import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDisplayDate } from "@/lib/utils";

const PRICE_MONTHLY = 299;
const PRICE_YEARLY = 2999;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Billing() {
  const { profile, roles, loading: authLoading } = useAuth();
  const sub = useSubscription();
  const [busy, setBusy] = useState<null | "monthly" | "yearly" | "cancel">(null);

  useEffect(() => {
    void loadRazorpay();
  }, []);

  if (authLoading) return null;
  if (!roles.includes("owner")) return <Navigate to="/dashboard" replace />;

  const seats = sub.seats;
  const planActive = !sub.isReadOnly && sub.plan !== "free";
  const monthlyTotal = seats * PRICE_MONTHLY;
  const yearlyTotal = seats * PRICE_YEARLY;

  async function startSubscribe(plan_type: "monthly" | "yearly") {
    setBusy(plan_type);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
        body: { plan_type },
      });
      if (error || !data?.subscription_id) {
        throw new Error(error?.message || data?.error || "Failed to start checkout");
      }
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        // Fallback: open hosted page
        if (data.short_url) window.location.href = data.short_url;
        return;
      }
      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: "CollectWeb",
        description: `Pro ${plan_type} - ${data.quantity} user(s)`,
        prefill: { email: profile?.email || "", contact: profile?.phone || "" },
        theme: { color: "#658f40" },
        handler: () => {
          toast({
            title: "Payment received",
            description: "Activating your subscription. This may take a moment.",
          });
          setTimeout(() => sub.refetch(), 2500);
        },
        modal: {
          ondismiss: () => setBusy(null),
        },
      });
      rzp.open();
    } catch (e: any) {
      toast({ title: "Couldn't start checkout", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy((b) => (b === "cancel" ? b : null));
    }
  }

  async function cancelSubscription() {
    if (!confirm("Cancel subscription at end of current billing period? You'll keep access until then.")) return;
    setBusy("cancel");
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-cancel-subscription", {});
      if (error) throw error;
      toast({ title: "Cancellation scheduled", description: "Your plan will end at the next billing date." });
      sub.refetch();
    } catch (e: any) {
      toast({ title: "Couldn't cancel", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your CollectWeb Pro subscription. Billed per active user.
        </p>
      </div>

      {/* Current plan */}
      <div className="rounded-xl bg-card p-5 stat-card-shadow">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</div>
            <div className="text-xl font-bold capitalize mt-1 flex items-center gap-2">
              {sub.plan}
              {planActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              ) : sub.plan === "free" ? (
                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">Free</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" /> Inactive
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {seats} active user{seats === 1 ? "" : "s"}
              {sub.planExpiresAt && (
                <>
                  {" · "}Renews / ends {formatDisplayDate(sub.planExpiresAt.toISOString())}
                </>
              )}
            </div>
            {sub.subscription?.cancel_at_period_end && (
              <div className="text-xs text-destructive mt-2">
                Cancellation scheduled at end of current period.
              </div>
            )}
          </div>

          {planActive && !sub.subscription?.cancel_at_period_end && (
            <Button variant="outline" onClick={cancelSubscription} disabled={busy === "cancel"} className="gap-2">
              {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel at period end
            </Button>
          )}
        </div>
      </div>

      {/* Upgrade options */}
      {!planActive && (
        <div className="grid sm:grid-cols-2 gap-4">
          <PlanCard
            label="Pro Monthly"
            price={PRICE_MONTHLY}
            unit="user / month"
            total={monthlyTotal}
            seats={seats}
            cycle="month"
            busy={busy === "monthly"}
            onClick={() => startSubscribe("monthly")}
          />
          <PlanCard
            label="Pro Yearly"
            price={PRICE_YEARLY}
            unit="user / year"
            total={yearlyTotal}
            seats={seats}
            cycle="year"
            highlight
            busy={busy === "yearly"}
            onClick={() => startSubscribe("yearly")}
          />
        </div>
      )}

      {sub.subscription?.short_url && !planActive && (
        <a
          href={sub.subscription.short_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
        >
          Open pending checkout <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
        Pricing is per active user. Adding or removing team members updates seat count on your next renewal cycle.
        Real payments are processed via Razorpay in live mode.
      </div>
    </div>
  );
}

function PlanCard({
  label,
  price,
  unit,
  total,
  seats,
  cycle,
  highlight,
  busy,
  onClick,
}: {
  label: string;
  price: number;
  unit: string;
  total: number;
  seats: number;
  cycle: "month" | "year";
  highlight?: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`rounded-xl p-5 stat-card-shadow ${highlight ? "bg-primary/5 border border-primary/30" : "bg-card"}`}
    >
      <div className="font-semibold">{label}</div>
      <div className="mt-2">
        <span className="text-3xl font-bold">₹{price.toLocaleString("en-IN")}</span>
        <span className="text-sm text-muted-foreground"> / {unit}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        × {seats} user{seats === 1 ? "" : "s"} ={" "}
        <strong className="text-foreground">₹{total.toLocaleString("en-IN")} / {cycle}</strong>
      </div>
      <Button
        className="gradient-primary text-primary-foreground w-full mt-4 gap-2"
        onClick={onClick}
        disabled={busy}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Subscribe
      </Button>
    </div>
  );
}
