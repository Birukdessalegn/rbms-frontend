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
  ],

  WAITER: ["dashboard", "pos"],
  CASHIER: ["dashboard", "pos"],
  CHEF: ["dashboard", "kitchen"],
  BARTENDER: ["dashboard", "bar"],
  STOREKEEPER: ["dashboard", "inventory", "products"],
  PURCHASING: ["dashboard", "purchasing", "inventory"],
  ACCOUNTANT: ["dashboard", "expenses", "reports"],
  HR: ["dashboard", "employees"],
};

function PermissionRoute({ permission }) {
  const { user } = useAuth();

  console.log("PermissionRoute:", {
    user,
    role: user?.role,
    permission,
  });

  if (!user) {
    console.log("NO USER → LOGIN");
    return <Navigate to="/login" replace />;
  }

  const permissions = rolePermissions[user.role] || [];

  const hasAccess =
    permissions.includes("*") ||
    permissions.includes(permission);

  console.log("Permission result:", {
    role: user.role,
    permissions,
    requestedPermission: permission,
    hasAccess,
  });

  if (!hasAccess) {
    console.log("NO PERMISSION → DASHBOARD");
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute; 