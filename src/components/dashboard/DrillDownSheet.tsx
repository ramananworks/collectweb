import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { formatCurrency } from "@/hooks/use-data";
import { toast } from "@/hooks/use-toast";

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

  const groupedInvoices = useMemo(() => groupBy(invoices, (i) => i.area || "Unknown"), [invoices]);
  const groupedPayments = useMemo(() => groupBy(payments, (p) => p.area || "Unknown"), [payments]);

  if (!type) return null;

  const invoiceAreaKeys = Object.keys(groupedInvoices).sort();
  const paymentAreaKeys = Object.keys(groupedPayments).sort();

  return (
    <Sheet open={!!type} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{titles[type]}</SheetTitle>
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
