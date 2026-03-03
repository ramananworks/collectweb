import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "manager" | "staff";

interface Permissions {
  role: AppRole | null;
  /** Full access to everything */
  isOwner: boolean;
  /** Add/Edit customers, invoices, payments & areas */
  isManager: boolean;
  /** View all, Add payments only */
  isStaff: boolean;
  /** Can add/edit customers */
  canManageCustomers: boolean;
  /** Can add/edit invoices */
  canManageInvoices: boolean;
  /** Can record payments */
  canRecordPayments: boolean;
  /** Can manage areas & company settings */
  canManageSettings: boolean;
  /** Can manage team members */
  canManageTeam: boolean;
  /** Can bulk import */
  canBulkImport: boolean;
}

export function usePermissions(): Permissions {
  const { role } = useAuth();

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isStaff = role === "staff";

  return {
    role,
    isOwner,
    isManager,
    isStaff,
    canManageCustomers: isOwner || isManager,
    canManageInvoices: isOwner || isManager,
    canRecordPayments: isOwner || isManager || isStaff, // all roles
    canManageSettings: isOwner,
    canManageTeam: isOwner,
    canBulkImport: isOwner || isManager,
  };
}
