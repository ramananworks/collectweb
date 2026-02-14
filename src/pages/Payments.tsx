import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PaymentModeBadge } from "@/components/shared/StatusBadges";
import { mockPayments, formatCurrency } from "@/lib/mock-data";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";

export default function Payments() {
  const [search, setSearch] = useState("");
  const filtered = mockPayments.filter((p) =>
    p.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">{mockPayments.length} payments recorded</p>
        </div>
        <RecordPaymentDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl bg-card stat-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Collected By</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.customer_name}</td>
                  <td className="px-4 py-3 font-semibold text-success">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3"><PaymentModeBadge mode={p.mode} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{p.collected_by}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
