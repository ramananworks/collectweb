import { useState } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { useInvoices, useCustomers, useAreas, formatCurrency } from "@/hooks/use-data";
import { formatDisplayDate } from "@/lib/utils";
import { InvoiceStatus } from "@/types";
import CreateInvoiceDialog from "@/components/forms/CreateInvoiceDialog";
import BulkImportInvoicesDialog from "@/components/forms/BulkImportInvoicesDialog";
import ScanInvoiceDialog, { ExtractedInvoiceData } from "@/components/forms/ScanInvoiceDialog";
import { DeliveryConfirmDialog } from "@/components/forms/DeliveryConfirmDialog";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/shared/PullToRefreshIndicator";
import { usePermissions } from "@/hooks/usePermissions";

const statusFilters: (InvoiceStatus | "all")[] = ["all", "pending", "delivered", "paid", "overdue"];

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [scanDefaults, setScanDefaults] = useState<ExtractedInvoiceData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deliveryInvoice, setDeliveryInvoice] = useState<{ id: string; customerName: string } | null>(null);
  const { data: invoices = [], refetch } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: areas = [] } = useAreas();
  const { canManageInvoices, canCreateInvoices, canBulkImport, canConfirmDelivery } = usePermissions();

  const ptr = usePullToRefresh({ queryKeys: [["invoices"], ["customers"], ["areas"]] });

  const handleDataExtracted = (data: ExtractedInvoiceData) => {
    setScanDefaults(data);
    setCreateOpen(true);
  };

  const areaNames = areas.map((a) => a.name);
  const getCustomerArea = (customerId: string) => customers.find((c) => c.id === customerId)?.area || "Unknown";

  const filtered = invoices.filter((inv) => {
    const matchesSearch = inv.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesArea = areaFilter === "all" || getCustomerArea(inv.customer_id) === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

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
          <h1 className="text-2xl font-bold">Invoices & Loans</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total records</p>
        </div>
        {canCreateInvoices && (
          <div className="flex flex-wrap gap-2">
            {canBulkImport && <BulkImportInvoicesDialog />}
            {canManageInvoices && <ScanInvoiceDialog onDataExtracted={handleDataExtracted} />}
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => { setScanDefaults(null); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span> Invoice
            </Button>
            <CreateInvoiceDialog
              open={createOpen}
              onOpenChange={(o) => { setCreateOpen(o); if (!o) setScanDefaults(null); }}
              defaultValues={scanDefaults ?? undefined}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <th className="px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Area</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Invoice Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Balance</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                {canConfirmDelivery && (
                  <th className="px-4 py-3 font-medium text-muted-foreground">Delivery</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-medium">{inv.customer_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{getCustomerArea(inv.customer_id)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{inv.invoice_date}</td>
                  <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-success">{formatCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-3 hidden md:table-cell font-semibold">{formatCurrency(inv.amount - inv.paid_amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  {canConfirmDelivery && (
                    <td className="px-4 py-3">
                      {inv.status !== "delivered" && (inv as any).otp_verified !== true ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeliveryInvoice({ id: inv.id, customerName: inv.customer_name });
                          }}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Confirm
                        </Button>
                      ) : (
                        <span className="text-xs text-success font-medium">✅ Delivered</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No invoices found</div>
        )}
      </div>

      {deliveryInvoice && (
        <DeliveryConfirmDialog
          open={!!deliveryInvoice}
          onOpenChange={(o) => { if (!o) setDeliveryInvoice(null); }}
          invoiceId={deliveryInvoice.id}
          customerName={deliveryInvoice.customerName}
        />
      )}
    </div>
  );
}
