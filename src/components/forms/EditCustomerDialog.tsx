import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Contact, Check, X, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAreas, useUpdateCustomer, useAddArea, type Customer } from "@/hooks/use-data";
import { hapticLight, hapticSuccess, hapticHeavy } from "@/lib/haptics";

function supportsContacts() {
  const hasAndroid = typeof window !== "undefined" && !!(window as any).Android?.pickContact;
  const hasWebPicker = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
  return hasAndroid || hasWebPicker;
}

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const editCustomerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(15, "Phone number is too long"),
  address: z.string().trim().max(200, "Address is too long").optional(),
  area: z.string().min(1, "Select an area"),
  gstin: z.string().trim().regex(gstinRegex, "Enter a valid 15-digit GSTIN").or(z.literal("")).optional(),
  
  default_due_days: z.coerce.number().min(0).max(365).optional().or(z.literal("").transform(() => undefined)),
});

type EditCustomerFormValues = z.infer<typeof editCustomerSchema>;

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const { data: areas = [] } = useAreas();
  const updateCustomer = useUpdateCustomer();
  const addArea = useAddArea();
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  const form = useForm<EditCustomerFormValues>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: "", phone: "", address: "", area: "", gstin: "", default_due_days: undefined,
    },
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || "",
        area: customer.area,
        gstin: customer.gstin || "",
        default_due_days: customer.default_due_days ?? undefined,
      });
    }
  }, [customer, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveNewArea = (onChange: (val: string) => void) => {
    const trimmed = newAreaName.trim();
    if (!trimmed) return;
    const duplicate = areas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      toast({ title: "Area exists", description: `"${trimmed}" already exists.`, variant: "destructive" });
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
    try {
      const android = (window as any).Android;
      if (android && typeof android.pickContact === "function") {
        const result = android.pickContact();
        if (result) {
          const contact = typeof result === "string" ? JSON.parse(result) : result;
          if (contact.phone) form.setValue("phone", contact.phone.replace(/[\s\-()]/g, ""));
          hapticLight();
          toast({ title: "Contact imported", description: `${contact.name || "Contact"} details filled in.` });
          return;
        }
      }
    } catch (e) {
      console.warn("Android bridge pickContact failed:", e);
    }
    try {
      const nav = navigator as any;
      if (nav.contacts?.select) {
        const contacts = await nav.contacts.select(["name", "tel", "address"], { multiple: false });
        if (contacts?.length > 0) {
          const c = contacts[0];
          if (c.tel?.[0]) form.setValue("phone", c.tel[0].replace(/[\s\-()]/g, ""));
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

  function onSubmit(values: EditCustomerFormValues) {
    if (!customer) return;
    updateCustomer.mutate({
      id: customer.id,
      name: values.name,
      phone: values.phone,
      address: values.address || "",
      area: values.area,
      gstin: values.gstin || null,
      default_due_days: values.default_due_days ?? null,
    }, {
      onSuccess: () => {
        hapticSuccess();
        toast({ title: "Customer updated", description: `${values.name} has been updated.` });
        onOpenChange(false);
      },
      onError: (err) => {
        hapticHeavy();
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[100dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-5 pb-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="tel" inputMode="tel" {...field} className={supportsContacts() ? "pr-10" : ""} />
                      {supportsContacts() && (
                        <Button type="button" variant="ghost" size="icon"
                          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                          onClick={pickFromContacts}>
                          <Contact className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
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
                    }} value={field.value}>
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl><Input maxLength={15} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="default_due_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Due Days</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" placeholder="e.g. 30" min={0} max={365} {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-3 pb-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="gradient-primary text-primary-foreground" disabled={updateCustomer.isPending}>
                  {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
