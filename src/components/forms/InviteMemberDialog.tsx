import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type AppRole = "manager" | "collection_staff" | "delivery_staff";

const roleOptions: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "collection_staff", label: "Collection Staff" },
  { value: "delivery_staff", label: "Delivery Staff" },
];

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(["collection_staff"]);
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const handleToggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const onSubmit = async (values: FormValues) => {
    if (selectedRoles.length === 0) {
      toast.error("Select at least one role");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          ...values,
          roles: selectedRoles,
          redirectUrl: "https://collectweb.lovable.app/set-password",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${values.name} has been invited as ${selectedRoles.join(", ")}`);
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["user_roles"] });
      form.reset();
      setSelectedRoles(["collection_staff"]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Add a new member to your company team.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Roles</Label>
              {roleOptions.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`invite-role-${r.value}`}
                    checked={selectedRoles.includes(r.value)}
                    onCheckedChange={() => handleToggleRole(r.value)}
                  />
                  <Label htmlFor={`invite-role-${r.value}`} className="text-sm">{r.label}</Label>
                </div>
              ))}
              {selectedRoles.length === 0 && (
                <p className="text-xs text-destructive">Select at least one role</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || selectedRoles.length === 0} className="gradient-primary text-primary-foreground">
                {loading ? "Inviting..." : "Invite Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
