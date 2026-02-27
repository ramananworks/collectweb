import { useMemo, useState } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useInvoices, usePayments, formatCurrency, type Customer } from "@/hooks/use-data";

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

  const ledgerEntries = useMemo<LedgerEntry[]>(() => {
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

  const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = totalDebit - totalCredit;

  return (
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
  );
}
