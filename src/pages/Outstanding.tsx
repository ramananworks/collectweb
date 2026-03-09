import { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, Download, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers, useInvoices, useAreas, useCompany, formatCurrency } from "@/hooks/use-data";
import { formatDisplayDate } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/shared/PullToRefreshIndicator";
import { StatusBadge } from "@/components/shared/StatusBadges";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadPDF } from "@/lib/share-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";

export default function Outstanding() {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collectTarget, setCollectTarget] = useState<{ customerId: string; invoiceId: string } | null>(null);
  const { canRecordPayments } = usePermissions();
  const isMobile = useIsMobile();

  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const { data: areas = [] } = useAreas();
  const { data: company } = useCompany();

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


  const handleExportPDF = useCallback(async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > ph - 20) { doc.addPage(); y = 20; }
    };

    if (company?.name) {
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(company.name, pw / 2, y, { align: "center" }); y += 10;
    }

    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("Outstanding Summary", pw / 2, y, { align: "center" }); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    doc.text(`Generated on ${formatDisplayDate(new Date())}`, pw / 2, y, { align: "center" }); y += 5;
    if (areaFilter !== "all") {
      doc.text(`Area: ${areaFilter}`, pw / 2, y, { align: "center" }); y += 5;
    }
    y += 3;

    doc.setDrawColor(200, 200, 200); doc.line(15, y, pw - 15, y); y += 8;
    doc.setTextColor(30, 30, 30); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Total Outstanding", 20, y);
    doc.text(formatCurrency(grandTotal), pw - 20, y, { align: "right" }); y += 5;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(`${outstandingData.length} customers`, 20, y); y += 8;
    doc.setDrawColor(200, 200, 200); doc.line(15, y, pw - 15, y); y += 10;

    for (const { customer, invoices: custInv, total } of outstandingData) {
      checkPage(20 + custInv.length * 6);

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text(customer.name, 20, y);
      doc.text(formatCurrency(total), pw - 20, y, { align: "right" }); y += 5;
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
      doc.text(`${customer.area || "No area"} · ${custInv.length} invoices`, 20, y); y += 6;

      doc.setFillColor(245, 245, 245);
      doc.rect(18, y - 3, pw - 36, 6, "F");
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
      doc.text("Invoice", 20, y); doc.text("Date", 55, y); doc.text("Amount", 90, y, { align: "right" });
      doc.text("Paid", 120, y, { align: "right" }); doc.text("Balance", 155, y, { align: "right" });
      doc.text("Status", pw - 20, y, { align: "right" }); y += 5;

      doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      for (const inv of custInv) {
        checkPage(7);
        doc.setFontSize(7.5);
        doc.text(inv.invoice_number, 20, y);
        doc.text(formatDisplayDate(inv.invoice_date), 55, y);
        doc.text(formatCurrency(Number(inv.amount)), 90, y, { align: "right" });
        doc.text(formatCurrency(Number(inv.paid_amount)), 120, y, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(Number(inv.amount) - Number(inv.paid_amount)), 155, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text(inv.status, pw - 20, y, { align: "right" });
        y += 5;
      }
      y += 6;
    }

    const footerY = ph - 10;
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text(`Generated by ${company?.name || "CollectWeb"}`, pw / 2, footerY, { align: "center" });

    const blob = doc.output("blob");
    const filename = `outstanding-summary-${new Date().toISOString().split("T")[0]}.pdf`;

    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Outstanding Summary" });
        return;
      }
    } catch (e) {
      // Share cancelled or unsupported — fall through to download
    }

    downloadPDF(blob, filename);
  }, [outstandingData, grandTotal, company, areaFilter]);
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF}>
            {isMobile ? <><Share2 className="h-4 w-4" /> Share</> : <><Download className="h-4 w-4" /> PDF</>}
          </Button>
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
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => toggleExpand(customer.id)}
                  className="flex-1 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors rounded-lg -mx-2 px-2 py-0.5"
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
                {canRecordPayments && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => setCollectTarget({ customerId: customer.id, invoiceId: "" })}
                  >
                    Collect
                  </Button>
                )}
              </div>

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
                          <th className="text-right px-2 py-2 font-medium">Balance</th>
                          <th className="text-center px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custInvoices.map((inv) => (
                          <tr key={inv.id} className="border-b">
                            <td className="px-4 py-2 font-medium">{inv.invoice_number}</td>
                            <td className="px-2 py-2 text-muted-foreground">{formatDisplayDate(inv.invoice_date)}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(Number(inv.amount))}</td>
                            <td className="px-2 py-2 text-right font-medium text-destructive">
                              {formatCurrency(Number(inv.amount) - Number(inv.paid_amount))}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <StatusBadge status={inv.status as any} />
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td className="px-4 py-2 font-bold">Total</td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2 text-right font-bold text-destructive">
                            {formatCurrency(total)}
                          </td>
                          <td className="px-4 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <RecordPaymentDialog
        open={!!collectTarget}
        onOpenChange={(v) => !v && setCollectTarget(null)}
        prefillCustomerId={collectTarget?.customerId}
        prefillInvoiceId={collectTarget?.invoiceId}
      />
    </div>
  );
}
