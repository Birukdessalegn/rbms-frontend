import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "CHEF") {
    return <Navigate to="/kitchen" replace />;
  }

  if (user.role === "ADMIN" || user.role === "MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role === "WAITER" || user.role === "CASHIER") {
    return <Navigate to="/pos" replace />;
  }

  if (user.role === "BARTENDER") {
    return <Navigate to="/bar" replace />;
  }

  if (user.role === "STOREKEEPER") {
    return <Navigate to="/inventory" replace />;
  }

  if (user.role === "ACCOUNTANT") {
    return <Navigate to="/finance" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default RoleRedirect;