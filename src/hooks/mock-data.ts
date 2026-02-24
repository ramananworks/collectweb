import type { Customer, Invoice, Payment, Area, Company, Profile } from "./use-data";

const CID = "00000000-0000-0000-0000-000000000001";

export const mockCompany: Company = {
  id: CID,
  name: "Sharma Traders Pvt Ltd",
  plan: "pro",
  status: "active",
  default_due_days: 30,
  created_at: "2024-01-15T00:00:00Z",
  address: "12 Market Yard, Pune 411001",
  gstin: "27AABCS1234A1Z5",
  phone: "+91 98765 43210",
};

export const mockProfiles: Profile[] = [
  { id: "00000000-0000-0000-0000-000000000101", company_id: CID, name: "Rajesh Sharma", email: "rajesh@sharmatraders.com", phone: "+91 98765 43210", avatar_url: null, created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000102", company_id: CID, name: "Vikram Singh", email: "vikram@sharmatraders.com", phone: "+91 98765 43211", avatar_url: null, created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000103", company_id: CID, name: "Sunil Kumar", email: "sunil@sharmatraders.com", phone: "+91 98765 43212", avatar_url: null, created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000104", company_id: CID, name: "Meera Joshi", email: "meera@sharmatraders.com", phone: "+91 98765 43213", avatar_url: null, created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z" },
];

export const mockAreas: Area[] = [
  { id: "00000000-0000-0000-0000-000000000201", company_id: CID, name: "MG Road", created_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000202", company_id: CID, name: "Station Area", created_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000203", company_id: CID, name: "Gandhi Nagar", created_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000204", company_id: CID, name: "Industrial Area", created_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000205", company_id: CID, name: "Bazaar", created_at: "2024-01-15T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000206", company_id: CID, name: "Ring Road", created_at: "2024-01-15T00:00:00Z" },
];

export const mockCustomers: Customer[] = [
  { id: "00000000-0000-0000-0000-000000000301", company_id: CID, name: "Amit Patel", phone: "+91 99887 11234", address: "15 MG Road, Pune", area: "MG Road", gstin: "27AABCP1234A1Z5", credit_limit: 500000, outstanding: 125000, default_due_days: 45, assigned_to: "00000000-0000-0000-0000-000000000102", created_at: "2024-02-01T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000302", company_id: CID, name: "Priya Electronics", phone: "+91 98123 45678", address: "22 Station Rd, Mumbai", area: "Station Area", gstin: "27AAECE5678B2Z3", credit_limit: 1000000, outstanding: 340000, default_due_days: 60, assigned_to: null, created_at: "2024-01-20T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000303", company_id: CID, name: "Suresh & Sons", phone: "+91 87654 32100", address: "8 Gandhi Nagar, Delhi", area: "Gandhi Nagar", gstin: null, credit_limit: 300000, outstanding: 0, default_due_days: null, assigned_to: "00000000-0000-0000-0000-000000000103", created_at: "2024-03-10T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000304", company_id: CID, name: "Metro Wholesale", phone: "+91 77889 90012", address: "45 Industrial Area, Ahmedabad", area: "Industrial Area", gstin: "24AABCM9012C1Z1", credit_limit: 750000, outstanding: 520000, default_due_days: null, assigned_to: null, created_at: "2024-01-05T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000305", company_id: CID, name: "Lakshmi Stores", phone: "+91 91234 56789", address: "3 Bazaar St, Chennai", area: "Bazaar", gstin: null, credit_limit: 200000, outstanding: 85000, default_due_days: null, assigned_to: "00000000-0000-0000-0000-000000000102", created_at: "2024-04-12T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000306", company_id: CID, name: "Rajan Distributors", phone: "+91 80011 22334", address: "67 Ring Road, Bangalore", area: "Ring Road", gstin: "29AABCR3456D1Z7", credit_limit: 600000, outstanding: 195000, default_due_days: 15, assigned_to: "00000000-0000-0000-0000-000000000104", created_at: "2024-02-28T00:00:00Z" },
];

export const mockInvoices: Invoice[] = [
  { id: "00000000-0000-0000-0000-000000000401", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000301", customer_name: "Amit Patel", invoice_number: "INV-2024-001", invoice_date: "2024-12-15", amount: 75000, paid_amount: 25000, due_date: "2025-01-15", created_at: "2024-12-15T00:00:00Z", status: "overdue", description: null, bill_image_url: null },
  { id: "00000000-0000-0000-0000-000000000402", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000302", customer_name: "Priya Electronics", invoice_number: "INV-2025-002", invoice_date: "2025-01-10", amount: 200000, paid_amount: 60000, due_date: "2025-02-28", created_at: "2025-01-10T00:00:00Z", status: "partial", description: null, bill_image_url: null },
  { id: "00000000-0000-0000-0000-000000000403", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000304", customer_name: "Metro Wholesale", invoice_number: "INV-2025-003", invoice_date: "2025-01-20", amount: 320000, paid_amount: 0, due_date: "2025-03-01", created_at: "2025-01-20T00:00:00Z", status: "pending", description: null, bill_image_url: null },
  { id: "00000000-0000-0000-0000-000000000404", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000305", customer_name: "Lakshmi Stores", invoice_number: "INV-2025-004", invoice_date: "2025-01-01", amount: 85000, paid_amount: 85000, due_date: "2025-01-31", created_at: "2025-01-01T00:00:00Z", status: "paid", description: null, bill_image_url: null },
  { id: "00000000-0000-0000-0000-000000000405", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000301", customer_name: "Amit Patel", invoice_number: "INV-2024-005", invoice_date: "2024-10-30", amount: 50000, paid_amount: 0, due_date: "2024-11-30", created_at: "2024-10-30T00:00:00Z", status: "overdue", description: null, bill_image_url: null },
  { id: "00000000-0000-0000-0000-000000000406", company_id: CID, customer_id: "00000000-0000-0000-0000-000000000306", customer_name: "Rajan Distributors", invoice_number: "INV-2025-006", invoice_date: "2025-01-05", amount: 195000, paid_amount: 50000, due_date: "2025-02-15", created_at: "2025-01-05T00:00:00Z", status: "partial", description: null, bill_image_url: null },
];

export const mockPayments: Payment[] = [
  { id: "00000000-0000-0000-0000-000000000501", invoice_id: "00000000-0000-0000-0000-000000000401", company_id: CID, customer_name: "Amit Patel", amount: 25000, date: "2025-01-20", mode: "upi", collected_by: "Vikram Singh", notes: null, created_at: "2025-01-20T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000502", invoice_id: "00000000-0000-0000-0000-000000000402", company_id: CID, customer_name: "Priya Electronics", amount: 60000, date: "2025-02-01", mode: "bank_transfer", collected_by: "Rajesh Sharma", notes: null, created_at: "2025-02-01T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000503", invoice_id: "00000000-0000-0000-0000-000000000404", company_id: CID, customer_name: "Lakshmi Stores", amount: 85000, date: "2025-01-25", mode: "cash", collected_by: "Vikram Singh", notes: null, created_at: "2025-01-25T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000504", invoice_id: "00000000-0000-0000-0000-000000000406", company_id: CID, customer_name: "Rajan Distributors", amount: 50000, date: "2025-02-10", mode: "upi", collected_by: "Sunil Kumar", notes: null, created_at: "2025-02-10T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000505", invoice_id: "00000000-0000-0000-0000-000000000402", company_id: CID, customer_name: "Priya Electronics", amount: 30000, date: "2025-02-12", mode: "cash", collected_by: "Vikram Singh", notes: null, created_at: "2025-02-12T00:00:00Z" },
];
