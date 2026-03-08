import { Badge } from "@/components/ui/badge";

type InvoiceStatus = "pending" | "paid" | "overdue" | "delivered";
type PaymentMode = "cash" | "upi" | "bank_transfer";
type UserRole = "owner" | "manager" | "collection_staff" | "delivery_staff";

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  delivered: { label: "Delivered", className: "bg-primary/10 text-primary border-primary/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as InvoiceStatus];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

export function PaymentModeBadge({ mode }: { mode: string }) {
  return <Badge variant="secondary">{modeLabels[mode as PaymentMode] || mode}</Badge>;
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", className: "bg-info/10 text-info border-info/20" },
  collection_staff: { label: "Collection Staff", className: "bg-warning/10 text-warning border-warning/20" },
  delivery_staff: { label: "Delivery Staff", className: "bg-accent/50 text-accent-foreground border-accent/30" },
};

export function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role as UserRole];
  if (!config) return <Badge variant="outline">{role}</Badge>;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
