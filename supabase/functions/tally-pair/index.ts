import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  errorJson,
  json,
  randomPairCode,
  randomToken,
  serviceClient,
  sha256Hex,
  userClientFromRequest,
} from "../_shared/tally-auth.ts";

const PAIR_TTL_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // Path is like /tally-pair/start, /tally-pair/claim, /tally-pair/status, /tally-pair/revoke
  const segments = url.pathname.split("/").filter(Boolean);
  const action = segments[segments.length - 1];

  try {
    if (action === "claim") return await claim(req);
    if (action === "start") return await start(req);
    if (action === "status") return await status(req);
    if (action === "revoke") return await revoke(req);
    return errorJson("not_found", "Unknown pair action", 404);
  } catch (e) {
    console.error("tally-pair error", e);
    return errorJson("internal", (e as Error).message, 500);
  }
});

// ---- Owner-authenticated endpoints ----
async function resolveOwner(req: Request) {
  const user = userClientFromRequest(req);
  const { data: { user: u } } = await user.auth.getUser();
  if (!u) return { error: errorJson("unauthorized", "Sign in required", 401) };

  const svc = serviceClient();
  const { data: profile } = await svc.from("profiles").select("company_id").eq("id", u.id).maybeSingle();
  if (!profile?.company_id) return { error: errorJson("forbidden", "No company", 403) };

  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", u.id);
  const isOwner = (roles ?? []).some((r) => r.role === "owner");
  if (!isOwner) return { error: errorJson("forbidden", "Owner role required", 403) };

  return { user: u, company_id: profile.company_id as string, svc };
}

async function start(req: Request) {
  if (req.method !== "POST") return errorJson("method_not_allowed", "POST required", 405);
  const ctx = await resolveOwner(req);
  if ("error" in ctx) return ctx.error;

  // Generate a unique pair code
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = randomPairCode();
    const { data: existing } = await ctx.svc.from("api_pair_codes").select("id").eq("code", code).maybeSingle();
    if (!existing) break;
  }
  const expires_at = new Date(Date.now() + PAIR_TTL_MS).toISOString();

  const { data, error } = await ctx.svc.from("api_pair_codes").insert({
    company_id: ctx.company_id,
    code,
    created_by: ctx.user.id,
    expires_at,
  }).select("id, code, expires_at").single();
  if (error) return errorJson("db_error", error.message, 500);

  return json({ pair_code: data.code, expires_at: data.expires_at, pair_id: data.id });
}

async function status(req: Request) {
  const ctx = await resolveOwner(req);
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const pair_id = url.searchParams.get("pair_id");
  if (!pair_id) return errorJson("bad_request", "pair_id required", 400);

  const { data, error } = await ctx.svc
    .from("api_pair_codes")
    .select("id, code, expires_at, claimed_at, claimed_device_id")
    .eq("id", pair_id)
    .eq("company_id", ctx.company_id)
    .maybeSingle();
  if (error || !data) return errorJson("not_found", "Pair code not found", 404);

  let device: { id: string; device_name: string; last_used_at: string | null } | null = null;
  if (data.claimed_device_id) {
    const { data: d } = await ctx.svc
      .from("api_devices")
      .select("id, device_name, last_used_at")
      .eq("id", data.claimed_device_id)
      .maybeSingle();
    device = d ?? null;
  }

  const expired = new Date(data.expires_at).getTime() < Date.now() && !data.claimed_at;
  return json({
    pair_id: data.id,
    code: data.code,
    expires_at: data.expires_at,
    claimed: !!data.claimed_at,
    claimed_at: data.claimed_at,
    expired,
    device,
  });
}

async function revoke(req: Request) {
  if (req.method !== "POST") return errorJson("method_not_allowed", "POST required", 405);
  const ctx = await resolveOwner(req);
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const device_id = body?.device_id;
  if (!device_id) return errorJson("bad_request", "device_id required", 400);

  const { error } = await ctx.svc
    .from("api_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", device_id)
    .eq("company_id", ctx.company_id);
  if (error) return errorJson("db_error", error.message, 500);
  return json({ ok: true });
}

// ---- Connector-side claim (no auth) ----
async function claim(req: Request) {
  if (req.method !== "POST") return errorJson("method_not_allowed", "POST required", 405);
  const body = await req.json().catch(() => ({}));
  const code = String(body?.pair_code ?? "").trim().toUpperCase();
  const device_name = String(body?.device_name ?? "").trim().slice(0, 120) || "Tally Connector";
  if (!code) return errorJson("bad_request", "pair_code required", 400);

  const svc = serviceClient();
  const { data: pc, error: pcErr } = await svc
    .from("api_pair_codes")
    .select("id, company_id, expires_at, claimed_at, created_by")
    .eq("code", code)
    .maybeSingle();
  if (pcErr || !pc) return errorJson("invalid_code", "Pair code not found", 404);
  if (pc.claimed_at) return errorJson("already_claimed", "Pair code already used", 409);
  if (new Date(pc.expires_at).getTime() < Date.now()) {
    return errorJson("expired", "Pair code has expired", 410);
  }

  const token = randomToken(32);
  const token_hash = await sha256Hex(token);

  const { data: device, error: devErr } = await svc.from("api_devices").insert({
    company_id: pc.company_id,
    device_name,
    token_hash,
    created_by: pc.created_by,
  }).select("id, company_id, device_name, created_at").single();
  if (devErr) return errorJson("db_error", devErr.message, 500);

  await svc.from("api_pair_codes")
    .update({ claimed_at: new Date().toISOString(), claimed_device_id: device.id })
    .eq("id", pc.id);

  return json({
    api_token: token,
    device_id: device.id,
    device_name: device.device_name,
    company_id: device.company_id,
    api_base_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/tally-api`,
  });
}
