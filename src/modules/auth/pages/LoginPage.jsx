import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { UtensilsCrossed, Eye, EyeOff, Clock, AlertTriangle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Live countdown timer for rate-limit lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // If already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        username: cleanUsername,
        password: password,
      };

      console.log("Login payload:", {
        username: cleanUsername,
        password: "********",
      });

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("Login response:", data);

      if (!response.ok) {
        if (response.status === 429 || data.retryAfter) {
          const seconds = Number(data.retryAfter) || 30;
          setLockoutSeconds(seconds);
          setError("");
          return;
        }
        throw new Error(
          data.message || "Invalid username or password"
        );
      }

      if (!data.success) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      

      const loggedInUser = data.user;
      const token = data.token;

      if (!loggedInUser || !token) {
        throw new Error(
          "Login succeeded but user information was not returned."
        );
      }

      console.log("Logged in user:", loggedInUser);

      // Save JWT
      localStorage.setItem("token", token);

      // Save user information
      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      // Update AuthContext
      login(loggedInUser);

      // Go to dashboard
      navigate("/dashboard", { replace: true });

    } catch (error) {
      console.error("Login failed:", error);

      setError(
        error.message || "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-6 text-center">
          <img
            src="/oak-club-logo.png"
            alt="The Oak Club Logo"
            className="mx-auto h-36 w-auto object-contain mix-blend-multiply drop-shadow-md"
          />

          <h1 className="mt-4 text-2xl font-black tracking-wide text-slate-900">
            THE OAK CLUB
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Club & Lounge Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your club dashboard.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Active Rate-Limit Lockout Countdown Banner */}
            {lockoutSeconds > 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-amber-950 text-sm">Security Cooldown Active</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Too many attempts. You can try again in{" "}
                    <span className="inline-flex items-center justify-center font-black font-mono text-amber-950 px-2 py-0.5 rounded-lg bg-amber-200 border border-amber-300">
                      {lockoutSeconds}s
                    </span>
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 pr-12 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                lockoutSeconds > 0
                  ? "bg-amber-600 hover:bg-amber-600 cursor-not-allowed opacity-90 shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              }`}
            >
              {lockoutSeconds > 0
                ? `Locked: Retry in ${lockoutSeconds}s`
                : loading
                ? "Signing in..."
                : "Sign In"}
            </button>

          </form>
        </div>

        {/* Development information */}
        <p className="mt-4 text-center text-xs text-slate-400">
          RBMS Authentication
        </p>

      </div>
    </div>
  );
}

export default LoginPage;