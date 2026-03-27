import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Contact, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAreas, useAddCustomer, useAddArea } from "@/hooks/use-data";
import { hapticLight, hapticSuccess, hapticHeavy } from "@/lib/haptics";

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
  
  default_due_days: z.coerce.number().min(0).max(365).optional(),
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
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const { data: areas = [] } = useAreas();
  const addCustomer = useAddCustomer();
  const addArea = useAddArea();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", area: "", gstin: "", default_due_days: undefined },
  });

  function onSubmit(values: CustomerFormValues) {
    addCustomer.mutate({
      name: values.name,
      phone: values.phone,
      address: values.address,
      area: values.area,
      gstin: values.gstin,
      default_due_days: values.default_due_days,
    }, {
      onSuccess: () => {
        hapticSuccess();
        toast({ title: "Customer added", description: `${values.name} has been added successfully.` });
        form.reset();
        setOpen(false);
        setOpen(false);
      },
      onError: (err) => {
        hapticHeavy();
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement | HTMLButtonElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleSaveNewArea = (onChange: (val: string) => void) => {
    const trimmed = newAreaName.trim();
    if (!trimmed) return;
    const duplicate = areas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      toast({ title: "Area exists", description: `"${trimmed}" already exists. Select it from the list.`, variant: "destructive" });
      setIsCreatingArea(false);
      setNewAreaName("");
      onChange(trimmed);
      return;
    }
    addArea.mutate(trimmed, {
      onSuccess: () => {
        onChange(trimmed);
        setIsCreatingArea(false);
        setNewAreaName("");
        toast({ title: "Area created", description: `"${trimmed}" has been added.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const pickFromContacts = async () => {
    // Path 1: Try Android WebView bridge first
    try {
      const android = (window as any).Android;
      if (android && typeof android.pickContact === "function") {
        const result = android.pickContact();
        if (result) {
          const contact = typeof result === "string" ? JSON.parse(result) : result;
          if (contact.name) form.setValue("name", contact.name);
          if (contact.phone) form.setValue("phone", contact.phone.replace(/[\s\-()]/g, ""));
          if (contact.address) {
            form.setValue("address", contact.address);
          }
          hapticLight();
          toast({ title: "Contact imported", description: `${contact.name || "Contact"} details filled in.` });
          return;
        }
      }
    } catch (e) {
      console.warn("Android bridge pickContact failed, trying Web API:", e);
    }

    // Path 2: Web Contact Picker API (Chrome on Android)
    try {
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
            }
          }
          hapticLight();
          toast({ title: "Contact imported", description: `${c.name?.[0] || "Contact"} details filled in.` });
          return;
        }
      }
    } catch (e) {
      console.warn("Web Contact Picker failed:", e);
    }

    toast({ title: "Not supported", description: "Contact picker is not available on this device.", variant: "destructive" });
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
          <DialogTitle>Add New Customer</DialogTitle>
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
                  {isCreatingArea ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New area name"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveNewArea(field.onChange);
                          }
                        }}
                        autoFocus
                        onFocus={scrollInputIntoView}
                      />
                      <Button type="button" size="icon" variant="ghost" className="shrink-0" disabled={addArea.isPending} onClick={() => handleSaveNewArea(field.onChange)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => { setIsCreatingArea(false); setNewAreaName(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={(val) => {
                      if (val === "__create_new__") {
                        setIsCreatingArea(true);
                        setNewAreaName("");
                      } else {
                        field.onChange(val);
                      }
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areas.map((a) => (
                          <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-primary font-medium">
                          <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Create New Area</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

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
              <FormField control={form.control} name="default_due_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Due Days</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" placeholder="e.g. 30" min={0} max={365} {...field} value={field.value ?? ""} onFocus={scrollInputIntoView} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Submit area with safe bottom padding */}
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 pt-3 pb-6">
                {supportsContacts() ? (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs justify-self-start" onClick={pickFromContacts}>
                    <Contact className="h-3.5 w-3.5" /> From Contacts
                  </Button>
                ) : <span />}
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="gradient-primary text-primary-foreground px-8" disabled={addCustomer.isPending}>
                  {addCustomer.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
