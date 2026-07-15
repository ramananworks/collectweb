// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
// };

// function generateOTP(): string {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// Deno.serve(async (req) => {
//   if (req.method === "OPTIONS") {
//     return new Response("ok", { headers: corsHeaders });
//   }

//   try {
//     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
//     const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
//     const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

//     const authHeader = req.headers.get("Authorization");
//     console.log("Auth header present:", !!authHeader);
    
//     if (!authHeader) {
//       return new Response(JSON.stringify({ error: "No authorization header" }), {
//         status: 401,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     const callerClient = createClient(supabaseUrl, anonKey, {
//       global: { headers: { Authorization: authHeader } },
//     });
//     const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
//     console.log("User lookup result:", caller?.id, "error:", userError?.message);
    
//     if (!caller) {
//       return new Response(JSON.stringify({ error: "Unauthorized", detail: userError?.message }), {
//         status: 401,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     // Verify caller role allows delivery operations (multi-role aware)
//     const { data: callerRoles, error: roleError } = await callerClient
//       .from("user_roles")
//       .select("role, company_id")
//       .eq("user_id", caller.id);
//     console.log("Role lookup:", callerRoles, "error:", roleError?.message);

//     const roleList = (callerRoles || []).map((r: any) => r.role);
//     const allowedRoles = ["owner", "manager", "delivery_staff"];
//     if (!roleList.some((r: string) => allowedRoles.includes(r))) {
//       return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
//         status: 403,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     // Get company_id from the first role record
//     const callerCompanyId = callerRoles?.[0]?.company_id;

//     const { action, invoiceId, otpCode, location } = await req.json();
//     const adminClient = createClient(supabaseUrl, serviceRoleKey);

//     if (action === "generate_otp") {
//       // Get invoice and customer details
//       const { data: invoice } = await adminClient
//         .from("invoices")
//         .select("id, customer_id, company_id, customer_name")
//         .eq("id", invoiceId)
//         .eq("company_id", callerCompanyId)
//         .single();

//       if (!invoice) {
//         return new Response(JSON.stringify({ error: "Invoice not found" }), {
//           status: 404,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }

//       // Get customer phone
//       const { data: customer } = await adminClient
//         .from("customers")
//         .select("phone, name")
//         .eq("id", invoice.customer_id)
//         .single();

//       if (!customer?.phone || customer.phone.trim() === "") {
//         return new Response(JSON.stringify({ error: `Customer "${customer?.name || invoice.customer_name}" has no phone number. Please update their profile first.` }), {
//           status: 400,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }

//       const otp = generateOTP();
//       const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

//       // Invalidate old OTPs for this invoice
//       await adminClient
//         .from("delivery_otps")
//         .update({ verified: true })
//         .eq("invoice_id", invoiceId)
//         .eq("verified", false);

//       // Store new OTP
//       const { error: insertError } = await adminClient
//         .from("delivery_otps")
//         .insert({
//           invoice_id: invoiceId,
//           customer_id: invoice.customer_id,
//           otp_code: otp,
//           expires_at: expiresAt,
//           company_id: callerCompanyId,
//         });

//       if (insertError) throw insertError;

//       // TODO: Send SMS via configured provider
//       // For now, the OTP is returned in the response for testing
//       // In production, replace this with actual SMS sending
//       const smsApiKey = Deno.env.get("SMS_API_KEY");
//       if (smsApiKey) {
//         // Placeholder for SMS provider integration
//         // Example: await sendSMS(customer.phone, `Your delivery OTP is: ${otp}`);
//         console.log(`SMS would be sent to ${customer.phone}: OTP ${otp}`);
//       }

//       return new Response(
//         JSON.stringify({
//           success: true,
//           message: `OTP sent to ${customer.name}'s registered mobile`,
//           customerPhone: customer.phone.replace(/(\d{2})\d+(\d{2})/, "$1****$2"),
//           // Include OTP in response only if no SMS provider configured (for testing)
//           ...(smsApiKey ? {} : { otp, note: "SMS provider not configured. OTP shown for testing." }),
//         }),
//         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
//       );
//     }

//     if (action === "verify_otp") {
//       if (!otpCode || !invoiceId) {
//         return new Response(JSON.stringify({ error: "OTP code and invoice ID required" }), {
//           status: 400,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }

//       // Find valid OTP
//       const { data: otpRecord } = await adminClient
//         .from("delivery_otps")
//         .select("*")
//         .eq("invoice_id", invoiceId)
//         .eq("otp_code", otpCode)
//         .eq("verified", false)
//         .gte("expires_at", new Date().toISOString())
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//       if (!otpRecord) {
//         return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
//           status: 400,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }

//       // Mark OTP as verified
//       await adminClient
//         .from("delivery_otps")
//         .update({ verified: true })
//         .eq("id", otpRecord.id);

//       // Update invoice with delivery confirmation
//       const { error: updateError } = await adminClient
//         .from("invoices")
//         .update({
//           delivered_by: caller.id,
//           delivery_confirmed_at: new Date().toISOString(),
//           otp_verified: true,
//           delivery_location: location || null,
//           status: "delivered",
//         })
//         .eq("id", invoiceId);

