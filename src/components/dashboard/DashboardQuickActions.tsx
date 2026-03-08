import { useState, useMemo } from "react";
import { UserPlus, Receipt, IndianRupee } from "lucide-react";
import AddCustomerDialog from "@/components/forms/AddCustomerDialog";
import CreateInvoiceDialog from "@/components/forms/CreateInvoiceDialog";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";
import { usePermissions } from "@/hooks/usePermissions";

type ActionKey = "customer" | "invoice" | "payment";

const allActions: { key: ActionKey; label: string; icon: typeof UserPlus; color: string; iconBg: string }[] = [
  { key: "customer", label: "Add Customer", icon: UserPlus, color: "text-blue-600", iconBg: "bg-blue-100" },
  { key: "invoice", label: "Create Invoice", icon: Receipt, color: "text-indigo-600", iconBg: "bg-indigo-100" },
  { key: "payment", label: "Record Payment", icon: IndianRupee, color: "text-emerald-600", iconBg: "bg-emerald-100" },
];

export default function DashboardQuickActions() {
  const [openDialog, setOpenDialog] = useState<ActionKey | null>(null);
  const { canManageCustomers, canCreateInvoices, canRecordPayments } = usePermissions();

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
            onClick={() => setOpenDialog(a.key)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-card shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md cursor-pointer min-w-0 border border-border/50"
          >
            <div className={`w-10 h-10 rounded-full ${a.iconBg} flex items-center justify-center`}>
              <a.icon className={`h-5 w-5 ${a.color}`} strokeWidth={1.8} />
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
