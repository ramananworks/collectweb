import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAreas, useAddCustomer, useProfiles } from "@/hooks/use-data";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(15, "Phone number is too long"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(200, "Address is too long"),
  area: z.string().min(1, "Select an area"),
  gstin: z.string().trim().regex(gstinRegex, "Enter a valid 15-digit GSTIN").or(z.literal("")).optional(),
  credit_limit: z.coerce.number().min(1000, "Minimum credit limit is ₹1,000").max(100000000, "Credit limit is too high"),
  default_due_days: z.coerce.number().min(0).max(365).optional(),
  assigned_to: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const { data: areas = [] } = useAreas();
  const addCustomer = useAddCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", area: "", gstin: "", credit_limit: 0, default_due_days: undefined },
  });

  function onSubmit(values: CustomerFormValues) {
    addCustomer.mutate({
      name: values.name,
      phone: values.phone,
      address: values.address,
      area: values.area,
      gstin: values.gstin,
      credit_limit: values.credit_limit,
      default_due_days: values.default_due_days,
    }, {
      onSuccess: () => {
        toast({ title: "Customer added", description: `${values.name} has been added successfully.` });
        form.reset();
        setOpen(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl><Input placeholder="e.g. Amit Patel" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input placeholder="15 MG Road, Pune" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="area" render={({ field }) => (
              <FormItem>
                <FormLabel>Area</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gstin" render={({ field }) => (
              <FormItem>
                <FormLabel>GSTIN <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Input placeholder="27AABCP1234A1Z5" maxLength={15} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="credit_limit" render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit (₹)</FormLabel>
                <FormControl><Input type="number" placeholder="500000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="default_due_days" render={({ field }) => (
              <FormItem>
                <FormLabel>Default Due Days <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Input type="number" placeholder="e.g. 30" min={0} max={365} {...field} value={field.value ?? ""} /></FormControl>
                <p className="text-xs text-muted-foreground">Overrides company default when creating invoices for this customer.</p>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={addCustomer.isPending}>
                {addCustomer.isPending ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
