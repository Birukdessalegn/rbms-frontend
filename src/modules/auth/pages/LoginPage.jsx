import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { UtensilsCrossed } from "lucide-react";

const demoUsers = [
  {
    id: 1,
    name: "Biruk Admin",
    email: "admin@rbms-restaurant.com",
    password: "admin123",
    role: "ADMIN",
  },
  {
    id: 2,
    name: "Restaurant Manager",
    email: "manager@rbms-restaurant.com",
    password: "manager123",
    role: "MANAGER",
  },
  {
    id: 3,
    name: "Waiter",
    email: "waiter@rbms-restaurant.com",
    password: "waiter123",
    role: "WAITER",
  },
  {
    id: 4,
    name: "Head Chef",
    email: "chef@rbms-restaurant.com",
    password: "chef123",
    role: "CHEF",
  },
  {
    id: 5,
    name: "Bartender",
    email: "bartender@rbms-restaurant.com",
    password: "bartender123",
    role: "BARTENDER",
  },
  {
    id: 6,
    name: "Storekeeper",
    email: "store@rbms-restaurant.com",
    password: "store123",
    role: "STOREKEEPER",
  },
  {
    id: 7,
    name: "Purchasing Officer",
    email: "purchasing@rbms-restaurant.com",
    password: "purchasing123",
    role: "PURCHASING",
  },
  {
    id: 8,
    name: "Accountant",
    email: "accountant@rbms-restaurant.com",
    password: "accountant123",
    role: "ACCOUNTANT",
  },
  {
    id: 9,
    name: "HR Officer",
    email: "hr@rbms-restaurant.com",
    password: "hr123",
    role: "HR",
  },
];

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    const foundUser = demoUsers.find(
      (item) =>
        item.email === email.trim().toLowerCase() &&
        item.password === password
    );

    if (!foundUser) {
      setError("Invalid email or password.");
      return;
    }

    const { password: _, ...userData } = foundUser;

    login(userData);

    
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
            <UtensilsCrossed className="h-7 w-7" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            RBMS
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Restaurant & Bar Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                required
              />
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
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;