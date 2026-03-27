import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { enqueueMutation } from "@/lib/offline-queue";
import { toast } from "sonner";
import { resolveDueDate } from "@/lib/due-date-resolver";

export type Customer = Tables<"customers">;
export type Invoice = Tables<"invoices">;
export type Payment = Tables<"payments">;
export type Area = Tables<"areas">;
export type Company = Tables<"companies">;
export type Profile = Tables<"profiles">;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function useCompany() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      // Fetch invoices, customers, and company in parallel for dynamic due-date resolution
      const [invoicesRes, customersRes, companyRes] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("customers").select("id, default_due_days"),
        supabase.from("companies").select("id, default_due_days").limit(1).single(),
      ]);
      if (invoicesRes.error) throw invoicesRes.error;

      const customerMap = new Map<string, number | null>();
      (customersRes.data || []).forEach((c: { id: string; default_due_days: number | null }) => {
        customerMap.set(c.id, c.default_due_days);
      });
      const companyDueDays = companyRes.data?.default_due_days ?? 30;

      const today = new Date().toISOString().slice(0, 10);
      const overdueIds: string[] = [];

      const invoices = (invoicesRes.data as Invoice[]).map((inv) => {
        // Dynamically re-resolve due date based on source
        let effectiveDueDate = inv.due_date;
        const source = (inv as any).due_date_source as string | undefined;

        if (source === "customer" || source === "company") {
          const resolved = resolveDueDate(
            { due_date: undefined, invoice_date: inv.invoice_date },
            { default_due_days: source === "customer" ? customerMap.get(inv.customer_id) : null },
            { default_due_days: companyDueDays }
          );
          effectiveDueDate = resolved.due_date;
        }

        if (
          (inv.status === "pending" || inv.status === "delivered") &&
          effectiveDueDate < today &&
          inv.paid_amount < inv.amount
        ) {
          overdueIds.push(inv.id);
          return { ...inv, due_date: effectiveDueDate, status: "overdue" };
        }
        return { ...inv, due_date: effectiveDueDate };
      });

      // Background DB update for newly overdue invoices
      if (overdueIds.length > 0) {
        supabase
          .from("invoices")
          .update({ status: "overdue" })
          .in("id", overdueIds)
          .then();
      }
      return invoices;
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Area[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      name: string;
      phone: string;
      address: string;
      area: string;
      gstin?: string;
      default_due_days?: number;
      assigned_to?: string;
    }) => {
      const row = {
        ...values,
        company_id: profile!.company_id!,
        gstin: values.gstin || null,
        default_due_days: values.default_due_days ?? null,
        assigned_to: values.assigned_to || null,
        outstanding: 0,
      };
      if (!navigator.onLine) {
        enqueueMutation({ table: "customers", type: "insert", payload: row });
        toast.info("Customer saved offline — will sync when back online");
        return;
      }
      const { error } = await supabase.from("customers").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      customer_id: string;
      customer_name: string;
      invoice_number: string;
      invoice_date: string;
      amount: number;
      due_date: string;
      due_date_source?: string;
      description?: string;
    }) => {
      const row = {
        ...values,
        company_id: profile!.company_id!,
        description: values.description || null,
        due_date_source: values.due_date_source || "company",
        paid_amount: 0,
        status: "pending",
      };
      if (!navigator.onLine) {
        enqueueMutation({ table: "invoices", type: "insert", payload: row });
        toast.info("Invoice saved offline — will sync when back online");
        return;
      }
      const { error } = await supabase.from("invoices").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      invoice_id: string;
      customer_name: string;
      amount: number;
      date: string;
      mode: string;
      collected_by: string;
      notes?: string;
      local_id?: string;
    }) => {
      const row = {
        ...values,
        company_id: profile!.company_id!,
        notes: values.notes || null,
        local_id: values.local_id || crypto.randomUUID(),
      };
      if (!navigator.onLine) {
        enqueueMutation({ table: "payments", type: "insert", payload: row });
        toast.info("Payment saved offline — will sync when back online");
        return;
      }
      // Insert payment
      const { error } = await supabase.from("payments").insert(row);
      if (error) throw error;

      // Reconcile paid_amount from sum of all payments (ledger-derived, not incremented)
      const { data: allPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", values.invoice_id);
      const reconciledPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

      // Get invoice amount to determine status
      const { data: inv } = await supabase
        .from("invoices")
        .select("amount")
        .eq("id", values.invoice_id)
        .single();
      if (inv) {
        // Cap paid_amount to invoice amount to prevent negative balance
        const cappedPaid = Math.min(reconciledPaid, inv.amount);
        const updates: { paid_amount: number; status?: string } = { paid_amount: cappedPaid };
        if (cappedPaid >= inv.amount) {
          updates.status = "paid";
        }
        await supabase
          .from("invoices")
          .update(updates)
          .eq("id", values.invoice_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      phone: string;
      address: string;
      area: string;
      gstin?: string | null;
      default_due_days?: number | null;
      assigned_to?: string | null;
    }) => {
      const { id, ...rest } = values;
      const { error } = await supabase.from("customers").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useAddArea() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("areas").insert({
        name,
        company_id: profile!.company_id!,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("areas").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; default_due_days?: number; address?: string; gstin?: string | null; phone?: string; upi_id?: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("companies").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });
}

export function useBulkImportCustomers() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (customers: { name: string; phone: string; address: string; area: string; gstin: string }[]) => {
      const companyId = profile!.company_id!;

      // 1. Fetch existing areas
      const { data: existingAreas } = await supabase
        .from("areas")
        .select("name")
        .eq("company_id", companyId);
      const existingSet = new Set(
        (existingAreas || []).map((a) => a.name.toLowerCase())
      );

      // 2. Collect unique new area names from CSV
      const newAreaNames: string[] = [];
      const seen = new Set<string>();
      for (const c of customers) {
        const trimmed = (c.area || "").trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (!existingSet.has(key) && !seen.has(key)) {
          seen.add(key);
          newAreaNames.push(trimmed);
        }
      }

      // 3. Insert new areas
      if (newAreaNames.length > 0) {
        const { error: areaErr } = await supabase
          .from("areas")
          .insert(newAreaNames.map((name) => ({ name, company_id: companyId })));
        if (areaErr) throw areaErr;
      }

      // 4. Insert customers
      const rows = customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        address: c.address,
        area: c.area || "",
        gstin: c.gstin || null,
        company_id: companyId,
        outstanding: 0,
      }));
      const { error } = await supabase.from("customers").insert(rows);
      if (error) throw error;

      return { newAreasCount: newAreaNames.length, newAreaNames };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}

