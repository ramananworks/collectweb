export type UserRole = "owner" | "manager" | "staff";
export type InvoiceStatus = "pending" | "partial" | "paid" | "overdue";
export type PaymentMode = "cash" | "upi" | "bank_transfer";
export type CompanyPlan = "free" | "pro" | "enterprise";

export interface Company {
  id: string;
  name: string;
  plan: CompanyPlan;
  status: "active" | "inactive";
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  address: string;
  credit_limit: number;
  outstanding: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  created_at: string;
  status: InvoiceStatus;
  description?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  company_id: string;
  customer_name: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  collected_by: string;
  notes?: string;
}
