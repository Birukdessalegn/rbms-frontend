import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  WAITER: ["pos"],
  CASHIER: ["pos"],
  CHEF: ["kitchen"],
  BARTENDER: ["bar"],
  STOREKEEPER: ["inventory", "products"],
  PURCHASING: ["purchasing", "inventory"],
  ACCOUNTANT: ["finance", "expenses", "reports"],
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
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;