import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useInvoices, useCustomers, useProfiles, useRecordPayment, formatCurrency } from "@/hooks/use-data";
import { useAuth } from "@/contexts/AuthContext";
import { hapticSuccess, hapticHeavy } from "@/lib/haptics";

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
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: profiles = [] } = useProfiles();
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
    }
  }, [open, prefillCustomerId, prefillInvoiceId]);

  const selectedCustomerId = form.watch("customer_id");

  const customersWithDues = customers.filter((c) =>
    invoices.some((inv) => inv.customer_id === c.id && inv.status !== "paid")
  );

  const customerInvoices = invoices.filter(
    (inv) => inv.customer_id === selectedCustomerId && inv.status !== "paid"
  );

  function onSubmit(values: CollectionFormValues) {
    const customer = customers.find((c) => c.id === values.customer_id);
    recordPayment.mutate({
      invoice_id: values.invoice_id,
      customer_name: customer?.name || "",
      amount: values.amount ?? 0,
      date: values.date,
      mode: values.mode,
      collected_by: values.collected_by,
      notes: values.notes,
    }, {
      onSuccess: () => {
        hapticSuccess();
        toast({ title: "Collection recorded", description: `${formatCurrency(values.amount)} recorded for ${customer?.name}.` });
        form.reset();
        setOpen(false);
      },
      onError: (err) => {
        hapticHeavy();
        toast({ title: "Error", description: err.message, variant: "destructive" });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Collection</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); form.setValue("invoice_id", ""); form.setValue("amount", undefined); setAmountAutoFilled(false); }} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customersWithDues.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="invoice_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCustomerId}>
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
                      if (field.value === 0) field.onChange(undefined);
                    }}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording..." : "Record Collection"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
