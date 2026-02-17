import { useState } from "react";
import { IndianRupee, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { dashboardStats, ageingData, mockInvoices, mockPayments, mockCustomers, mockAreas, formatCurrency, getCustomerArea } from "@/lib/mock-data";

const barColors = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(25, 85%, 55%)", "hsl(0, 72%, 51%)"];

export default function Dashboard() {
  const [areaFilter, setAreaFilter] = useState("all");

  const filteredCustomerIds = areaFilter === "all"
    ? mockCustomers.map((c) => c.id)
    : mockCustomers.filter((c) => c.area === areaFilter).map((c) => c.id);

  const filteredInvoices = mockInvoices.filter((inv) => filteredCustomerIds.includes(inv.customer_id));
  const filteredPayments = mockPayments.filter((p) => {
    const inv = mockInvoices.find((i) => i.id === p.invoice_id);
    return inv && filteredCustomerIds.includes(inv.customer_id);
  });

  const totalOutstanding = filteredInvoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const todayCollection = filteredPayments.reduce((a, p) => a + p.amount, 0);
  const overdueAmount = filteredInvoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const customerCount = new Set(filteredInvoices.map((i) => i.customer_id)).size;

  const recentInvoices = filteredInvoices.slice(0, 4);
  const recentPayments = filteredPayments.slice(0, 4);

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
            {mockAreas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Outstanding" value={totalOutstanding} icon={IndianRupee} variant="default" />
        <StatCard title="Today's Collection" value={todayCollection} icon={TrendingUp} variant="success" />
        <StatCard title="Overdue Amount" value={overdueAmount} icon={AlertTriangle} variant="destructive" />
        <StatCard title="Active Customers" value={customerCount} icon={Users} isCurrency={false} variant="default" />
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Ageing Chart */}
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

        {/* Recent Invoices */}
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
          </div>
        </div>
      </div>

      {/* Recent Collections */}
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
        </div>
      </div>
    </div>
  );
}
