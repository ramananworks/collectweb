import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import Home from "@/pages/Home";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLockProvider } from "@/contexts/AppLockContext";
import AppLockScreen from "@/components/lock/AppLockScreen";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import RootRedirect from "@/components/RootRedirect";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SetPassword from "@/pages/SetPassword";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Invoices from "@/pages/Invoices";
import Collections from "@/pages/Collections";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import Settings from "@/pages/Settings";
import Outstanding from "@/pages/Outstanding";
import Billing from "@/pages/Billing";
import PlanStatus from "@/pages/PlanStatus";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminCompany from "@/pages/admin/AdminCompany";
import AdminRoute from "@/components/AdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error: any) => {
       if (error?.code === "42501") {
        toast.error("This action isn't available on your current plan. Upgrade to continue.");
      } else {
        toast.error(error?.message || "Something went wrong. Please try again.");
      }
    },
  }),
});

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLockProvider>
          <AppLockScreen />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/customers" element={<ProtectedLayout><Customers /></ProtectedLayout>} />
            <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
            <Route path="/collections" element={<ProtectedLayout><Collections /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/users" element={<ProtectedLayout><UserManagement /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
            <Route path="/outstanding" element={<ProtectedLayout><Outstanding /></ProtectedLayout>} />
            <Route path="/settings/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
            <Route path="/settings/plan-status" element={<ProtectedLayout><PlanStatus /></ProtectedLayout>} />
            <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />
            <Route path="/admin/companies/:id" element={<AdminRoute><AppLayout><AdminCompany /></AppLayout></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AppLockProvider>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
