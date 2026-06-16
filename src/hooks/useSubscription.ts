import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionRow {
  id: string;
  company_id: string;
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  plan_type: "monthly" | "yearly";
  quantity: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  short_url: string | null;
}

export function useSubscription() {
  const { profile, roles } = useAuth();
  const isOwner = roles.includes("owner");
  const companyId = profile?.company_id;

  const subQuery = useQuery({
    queryKey: ["subscription", companyId],
    enabled: !!companyId && isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as SubscriptionRow | null) ?? null;
    },
  });

  const companyQuery = useQuery({
    queryKey: ["company-plan", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("plan, plan_expires_at")
        .eq("id", companyId!)
        .maybeSingle();
      return data as { plan: string; plan_expires_at: string | null } | null;
    },
  });

  const seatQuery = useQuery({
    queryKey: ["seat-count", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!);
      return count ?? 1;
    },
  });

  const plan = companyQuery.data?.plan ?? "free";
  const planExpiresAt = companyQuery.data?.plan_expires_at
    ? new Date(companyQuery.data.plan_expires_at)
    : null;
  const seats = seatQuery.data ?? 1;
  const sub = subQuery.data;

  // Read-only / write-allowed mirrors the DB function:
  //   - free plan: writes allowed only when there is exactly 1 user
  //   - paid plan: writes allowed only when subscription is active and not expired
  let canWrite = true;
  if (plan === "free") {
    canWrite = seats <= 1;
  } else {
    const active = !!sub && ["active", "authenticated", "pending"].includes(sub.status);
    const notExpired = !planExpiresAt || planExpiresAt.getTime() > Date.now();
    canWrite = active && notExpired;
  }

  return {
    plan,
    planExpiresAt,
    seats,
    subscription: sub,
    isOwner,
    canWrite,
    isReadOnly: !canWrite,
    loading: companyQuery.isLoading || seatQuery.isLoading || (isOwner && subQuery.isLoading),
    refetch: () => {
      subQuery.refetch();
      companyQuery.refetch();
      seatQuery.refetch();
    },
  };
}
