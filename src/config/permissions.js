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
  FB_CONTROLLER: "FB_CONTROLLER",
  FRUIT_MANAGER: "FRUIT_MANAGER",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ["*"],

  [ROLES.MANAGER]: [
    "dashboard.view",
    "pos.view",
    "menu.view",
    "orders.view",
    "orders.create",
    "tables.view",
    "kitchen.view",
    "kitchen_audit.manage",
    "bar.view",
    "fruit.view",
    "products.view",
    "inventory.view",
    "transfers.approve",
    "purchasing.view",
    "customers.view",
    "payments.view",
    "expenses.view",
    "reports.view",
    "finance.view",
    "cashier.reconcile",
    "employees.view",
    "attendance.view",
  ],

  [ROLES.FRUIT_MANAGER]: [
    "dashboard.view",
    "fruit.view",
    "kitchen.view",
    "orders.view",
  ],

  [ROLES.FB_CONTROLLER]: [
    "dashboard.view",
    "kitchen.view",
    "kitchen_audit.manage",
    "inventory.view",
    "transfers.approve",
    "reports.view",
  ],

  // Waiter permissions
  [ROLES.WAITER]: [
    "dashboard.view",
    "pos.view",
    "menu.view",
    "orders.view",
    "orders.create",
  ],

  [ROLES.CASHIER]: [
    "dashboard.view",
    "pos.view",
    "orders.view",
    "payments.view",
    "payments.create",
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
    "menu.view",
    "orders.view",
    "orders.create",
    "payments.view",
    "payments.create",
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
    "payroll.view",
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
  const normalizedRole = typeof role === "string" ? role.toUpperCase() : "";
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[role] || [];

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}   