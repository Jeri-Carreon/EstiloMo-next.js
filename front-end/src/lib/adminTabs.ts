export type AdminTabKey =
  | "dashboard"
  | "customers"
  | "services"
  | "barbers"
  | "appointments"
  | "sales"
  | "reviews"
  | "loyaltyCard"
  | "reports"
  | "user-management"
  | "chatbot"
  | "security";

export type BuiltInAdminRole = "OWNER" | "RECEPTIONIST" | "BARBER";
export type AdminRole = string;

export const ADMIN_TABS: { key: AdminTabKey; label: string; path: string }[] = [
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
  { key: "customers", label: "Customers", path: "/admin/customers" },
  { key: "services", label: "Services", path: "/admin/services" },
  { key: "barbers", label: "Barbers", path: "/admin/barbers" },
  { key: "appointments", label: "Appointments", path: "/admin/appointments" },
  { key: "sales", label: "Sales", path: "/admin/sales" },
  { key: "reviews", label: "Customer Reviews", path: "/admin/reviews" },
  { key: "loyaltyCard", label: "Loyalty Card", path: "/admin/loyaltyCard" },
  { key: "reports", label: "Reports", path: "/admin/reports" },
  { key: "user-management", label: "User Management", path: "/admin/user-management" },
  { key: "chatbot", label: "Chatbot", path: "/admin/chatbot" },
  { key: "security", label: "Security Logs", path: "/admin/security" },
];

export const ALL_ADMIN_TAB_KEYS = ADMIN_TABS.map((tab) => tab.key);

export const DEFAULT_ROLE_TAB_ACCESS: Record<BuiltInAdminRole, AdminTabKey[]> = {
  OWNER: ALL_ADMIN_TAB_KEYS,
  RECEPTIONIST: [
    "dashboard",
    "customers",
    "barbers",
    "appointments",
    "sales",
    "loyaltyCard",
  ],
  BARBER: ["barbers"],
};

export function normalizeAdminRole(role: string | null | undefined): AdminRole | null {
  const normalizedRole = role?.trim();

  if (!normalizedRole || normalizedRole === "CUSTOMER") {
    return null;
  }

  return normalizedRole;
}

export function canAccessAdminTab(
  role: string | null | undefined,
  tabKey: AdminTabKey,
  accessibleTabs?: string[]
) {
  const normalizedRole = normalizeAdminRole(role);

  if (!normalizedRole) return false;
  if (normalizedRole === "OWNER") return true;

  const tabs = accessibleTabs?.length
    ? accessibleTabs
    : DEFAULT_ROLE_TAB_ACCESS[normalizedRole as BuiltInAdminRole] || [];

  return tabs.includes(tabKey);
}
