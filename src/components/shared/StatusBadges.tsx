import { InvoiceStatus, PaymentMode, UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  pending: { label: "Pending", className: "bg-info/10 text-info border-info/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

const modeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

export function PaymentModeBadge({ mode }: { mode: PaymentMode }) {
  return <Badge variant="secondary">{modeLabels[mode]}</Badge>;
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", className: "bg-info/10 text-info border-info/20" },
  staff: { label: "Staff", className: "bg-muted text-muted-foreground" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
