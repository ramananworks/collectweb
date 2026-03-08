import { useState } from "react";
import { format } from "date-fns";
import { Search, ChevronDown, ChevronRight, CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { PaymentModeBadge } from "@/components/shared/StatusBadges";
import { usePayments, useCustomers, formatCurrency } from "@/hooks/use-data";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/shared/PullToRefreshIndicator";

export default function Collections() {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const { data: payments = [] } = usePayments();
  const { data: customers = [] } = useCustomers();

  const ptr = usePullToRefresh({ queryKeys: [["payments"], ["customers"]] });

  const filteredPayments = payments.filter((p) => {
    if (modeFilter !== "all" && p.mode !== modeFilter) return false;
    if (dateFrom && p.date < format(dateFrom, "yyyy-MM-dd")) return false;
    if (dateTo && p.date > format(dateTo, "yyyy-MM-dd")) return false;
    return true;
  });

  const customerCollections = customers
    .map((customer) => {
      const collections = filteredPayments.filter((p) => p.customer_name === customer.name);
      const totalCollected = collections.reduce((sum, p) => sum + p.amount, 0);
      return { ...customer, collections, totalCollected };
    })
    .filter((c) => c.collections.length > 0)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const totalCollections = filteredPayments.length;
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  function toggleCustomer(customerId: string) {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }

  return (
    <div
      ref={ptr.containerRef}
      onTouchStart={ptr.handleTouchStart}
      onTouchMove={ptr.handleTouchMove}
      onTouchEnd={ptr.handleTouchEnd}
      className="space-y-6 relative"
    >
      <PullToRefreshIndicator
        pulling={ptr.pulling}
        refreshing={ptr.refreshing}
        pullDistance={ptr.pullDistance}
        threshold={ptr.threshold}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {totalCollections} collections · {formatCurrency(totalAmount)} total
          </p>
        </div>
        <RecordPaymentDialog />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={(d) => dateFrom ? d < dateFrom : false} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {customerCollections.map((customer) => {
          const isExpanded = expandedCustomers.has(customer.id);
          return (
            <div key={customer.id} className="rounded-xl bg-card stat-card-shadow overflow-hidden">
              <button
                onClick={() => toggleCustomer(customer.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.collections.length} collection{customer.collections.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-success">{formatCurrency(customer.totalCollected)}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                          <th className="px-4 py-2.5 font-medium text-muted-foreground">Mode</th>
                          <th className="px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Collected By</th>
                          <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.collections.map((p) => (
                          <tr key={p.id} className="border-t border-border last:border-0">
                            <td className="px-4 py-2.5 font-semibold text-success">{formatCurrency(p.amount)}</td>
                            <td className="px-4 py-2.5"><PaymentModeBadge mode={p.mode} /></td>
                            <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{p.collected_by}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{p.date}</td>
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

        {customerCollections.length === 0 && (
          <div className="rounded-xl bg-card p-8 text-center text-muted-foreground stat-card-shadow">
            No collections found
          </div>
        )}
      </div>
    </div>
  );
}
