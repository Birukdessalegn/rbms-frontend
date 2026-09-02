import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RoleRedirect from "./RoleRedirect";

const rolePermissions = {
  ADMIN: ["*"],

  MANAGER: [
    "dashboard",
    "pos",
    "kitchen",
    "bar",
    "reservations",
    "products",
    "inventory",
    "customers",
    "purchasing",
    "employees",
    "expenses",
    "reports",
    "finance",
  ],

  WAITER: ["pos", "dashboard", "orders"],
  CASHIER: ["pos", "finance"],
  CHEF: ["kitchen"],
  BARTENDER: ["bar"],
  STOREKEEPER: ["inventory", "products"],
  PURCHASING: ["purchasing", "inventory"],
  ACCOUNTANT: ["finance", "expenses", "reports"],
  FINANCE: ["finance", "expenses", "reports", "payments"],
  HR: ["employees"],
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