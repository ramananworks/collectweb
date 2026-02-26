import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/StatusBadges";
import { formatCurrency } from "@/hooks/use-data";

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

export default function DrillDownSheet({ type, onClose, invoices, payments }: DrillDownSheetProps) {
  if (!type) return null;

  const isPayments = type === "todayCollection";

  return (
    <Sheet open={!!type} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{titles[type]}</SheetTitle>
        </SheetHeader>

        {isPayments ? (
          <div className="mt-4 space-y-2">
            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No collections today</p>
            )}
            {payments.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.customer_name}</span>
                  <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{p.mode.replace("_", " ")}</span>
                  <span>{p.collected_by}</span>
                </div>
                {p.area && (
                  <span className="inline-block text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{p.area}</span>
                )}
              </div>
            ))}
            <div className="pt-3 border-t border-border flex justify-between text-sm font-semibold">
              <span>Total ({payments.length})</span>
              <span>{formatCurrency(payments.reduce((a, p) => a + p.amount, 0))}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {invoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No invoices found</p>
            )}
            {invoices.map((inv) => (
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
                {inv.area && (
                  <span className="inline-block text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{inv.area}</span>
                )}
              </div>
            ))}
            <div className="pt-3 border-t border-border flex justify-between text-sm font-semibold">
              <span>Total ({invoices.length})</span>
              <span>{formatCurrency(invoices.reduce((a, i) => a + (i.amount - i.paid_amount), 0))}</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
