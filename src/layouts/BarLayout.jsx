import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Wine,
  ClipboardList,
  Flame,
  CheckCircle2,
  BarChart3,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

import AppHeader from "../layouts/AppHeader";


const menuItems = [
  {
    name: "Bar Dashboard",
    path: "/bar",
    icon: Wine,
  },
  {
    name: "New Orders",
    path: "/bar/new",
    icon: ClipboardList,
  },
  {
    name: "Preparing",
    path: "/bar/preparing",
    icon: Flame,
  },
  {
    name: "Ready Orders",
    path: "/bar/ready",
    icon: CheckCircle2,
  },
  {
    name: "Reports",
    path: "/bar/reports",
    icon: BarChart3,
  },
];

function BarLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isReportsPage = location.pathname === "/bar/reports";

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ================= SIDEBAR ================= */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
            <Wine className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-lg font-bold">
              RBMS
            </h1>

            <p className="text-xs text-slate-400">
              Bar Management
            </p>
          </div>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bar Operations
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/bar"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />

                <span>{item.name}</span>
              </NavLink>
            );
          })}

        </nav>


        {/* ================= USER ================= */}

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 font-bold">
              {user?.name?.charAt(0)}
            </div>

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold">
                {user?.name}
              </p>

              <p className="text-xs text-slate-400">
                {user?.role}
              </p>

            </div>

          </div>


          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />

            Logout
          </button>

        </div>

      </aside>


      {/* ================= MAIN AREA ================= */}

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

        {/* ================= HEADER ================= */}

        <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

          <AppHeader
            title="Bar Operations"
            description="Manage bar operations and drink orders"
          />

          <main className="min-w-0 flex-1 p-6">
            <Outlet />
          </main>

        </div>


        {/* ================= PAGE CONTENT ================= */}

        <main className="min-w-0 flex-1 p-6">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default BarLayout;   