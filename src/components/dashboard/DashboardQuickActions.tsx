import { UserPlus, FileText, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { label: "Add Customer", icon: UserPlus, path: "/customers", bg: "bg-blue-50", color: "text-blue-600", shadow: "shadow-blue-100" },
  { label: "Create Invoice", icon: FileText, path: "/invoices", bg: "bg-indigo-50", color: "text-indigo-600", shadow: "shadow-indigo-100" },
  { label: "Record Payment", icon: Wallet, path: "/collections", bg: "bg-green-50", color: "text-green-600", shadow: "shadow-green-100" },
];

export default function DashboardQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3 overflow-x-auto">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 ${a.bg} shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md cursor-pointer min-w-0`}
          >
            <a.icon className={`h-8 w-8 ${a.color}`} strokeWidth={1.8} />
            <span className={`text-xs font-semibold ${a.color} text-center leading-tight`}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
