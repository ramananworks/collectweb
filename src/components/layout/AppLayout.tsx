import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/use-data";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { WifiOff, Wifi, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { data: company } = useCompany();
  const isOnline = useNetworkStatus();
  const pendingCount = useSyncStatus();

  const backPressedRef = useRef(false);
  const backTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Android back button: double-press to minimize/exit, never navigate to login
  useEffect(() => {
    const handlePopState = () => {
      // Always push state back so we never leave the app via back button
      window.history.pushState(null, "", window.location.href);

      if (backPressedRef.current) {
        // Second press — try to minimize or close
        const android = (window as any).Android;
        if (android && typeof android.minimizeApp === "function") {
          android.minimizeApp();
        } else if (android && typeof android.exitApp === "function") {
          android.exitApp();
        }
        backPressedRef.current = false;
      } else {
        backPressedRef.current = true;
        toast({ title: "Press back again to exit" });
        backTimerRef.current = setTimeout(() => {
          backPressedRef.current = false;
        }, 2000);
      }
    };

    // Push an initial state so popstate fires on back press
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (backTimerRef.current) clearTimeout(backTimerRef.current);
    };
  }, []);

  const companyName = company?.name || "My Company";
  const displayName = profile?.name || "User";
  const displayEmail = profile?.email || "";
  const displayRole = role || "staff";

  const handleSignOut = async () => {
    await signOut();
    // Clear all storage and replace history so back button won't return to dashboard
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
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
          <img src={logoImg} alt="CollectWeb" className="h-9 w-9 rounded-lg object-cover" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate">
              {companyName}
            </h1>
            <p className="text-xs text-sidebar-foreground">{displayRole}</p>
          </div>
          <button
            className="ml-auto lg:hidden flex items-center justify-center h-12 w-12 -mr-2 rounded-lg active:bg-sidebar-accent transition-colors text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-7 w-7" />
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

        {/* Sync Status */}
        <div className="px-4 py-2 border-t border-sidebar-border">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-sidebar-accent/50 text-xs font-medium">
            {!isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-destructive">Offline</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                <span className="text-warning">{pendingCount} Pending</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-success">Online</span>
              </>
            )}
          </div>
        </div>

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
            <button onClick={() => setLogoutOpen(true)} className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center h-12 w-12 -ml-2 rounded-lg active:bg-accent transition-colors"
          >
            <Menu className="h-7 w-7 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img src={logoImg} alt="CollectWeb" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            <span className="text-base font-bold truncate">{companyName}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
            {!isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-destructive">Offline</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                <span className="text-warning">{pendingCount}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
              </>
            )}
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

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
