import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function rpAuthHeader() {
  const id = Deno.env.get("RAZORPAY_KEY_ID")!;
  const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  return "Basic " + btoa(`${id}:${secret}`);
}

async function rpFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${RAZORPAY_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: rpAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`Razorpay ${path} ${res.status}: ${text}`);
  }
  return json;
}

/** Find or create a per-seat plan for the requested period. */
async function ensurePlan(plan_type: "monthly" | "yearly") {
  const period = plan_type === "monthly" ? "monthly" : "yearly";
  const amount = plan_type === "monthly" ? 29900 : 299900; // INR paise per seat
  const name = plan_type === "monthly" ? "CollectWeb Pro Monthly (per user)" : "CollectWeb Pro Yearly (per user)";

  // List existing plans and try to match by item.name + amount + period
  const list = await rpFetch(`/plans?count=100`);
  const found = (list?.items || []).find(
    (p: any) => p.period === period && p?.item?.amount === amount && p?.item?.name === name,
  );
  if (found) return found.id as string;

  const created = await rpFetch(`/plans`, {
    method: "POST",
    body: JSON.stringify({
      period,
      interval: 1,
      item: {
        name,
        amount,
        currency: "INR",
        description: "Per active user, billed " + period,
      },
    }),
  });
  return created.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await callerClient.from("user_roles").select("role").eq("user_id", user.id);
    const isOwner = (roles || []).some((r: any) => r.role === "owner");
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Only the owner can manage billing." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await callerClient.from("profiles").select("company_id").eq("id", user.id).single();
    const company_id = profile?.company_id;
    if (!company_id) {
      return new Response(JSON.stringify({ error: "No company" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const plan_type = body.plan_type === "yearly" ? "yearly" : "monthly";

    const admin = createClient(supabaseUrl, serviceKey);
    const { count: seats = 1 } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company_id);
    const quantity = Math.max(1, seats || 1);

    const plan_id = await ensurePlan(plan_type);
    const total_count = plan_type === "monthly" ? 120 : 10;

    const subscription = await rpFetch(`/subscriptions`, {
      method: "POST",
      body: JSON.stringify({
        plan_id,
        total_count,
        quantity,
        customer_notify: 1,
        notes: { company_id, plan_type },
      }),
    });

    await admin.from("subscriptions").insert({
      company_id,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: plan_id,
      plan_type,
      quantity,
      status: subscription.status || "created",
      short_url: subscription.short_url || null,
      raw: subscription,
    });

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        short_url: subscription.short_url,
        key_id: Deno.env.get("RAZORPAY_KEY_ID"),
        plan_id,
        quantity,
        plan_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
