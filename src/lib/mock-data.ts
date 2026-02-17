import { Company, User, Customer, Invoice, Payment } from "@/types";

export const mockCompany: Company = {
  id: "c1",
  name: "Sharma Traders Pvt Ltd",
  plan: "pro",
  status: "active",
  default_due_days: 30,
  created_at: "2024-01-15",
};

export const mockUser: User = {
  id: "u1",
  company_id: "c1",
  name: "Rajesh Sharma",
  email: "rajesh@sharmatraders.com",
  phone: "+91 98765 43210",
  role: "owner",
};

export const mockAreas = [
  "MG Road",
  "Station Area",
  "Gandhi Nagar",
  "Industrial Area",
  "Bazaar",
  "Ring Road",
];

export const mockCustomers: Customer[] = [
  { id: "cu1", company_id: "c1", name: "Amit Patel", phone: "+91 99887 11234", address: "15 MG Road, Pune", area: "MG Road", gstin: "27AABCP1234A1Z5", credit_limit: 500000, outstanding: 125000, default_due_days: 45, created_at: "2024-02-01" },
  { id: "cu2", company_id: "c1", name: "Priya Electronics", phone: "+91 98123 45678", address: "22 Station Rd, Mumbai", area: "Station Area", gstin: "27AAECE5678B2Z3", credit_limit: 1000000, outstanding: 340000, default_due_days: 60, created_at: "2024-01-20" },
  { id: "cu3", company_id: "c1", name: "Suresh & Sons", phone: "+91 87654 32100", address: "8 Gandhi Nagar, Delhi", area: "Gandhi Nagar", credit_limit: 300000, outstanding: 0, created_at: "2024-03-10" },
  { id: "cu4", company_id: "c1", name: "Metro Wholesale", phone: "+91 77889 90012", address: "45 Industrial Area, Ahmedabad", area: "Industrial Area", gstin: "24AABCM9012C1Z1", credit_limit: 750000, outstanding: 520000, created_at: "2024-01-05" },
  { id: "cu5", company_id: "c1", name: "Lakshmi Stores", phone: "+91 91234 56789", address: "3 Bazaar St, Chennai", area: "Bazaar", credit_limit: 200000, outstanding: 85000, created_at: "2024-04-12" },
  { id: "cu6", company_id: "c1", name: "Rajan Distributors", phone: "+91 80011 22334", address: "67 Ring Road, Bangalore", area: "Ring Road", gstin: "29AABCR3456D1Z7", credit_limit: 600000, outstanding: 195000, default_due_days: 15, created_at: "2024-02-28" },
];

export const mockInvoices: Invoice[] = [
  { id: "inv1", company_id: "c1", customer_id: "cu1", customer_name: "Amit Patel", invoice_number: "INV-2024-001", invoice_date: "2024-12-15", amount: 75000, paid_amount: 25000, due_date: "2025-01-15", created_at: "2024-12-15", status: "overdue" },
  { id: "inv2", company_id: "c1", customer_id: "cu2", customer_name: "Priya Electronics", invoice_number: "INV-2025-002", invoice_date: "2025-01-10", amount: 200000, paid_amount: 60000, due_date: "2025-02-28", created_at: "2025-01-10", status: "partial" },
  { id: "inv3", company_id: "c1", customer_id: "cu4", customer_name: "Metro Wholesale", invoice_number: "INV-2025-003", invoice_date: "2025-01-20", amount: 320000, paid_amount: 0, due_date: "2025-03-01", created_at: "2025-01-20", status: "pending" },
  { id: "inv4", company_id: "c1", customer_id: "cu5", customer_name: "Lakshmi Stores", invoice_number: "INV-2025-004", invoice_date: "2025-01-01", amount: 85000, paid_amount: 85000, due_date: "2025-01-31", created_at: "2025-01-01", status: "paid" },
  { id: "inv5", company_id: "c1", customer_id: "cu1", customer_name: "Amit Patel", invoice_number: "INV-2024-005", invoice_date: "2024-10-30", amount: 50000, paid_amount: 0, due_date: "2024-11-30", created_at: "2024-10-30", status: "overdue" },
  { id: "inv6", company_id: "c1", customer_id: "cu6", customer_name: "Rajan Distributors", invoice_number: "INV-2025-006", invoice_date: "2025-01-05", amount: 195000, paid_amount: 50000, due_date: "2025-02-15", created_at: "2025-01-05", status: "partial" },
];

export const mockPayments: Payment[] = [
  { id: "p1", invoice_id: "inv1", company_id: "c1", customer_name: "Amit Patel", amount: 25000, date: "2025-01-20", mode: "upi", collected_by: "Vikram Singh" },
  { id: "p2", invoice_id: "inv2", company_id: "c1", customer_name: "Priya Electronics", amount: 60000, date: "2025-02-01", mode: "bank_transfer", collected_by: "Rajesh Sharma" },
  { id: "p3", invoice_id: "inv4", company_id: "c1", customer_name: "Lakshmi Stores", amount: 85000, date: "2025-01-25", mode: "cash", collected_by: "Vikram Singh" },
  { id: "p4", invoice_id: "inv6", company_id: "c1", customer_name: "Rajan Distributors", amount: 50000, date: "2025-02-10", mode: "upi", collected_by: "Sunil Kumar" },
  { id: "p5", invoice_id: "inv2", company_id: "c1", customer_name: "Priya Electronics", amount: 30000, date: "2025-02-12", mode: "cash", collected_by: "Vikram Singh" },
];

export const mockStaff: User[] = [
  { id: "u1", company_id: "c1", name: "Rajesh Sharma", email: "rajesh@sharmatraders.com", phone: "+91 98765 43210", role: "owner" },
  { id: "u2", company_id: "c1", name: "Vikram Singh", email: "vikram@sharmatraders.com", phone: "+91 98765 43211", role: "staff" },
  { id: "u3", company_id: "c1", name: "Sunil Kumar", email: "sunil@sharmatraders.com", phone: "+91 98765 43212", role: "staff" },
  { id: "u4", company_id: "c1", name: "Meera Joshi", email: "meera@sharmatraders.com", phone: "+91 98765 43213", role: "manager" },
];

export const dashboardStats = {
  totalOutstanding: 1265000,
  todayCollection: 55000,
  overdueAmount: 125000,
  customerCount: 6,
  totalInvoices: 6,
  paidInvoices: 1,
};

export const ageingData = [
  { bracket: "0–30 days", amount: 520000, count: 2 },
  { bracket: "31–60 days", amount: 340000, count: 2 },
  { bracket: "61–90 days", amount: 280000, count: 1 },
  { bracket: "90+ days", amount: 125000, count: 1 },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Helper: get area for a customer_id */
export function getCustomerArea(customerId: string): string {
  return mockCustomers.find((c) => c.id === customerId)?.area || "Unknown";
}
