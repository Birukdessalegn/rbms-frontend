import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import SubscriptionLockScreen from "../components/subscription/SubscriptionLockScreen";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { subscription } = useSubscription();

  // Don't redirect while authentication is being restored
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Hard lockout screen if subscription expired past grace period
  if (subscription?.isExpired) {
    return <SubscriptionLockScreen />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
