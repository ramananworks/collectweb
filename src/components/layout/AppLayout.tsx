import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/use-data";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { WifiOff, Wifi, Clock } from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  { to: "/collections", icon: CreditCard, label: "Collections" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/users", icon: UserCog, label: "Team" },
  { to: "/settings", icon: Settings, label: "Company Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { data: company } = useCompany();
  const isOnline = useNetworkStatus();

  const companyName = company?.name || "My Company";
  const displayName = profile?.name || "User";
  const displayEmail = profile?.email || "";
  const displayRole = role || "staff";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`gradient-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate">
              {companyName}
            </h1>
            <p className="text-xs text-sidebar-foreground">{displayRole}</p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {displayName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-foreground truncate">{displayEmail}</p>
            </div>
            <button onClick={handleSignOut} className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">{companyName}</span>
          </div>
        </header>

        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-destructive-foreground text-xs font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — changes will sync when back online
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
