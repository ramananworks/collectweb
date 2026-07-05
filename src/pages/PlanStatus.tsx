import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarClock, Gift, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { formatDisplayDate } from "@/lib/utils";

export default function PlanStatus() {
  const { profile, roles, loading: authLoading } = useAuth();
  const sub = useSubscription();
  const companyId = profile?.company_id;

  const companyQuery = useQuery({
    queryKey: ["plan-status-company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, plan, plan_expires_at")
        .eq("id", companyId!)
        .maybeSingle();
      return data;
    },
  });

  const latestSubQuery = useQuery({
    queryKey: ["plan-status-sub", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_type, status, current_period_start, current_period_end, cancel_at_period_end, raw, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  if (authLoading) return null;
  if (!roles.includes("owner")) return <Navigate to="/dashboard" replace />;

  const loading = companyQuery.isLoading || latestSubQuery.isLoading;
  const company = companyQuery.data;
  const latest = latestSubQuery.data;
  const raw = latest?.raw ?? {};
  const isComplimentary = !!raw?.complimentary;
  const expiry = company?.plan_expires_at || latest?.current_period_end;
  const daysLeft = expiry
    ? Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeCheck className="h-6 w-6 text-primary" /> Plan Status
        </h1>
        <p className="text-sm text-muted-foreground">Detailed view of your current subscription state.</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-card p-6 stat-card-shadow flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="rounded-xl bg-card p-5 stat-card-shadow space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
              <div className="text-lg font-semibold">{company?.name || "—"}</div>
            </div>
            {isComplimentary && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent/20 text-accent-foreground px-2 py-1 rounded-full border border-accent/40">
                <Gift className="h-3 w-3" /> Complimentary
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Current plan" value={<span className="capitalize font-semibold">{company?.plan ?? "free"}</span>} />
            <Field
              label="Status"
              value={
                <span className="capitalize">
                  {latest?.status ?? (company?.plan === "free" ? "free" : "—")}
                  {sub.isReadOnly ? " (read-only)" : ""}
                </span>
              }
            />
            <Field label="Plan type" value={<span className="capitalize">{latest?.plan_type ?? "—"}</span>} />
            <Field
              label="Seats"
              value={
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" /> {sub.seats}
                </span>
              }
            />
            <Field
              label="Period start"
              value={latest?.current_period_start ? formatDisplayDate(latest.current_period_start) : "—"}
            />
            <Field
              label="Period end"
              value={latest?.current_period_end ? formatDisplayDate(latest.current_period_end) : "—"}
            />
            <Field
              label="Plan expires on"
              value={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  {expiry ? formatDisplayDate(expiry) : "—"}
                  {daysLeft !== null && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({daysLeft >= 0 ? `${daysLeft} days left` : `expired ${-daysLeft} days ago`})
                    </span>
                  )}
                </span>
              }
            />
            <Field
              label="Cancels at period end"
              value={latest?.cancel_at_period_end ? "Yes" : "No"}
            />
          </div>

          {raw?.note && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> {String(raw.note)}
            </div>
          )}

          <details className="rounded-lg bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground">Raw subscription payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
