import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, Contact } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAreas, useAddCustomer, useProfiles } from "@/hooks/use-data";

function supportsContacts() {
  const hasAndroid = typeof window !== "undefined" && !!(window as any).Android?.pickContact;
  const hasWebPicker = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
  return hasAndroid || hasWebPicker;
}

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

interface AddCustomerDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddCustomerDialog({ open: controlledOpen, onOpenChange }: AddCustomerDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [optionalOpen, setOptionalOpen] = useState(false);
  const { data: areas = [] } = useAreas();
  const { data: profiles = [] } = useProfiles();
  const addCustomer = useAddCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", area: "", gstin: "", credit_limit: 0, default_due_days: undefined, assigned_to: undefined },
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
      assigned_to: values.assigned_to,
    }, {
      onSuccess: () => {
        toast({ title: "Customer added", description: `${values.name} has been added successfully.` });
        form.reset();
        setOptionalOpen(false);
        setOpen(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement | HTMLButtonElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const pickFromContacts = async () => {
    try {
      const android = (window as any).Android;

      // Path 1: Android WebView bridge
      if (android?.pickContact) {
        const result = android.pickContact();
        if (result) {
          const contact = typeof result === "string" ? JSON.parse(result) : result;
          if (contact.name) form.setValue("name", contact.name);
          if (contact.phone) form.setValue("phone", contact.phone.replace(/[\s\-()]/g, ""));
          if (contact.address) {
            form.setValue("address", contact.address);
            setOptionalOpen(true);
          }
          toast({ title: "Contact imported", description: `${contact.name || "Contact"} details filled in.` });
          return;
        }
      }

      // Path 2: Web Contact Picker API (Chrome on Android)
      const nav = navigator as any;
      if (nav.contacts?.select) {
        const contacts = await nav.contacts.select(["name", "tel", "address"], { multiple: false });
        if (contacts?.length > 0) {
          const c = contacts[0];
          if (c.name?.[0]) form.setValue("name", c.name[0]);
          if (c.tel?.[0]) form.setValue("phone", c.tel[0].replace(/[\s\-()]/g, ""));
          if (c.address?.[0]) {
            const addr = c.address[0];
            const parts = [addr.streetAddress, addr.locality, addr.region, addr.postalCode].filter(Boolean);
            if (parts.length > 0) {
              form.setValue("address", parts.join(", "));
              setOptionalOpen(true);
            }
          }
          toast({ title: "Contact imported", description: `${c.name?.[0] || "Contact"} details filled in.` });
          return;
        }
      }

      toast({ title: "Not supported", description: "Contact picker is not available in this browser.", variant: "destructive" });
    } catch (err: any) {
      console.error("Contact picker error:", err);
      toast({ title: "Could not access contacts", description: err?.message || "Please allow contact access and try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[100dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Add New Customer</DialogTitle>
            {(supportsContactPicker || supportsAndroidBridge) && (
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={pickFromContacts}>
                <Contact className="h-3.5 w-3.5" /> From Contacts
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-5 pb-5" style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Essential fields */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Amit Patel" {...field} onFocus={scrollInputIntoView} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input type="tel" inputMode="tel" placeholder="+91 98765 43210" {...field} onFocus={scrollInputIntoView} /></FormControl>
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

              {/* Collapsible optional fields */}
              <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between px-1 py-2 h-auto text-sm text-muted-foreground hover:text-foreground">
                    Additional Details (Optional)
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${optionalOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-1">
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="15 MG Road, Pune" {...field} onFocus={scrollInputIntoView} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gstin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN</FormLabel>
                      <FormControl><Input placeholder="27AABCP1234A1Z5" maxLength={15} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} onFocus={scrollInputIntoView} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="credit_limit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit (₹)</FormLabel>
                      <FormControl><Input type="number" inputMode="numeric" placeholder="500000" {...field} onFocus={scrollInputIntoView} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_due_days" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Due Days</FormLabel>
                      <FormControl><Input type="number" inputMode="numeric" placeholder="e.g. 30" min={0} max={365} {...field} value={field.value ?? ""} onFocus={scrollInputIntoView} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CollapsibleContent>
              </Collapsible>

              {/* Submit area with safe bottom padding */}
              <div className="flex justify-end gap-2 pt-3 pb-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="gradient-primary text-primary-foreground" disabled={addCustomer.isPending}>
                  {addCustomer.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
