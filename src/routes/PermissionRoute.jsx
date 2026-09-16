import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RoleRedirect from "./RoleRedirect";

const rolePermissions = {
  ADMIN: ["*"],

  MANAGER: [
    "dashboard",
    "pos",
    "kitchen",
    "kitchen_audit",
    "bar",
    "products",
    "inventory",
    "customers",
    "purchasing",
    "expenses",
    "reports",
    "finance",
    "fruit",
  ],

  WAITER: ["pos", "orders"],
  CASHIER: ["pos", "finance"],
  CHEF: ["kitchen"],
  BARTENDER: ["bar", "pos"],
  STOREKEEPER: ["inventory", "products"],
  PURCHASING: ["purchasing", "inventory"],
  ACCOUNTANT: ["finance", "expenses", "reports"],
  FINANCE: ["finance", "expenses", "reports", "payments"],
  HR: ["employees"],
  FB_CONTROLLER: ["kitchen", "kitchen_audit", "inventory", "reports"],
  FRUIT_MANAGER: ["fruit", "kitchen", "orders"],
};

function PermissionRoute({ permission }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Backend returns roles like "waiter", "admin", etc.
  // Frontend permissions use "WAITER", "ADMIN", etc.
  const normalizedRole = user.role?.toUpperCase();

  const permissions = rolePermissions[normalizedRole] || [];

  const hasAccess =
    permissions.includes("*") ||
    permissions.includes(permission);

  if (!hasAccess) {
    return <RoleRedirect />;
  }

  return <Outlet />;
}

export default PermissionRoute;