export function useBulkImportInvoices() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (invoices: { customer_name: string; customer_id: string; is_new_customer?: boolean; customer_phone?: string; customer_area?: string; invoice_number: string; invoice_date: string; amount: number; due_date?: string; description: string }[]) => {
      const companyId = profile!.company_id!;

      // Create new customers first, deduplicating by name
      const newCustomerInvoices = invoices.filter(inv => inv.is_new_customer && !inv.customer_id);
      const seen = new Set<string>();
      const uniqueNewCustomers: { name: string; phone: string; area: string }[] = [];
      for (const inv of newCustomerInvoices) {
        const key = inv.customer_name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueNewCustomers.push({ name: inv.customer_name, phone: inv.customer_phone || "", area: inv.customer_area || "" });
        }
      }
      const customerIdMap: Record<string, string> = {};

      if (uniqueNewCustomers.length > 0) {
        const newCustomers = uniqueNewCustomers.map(c => ({
          name: c.name,
          company_id: companyId,
          phone: c.phone,
          address: "",
          area: c.area,
          outstanding: 0,
        }));
        const { data: created, error: custError } = await supabase.from("customers").insert(newCustomers).select("id, name");
        if (custError) throw custError;
        for (const c of created || []) {
          customerIdMap[c.name.toLowerCase()] = c.id;
        }
      }

      // Fetch company for due date resolution
      const { data: companyData } = await supabase.from("companies").select("default_due_days").eq("id", companyId).single();
      const companyDueDays = companyData?.default_due_days ?? 30;

      // Fetch existing + newly created customers for due date resolution
      const { data: allCustomers } = await supabase.from("customers").select("id, default_due_days").eq("company_id", companyId);
      const customerDueDaysMap: Record<string, number | null> = {};
      for (const c of allCustomers || []) {
        customerDueDaysMap[c.id] = c.default_due_days;
      }

      const rows = invoices.map((inv) => {
        const custId = inv.customer_id || customerIdMap[inv.customer_name.toLowerCase()];
        const hasDueDate = !!inv.due_date;
        let resolvedDueDate: string;
        let dueDateSource: string;

        if (hasDueDate) {
          resolvedDueDate = inv.due_date!;
          dueDateSource = "invoice";
        } else {
          const custDueDays = customerDueDaysMap[custId];
          const resolved = resolveDueDate(
            { invoice_date: inv.invoice_date },
            { default_due_days: custDueDays },
            { default_due_days: companyDueDays }
          );
          resolvedDueDate = resolved.due_date;
          dueDateSource = resolved.source;
        }

        return {
          customer_id: custId,
          customer_name: inv.customer_name,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          amount: inv.amount,
          due_date: resolvedDueDate,
          description: inv.description || null,
          company_id: companyId,
          paid_amount: 0,
          status: "pending",
          due_date_source: dueDateSource,
        };
      });
      const { error } = await supabase.from("invoices").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
