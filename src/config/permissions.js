export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  WAITER: "WAITER",
  CASHIER: "CASHIER",
  CHEF: "CHEF",
  BARTENDER: "BARTENDER",
  STOREKEEPER: "STOREKEEPER",
  PURCHASING: "PURCHASING",
  ACCOUNTANT: "ACCOUNTANT",
  HR: "HR",
  FINANCE: "FINANCE",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ["*"],

  [ROLES.MANAGER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "kitchen.view",
    "bar.view",
    "reservations.view",
    "products.view",
    "inventory.view",
    "purchasing.view",
    "customers.view",
    "payments.view",
    "expenses.view",
    "employees.view",
    "reports.view",
    "finance.view",
    "cashier.reconcile",
  ],

  // Waiter permissions
  [ROLES.WAITER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "orders.create",
    "customers.view",
  ],

  [ROLES.CASHIER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "orders.create",
    "payments.view",
    "payments.create",
    "customers.view",
    "attendance.view",
    "attendance.manage",
  ],

  [ROLES.CHEF]: [
    "dashboard.view",
    "kitchen.view",
    "kitchen.update",
  ],

  [ROLES.BARTENDER]: [
    "dashboard.view",
    "bar.view",
    "bar.update",
  ],

  [ROLES.STOREKEEPER]: [
    "dashboard.view",
    "inventory.view",
    "inventory.update",
    "products.view",
  ],

  [ROLES.PURCHASING]: [
    "dashboard.view",
    "purchasing.view",
    "purchasing.create",
    "suppliers.view",
  ],

  [ROLES.ACCOUNTANT]: [
    "dashboard.view",
    "payments.view",
    "expenses.view",
    "accounting.view",
    "reports.view",
    "finance.view",
    "cashier.reconcile",
  ],

  [ROLES.FINANCE]: [
    "dashboard.view",
    "finance.view",
    "payments.view",
    "payments.verify",
    "cashier.reconcile",
    "expenses.view",
    "reports.view",
  ],

  [ROLES.HR]: [
    "dashboard.view",
    "employees.view",
    "attendance.view",
    "leave.view",
    "payroll.view",
  ],
};

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}   