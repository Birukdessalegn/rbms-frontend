import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toUpperCase();

  switch (role) {
    case "CHEF":
      return <Navigate to="/kitchen" replace />;

    case "ADMIN":
    case "MANAGER":
      return <Navigate to="/dashboard" replace />;

    case "WAITER":
    case "CASHIER":
      return <Navigate to="/pos" replace />;

    case "BARTENDER":
      return <Navigate to="/bar" replace />;

    case "STOREKEEPER":
      return <Navigate to="/inventory" replace />;

    case "PURCHASING":
      return <Navigate to="/purchasing" replace />;

    case "ACCOUNTANT":
    case "FINANCE":
      return <Navigate to="/finance" replace />;

    case "HR":
      return <Navigate to="/employees" replace />;

    default:
      return <Navigate to="/dashboard" replace />;
  }
}

export default RoleRedirect;