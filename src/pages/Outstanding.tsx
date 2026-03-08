import { useState, useMemo } from "react";
import { Search, IndianRupee, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers, useInvoices, useAreas, formatCurrency } from "@/hooks/use-data";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/shared/PullToRefreshIndicator";
import { StatusBadge } from "@/components/shared/StatusBadges";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import { usePermissions } from "@/hooks/usePermissions";

export default function Outstanding() {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const { data: areas = [] } = useAreas();

  const ptr = usePullToRefresh({
    queryKeys: [["customers"], ["invoices"], ["areas"]],
  });

  const outstandingData = useMemo(() => {
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status !== "paid" && inv.amount - inv.paid_amount > 0
    );

    const customerMap = new Map(
      customers.map((c) => [c.id, c])
    );

    const grouped: Record<
      string,
      {
        customer: (typeof customers)[0];
        invoices: typeof unpaidInvoices;
        total: number;
      }
    > = {};

    for (const inv of unpaidInvoices) {
      const cust = customerMap.get(inv.customer_id);
      if (!cust) continue;

      if (!grouped[cust.id]) {
        grouped[cust.id] = { customer: cust, invoices: [], total: 0 };
      }
      const balance = Number(inv.amount) - Number(inv.paid_amount);
      grouped[cust.id].invoices.push(inv);
      grouped[cust.id].total += balance;
    }

    let result = Object.values(grouped);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.customer.name.toLowerCase().includes(q)
      );
    }

    if (areaFilter !== "all") {
      result = result.filter((r) => r.customer.area === areaFilter);
    }

    result.sort((a, b) => b.total - a.total);
    return result;
  }, [customers, invoices, search, areaFilter]);

  const grandTotal = outstandingData.reduce((s, r) => s + r.total, 0);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      ref={ptr.containerRef}
      onTouchStart={ptr.handleTouchStart}
      onTouchMove={ptr.handleTouchMove}
      onTouchEnd={ptr.handleTouchEnd}
      className="space-y-4"
    >
      <PullToRefreshIndicator
        pulling={ptr.pulling}
        refreshing={ptr.refreshing}
        pullDistance={ptr.pullDistance}
        threshold={ptr.threshold}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Outstanding</h1>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-destructive">{formatCurrency(grandTotal)}</span>
            {" · "}
            {outstandingData.length} customers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {outstandingData.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No outstanding amounts found</p>
        )}

        {outstandingData.map(({ customer, invoices: custInvoices, total }) => {
          const isOpen = expanded.has(customer.id);
          return (
            <div key={customer.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Customer row */}
              <button
                onClick={() => toggleExpand(customer.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.area || "No area"} · {custInvoices.length} invoices</p>
                </div>
                <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                  {formatCurrency(total)}
                </span>
              </button>

              {/* Invoice breakdown */}
              {isOpen && (
                <div className="border-t bg-muted/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left px-4 py-2 font-medium">Invoice</th>
                          <th className="text-left px-2 py-2 font-medium">Date</th>
                          <th className="text-right px-2 py-2 font-medium">Amount</th>
                          <th className="text-right px-2 py-2 font-medium">Paid</th>
                          <th className="text-right px-2 py-2 font-medium">Balance</th>
                          <th className="text-center px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custInvoices.map((inv) => (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="px-4 py-2 font-medium">{inv.invoice_number}</td>
                            <td className="px-2 py-2 text-muted-foreground">{inv.invoice_date}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(Number(inv.amount))}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(Number(inv.paid_amount))}</td>
                            <td className="px-2 py-2 text-right font-medium text-destructive">
                              {formatCurrency(Number(inv.amount) - Number(inv.paid_amount))}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <StatusBadge status={inv.status as any} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
