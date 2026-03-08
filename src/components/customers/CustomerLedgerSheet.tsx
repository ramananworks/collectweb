import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, X, Download, Share2 } from "lucide-react";
import ShareOptionsModal from "@/components/shared/ShareOptionsModal";
import type { ShareSummaryData } from "@/lib/share-utils";
import { downloadPDF } from "@/lib/share-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [shareOpen, setShareOpen] = useState(false);

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

  const shareData: ShareSummaryData = {
    title: `${customer?.name ?? ""} – Ledger Summary`,
    companyName: company?.name,
    lines: [
      { label: "Total Debit", value: formatCurrency(totalDebit) },
      { label: "Total Credit", value: formatCurrency(totalCredit) },
      { label: "Closing Balance", value: `${formatCurrency(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}` },
      { label: "Transactions", value: String(ledgerEntries.length) },
    ],
  };

  const fmtAmount = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

  function exportCSV() {
    if (!customer || ledgerEntries.length === 0) return;
    const header = "Date,Particulars,Debit,Credit,Balance\n";
    const rows = ledgerEntries.map((e) =>
      `${format(parseISO(e.date), "dd-MM-yyyy")},"${e.particular}",${e.debit || ""},${e.credit || ""},${e.balance > 0 ? fmtAmount(e.balance) + " Dr" : e.balance < 0 ? fmtAmount(Math.abs(e.balance)) + " Cr" : "0"}`
    ).join("\n");
    const footer = `\nClosing Balance,,${fmtAmount(totalDebit)},${fmtAmount(totalCredit)},${closingBalance > 0 ? fmtAmount(closingBalance) + " Dr" : closingBalance < 0 ? fmtAmount(Math.abs(closingBalance)) + " Cr" : "0"}`;
    const blob = new Blob([header + rows + footer], { type: "text/csv" });
    downloadBlob(blob, `${customer.name}_Ledger.csv`);
  }

  function exportPDF() {
    if (!customer || ledgerEntries.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const tableRows = ledgerEntries.map((e) =>
      `<tr><td>${format(parseISO(e.date), "dd MMM yy")}</td><td>${e.particular}</td><td style="text-align:right">${e.debit > 0 ? fmtAmount(e.debit) : "–"}</td><td style="text-align:right">${e.credit > 0 ? fmtAmount(e.credit) : "–"}</td><td style="text-align:right">${fmtAmount(Math.abs(e.balance))} ${e.balance > 0 ? "Dr" : e.balance < 0 ? "Cr" : ""}</td></tr>`
    ).join("");
    const footerRow = `<tr style="font-weight:bold;border-top:2px solid #333"><td colspan="2">Closing Balance</td><td style="text-align:right">${fmtAmount(totalDebit)}</td><td style="text-align:right">${fmtAmount(totalCredit)}</td><td style="text-align:right">${fmtAmount(Math.abs(closingBalance))} ${closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}</td></tr>`;
    w.document.write(`<!DOCTYPE html><html><head><title>${customer.name} – Ledger</title><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}h2{margin:0 0 4px}p{margin:0 0 16px;color:#666}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style></head><body><h2>${customer.name} – Ledger</h2><p>${customer.phone} · ${customer.area || "No Area"}</p><table><thead><tr><th>Date</th><th>Particulars</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead><tbody>${tableRows}</tbody><tfoot>${footerRow}</tfoot></table></body></html>`);
    w.document.close();
    w.print();
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
                  {fromDate ? format(fromDate, "dd MMM yy") : "From"}
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
                  {toDate ? format(toDate, "dd MMM yy") : "To"}
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
            <div className="ml-auto flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShareOpen(true)}>
                <Share2 className="h-3 w-3" /> Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Download className="h-3 w-3" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCSV}>Download CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPDF}>Print / Save PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      {format(parseISO(entry.date), "dd MMM yy")}
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
    <ShareOptionsModal open={shareOpen} onClose={() => setShareOpen(false)} data={shareData} />
  </>
  );
}
