import { useState, useRef, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PaymentModeBadge } from "@/components/shared/StatusBadges";
import { usePayments, useCustomers, formatCurrency } from "@/hooks/use-data";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import { useQueryClient } from "@tanstack/react-query";

export default function Collections() {
  const [search, setSearch] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const { data: payments = [] } = usePayments();
  const { data: customers = [] } = useCustomers();
  const queryClient = useQueryClient();

  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPulling(true);
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, queryClient]);

  const customerCollections = customers
    .map((customer) => {
      const collections = payments.filter((p) => p.customer_name === customer.name);
      const totalCollected = collections.reduce((sum, p) => sum + p.amount, 0);
      return { ...customer, collections, totalCollected };
    })
    .filter((c) => c.collections.length > 0)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const totalCollections = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

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
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="space-y-6 relative"
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pulling || refreshing ? `${pullDistance}px` : 0 }}
      >
        <RefreshCw
          className={`h-5 w-5 text-primary transition-transform ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${pullDistance * 3}deg)` }}
        />
        <span className="ml-2 text-xs text-muted-foreground">
          {refreshing ? "Refreshing..." : pullDistance >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {totalCollections} collections · {formatCurrency(totalAmount)} total
          </p>
        </div>
        <RecordPaymentDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
