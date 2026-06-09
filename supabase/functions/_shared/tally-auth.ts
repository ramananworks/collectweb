// Shared helpers for the Tally connector edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export function errorJson(code: string, message: string, status = 400, field?: string) {
  return json({ error: { code, message, ...(field ? { field } : {}) } }, status);
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function userClientFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomPairCode(): string {
  // 8 chars, no ambiguous letters, formatted XXXX-XXXX
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const chars = Array.from(arr).map((b) => alphabet[b % alphabet.length]);
  return chars.slice(0, 4).join("") + "-" + chars.slice(4).join("");
}

export type AuthedDevice = { device_id: string; company_id: string };

export async function authDevice(req: Request): Promise<AuthedDevice | Response> {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return errorJson("unauthorized", "Missing bearer token", 401);
  }
  const token = header.slice(7).trim();
  if (!token) return errorJson("unauthorized", "Empty bearer token", 401);

  const hash = await sha256Hex(token);
  const svc = serviceClient();
  const { data, error } = await svc
    .from("api_devices")
    .select("id, company_id, revoked_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return errorJson("unauthorized", "Invalid or revoked token", 401);

  // Fire-and-forget last_used_at update
  svc.from("api_devices").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});

  return { device_id: data.id, company_id: data.company_id };
}

export async function logRequest(
  device: AuthedDevice | null,
  company_id: string | null,
  path: string,
  method: string,
  status: number,
  duration_ms: number,
) {
  if (!company_id) return;
  const svc = serviceClient();
  await svc.from("api_request_log").insert({
    company_id,
    device_id: device?.device_id ?? null,
    path,
    method,
    status,
    duration_ms,
  });
}
