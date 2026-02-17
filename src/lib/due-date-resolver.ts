import { addDays, format } from "date-fns";
import { Company, Customer, Invoice } from "@/types";

export type DueDateSource = "invoice" | "customer" | "company";

export interface ResolvedDueDate {
  due_date: string;
  source: DueDateSource;
}

/**
 * Resolves the due date for an invoice using strict priority:
 * 1. Invoice-level due_date (highest)
 * 2. Customer-level default_due_days from invoice_date
 * 3. Company-level default_due_days from invoice_date (lowest)
 */
export function resolveDueDate(
  invoice: Pick<Invoice, "due_date" | "invoice_date">,
  customer: Pick<Customer, "default_due_days">,
  company: Pick<Company, "default_due_days">
): ResolvedDueDate {
  // 1. Invoice-level due date
  if (invoice.due_date) {
    return { due_date: invoice.due_date, source: "invoice" };
  }

  const baseDate = new Date(invoice.invoice_date);

  // 2. Customer-level default
  if (customer.default_due_days != null && customer.default_due_days > 0) {
    return {
      due_date: format(addDays(baseDate, customer.default_due_days), "yyyy-MM-dd"),
      source: "customer",
    };
  }

  // 3. Company-level default
  return {
    due_date: format(addDays(baseDate, company.default_due_days), "yyyy-MM-dd"),
    source: "company",
  };
}

/**
 * Calculates a due date from invoice_date and days offset.
 */
export function calculateDueDate(invoiceDate: string, dueDays: number): string {
  return format(addDays(new Date(invoiceDate), dueDays), "yyyy-MM-dd");
}
