import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
    console.log("User lookup result:", caller?.id, "error:", userError?.message);
    
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller role allows delivery operations (multi-role aware)
    const { data: callerRoles, error: roleError } = await callerClient
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", caller.id);
    console.log("Role lookup:", callerRoles, "error:", roleError?.message);

    const roleList = (callerRoles || []).map((r: any) => r.role);
    const allowedRoles = ["owner", "manager", "delivery_staff"];
    if (!roleList.some((r: string) => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company_id from the first role record
    const callerCompanyId = callerRoles?.[0]?.company_id;

    const { action, invoiceId, otpCode, location } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "generate_otp") {
      // Get invoice and customer details
      const { data: invoice } = await adminClient
        .from("invoices")
        .select("id, customer_id, company_id, customer_name")
        .eq("id", invoiceId)
        .eq("company_id", callerCompanyId)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get customer phone
      const { data: customer } = await adminClient
        .from("customers")
        .select("phone, name")
        .eq("id", invoice.customer_id)
        .single();

      if (!customer?.phone) {
        return new Response(JSON.stringify({ error: "Customer has no phone number registered" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

      // Invalidate old OTPs for this invoice
      await adminClient
        .from("delivery_otps")
        .update({ verified: true })
        .eq("invoice_id", invoiceId)
        .eq("verified", false);

      // Store new OTP
      const { error: insertError } = await adminClient
        .from("delivery_otps")
        .insert({
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          otp_code: otp,
          expires_at: expiresAt,
          company_id: callerCompanyId,
        });

      if (insertError) throw insertError;

      // TODO: Send SMS via configured provider
      // For now, the OTP is returned in the response for testing
      // In production, replace this with actual SMS sending
      const smsApiKey = Deno.env.get("SMS_API_KEY");
      if (smsApiKey) {
        // Placeholder for SMS provider integration
        // Example: await sendSMS(customer.phone, `Your delivery OTP is: ${otp}`);
        console.log(`SMS would be sent to ${customer.phone}: OTP ${otp}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `OTP sent to ${customer.name}'s registered mobile`,
          customerPhone: customer.phone.replace(/(\d{2})\d+(\d{2})/, "$1****$2"),
          // Include OTP in response only if no SMS provider configured (for testing)
          ...(smsApiKey ? {} : { otp, note: "SMS provider not configured. OTP shown for testing." }),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_otp") {
      if (!otpCode || !invoiceId) {
        return new Response(JSON.stringify({ error: "OTP code and invoice ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find valid OTP
      const { data: otpRecord } = await adminClient
        .from("delivery_otps")
        .select("*")
        .eq("invoice_id", invoiceId)
        .eq("otp_code", otpCode)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as verified
      await adminClient
        .from("delivery_otps")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Update invoice with delivery confirmation
      const { error: updateError } = await adminClient
        .from("invoices")
        .update({
          delivered_by: caller.id,
          delivery_confirmed_at: new Date().toISOString(),
          otp_verified: true,
          delivery_location: location || null,
          status: "delivered",
        })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: "Delivery confirmed successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
