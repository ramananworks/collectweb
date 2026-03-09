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
  IndianRupee,
  Key,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { useTheme } from "next-themes";
import { usePermissions } from "@/hooks/usePermissions";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import GlobalFAB from "@/components/shared/GlobalFAB";
import ChangePasswordDialog from "@/components/forms/ChangePasswordDialog";

const allNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: null },
  { to: "/customers", icon: Users, label: "Customers", roles: null },
  { to: "/invoices", icon: FileText, label: "Invoices", roles: null },
  { to: "/outstanding", icon: IndianRupee, label: "Outstanding", roles: null },
  { to: "/collections", icon: CreditCard, label: "Collections", roles: ["owner", "manager", "collection_staff"] as string[] },
  { to: "/reports", icon: BarChart3, label: "Reports", roles: ["owner", "manager"] as string[] },
  { to: "/users", icon: UserCog, label: "Team", roles: ["owner"] as string[] },
  { to: "/settings", icon: Settings, label: "Company Settings", roles: ["owner", "manager"] as string[] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const { data: company } = useCompany();
  const isOnline = useNetworkStatus();
  const pendingCount = useSyncStatus();
  const { theme, setTheme } = useTheme();

  const backPressedRef = useRef(false);
  const backTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sidebarOpenRef = useRef(sidebarOpen);

  // Keep sidebar ref in sync
  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  // Android back button: close overlays first, then double-press to minimize/exit
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);

      // 1. Close sidebar if open
      if (sidebarOpenRef.current) {
        setSidebarOpen(false);
        return;
      }

      // 2. Close any open dialog/sheet/alert
      const openOverlay = document.querySelector(
        '[role="dialog"], [role="alertdialog"]'
      );
      if (openOverlay) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
        return;
      }

      // 3. Existing double-press to exit logic
      if (backPressedRef.current) {
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

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    manager: "Manager",
    collection_staff: "Collection Staff",
    delivery_staff: "Delivery Staff",
  };
  const displayRole = roles.length > 0
    ? roles.map((r) => roleLabels[r] || r).join(", ")
    : "Staff";

  const navItems = allNavItems.filter(
    (item) => item.roles === null || roles.some((r) => item.roles!.includes(r))
  );

  const handleSignOut = async () => {
    hapticMedium();
    await signOut();
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  hapticLight();
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-4 rounded-xl px-4 min-h-[56px] text-base font-medium transition-all active:scale-[0.98] ${
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-6 w-6 shrink-0" />
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
            <button 
              onClick={() => {
                hapticLight();
                setLogoutOpen(true);
              }} 
              className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            >
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                {displayName.split(" ").map((n) => n[0]).join("")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayRole}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  hapticLight();
                  setChangePasswordOpen(true);
                }}
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pt-1 pb-0.5">Display</DropdownMenuLabel>
              <div className="flex items-center gap-1 px-2 pb-1.5">
                {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
                  <button
                    key={t}
                    onClick={() => { hapticLight(); setTheme(t); }}
                    className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${theme === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <DropdownMenuItem
                onClick={() => {
                  hapticLight();
                  setLogoutOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-destructive-foreground text-xs font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — changes will sync when back online
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
        <GlobalFAB />
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

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
