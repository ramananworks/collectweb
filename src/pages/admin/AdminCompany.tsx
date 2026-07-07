import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gift, CalendarPlus, XCircle, Download, LogIn, Loader2, Users, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatDisplayDate } from "@/lib/utils";
import { toCSV, downloadCSV } from "@/lib/csv-export";

export default function AdminCompany() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [months, setMonths] = useState(12);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const company = useQuery({
    queryKey: ["admin-company", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const subs = useQuery({
    queryKey: ["admin-company-subs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, plan_type, status, current_period_start, current_period_end, cancel_at_period_end, raw, created_at")
        .eq("company_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const users = useQuery({
    queryKey: ["admin-company-users", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, name, email, phone").eq("company_id", id!),
        supabase.from("user_roles").select("user_id, role").eq("company_id", id!),
      ]);
      const rolesByUser = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      return (profiles || []).map((p: any) => ({ ...p, roles: rolesByUser.get(p.id) || [] }));
    },
  });

  async function run(action: string, fn: () => Promise<any>) {
    setBusy(action);
    try {
      const { error } = await fn();
      if (error) throw error;
      toast({ title: "Done", description: action + " succeeded." });
      qc.invalidateQueries({ queryKey: ["admin-company", id] });
      qc.invalidateQueries({ queryKey: ["admin-company-subs", id] });
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function exportTable(table: "customers" | "invoices" | "payments") {
    setBusy("export-" + table);
    try {
      const { data, error } = await supabase.from(table).select("*").eq("company_id", id!);
      if (error) throw error;
      const csv = toCSV(data || []);
      downloadCSV(`${company.data?.name || "company"}-${table}.csv`, csv);
      toast({ title: "Exported", description: `${data?.length ?? 0} ${table} rows.` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function impersonate(email: string) {
    setImpersonating(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { email } });
      if (error) throw error;
      const link = (data as any)?.action_link;
      if (!link) throw new Error("No sign-in link returned");
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Impersonation failed", description: e.message, variant: "destructive" });
    } finally {
      setImpersonating(null);
    }
  }

  const c = company.data;
  const latest = subs.data?.[0];
  const isComplimentary = !!(latest?.raw as any)?.complimentary;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
      </div>

      {company.isLoading ? (
        <div className="rounded-xl bg-card p-8 stat-card-shadow flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !c ? (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">Company not found.</div>
      ) : (
        <>
          <div className="rounded-xl bg-card p-5 stat-card-shadow">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BadgeCheck className="h-6 w-6 text-primary" /> {c.name}
                </h1>
                <p className="text-sm text-muted-foreground">{c.phone || "—"} · GSTIN {c.gstin || "—"}</p>
              </div>
              {isComplimentary && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent/20 text-accent-foreground px-2 py-1 rounded-full border border-accent/40">
                  <Gift className="h-3 w-3" /> Complimentary
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
              <div><div className="text-xs text-muted-foreground">Plan</div><div className="font-semibold uppercase">{c.plan}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><div className="font-semibold">{c.status}</div></div>
              <div><div className="text-xs text-muted-foreground">Expires</div><div className="font-semibold">{c.plan_expires_at ? formatDisplayDate(c.plan_expires_at) : "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Sub status</div><div className="font-semibold">{latest?.status || "—"}</div></div>
            </div>
          </div>

          {/* Plan actions */}
          <div className="rounded-xl bg-card p-5 stat-card-shadow space-y-4">
            <h2 className="text-lg font-semibold">Plan actions</h2>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Months</label>
                <Input type="number" min={1} max={60} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-24" />
              </div>
              <Button
                className="gap-2"
                disabled={busy !== null}
                onClick={() => run("Grant complimentary", async () => await supabase.rpc("admin_grant_complimentary_plan", { _company_id: id!, _months: months }))}
              >
                {busy === "Grant complimentary" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Grant complimentary
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Extend by (days)</label>
                <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
              </div>
              <Button
                variant="secondary"
                className="gap-2"
                disabled={busy !== null}
                onClick={() => run("Extend plan", async () => await supabase.rpc("admin_extend_plan", { _company_id: id!, _days: days }))}
              >
                {busy === "Extend plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                Extend plan
              </Button>
            </div>

            <div>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={busy !== null}
                onClick={() => run("Cancel plan", async () => await supabase.rpc("admin_cancel_plan", { _company_id: id! }))}
              >
                {busy === "Cancel plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel plan
              </Button>
            </div>
          </div>

          {/* Users */}
          <div className="rounded-xl bg-card p-5 stat-card-shadow">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Users className="h-5 w-5 text-primary" /> Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Roles</th><th className="text-right py-2">Action</th></tr>
                </thead>
                <tbody>
                  {(users.data || []).map((u: any) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-muted-foreground">{u.email}</td>
                      <td className="py-2 text-xs">{u.roles.join(", ")}</td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="outline" className="gap-1" disabled={impersonating === u.email} onClick={() => impersonate(u.email)}>
                          {impersonating === u.email ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                          Sign in as
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!users.data?.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No users.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Backup */}
          <div className="rounded-xl bg-card p-5 stat-card-shadow">
            <h2 className="text-lg font-semibold mb-3">Data backup</h2>
            <p className="text-xs text-muted-foreground mb-3">Download a full CSV export of this company's data.</p>
            <div className="flex flex-wrap gap-2">
              {(["customers", "invoices", "payments"] as const).map((t) => (
                <Button key={t} variant="outline" className="gap-2" disabled={busy !== null} onClick={() => exportTable(t)}>
                  {busy === "export-" + t ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Sub history */}
          <div className="rounded-xl bg-card p-5 stat-card-shadow">
            <h2 className="text-lg font-semibold mb-3">Subscription history</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left py-2">Created</th><th className="text-left py-2">Plan</th><th className="text-left py-2">Status</th><th className="text-left py-2">Period end</th><th className="text-left py-2">Comp</th></tr>
                </thead>
                <tbody>
                  {(subs.data || []).map((s: any) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-2">{formatDisplayDate(s.created_at)}</td>
                      <td className="py-2">{s.plan_type}</td>
                      <td className="py-2">{s.status}</td>
                      <td className="py-2">{s.current_period_end ? formatDisplayDate(s.current_period_end) : "—"}</td>
                      <td className="py-2">{s.raw?.complimentary ? "Yes" : ""}</td>
                    </tr>
                  ))}
                  {!subs.data?.length && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No subscriptions.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
