import { useState, useMemo } from "react";
import { IndianRupee, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { useCustomers, useInvoices, usePayments, useAreas, formatCurrency } from "@/hooks/use-data";
import { differenceInDays } from "date-fns";

const barColors = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(25, 85%, 55%)", "hsl(0, 72%, 51%)"];

export default function Dashboard() {
  const [areaFilter, setAreaFilter] = useState("all");
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: areas = [] } = useAreas();

  const areaNames = useMemo(() => areas.map((a) => a.name), [areas]);

  const filteredCustomerIds = areaFilter === "all"
    ? customers.map((c) => c.id)
    : customers.filter((c) => c.area === areaFilter).map((c) => c.id);

  const filteredInvoices = invoices.filter((inv) => filteredCustomerIds.includes(inv.customer_id));
  const filteredPayments = payments.filter((p) => {
    const inv = invoices.find((i) => i.id === p.invoice_id);
    return inv && filteredCustomerIds.includes(inv.customer_id);
  });

  const totalOutstanding = filteredInvoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const today = new Date().toISOString().split("T")[0];
  const todayCollection = filteredPayments.filter((p) => p.date === today).reduce((a, p) => a + p.amount, 0);
  const overdueAmount = filteredInvoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const customerCount = new Set(filteredInvoices.map((i) => i.customer_id)).size;

  const recentInvoices = filteredInvoices.slice(0, 4);
  const recentPayments = filteredPayments.slice(0, 4);

  // Compute ageing data from real invoices
  const ageingData = useMemo(() => {
    const now = new Date();
    const brackets = [
      { bracket: "0–30 days", amount: 0, count: 0 },
      { bracket: "31–60 days", amount: 0, count: 0 },
      { bracket: "61–90 days", amount: 0, count: 0 },
      { bracket: "90+ days", amount: 0, count: 0 },
    ];
    filteredInvoices
      .filter((i) => i.status === "overdue" || (i.status !== "paid" && new Date(i.due_date) < now))
      .forEach((i) => {
        const days = differenceInDays(now, new Date(i.due_date));
        const balance = i.amount - i.paid_amount;
        if (days <= 30) { brackets[0].amount += balance; brackets[0].count++; }
        else if (days <= 60) { brackets[1].amount += balance; brackets[1].count++; }
        else if (days <= 90) { brackets[2].amount += balance; brackets[2].count++; }
        else { brackets[3].amount += balance; brackets[3].count++; }
      });
    return brackets;
  }, [filteredInvoices]);

  const getCustomerArea = (customerId: string) => customers.find((c) => c.id === customerId)?.area || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your collections and outstanding</p>
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areaNames.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Outstanding" value={totalOutstanding} icon={IndianRupee} variant="default" />
        <StatCard title="Today's Collection" value={todayCollection} icon={TrendingUp} variant="success" />
        <StatCard title="Overdue Amount" value={overdueAmount} icon={AlertTriangle} variant="destructive" />
        <StatCard title="Active Customers" value={customerCount} icon={Users} isCurrency={false} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl bg-card p-5 stat-card-shadow">
          <h2 className="text-base font-semibold mb-4">Overdue Ageing</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageingData}>
              <XAxis dataKey="bracket" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {ageingData.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-card p-5 stat-card-shadow">
          <h2 className="text-base font-semibold mb-4">Recent Invoices</h2>
          <div className="space-y-3">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{inv.customer_name}</p>
                  <p className="text-xs text-muted-foreground">Due {inv.due_date} · {getCustomerArea(inv.customer_id)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(inv.amount)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card p-5 stat-card-shadow">
        <h2 className="text-base font-semibold mb-4">Recent Collections</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">Customer</th>
                <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                <th className="pb-2 font-medium text-muted-foreground hidden sm:table-cell">Mode</th>
                <th className="pb-2 font-medium text-muted-foreground hidden md:table-cell">Collected By</th>
                <th className="pb-2 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium">{p.customer_name}</td>
                  <td className="py-2.5 font-semibold">{formatCurrency(p.amount)}</td>
                  <td className="py-2.5 hidden sm:table-cell capitalize">{p.mode.replace("_", " ")}</td>
                  <td className="py-2.5 hidden md:table-cell text-muted-foreground">{p.collected_by}</td>
                  <td className="py-2.5 text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentPayments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No collections yet</p>}
        </div>
      </div>
    </div>
  );
}
