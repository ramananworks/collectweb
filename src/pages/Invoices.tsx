import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { mockInvoices, formatCurrency } from "@/lib/mock-data";
import { InvoiceStatus } from "@/types";
import CreateInvoiceDialog from "@/components/forms/CreateInvoiceDialog";

const statusFilters: (InvoiceStatus | "all")[] = ["all", "pending", "partial", "paid", "overdue"];

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const filtered = mockInvoices.filter((inv) => {
    const matchesSearch = inv.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices & Loans</h1>
          <p className="text-sm text-muted-foreground">{mockInvoices.length} total records</p>
        </div>
        <CreateInvoiceDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-card stat-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Balance</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{inv.customer_name}</td>
                  <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-success">{formatCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-3 hidden md:table-cell font-semibold">{formatCurrency(inv.amount - inv.paid_amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No invoices found</div>
        )}
      </div>
    </div>
  );
}
