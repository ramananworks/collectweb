import { useState, useMemo } from "react";
import { UserPlus, Receipt, IndianRupee, Truck } from "lucide-react";
import AddCustomerDialog from "@/components/forms/AddCustomerDialog";
import CreateInvoiceDialog from "@/components/forms/CreateInvoiceDialog";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import SelectDeliveryInvoiceDialog from "@/components/forms/SelectDeliveryInvoiceDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { hapticLight } from "@/lib/haptics";

type ActionKey = "customer" | "invoice" | "payment" | "delivery";

const allActions: { key: ActionKey; label: string; icon: typeof UserPlus; gradientClass: string }[] = [
  { key: "customer", label: "Add Customer", icon: UserPlus, gradientClass: "action-customer" },
  { key: "invoice", label: "Create Invoice", icon: Receipt, gradientClass: "action-invoice" },
  { key: "payment", label: "Record Collection", icon: IndianRupee, gradientClass: "action-payment" },
  { key: "delivery", label: "Confirm Delivery", icon: Truck, gradientClass: "action-delivery" },
];

export default function DashboardQuickActions() {
  const [openDialog, setOpenDialog] = useState<ActionKey | null>(null);
  const { canManageCustomers, canCreateInvoices, canRecordPayments, canConfirmDelivery } = usePermissions();

  const actions = useMemo(() => allActions.filter((a) => {
    if (a.key === "customer") return canManageCustomers;
    if (a.key === "invoice") return canCreateInvoices;
    if (a.key === "payment") return canRecordPayments;
    return true;
  }), [canManageCustomers, canCreateInvoices, canRecordPayments]);

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3 overflow-x-auto">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => {
              hapticLight();
              setOpenDialog(a.key);
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-card shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md cursor-pointer min-w-0 border border-border/50"
          >
            <div className={`w-10 h-10 rounded-full ${a.gradientClass} flex items-center justify-center`}>
              <a.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-sm font-medium text-foreground text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>

      <AddCustomerDialog open={openDialog === "customer"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <CreateInvoiceDialog open={openDialog === "invoice"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <RecordPaymentDialog open={openDialog === "payment"} onOpenChange={(v) => !v && setOpenDialog(null)} />
    </div>
  );
}
