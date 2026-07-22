import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerCombobox from "@/components/shared/CustomerCombobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useInvoices, useCustomers, useProfiles, useRecordPayment, useCompany, formatCurrency } from "@/hooks/use-data";
import UpiQrDialog from "@/components/shared/UpiQrDialog";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticHeavy } from "@/lib/haptics";
import { printReceipt, getAutoPrint, ensurePrinterReady } from "@/lib/bluetooth-print";
import { toast as sonnerToast } from "sonner";

const collectionSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  invoice_id: z.string().min(1, "Select an invoice"),
  amount: z.union([z.number().min(1, "Amount must be greater than 0").max(100000000, "Amount is too high"), z.undefined()]).refine((v) => v !== undefined && v >= 1, { message: "Amount must be greater than 0" }),
  date: z.string().min(1, "Collection date is required"),
  mode: z.enum(["cash", "upi", "bank_transfer"], { required_error: "Select collection mode" }),
  collected_by: z.string().min(1, "Select collector"),
  notes: z.string().trim().max(500, "Notes too long").optional(),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface RecordPaymentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefillCustomerId?: string;
  prefillInvoiceId?: string;
}

export default function RecordPaymentDialog({ open: controlledOpen, onOpenChange, prefillCustomerId, prefillInvoiceId }: RecordPaymentDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [amountAutoFilled, setAmountAutoFilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: profiles = [] } = useProfiles();
  const { data: company } = useCompany();
  const recordPayment = useRecordPayment();
  const { profile: authProfile } = useAuth();

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { customer_id: prefillCustomerId || "", invoice_id: prefillInvoiceId || "", amount: undefined, date: new Date().toISOString().split("T")[0], mode: undefined, collected_by: authProfile?.name || "", notes: "" },
  });

  useEffect(() => {
    if (open && prefillCustomerId) {
      form.setValue("customer_id", prefillCustomerId);
      form.setValue("invoice_id", prefillInvoiceId || "");
    }
    if (!open) {
      form.reset();
      setAmountAutoFilled(false);
      setIsSubmitting(false);
    }
  }, [open, prefillCustomerId, prefillInvoiceId]);

  const selectedCustomerId = form.watch("customer_id");
  const selectedMode = form.watch("mode");
  const watchedAmount = form.watch("amount");

  const customersWithDues = customers.filter((c) =>
    invoices.some((inv) => inv.customer_id === c.id && inv.status !== "paid")
  );

  const customerInvoices = invoices.filter(
    (inv) => inv.customer_id === selectedCustomerId && inv.status !== "paid" && (inv.amount - inv.paid_amount !== 0)
  );

  function onSubmit(values: CollectionFormValues) {
    if (isSubmitting) return;
    // Overpayment guard: prevent payment exceeding invoice balance
    const selectedInv = invoices.find(i => i.id === values.invoice_id);
    if (selectedInv && values.amount !== undefined) {
      const balance = Number(selectedInv.amount) - Number(selectedInv.paid_amount);
      if (values.amount > balance) {
        toast({ title: "Overpayment", description: `Amount exceeds invoice balance of ${formatCurrency(balance)}.`, variant: "destructive" });
        return;
      }
    }
    setIsSubmitting(true);
    const customer = customers.find((c) => c.id === values.customer_id);
    const transactionId = crypto.randomUUID();
    recordPayment.mutate({
      invoice_id: values.invoice_id,
      customer_name: customer?.name || "",
      amount: values.amount ?? 0,
      date: values.date,
      mode: values.mode,
      collected_by: values.collected_by,
      notes: values.notes,
      local_id: transactionId,
    }, {
      onSuccess: () => {
        hapticSuccess();

        // Compute outstanding-after for this customer using latest invoices minus this payment
        const outstandingAfter = Math.max(0,
          invoices
            .filter((i) => i.customer_id === values.customer_id)
            .reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0)
          - (values.amount ?? 0)
        );
        const receiptData = {
          companyName: company?.name || "My Company",
          companyPhone: (company as any)?.phone,
          companyAddress: (company as any)?.address,
          customerName: customer?.name || "",
          invoiceNumber: selectedInv?.invoice_number,
          invoiceDate: selectedInv?.invoice_date,
          paymentDate: values.date,
          amount: values.amount ?? 0,
          mode: values.mode,
          collectedBy: values.collected_by,
          notes: values.notes,
          outstandingAfter,
          receiptNumber: transactionId.slice(0, 8).toUpperCase(),
        };
        if (getAutoPrint()) {
          (async () => {
            const ready = await ensurePrinterReady();
            if (!ready.cancelled) printReceipt(receiptData);
          })();
        } else {
          // Single success toast — carries the Print Receipt action.
          sonnerToast.success("Collection recorded", {
            description: `${formatCurrency(values.amount ?? 0)} from ${customer?.name}`,
            action: {
              label: "Print Receipt",
              onClick: async () => {
                const ready = await ensurePrinterReady();
                if (!ready.cancelled) printReceipt(receiptData);
              },
            },
          });
        }
        form.reset();
        setIsSubmitting(false);
        setOpen(false);
      },
      onError: () => {
        // Error toast is now handled centrally by the global MutationCache
        // handler in App.tsx — only local side effects belong here.
        hapticHeavy();
        setIsSubmitting(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Record Collection
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Record Collection</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="space-y-4 py-1 pr-1">
            <FormField control={form.control} name="customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <FormControl>
                  <CustomerCombobox
                    customers={customersWithDues}
                    value={field.value}
                    onValueChange={(val) => { field.onChange(val); form.setValue("invoice_id", ""); form.setValue("amount", undefined); setAmountAutoFilled(false); }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="invoice_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); const inv = invoices.find(i => i.id === val); if (inv) { const balance = inv.amount - (inv.paid_amount || 0); form.setValue("amount", balance); setAmountAutoFilled(true); } }} value={field.value} disabled={!selectedCustomerId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCustomerId ? "Select invoice" : "Select customer first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customerInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {formatCurrency(inv.amount - inv.paid_amount)} due
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={field.value ?? ""}
                    onFocus={() => {
                      if (amountAutoFilled) { field.onChange(undefined); setAmountAutoFilled(false); }
                      else if (field.value === 0) field.onChange(undefined);
                    }}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {selectedMode === "upi" && (
              <UpiQrDialog
                amount={watchedAmount ?? 0}
                upiId={(company as any)?.upi_id || ""}
                businessName={company?.name || ""}
              />
            )}
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Collection Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mode" render={({ field }) => (
              <FormItem>
                <FormLabel>Collection Mode</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="collected_by" render={({ field }) => (
              <FormItem>
                <FormLabel>Collected By</FormLabel>
                <FormControl><Input readOnly value={field.value} className="bg-muted cursor-not-allowed" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Collection notes..." className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 flex-shrink-0 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground gap-2" disabled={isSubmitting || recordPayment.isPending}>
                {isSubmitting || recordPayment.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</> : "Record Collection"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}