export type UserRole = "owner" | "manager" | "collection_staff" | "delivery_staff";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "delivered";
export type PaymentMode = "cash" | "upi" | "bank_transfer";
export type CompanyPlan = "free" | "pro" | "enterprise";

export interface Company {
  id: string;
  name: string;
  plan: CompanyPlan;
  status: "active" | "inactive";
  default_due_days: number;
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
  area: string;
  gstin?: string;
  credit_limit: number;
  outstanding: number;
  default_due_days?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  created_at: string;
  status: InvoiceStatus;
  description?: string;
  delivered_by?: string;
  delivery_confirmed_at?: string;
  otp_verified?: boolean;
  delivery_location?: { lat: number; lng: number } | null;
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
