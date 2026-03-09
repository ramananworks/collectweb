import { useState, useMemo, useEffect, useCallback } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { formatCurrency, useCompany } from "@/hooks/use-data";
import { downloadPDF } from "@/lib/share-utils";
import { formatDisplayDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

type DrillDownType = "outstanding" | "todayCollection" | "overdue" | null;

interface InvoiceRow {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  area?: string;
}

interface PaymentRow {
  id: string;
  customer_name: string;
  amount: number;
  date: string;
  mode: string;
  collected_by: string;
  area?: string;
}

interface DrillDownSheetProps {
  type: DrillDownType;
  onClose: () => void;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
}

const titles: Record<string, string> = {
  outstanding: "Total Outstanding — Details",
  todayCollection: "Today's Collection — Details",
  overdue: "Overdue Amount — Details",
};

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  items.forEach((item) => {
    const k = key(item) || "Unknown";
    (map[k] ??= []).push(item);
  });
  return map;
}

export default function DrillDownSheet({ type, onClose, invoices, payments }: DrillDownSheetProps) {
  const isPayments = type === "todayCollection";
  const isMobile = useIsMobile();
  const { data: company } = useCompany();

  const groupedInvoices = useMemo(() => groupBy(invoices, (i) => i.area || "Unknown"), [invoices]);
  const groupedPayments = useMemo(() => groupBy(payments, (p) => p.area || "Unknown"), [payments]);

  const invoiceAreaKeys = useMemo(() => Object.keys(groupedInvoices).sort(), [groupedInvoices]);
  const paymentAreaKeys = useMemo(() => Object.keys(groupedPayments).sort(), [groupedPayments]);

  const totalOutstanding = useMemo(() => invoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0), [invoices]);
  const totalOverdue = useMemo(() => invoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount - i.paid_amount), 0), [invoices]);
  const pendingCount = useMemo(() => invoices.filter((i) => i.status !== "paid").length, [invoices]);

  const hasData = isPayments ? payments.length > 0 : invoices.length > 0;

  const generatePDFBlob = useCallback((): Blob | null => {
    if (!type || !hasData) return null;
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

    const title = titles[type] || "Details";
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(title, pw / 2, y, { align: "center" }); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    doc.text(`Generated on ${formatDisplayDate(new Date())}`, pw / 2, y, { align: "center" }); y += 8;
    doc.setDrawColor(200, 200, 200); doc.line(15, y, pw - 15, y); y += 8;
    doc.setTextColor(30, 30, 30);

    // --- Area-wise summary table helper ---
    const drawAreaTable = (areas: string[], getCount: (area: string) => number, getTotal: (area: string) => number, grandTotal: number) => {
      checkPage(14 + areas.length * 6);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Area-wise Summary", 18, y); y += 6;

      // Table header
      doc.setFillColor(235, 235, 235);
      doc.rect(15, y - 4, pw - 30, 7, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
      doc.text("Area", 18, y);
      doc.text("Count", 105, y, { align: "right" });
      doc.text("Amount", pw - 18, y, { align: "right" }); y += 6;

      // Table rows
      doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      areas.forEach((area) => {
        checkPage(6);
        doc.setFontSize(8);
        doc.text(area, 18, y);
        doc.text(String(getCount(area)), 105, y, { align: "right" });
        doc.text(formatCurrency(getTotal(area)), pw - 18, y, { align: "right" }); y += 5;
      });

      // Table footer
      checkPage(8);
      doc.setDrawColor(80, 80, 80); doc.line(15, y, pw - 15, y); y += 5;
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Total", 18, y);
      doc.text(formatCurrency(grandTotal), pw - 18, y, { align: "right" }); y += 10;

      doc.setDrawColor(200, 200, 200); doc.line(15, y - 4, pw - 15, y - 4); y += 2;
    };

    if (isPayments) {
      const total = payments.reduce((a, p) => a + p.amount, 0);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Total Collected:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(total), 70, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.text("Payments:", 20, y); doc.setFont("helvetica", "bold"); doc.text(String(payments.length), 70, y); y += 10;

      // Area-wise summary table
      drawAreaTable(
        paymentAreaKeys,
        (area) => groupedPayments[area].length,
        (area) => groupedPayments[area].reduce((a, p) => a + p.amount, 0),
        total
      );

      // Detailed breakdown
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Detailed Breakdown", 18, y); y += 7;

      paymentAreaKeys.forEach((area) => {
        const items = groupedPayments[area];
        const subtotal = items.reduce((a, p) => a + p.amount, 0);
        checkPage(12);
        doc.setFillColor(245, 245, 245); doc.rect(15, y - 4, pw - 30, 7, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
        doc.text(`${area} (${items.length})`, 18, y);
        doc.text(formatCurrency(subtotal), pw - 18, y, { align: "right" }); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
        items.forEach((p) => {
          checkPage(6);
          doc.text(p.customer_name, 20, y);
          doc.text(p.mode.replace("_", " "), 90, y);
          doc.text(formatCurrency(p.amount), pw - 18, y, { align: "right" }); y += 5;
        });
        y += 3;
      });
    } else {
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Total Outstanding:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalOutstanding), 70, y); y += 6;
      if (totalOverdue > 0) {
        doc.setFont("helvetica", "normal"); doc.text("Overdue Amount:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalOverdue), 70, y); y += 6;
      }
      doc.setFont("helvetica", "normal"); doc.text("Pending Invoices:", 20, y); doc.setFont("helvetica", "bold"); doc.text(String(pendingCount), 70, y); y += 10;

      // Area-wise summary table
      drawAreaTable(
        invoiceAreaKeys,
        (area) => groupedInvoices[area].length,
        (area) => groupedInvoices[area].reduce((a, i) => a + (i.amount - i.paid_amount), 0),
        totalOutstanding
      );

      // Detailed breakdown
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Detailed Breakdown", 18, y); y += 7;

      invoiceAreaKeys.forEach((area) => {
        const items = groupedInvoices[area];
        const subtotal = items.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
        checkPage(12);
        doc.setFillColor(245, 245, 245); doc.rect(15, y - 4, pw - 30, 7, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
        doc.text(`${area} (${items.length})`, 18, y);
        doc.text(formatCurrency(subtotal), pw - 18, y, { align: "right" }); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
        items.forEach((inv) => {
          checkPage(6);
          doc.text(`${inv.customer_name} #${inv.invoice_number}`, 20, y);
          doc.text(`Bal: ${formatCurrency(inv.amount - inv.paid_amount)}`, pw - 18, y, { align: "right" }); y += 5;
        });
        y += 3;
      });
    }

    const footerY = ph - 10;
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text(`Generated by ${company?.name || "CollectWeb"}`, pw / 2, footerY, { align: "center" });

    return doc.output("blob");
  }, [type, hasData, isPayments, invoices, payments, company, totalOutstanding, totalOverdue, pendingCount, invoiceAreaKeys, paymentAreaKeys, groupedInvoices, groupedPayments]);

  const handlePDF = useCallback(async () => {
    const blob = generatePDFBlob();
    if (!blob || !type) return;
    const label = type === "todayCollection" ? "Collection" : type === "overdue" ? "Overdue" : "Outstanding";
    const filename = `${label}_Summary_${new Date().toISOString().split("T")[0]}.pdf`;

    const isWebView = !!(window as any).Android || /wv|WebView/i.test(navigator.userAgent);
    if (isWebView) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = base64;
        document.body.appendChild(iframe);
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.location.href = base64;
        }, 1000);
      };
      reader.readAsDataURL(blob);
      return;
    }

    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: titles[type] });
        return;
      }
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }

    downloadPDF(blob, filename);
  }, [generatePDFBlob, type]);

  if (!type) return null;

  return (
    <Sheet open={!!type} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pr-8">
          <SheetTitle className="text-lg">{titles[type]}</SheetTitle>
          {hasData && (
            isMobile ? (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePDF}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePDF}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            )
          )}
        </SheetHeader>

        {isPayments ? (
          <div className="mt-4">
            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No collections today</p>
            )}
            {payments.length > 0 && (
              <Accordion type="multiple" defaultValue={paymentAreaKeys} className="space-y-2">
                {paymentAreaKeys.map((area) => {
                  const items = groupedPayments[area];
                  const subtotal = items.reduce((a, p) => a + p.amount, 0);
                  return (
                    <AccordionItem key={area} value={area} className="border rounded-lg px-3">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="text-sm font-semibold">{area} <span className="text-muted-foreground font-normal">({items.length})</span></span>
                          <span className="text-sm font-semibold text-success">{formatCurrency(subtotal)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 space-y-2">
                        {items.map((p) => (
                          <div key={p.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{p.customer_name}</span>
                              <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="capitalize">{p.mode.replace("_", " ")}</span>
                              <span>{p.collected_by}</span>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
            <div className="pt-3 mt-3 border-t border-border flex justify-between text-sm font-semibold">
              <span>Grand Total ({payments.length})</span>
              <span>{formatCurrency(payments.reduce((a, p) => a + p.amount, 0))}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {invoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No invoices found</p>
            )}
            {invoices.length > 0 && (
              <Accordion type="multiple" defaultValue={invoiceAreaKeys} className="space-y-2">
                {invoiceAreaKeys.map((area) => {
                  const items = groupedInvoices[area];
                  const subtotal = items.reduce((a, i) => a + (i.amount - i.paid_amount), 0);
                  return (
                    <AccordionItem key={area} value={area} className="border rounded-lg px-3">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="text-sm font-semibold">{area} <span className="text-muted-foreground font-normal">({items.length})</span></span>
                          <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 space-y-2">
                        {items.map((inv) => (
                          <div key={inv.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{inv.customer_name}</span>
                              <StatusBadge status={inv.status} />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>#{inv.invoice_number}</span>
                              <span>Due {inv.due_date}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Paid {formatCurrency(inv.paid_amount)} / {formatCurrency(inv.amount)}
                              </span>
                              <span className="font-semibold text-foreground">
                                Bal: {formatCurrency(inv.amount - inv.paid_amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
            <div className="pt-3 mt-3 border-t border-border flex justify-between text-sm font-semibold">
              <span>Grand Total ({invoices.length})</span>
              <span>{formatCurrency(invoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0))}</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
