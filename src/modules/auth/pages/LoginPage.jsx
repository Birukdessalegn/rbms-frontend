import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        throw new Error(
          data.message || "Invalid username or password"
        );
      }

      if (!data.success) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      /*
       * Backend returns:
       *
       * {
       *   success: true,
       *   message: "Login successful",
       *   token: "...",
       *   user: {
       *      id,
       *      username,
       *      email,
       *      roleId,
       *      role
       *   }
       * }
       */

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

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

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

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
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