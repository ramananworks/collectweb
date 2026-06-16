import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function rpAuth() {
  return "Basic " + btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles || []).some((r: any) => r.role === "owner")) {
      return new Response(JSON.stringify({ error: "Only owner can cancel." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: profile } = await caller.from("profiles").select("company_id").eq("id", user.id).single();
    const company_id = profile?.company_id;
    if (!company_id) return new Response(JSON.stringify({ error: "No company" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sub } = await admin.from("subscriptions").select("*").eq("company_id", company_id)
      .in("status", ["active", "authenticated", "pending", "created"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub?.razorpay_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
      method: "POST",
      headers: { Authorization: rpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });
    const text = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Razorpay: ${text}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const updated = JSON.parse(text);
    await admin.from("subscriptions").update({
      cancel_at_period_end: true,
      status: updated.status || sub.status,
      raw: updated,
    }).eq("id", sub.id);

    return new Response(JSON.stringify({ ok: true, status: updated.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
