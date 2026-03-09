import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, X, Download, Share2 } from "lucide-react";
import { downloadPDF } from "@/lib/share-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDisplayDate } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useInvoices, usePayments, useCompany, formatCurrency, type Customer } from "@/hooks/use-data";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";

interface CustomerLedgerSheetProps {
  customer: Customer | null;
  onClose: () => void;
}

type LedgerEntry = {
  date: string;
  particular: string;
  type: "debit" | "credit";
  debit: number;
  credit: number;
  balance: number;
};

export default function CustomerLedgerSheet({ customer, onClose }: CustomerLedgerSheetProps) {
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: company } = useCompany();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const isMobile = useIsMobile();
  const allEntries = useMemo<LedgerEntry[]>(() => {
    if (!customer) return [];

    const customerInvoices = invoices.filter((i) => i.customer_id === customer.id);
    const customerPaymentInvoiceIds = new Set(customerInvoices.map((i) => i.id));
    const customerPayments = payments.filter((p) => customerPaymentInvoiceIds.has(p.invoice_id));

    const rawEntries: { date: string; particular: string; type: "debit" | "credit"; amount: number }[] = [];

    customerInvoices.forEach((inv) => {
      rawEntries.push({
        date: inv.invoice_date,
        particular: `Invoice #${inv.invoice_number}${inv.description ? ` – ${inv.description}` : ""}`,
        type: "debit",
        amount: inv.amount,
      });
    });

    customerPayments.forEach((pay) => {
      const inv = customerInvoices.find((i) => i.id === pay.invoice_id);
      rawEntries.push({
        date: pay.date,
        particular: `Payment${inv ? ` (Inv #${inv.invoice_number})` : ""} – ${pay.mode}`,
        type: "credit",
        amount: pay.amount,
      });
    });

    rawEntries.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    return rawEntries.map((e) => {
      if (e.type === "debit") {
        runningBalance += e.amount;
      } else {
        runningBalance -= e.amount;
      }
      return {
        date: e.date,
        particular: e.particular,
        type: e.type,
        debit: e.type === "debit" ? e.amount : 0,
        credit: e.type === "credit" ? e.amount : 0,
        balance: runningBalance,
      };
    });
  }, [customer, invoices, payments]);

  const ledgerEntries = useMemo(() => {
    if (!fromDate && !toDate) return allEntries;
    return allEntries.filter((e) => {
      const d = parseISO(e.date);
      const after = fromDate ? d >= startOfDay(fromDate) : true;
      const before = toDate ? d <= endOfDay(toDate) : true;
      return after && before;
    });
  }, [allEntries, fromDate, toDate]);

  const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = totalDebit - totalCredit;

  

  const generateLedgerPDFBlob = useCallback((): Blob | null => {
    if (!customer || ledgerEntries.length === 0) return null;
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
    doc.text(`${customer.name} – Ledger`, pw / 2, y, { align: "center" }); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    doc.text(`${customer.phone} · ${customer.area || "No Area"}`, pw / 2, y, { align: "center" }); y += 5;
    doc.text(`Generated on ${formatDisplayDate(new Date())}`, pw / 2, y, { align: "center" }); y += 8;

    doc.setDrawColor(200, 200, 200); doc.line(15, y, pw - 15, y); y += 8;

    // Summary
    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Total Debit:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalDebit), 70, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.text("Total Credit:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalCredit), 70, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.text("Closing Balance:", 20, y); doc.setFont("helvetica", "bold");
    doc.text(`${formatCurrency(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}`, 70, y); y += 10;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y - 4, pw - 30, 7, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
    doc.text("Date", 18, y); doc.text("Particulars", 42, y); doc.text("Debit", 115, y, { align: "right" });
    doc.text("Credit", 140, y, { align: "right" }); doc.text("Balance", pw - 18, y, { align: "right" }); y += 6;

    // Rows
    doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
    for (const entry of ledgerEntries) {
      checkPage(7);
      doc.setFontSize(7.5);
      const dateStr = format(parseISO(entry.date), "dd-MMM-yy");
      doc.text(dateStr, 18, y);
      const partText = doc.splitTextToSize(entry.particular, 65);
      doc.text(partText[0], 42, y);
      doc.text(entry.debit > 0 ? formatCurrency(entry.debit) : "–", 115, y, { align: "right" });
      doc.text(entry.credit > 0 ? formatCurrency(entry.credit) : "–", 140, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${formatCurrency(Math.abs(entry.balance))} ${entry.balance > 0 ? "Dr" : entry.balance < 0 ? "Cr" : ""}`, pw - 18, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    // Footer row
    checkPage(10);
    y += 2;
    doc.setDrawColor(50, 50, 50); doc.line(15, y, pw - 15, y); y += 5;
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Closing Balance", 18, y);
    doc.text(formatCurrency(totalDebit), 115, y, { align: "right" });
    doc.text(formatCurrency(totalCredit), 140, y, { align: "right" });
    doc.text(`${formatCurrency(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}`, pw - 18, y, { align: "right" });

    // Page footer
    const footerY = ph - 10;
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text(`Generated by ${company?.name || "CollectWeb"}`, pw / 2, footerY, { align: "center" });

    return doc.output("blob");
  }, [customer, ledgerEntries, totalDebit, totalCredit, closingBalance, company]);

  const handleSharePDF = useCallback(async () => {
    const blob = generateLedgerPDFBlob();
    if (!blob || !customer) return;
    const filename = `${customer.name}_Ledger_${new Date().toISOString().split("T")[0]}.pdf`;

    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${customer.name} – Ledger` });
        return;
      }
    } catch (e) {
      // Share cancelled or unsupported
    }

    downloadPDF(blob, filename);
  }, [generateLedgerPDFBlob, customer]);

  

  return (
    <>
    <Sheet open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg">{customer?.name} – Ledger</SheetTitle>
          <SheetDescription className="text-xs">
            {customer?.phone} · {customer?.area || "No Area"}
          </SheetDescription>
          <div className="flex gap-4 pt-2 flex-wrap">
            <div className="text-xs">
              <span className="text-muted-foreground">Total Debit: </span>
              <span className="font-semibold text-destructive">{formatCurrency(totalDebit)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Total Credit: </span>
              <span className="font-semibold text-success">{formatCurrency(totalCredit)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Balance: </span>
              <Badge variant={closingBalance > 0 ? "destructive" : "default"} className="text-xs px-1.5 py-0">
                {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 pt-2 items-center flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", !fromDate && "text-muted-foreground")}>
                  <CalendarIcon className="h-3 w-3" />
                  {fromDate ? format(fromDate, "dd-MMM-yy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", !toDate && "text-muted-foreground")}>
                  <CalendarIcon className="h-3 w-3" />
                  {toDate ? format(t-MMM-yy") -yy") -MMM-: "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            <div className="ml-auto">
              {isMobile ? (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSharePDF}>
                  <Share2 className="h-3 w-3" /> Share
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSharePDF}>
                  <Download className="h-3 w-3" /> PDF
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {ledgerEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No transactions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[90px]">Date</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right w-[100px]">Debit</TableHead>
                  <TableHead className="text-right w-[100px]">Credit</TableHead>
                  <TableHead className="text-right w-[110px]">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.map((entry, idx) => (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="py-2.5 text-muted-foreground">
                      {format(parseISO(entry.date-MMM-yy"M-MMM-)}
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[200px] truncate">{entry.particular}</TableCell>
                    <TableCell className={`py-2.5 text-right font-medium ${entry.debit > 0 ? "text-destructive" : ""}`}>
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "–"}
                    </TableCell>
                    <TableCell className={`py-2.5 text-right font-medium ${entry.credit > 0 ? "text-success" : ""}`}>
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "–"}
                    </TableCell>
                    <TableCell className={`py-2.5 text-right font-semibold ${entry.balance > 0 ? "text-destructive" : "text-success"}`}>
                      {formatCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? "Dr" : entry.balance < 0 ? "Cr" : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="text-xs font-semibold">
                  <TableCell colSpan={2} className="py-2.5">Closing Balance</TableCell>
                  <TableCell className="py-2.5 text-right text-destructive">{formatCurrency(totalDebit)}</TableCell>
                  <TableCell className="py-2.5 text-right text-success">{formatCurrency(totalCredit)}</TableCell>
                  <TableCell className={`py-2.5 text-right ${closingBalance > 0 ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </>
  );
}
