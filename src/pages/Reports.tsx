import { useState } from "react";
import { Download, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { mockInvoices, mockCustomers, mockAreas, formatCurrency, ageingData, getCustomerArea } from "@/lib/mock-data";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");

  // Filter invoices
  const filtered = mockInvoices.filter((inv) => {
    const matchesCustomer = customerFilter === "all" || inv.customer_id === customerFilter;
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesArea = areaFilter === "all" || getCustomerArea(inv.customer_id) === areaFilter;
    return matchesCustomer && matchesStatus && matchesArea;
  });

  const totalOutstanding = filtered.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const totalOverdue = filtered.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount - i.paid_amount), 0);
  const totalPaid = filtered.reduce((a, i) => a + i.paid_amount, 0);
  const totalAmount = filtered.reduce((a, i) => a + i.amount, 0);
  const collectionRate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  // Area-wise summary
  const areaSummary = mockAreas
    .map((area) => {
      const areaCustomerIds = mockCustomers.filter((c) => c.area === area).map((c) => c.id);
      const areaInvoices = filtered.filter((inv) => areaCustomerIds.includes(inv.customer_id));
      const outstanding = areaInvoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
      const overdue = areaInvoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount - i.paid_amount), 0);
      const customerCount = new Set(areaInvoices.map((i) => i.customer_id)).size;
      return { area, outstanding, overdue, invoiceCount: areaInvoices.length, customerCount };
    })
    .filter((a) => a.invoiceCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Filter and analyze your collection data</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-card p-4 stat-card-shadow">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Area</label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {mockAreas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer</label>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {mockCustomers
                  .filter((c) => areaFilter === "all" || c.area === areaFilter)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-5 stat-card-shadow text-center">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl bg-card p-5 stat-card-shadow text-center">
          <p className="text-sm text-muted-foreground">Total Overdue</p>
          <p className="text-xl font-bold mt-1 text-destructive">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="rounded-xl bg-card p-5 stat-card-shadow text-center">
          <p className="text-sm text-muted-foreground">Collection Rate</p>
          <p className="text-xl font-bold mt-1 text-success">{collectionRate}%</p>
        </div>
      </div>

      {/* Area-wise Summary */}
      <div className="rounded-xl bg-card stat-card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Area-wise Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Area</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customers</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Invoices</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {areaSummary.map((a) => (
                <tr key={a.area} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{a.area}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.customerCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.invoiceCount}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(a.outstanding)}</td>
                  <td className="px-4 py-3 text-destructive font-semibold">{a.overdue > 0 ? formatCurrency(a.overdue) : "—"}</td>
                </tr>
              ))}
              {areaSummary.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No data for selected filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ageing Table */}
      <div className="rounded-xl bg-card stat-card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Ageing Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Ageing Bracket</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">No. of Invoices</th>
              </tr>
            </thead>
            <tbody>
              {ageingData.map((a) => (
                <tr key={a.bracket} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{a.bracket}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(a.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
