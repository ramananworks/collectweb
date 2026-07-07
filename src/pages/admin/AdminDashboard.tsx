import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CreditCard, Gift, IndianRupee, FileText, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  plan: string;
  status: string;
  plan_expires_at: string | null;
  created_at: string;
  owner_email?: string | null;
  seats?: number;
  active_sub_status?: string | null;
  complimentary?: boolean;
};

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl bg-card p-4 stat-card-shadow">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [q, setQ] = useState("");

  const companiesQuery = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, plan, status, plan_expires_at, created_at")
        .order("created_at", { ascending: false });
      const ids = (companies || []).map((c) => c.id);
      if (!ids.length) return [] as Row[];

      const [{ data: subs }, { data: roles }, { data: owners }] = await Promise.all([
        supabase.from("subscriptions").select("company_id, status, current_period_end, raw, created_at").in("company_id", ids),
        supabase.from("user_roles").select("company_id, user_id").in("company_id", ids),
        supabase.from("profiles").select("id, email, company_id").in("company_id", ids),
      ]);

      const latestSubByCompany = new Map<string, any>();
      (subs || []).forEach((s: any) => {
        const cur = latestSubByCompany.get(s.company_id);
        if (!cur || new Date(s.created_at) > new Date(cur.created_at)) latestSubByCompany.set(s.company_id, s);
      });
      const seatByCompany = new Map<string, number>();
      (roles || []).forEach((r: any) => seatByCompany.set(r.company_id, (seatByCompany.get(r.company_id) || 0) + 1));
      const ownerEmailByCompany = new Map<string, string>();
      (owners || []).forEach((p: any) => {
        if (!ownerEmailByCompany.has(p.company_id)) ownerEmailByCompany.set(p.company_id, p.email);
      });

      return (companies || []).map<Row>((c) => {
        const sub = latestSubByCompany.get(c.id);
        return {
          ...c,
          owner_email: ownerEmailByCompany.get(c.id) || null,
          seats: seatByCompany.get(c.id) || 0,
          active_sub_status: sub?.status || null,
          complimentary: !!(sub?.raw as any)?.complimentary,
        };
      });
    },
  });

  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [inv, pay, subs] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
        supabase.from("subscriptions").select("status, plan_type, quantity, current_period_end, raw"),
      ]);
      const totalCollections = (pay.data || []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
      const active = (subs.data || []).filter((s: any) => ["active", "authenticated", "pending"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end) > new Date()));
      const complimentaryCount = active.filter((s: any) => (s?.raw as any)?.complimentary).length;
      const priceMonthly = 499; // approx per seat
      const priceYearly = 4999;
      const mrr = active.reduce((sum, s: any) => {
        if ((s?.raw as any)?.complimentary) return sum;
        const seats = Number(s.quantity || 1);
        return sum + (s.plan_type === "yearly" ? (priceYearly * seats) / 12 : priceMonthly * seats);
      }, 0);
      return {
        invoiceCount: inv.count || 0,
        totalCollections,
        activeSubs: active.length,
        complimentaryCount,
        mrr,
      };
    },
  });

  const rows = companiesQuery.data || [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle) || (r.owner_email || "").toLowerCase().includes(needle));
  }, [rows, q]);

  const m = metricsQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground">Platform overview & tenant management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Building2} label="Companies" value={rows.length} />
        <Stat icon={CreditCard} label="Active subs" value={m?.activeSubs ?? "—"} />
        <Stat icon={Gift} label="Complimentary" value={m?.complimentaryCount ?? "—"} />
        <Stat icon={FileText} label="Invoices" value={m?.invoiceCount ?? "—"} />
        <Stat icon={IndianRupee} label="Collections (₹)" value={m ? Math.round(m.totalCollections).toLocaleString("en-IN") : "—"} />
        <Stat icon={IndianRupee} label="Est. MRR (₹)" value={m ? Math.round(m.mrr).toLocaleString("en-IN") : "—"} />
      </div>

      <div className="rounded-xl bg-card stat-card-shadow overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company or owner email…" value={q} onChange={(e) => setQ(e.target.value)} className="border-0 focus-visible:ring-0" />
        </div>
        {companiesQuery.isLoading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Company</th>
                  <th className="text-left px-3 py-2">Owner</th>
                  <th className="text-left px-3 py-2">Plan</th>
                  <th className="text-left px-3 py-2">Sub</th>
                  <th className="text-left px-3 py-2">Expires</th>
                  <th className="text-right px-3 py-2">Seats</th>
                  <th className="text-left px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-accent/40">
                    <td className="px-3 py-2">
                      <Link to={`/admin/companies/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                      {r.complimentary && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full border border-accent/40">
                          <Gift className="h-2.5 w-2.5" /> Comp
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.owner_email || "—"}</td>
                    <td className="px-3 py-2 uppercase text-xs">{r.plan}</td>
                    <td className="px-3 py-2 text-xs">{r.active_sub_status || "—"}</td>
                    <td className="px-3 py-2">{r.plan_expires_at ? formatDisplayDate(r.plan_expires_at) : "—"}</td>
                    <td className="px-3 py-2 text-right">{r.seats}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDisplayDate(r.created_at)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No companies match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
