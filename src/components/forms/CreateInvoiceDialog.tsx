import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { mockCustomers, mockCompany } from "@/lib/mock-data";
import { resolveDueDate, DueDateSource } from "@/lib/due-date-resolver";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const invoiceSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  invoice_number: z.string().trim().min(1, "Invoice number is required").max(50, "Invoice number is too long"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0").max(100000000, "Amount is too high"),
  due_date: z.string().optional(),
  description: z.string().trim().max(500, "Description is too long").optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const sourceLabels: Record<DueDateSource, string> = {
  invoice: "Set on invoice",
  customer: "From customer default",
  company: "From company default",
};

const sourceBadgeStyles: Record<DueDateSource, string> = {
  invoice: "bg-primary/10 text-primary",
  customer: "bg-accent text-accent-foreground",
  company: "bg-muted text-muted-foreground",
};

export default function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { customer_id: "", invoice_number: "", invoice_date: "", amount: 0, due_date: "", description: "" },
  });

  const selectedCustomerId = form.watch("customer_id");
  const invoiceDate = form.watch("invoice_date");
  const manualDueDate = form.watch("due_date");

  const customer = mockCustomers.find((c) => c.id === selectedCustomerId);

  // Resolve due date using priority system
  const resolved = invoiceDate
    ? resolveDueDate(
        { due_date: manualDueDate || "", invoice_date: invoiceDate },
        { default_due_days: customer?.default_due_days },
        mockCompany
      )
    : null;

  function onSubmit(values: InvoiceFormValues) {
    const cust = mockCustomers.find((c) => c.id === values.customer_id);
    const finalDueDate = resolved?.due_date || values.due_date || "";
    console.log("New invoice:", { ...values, due_date: finalDueDate, due_date_source: resolved?.source, customer_name: cust?.name });
    toast({ title: "Invoice created", description: `Invoice for ${cust?.name} has been created.` });
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mockCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.default_due_days ? ` (${c.default_due_days}d terms)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="invoice_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Number</FormLabel>
                <FormControl><Input placeholder="INV-2025-007" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="invoice_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl><Input type="number" placeholder="75000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Due Date with resolution indicator */}
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Due Date (optional override)</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] text-xs">
                        <p className="font-semibold mb-1">Due Date Priority:</p>
                        <p>1. Invoice level (this field)</p>
                        <p>2. Customer default ({customer?.default_due_days ? `${customer.default_due_days} days` : "not set"})</p>
                        <p>3. Company default ({mockCompany.default_due_days} days)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl><Input type="date" {...field} /></FormControl>
                {resolved && invoiceDate && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sourceBadgeStyles[resolved.source]}`}>
                      {sourceLabels[resolved.source]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      → {resolved.due_date}
                    </span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl><Textarea placeholder="Invoice details..." className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Create Invoice</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
