import { UserPlus, Receipt, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { label: "Add Customer", icon: UserPlus, path: "/customers", bg: "bg-blue-50", color: "text-blue-600", iconBg: "bg-blue-100" },
  { label: "Create Invoice", icon: Receipt, path: "/invoices", bg: "bg-indigo-50", color: "text-indigo-600", iconBg: "bg-indigo-100" },
  { label: "Record Payment", icon: IndianRupee, path: "/collections", bg: "bg-emerald-50", color: "text-emerald-600", iconBg: "bg-emerald-100" },
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
            <div className={`w-10 h-10 rounded-full ${a.iconBg} flex items-center justify-center`}>
              <a.icon className={`h-5 w-5 ${a.color}`} strokeWidth={1.8} />
            </div>
            <span className={`text-sm font-medium ${a.color} text-center leading-tight`}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
