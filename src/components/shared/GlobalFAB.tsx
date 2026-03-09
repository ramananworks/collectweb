import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, UserPlus, Receipt, IndianRupee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePermissions } from "@/hooks/usePermissions";
import { hapticLight } from "@/lib/haptics";
import AddCustomerDialog from "@/components/forms/AddCustomerDialog";
import CreateInvoiceDialog from "@/components/forms/CreateInvoiceDialog";
import RecordPaymentDialog from "@/components/forms/RecordPaymentDialog";

type ActionKey = "customer" | "invoice" | "payment";

const allActions: { key: ActionKey; label: string; icon: typeof UserPlus; gradientClass: string }[] = [
  { key: "payment", label: "Record Payment", icon: IndianRupee, gradientClass: "action-payment" },
  { key: "invoice", label: "Create Invoice", icon: Receipt, gradientClass: "action-invoice" },
  { key: "customer", label: "Add Customer", icon: UserPlus, gradientClass: "action-customer" },
];

export default function GlobalFAB() {
  const [expanded, setExpanded] = useState(false);
  const [openDialog, setOpenDialog] = useState<ActionKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { canManageCustomers, canCreateInvoices, canRecordPayments } = usePermissions();

  const actions = useMemo(() => allActions.filter((a) => {
    if (a.key === "customer") return canManageCustomers;
    if (a.key === "invoice") return canCreateInvoices;
    if (a.key === "payment") return canRecordPayments;
    return true;
  }), [canManageCustomers, canCreateInvoices, canRecordPayments]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [expanded]);

  if (actions.length === 0) return null;

  return (
    <>
      <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {expanded && actions.map((action, i) => (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.15, delay: i * 0.04 }}
              onClick={() => {
                hapticLight();
                setExpanded(false);
                setOpenDialog(action.key);
              }}
              className="flex items-center gap-3 rounded-full bg-card pl-4 pr-2 py-2 shadow-lg border border-border/50 active:scale-95 transition-transform"
            >
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{action.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.bgClass}`}>
                <action.icon className={`h-5 w-5 ${action.colorClass}`} strokeWidth={1.8} />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            hapticLight();
            setExpanded((prev) => !prev);
          }}
          animate={{ rotate: expanded ? 135 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </motion.button>
      </div>

      <AddCustomerDialog open={openDialog === "customer"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <CreateInvoiceDialog open={openDialog === "invoice"} onOpenChange={(v) => !v && setOpenDialog(null)} />
      <RecordPaymentDialog open={openDialog === "payment"} onOpenChange={(v) => !v && setOpenDialog(null)} />
    </>
  );
}
