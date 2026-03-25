import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInvoices, formatCurrency } from "@/hooks/use-data";
import { DeliveryConfirmDialog } from "@/components/forms/DeliveryConfirmDialog";
import { Search, Truck, Package } from "lucide-react";
import { format } from "date-fns";

interface SelectDeliveryInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SelectDeliveryInvoiceDialog({
  open,
  onOpenChange,
}: SelectDeliveryInvoiceDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; customerName: string; customerId: string } | null>(null);
  const { data: invoices = [] } = useInvoices();

  const pending = invoices.filter(
    (inv) => inv.status === "pending" && !inv.otp_verified
  );

  const filtered = pending.filter((inv) =>
    inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = (v: boolean) => {
    if (!v) {
      setSearch("");
      setSelected(null);
    }
    onOpenChange(v);
  };

  if (selected) {
    return (
      <DeliveryConfirmDialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setSelected(null);
            onOpenChange(false);
          }
        }}
        invoiceId={selected.id}
        customerName={selected.customerName}
        customerId={selected.customerId}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            Select a pending invoice to confirm delivery
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Package className="h-8 w-8" />
              <p className="text-sm">No pending invoices found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelected({ id: inv.id, customerName: inv.customer_name, customerId: inv.customer_id })}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_number} · {format(new Date(inv.invoice_date), "dd-MMM-yy")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0 ml-3">
                    {formatCurrency(inv.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
