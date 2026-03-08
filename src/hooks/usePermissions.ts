import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "manager" | "collection_staff" | "delivery_staff";

interface Permissions {
  roles: AppRole[];
  /** Full access to everything */
  isOwner: boolean;
  /** Add/Edit customers, invoices, payments & areas */
  isManager: boolean;
  /** View all, Add payments only */
  isCollectionStaff: boolean;
  /** Create invoices, view customers/invoices, record payments, delivery OTP */
  isDeliveryStaff: boolean;
  /** Can add/edit customers */
  canManageCustomers: boolean;
  /** Can add/edit invoices */
  canManageInvoices: boolean;
  /** Can create invoices (includes delivery staff) */
  canCreateInvoices: boolean;
  /** Can record payments */
  canRecordPayments: boolean;
  /** Can manage areas & company settings */
  canManageSettings: boolean;
  /** Can manage team members */
  canManageTeam: boolean;
  /** Can bulk import */
  canBulkImport: boolean;
  /** Can view reports */
  canViewReports: boolean;
  /** Can initiate delivery confirmation */
  canConfirmDelivery: boolean;
}

export function usePermissions(): Permissions {
  const { roles } = useAuth();

  const isOwner = roles.includes("owner");
  const isManager = roles.includes("manager");
  const isCollectionStaff = roles.includes("collection_staff");
  const isDeliveryStaff = roles.includes("delivery_staff");

  return {
    roles,
    isOwner,
    isManager,
    isCollectionStaff,
    isDeliveryStaff,
    canManageCustomers: isOwner || isManager,
    canManageInvoices: isOwner || isManager,
    canCreateInvoices: isOwner || isManager || isDeliveryStaff,
    canRecordPayments: isOwner || isManager || isCollectionStaff || isDeliveryStaff,
    canManageSettings: isOwner,
    canManageTeam: isOwner,
    canBulkImport: isOwner || isManager,
    canViewReports: isOwner || isManager,
    canConfirmDelivery: isOwner || isManager || isDeliveryStaff,
  };
}
