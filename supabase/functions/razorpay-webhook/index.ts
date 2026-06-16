import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-razorpay-event-id",
};

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tsFromUnix(v: any): string | null {
  if (!v || typeof v !== "number") return null;
  return new Date(v * 1000).toISOString();
}

function mapStatusToPlan(status: string): "free" | "pro" {
  if (["active", "authenticated", "pending"].includes(status)) return "pro";
  return "free";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500, headers: corsHeaders });
  }
  const expected = await hmacHex(secret, rawBody);
  if (expected !== signature) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return new Response("Bad JSON", { status: 400, headers: corsHeaders });
  }

  const eventName: string = event.event || "";
  if (!eventName.startsWith("subscription.")) {
    // ignore non-subscription events
    return new Response("ok", { headers: corsHeaders });
  }

  const sub = event.payload?.subscription?.entity;
  if (!sub?.id) {
    return new Response("No subscription entity", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Lookup our row
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, company_id")
    .eq("razorpay_subscription_id", sub.id)
    .maybeSingle();

  const company_id = existing?.company_id || sub.notes?.company_id;
  if (!company_id) {
    return new Response("Unknown subscription", { status: 200, headers: corsHeaders });
  }

  const status = String(sub.status || "").toLowerCase();
  const current_period_start = tsFromUnix(sub.current_start);
  const current_period_end = tsFromUnix(sub.current_end || sub.end_at);

  const updatePayload = {
    company_id,
    razorpay_subscription_id: sub.id,
    razorpay_plan_id: sub.plan_id,
    plan_type: sub.notes?.plan_type === "yearly" ? "yearly" : "monthly",
    quantity: sub.quantity || 1,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end: !!sub.cancel_at_cycle_end,
    short_url: sub.short_url || null,
    raw: sub,
  };

  if (existing) {
    await admin.from("subscriptions").update(updatePayload).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(updatePayload);
  }

  // Sync companies.plan + plan_expires_at
  const newPlan = mapStatusToPlan(status);
  await admin
    .from("companies")
    .update({
      plan: newPlan,
      plan_expires_at: current_period_end,
    })
    .eq("id", company_id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
