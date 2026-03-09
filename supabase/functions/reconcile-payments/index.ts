import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated and is an owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isOwner } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "owner",
    });
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Only owners can reconcile" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all invoices
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("id, amount, paid_amount, status");
    if (invError) throw invError;

    // Get all payments grouped by invoice
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("invoice_id, amount");
    if (payError) throw payError;

    // Sum payments per invoice
    const paymentSums = new Map<string, number>();
    for (const p of payments || []) {
      paymentSums.set(
        p.invoice_id,
        (paymentSums.get(p.invoice_id) || 0) + Number(p.amount)
      );
    }

    const fixes: Array<{
      invoice_id: string;
      old_paid: number;
      new_paid: number;
      old_status: string;
      new_status: string;
    }> = [];

    for (const inv of invoices || []) {
      const actualPaid = Math.min(
        paymentSums.get(inv.id) || 0,
        Number(inv.amount)
      );
      const currentPaid = Number(inv.paid_amount);

      if (Math.abs(actualPaid - currentPaid) > 0.01) {
        const newStatus =
          actualPaid >= Number(inv.amount)
            ? "paid"
            : inv.status === "paid"
            ? "delivered"
            : inv.status;

        fixes.push({
          invoice_id: inv.id,
          old_paid: currentPaid,
          new_paid: actualPaid,
          old_status: inv.status,
          new_status: newStatus,
        });

        await supabase
          .from("invoices")
          .update({ paid_amount: actualPaid, status: newStatus })
          .eq("id", inv.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Reconciled ${fixes.length} invoices`,
        fixes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
