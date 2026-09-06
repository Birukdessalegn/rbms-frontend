import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const AuthContext = createContext(null);

// Inactivity timeout: 12 hours (full restaurant shift) so clients and staff are never abruptly booted out
export const SESSION_INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session_last_activity");

    setUser(null);

    // If currently on an authenticated page, redirect to /login
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }, []);

  const login = (userData) => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem("session_last_activity", now.toString());
    setUser(userData);
  };

  // 1. Restore login and verify inactivity on page refresh / initial load
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      const lastActivity = Number(localStorage.getItem("session_last_activity") || 0);

      if (token && savedUser) {
        // If user was inactive for more than 1 minute while away
        if (lastActivity && Date.now() - lastActivity >= SESSION_INACTIVITY_TIMEOUT_MS) {
          console.warn("Session expired during inactivity period.");
          logout();
        } else {
          setUser(JSON.parse(savedUser));
          const now = Date.now();
          lastActivityRef.current = now;
          localStorage.setItem("session_last_activity", now.toString());
        }
      }
    } catch (error) {
      console.error("Failed to restore authentication:", error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // 2. Inactivity Tracking & Auto-Logout when user is logged in
  useEffect(() => {
    if (!user) return;

    let throttleTimer = null;

    const recordUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Throttle localStorage updates to once every 1,000ms
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          localStorage.setItem("session_last_activity", Date.now().toString());
          throttleTimer = null;
        }, 1000);
      }
    };

    // User activity events
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });

    // Check inactivity periodically (every 30 seconds)
    const intervalId = setInterval(() => {
      const storedLastActivity = Number(
        localStorage.getItem("session_last_activity") || lastActivityRef.current
      );
      const elapsed = Date.now() - storedLastActivity;

      if (elapsed >= SESSION_INACTIVITY_TIMEOUT_MS) {
        console.warn(`User inactive for ${elapsed}ms. Auto-logging out...`);
        logout();
      }
    }, 30000);

    // Synchronize cross-tab activity or logout
    const handleStorageChange = (e) => {
      if (e.key === "session_last_activity" && e.newValue) {
        lastActivityRef.current = Number(e.newValue);
      } else if (e.key === "token" && !e.newValue) {
        // Another tab logged out
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}