//       if (updateError) throw updateError;

//       return new Response(
//         JSON.stringify({ success: true, message: "Delivery confirmed successfully" }),
//         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(JSON.stringify({ error: "Invalid action" }), {
//       status: 400,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   } catch (err) {
//     return new Response(JSON.stringify({ error: err.message }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });





import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OTP_TTL_MINUTES = 5; // must match the registered SMS template wording
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last10) ? last10 : null;
}

async function sendOtpSms(mobile: string, otp: string, smsUser: string, smsPassword: string): Promise<void> {
  const number = "91" + mobile;
  const message = `${otp} is your OTP for Mobile Number verification. Valid for 5 min. VIN ENTERPRISES`;
  const text = encodeURIComponent(message);
  const url = `https://online.chennaisms.com/api/mt/SendSMS?user=${smsUser}&password=${smsPassword}&senderid=VINEPR&channel=Trans&DCS=0&flashsms=0&number=${number}&text=${text}&route=6`;

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  const body = await response.text();
  console.log("SMS gateway response:", response.status, body);

  if (!response.ok) {
    throw new Error(`SMS gateway returned ${response.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const smsUser = Deno.env.get("SMS_USER");
    const smsPassword = Deno.env.get("SMS_PASSWORD");

    const authHeader = req.headers.get("Authorization");
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
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles } = await callerClient
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", caller.id);

    const roleList = (callerRoles || []).map((r: any) => r.role);
    const allowedRoles = ["owner", "manager", "delivery_staff"];
    if (!roleList.some((r: string) => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerCompanyId = callerRoles?.[0]?.company_id;
    const { action, invoiceId, otpCode, location } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "generate_otp") {
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

      const { data: customer } = await adminClient
        .from("customers")
        .select("phone, name")
        .eq("id", invoice.customer_id)
        .single();

      if (!customer?.phone || customer.phone.trim() === "") {
        return new Response(JSON.stringify({ error: `Customer "${customer?.name || invoice.customer_name}" has no phone number. Please update their profile first.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedPhone = normalizeIndianMobile(customer.phone);
      if (!normalizedPhone) {
        return new Response(JSON.stringify({ error: `Customer "${customer.name}"'s phone number doesn't look like a valid Indian mobile number.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resend cooldown
      const { data: recentOtp } = await adminClient
        .from("delivery_otps")
        .select("created_at")
        .eq("invoice_id", invoiceId)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentOtp) {
        const elapsedMs = Date.now() - new Date(recentOtp.created_at).getTime();
        if (elapsedMs < RESEND_COOLDOWN_MS) {
          const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
          return new Response(JSON.stringify({ error: `Please wait ${waitSeconds}s before requesting another OTP.` }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Invalidate previous unverified OTPs for this invoice
      await adminClient
        .from("delivery_otps")
        .update({ verified: true })
        .eq("invoice_id", invoiceId)
        .eq("verified", false);

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

      const { data: newOtpRow, error: insertError } = await adminClient
        .from("delivery_otps")
        .insert({
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          otp_code: otp,
          expires_at: expiresAt,
          company_id: callerCompanyId,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const smsConfigured = !!(smsUser && smsPassword);

      if (smsConfigured) {
        try {
          await sendOtpSms(normalizedPhone, otp, smsUser!, smsPassword!);
        } catch (smsErr) {
          await adminClient.from("delivery_otps").delete().eq("id", newOtpRow.id);
          console.error("SMS send failed:", smsErr);
          return new Response(JSON.stringify({ error: "Failed to send OTP SMS. Please try again." }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `OTP sent to ${customer.name}'s registered mobile`,
          customerPhone: customer.phone.replace(/(\d{2})\d+(\d{2})/, "$1****$2"),
          ...(smsConfigured ? {} : { otp, note: "SMS provider not configured. OTP shown for testing." }),
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

      const { data: otpRecord } = await adminClient
        .from("delivery_otps")
        .select("*")
        .eq("invoice_id", invoiceId)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "No active OTP found. Please request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (otpRecord.attempts >= MAX_ATTEMPTS) {
        await adminClient.from("delivery_otps").update({ verified: true }).eq("id", otpRecord.id);
        return new Response(JSON.stringify({ error: "Too many incorrect attempts. Please request a new OTP." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (otpRecord.otp_code !== String(otpCode)) {
        await adminClient
          .from("delivery_otps")
          .update({ attempts: otpRecord.attempts + 1 })
          .eq("id", otpRecord.id);

        const remaining = MAX_ATTEMPTS - (otpRecord.attempts + 1);
        return new Response(JSON.stringify({ error: `Incorrect OTP. ${remaining > 0 ? `${remaining} attempt(s) left.` : "No attempts left — request a new OTP."}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("delivery_otps").update({ verified: true }).eq("id", otpRecord.id);

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
    console.error("delivery-otp error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});