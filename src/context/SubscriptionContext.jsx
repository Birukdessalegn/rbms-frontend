import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState({
    status: "active",
    clientName: "The Oak Club",
    isActive: true,
    daysRemaining: 30,
    hoursRemaining: 720,
    graceDaysRemaining: 0,
    isGracePeriod: false,
    isExpired: false,
    expiresAt: null,
    hardLockoutDate: null,
    graceDays: 3,
    notes: null,
  });
  const [loading, setLoading] = useState(true);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api("/subscription/status").catch(() => null);
      if (res && res.success && res.data) {
        setSubscription(res.data);
      }
    } catch (err) {
      console.warn("Subscription check notice:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll subscription status every 15 minutes
    const interval = setInterval(fetchStatus, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const renew = async ({ days = 30, masterPin, newExpiryDate, notes }) => {
    try {
      const res = await api("/subscription/renew", {
        method: "POST",
        body: JSON.stringify({ days, masterPin, newExpiryDate, notes }),
      });
      if (res && res.success && res.data) {
        setSubscription(res.data);
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || "Renewal failed" };
    } catch (err) {
      return { success: false, message: err.message || "Failed to renew subscription" };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refresh: fetchStatus,
        renew,
        showRenewalModal,
        setShowRenewalModal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
