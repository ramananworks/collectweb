import { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  trend?: string;
  variant?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const variantStyles = {
  default: "bg-card",
  success: "bg-card border-l-4 border-l-success",
  warning: "bg-card border-l-4 border-l-warning",
  destructive: "bg-card border-l-4 border-l-destructive",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export default function StatCard({ title, value, icon: Icon, isCurrency = true, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 stat-card-shadow hover:stat-card-shadow-hover transition-shadow animate-fade-in ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {isCurrency ? formatCurrency(value) : value.toLocaleString("en-IN")}
          </p>
          {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconVariantStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
