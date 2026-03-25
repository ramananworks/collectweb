import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, X, Download, Share2, Loader2 } from "lucide-react";
import { downloadPDF, sharePDFFile } from "@/lib/share-utils";
import { drawBrandedHeader, drawTableHeader, drawAmberDivider, addBrandedFooters, PDF_PRIMARY, PDF_DARK } from "@/lib/pdf-brand";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDisplayDate } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";

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

    const checkPage = (needed: number) => {
      if (y + needed > ph - 20) { doc.addPage(); y = 20; }
    };

    // Branded header
    let y = drawBrandedHeader(doc, {
      companyName: company?.name,
      title: `${customer.name} – Ledger`,
      subtitle: `${customer.phone} · ${customer.area || "No Area"}`,
      date: new Date(),
    });

    // Summary
    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Total Debit:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalDebit), 70, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.text("Total Credit:", 20, y); doc.setFont("helvetica", "bold"); doc.text(formatCurrency(totalCredit), 70, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.text("Closing Balance:", 20, y); doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_PRIMARY);
    doc.text(`${formatCurrency(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}`, 70, y); y += 10;

    // Table header
    y = drawTableHeader(doc, y, [
      { text: "Date", x: 18 },
      { text: "Particulars", x: 42 },
      { text: "Debit", x: 115, align: "right" },
      { text: "Credit", x: 140, align: "right" },
      { text: "Balance", x: pw - 18, align: "right" },
    ]);

    // Rows
    doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
    for (let idx = 0; idx < ledgerEntries.length; idx++) {
      const entry = ledgerEntries[idx];
      checkPage(7);
      if (idx % 2 === 0) {
        doc.setFillColor(243, 240, 233);
        doc.rect(15, y - 3.5, pw - 30, 5, "F");
      }
      doc.setFontSize(7.5); doc.setTextColor(50, 50, 50);
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
    y = drawAmberDivider(doc, y);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...PDF_DARK);
    doc.text("Closing Balance", 18, y);
    doc.text(formatCurrency(totalDebit), 115, y, { align: "right" });
    doc.text(formatCurrency(totalCredit), 140, y, { align: "right" });
    doc.setTextColor(...PDF_PRIMARY);
    doc.text(`${formatCurrency(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}`, pw - 18, y, { align: "right" });

    addBrandedFooters(doc, company?.name);

    return doc.output("blob");
  }, [customer, ledgerEntries, totalDebit, totalCredit, closingBalance, company]);

  const [exporting, setExporting] = useState(false);

  const handleSharePDF = useCallback(async () => {
    if (!customer) return;
    setExporting(true);
    try {
      const blob = generateLedgerPDFBlob();
      if (!blob) return;
      const filename = `${customer.name}_Ledger_${new Date().toISOString().split("T")[0]}.pdf`;

      const shared = await sharePDFFile(blob, filename, `${customer.name} – Ledger`);
      if (!shared) {
        downloadPDF(blob, filename);
      }
    } catch (e) {
      console.error("PDF share failed:", e);
      toast.error("Failed to share PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [generateLedgerPDFBlob, customer]);

  

  const headerContent = (
    <div className={cn("border-b border-border", isMobile ? "p-4 pb-3" : "p-5 pb-3")}>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-xs">
          <span className="text-muted-foreground">Debit: </span>
          <span className="font-semibold text-destructive">{formatCurrency(totalDebit)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Credit: </span>
          <span className="font-semibold text-success">{formatCurrency(totalCredit)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Bal: </span>
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
              {toDate ? format(toDate, "dd-MMM-yy") : "To"}
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
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSharePDF} disabled={exporting}>
            {exporting ? <><Loader2 className="h-3 w-3 animate-spin" /> Sharing…</> : isMobile ? <><Share2 className="h-3 w-3" /> Share</> : <><Download className="h-3 w-3" /> PDF</>}
          </Button>
        </div>
      </div>
    </div>
  );

  const bodyContent = (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {ledgerEntries.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No transactions found</div>
      ) : isMobile ? (
        <div className="divide-y divide-border">
          {ledgerEntries.map((entry, idx) => (
            <div key={idx} className="py-3 px-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{format(parseISO(entry.date), "dd-MMM-yy")}</span>
                <span className={cn("text-xs font-semibold", entry.balance > 0 ? "text-destructive" : "text-success")}>
                  {formatCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? "Dr" : entry.balance < 0 ? "Cr" : ""}
                </span>
              </div>
              <p className="text-xs truncate text-foreground">{entry.particular}</p>
              <div className="flex items-center justify-between">
                {entry.debit > 0 ? (
                  <span className="text-[11px] font-medium text-destructive">↑ {formatCurrency(entry.debit)}</span>
                ) : <span />}
                {entry.credit > 0 ? (
                  <span className="text-[11px] font-medium text-success">↓ {formatCurrency(entry.credit)}</span>
                ) : <span />}
              </div>
            </div>
          ))}
        </div>
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
                  {format(parseISO(entry.date), "dd-MMM-yy")}
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
    </div>
  );

  const mobileFooter = isMobile && ledgerEntries.length > 0 ? (
    <div className="sticky bottom-0 border-t border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">Closing</span>
        <div className="flex gap-3">
          <span className="text-destructive">{formatCurrency(totalDebit)}</span>
          <span className="text-success">{formatCurrency(totalCredit)}</span>
          <span className={closingBalance > 0 ? "text-destructive" : "text-success"}>
            {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}
          </span>
        </div>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={!!customer} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="p-4 pb-1">
            <DrawerTitle className="text-lg">{customer?.name} – Ledger</DrawerTitle>
            <DrawerDescription className="text-xs">
              {customer?.phone} · {customer?.area || "No Area"}
            </DrawerDescription>
          </DrawerHeader>
          {headerContent}
          {bodyContent}
          {mobileFooter}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg">{customer?.name} – Ledger</SheetTitle>
          <SheetDescription className="text-xs">
            {customer?.phone} · {customer?.area || "No Area"}
          </SheetDescription>
        </SheetHeader>
        {headerContent}
        {bodyContent}
      </SheetContent>
    </Sheet>
  );
}
