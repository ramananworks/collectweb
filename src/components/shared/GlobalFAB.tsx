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
  { key: "payment", label: "Record Collection", icon: IndianRupee, gradientClass: "action-payment" },
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
      {/* Backdrop overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {expanded && actions.map((action, i) => (
            <motion.button
              key={action.key}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.15, delay: i * 0.04 }}
              whileHover={{ scale: 1.05, boxShadow: action.key === "customer"
                ? "0 6px 28px -2px hsl(217 91% 60% / 0.5), 0 3px 12px -1px hsl(236 72% 79% / 0.3)"
                : action.key === "invoice"
                ? "0 6px 28px -2px hsl(263 70% 50% / 0.5), 0 3px 12px -1px hsl(280 100% 70% / 0.3)"
                : "0 6px 28px -2px hsl(142 71% 45% / 0.5), 0 3px 12px -1px hsl(160 84% 39% / 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                hapticLight();
                setExpanded(false);
                setOpenDialog(action.key);
              }}
              className="flex items-center gap-3 rounded-full bg-card pl-4 pr-2 py-2 shadow-lg border border-border/50 transition-shadow"
            >
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{action.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.gradientClass}`}>
                <action.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            hapticLight();
            setExpanded((prev) => !prev);
          }}
          animate={{ 
            rotate: expanded ? 135 : 0,
            scale: expanded ? 1 : [1, 1.05, 1],
            boxShadow: expanded
              ? "0 4px 20px -2px hsl(82 60% 45% / 0.4), 0 2px 8px -1px hsl(0 0% 0% / 0.15)"
              : [
                  "0 4px 20px -2px hsl(82 60% 45% / 0.4), 0 2px 8px -1px hsl(0 0% 0% / 0.15)",
                  "0 6px 32px -2px hsl(82 60% 45% / 0.7), 0 4px 16px -1px hsl(42 85% 58% / 0.35)",
                  "0 4px 20px -2px hsl(82 60% 45% / 0.4), 0 2px 8px -1px hsl(0 0% 0% / 0.15)",
                ]
          }}
          transition={{ 
            rotate: { duration: 0.2 },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground active:scale-95"
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
