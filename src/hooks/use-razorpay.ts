import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Plan = "pro_monthly" | "pro_yearly";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();

  const checkout = useCallback(
    async (plan: Plan) => {
      if (!session) {
        toast({ title: "Please sign in first", description: "You need an account to subscribe.", variant: "destructive" });
        navigate("/login");
        return;
      }

      setLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay SDK");
        }

        // Create order
        const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
          body: { plan },
        });

        if (error || !data?.order_id) {
          throw new Error(error?.message || data?.error || "Failed to create order");
        }

        // Open Razorpay checkout
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: "CollectWeb",
          description: plan === "pro_monthly" ? "Pro Monthly Plan" : "Pro Yearly Plan",
          order_id: data.order_id,
          prefill: data.prefill,
          theme: { color: "#2563eb" },
          handler: async (response: any) => {
            try {
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                "verify-razorpay-payment",
                {
                  body: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    plan,
                  },
                }
              );

              if (verifyError || !verifyData?.success) {
                throw new Error(verifyError?.message || verifyData?.error || "Verification failed");
              }

              toast({ title: "Payment successful! 🎉", description: "Your plan has been upgraded to Pro." });
              navigate("/dashboard");
            } catch (err: any) {
              toast({ title: "Payment verification failed", description: err.message, variant: "destructive" });
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          toast({
            title: "Payment failed",
            description: response.error?.description || "Something went wrong",
            variant: "destructive",
          });
          setLoading(false);
        });
        rzp.open();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [session, toast, navigate]
  );

  return { checkout, loading };
}
