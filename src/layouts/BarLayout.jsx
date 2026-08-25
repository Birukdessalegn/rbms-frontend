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

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

          {/* Page title */}

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              {isReportsPage ? "Bar Reports" : "Bar Dashboard"}
            </h2>

            <p className="text-xs text-slate-500">
              {isReportsPage
                ? "View and analyze bar sales performance"
                : "Manage drink orders and bar operations"}
            </p>

          </div>


          {/* Right side */}

          <div className="flex items-center gap-4">

            {/* Online */}

            <div className="hidden items-center gap-2 sm:flex">

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-slate-500">
                Online
              </span>

            </div>


            {/* User */}

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-sm font-bold text-white">
                {user?.name?.charAt(0)}
              </div>

              <div className="hidden md:block">

                <p className="text-xs font-bold text-slate-900">
                  {user?.name}
                </p>

                <p className="text-[11px] text-slate-500">
                  {user?.role}
                </p>

              </div>

              <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />

            </div>

          </div>

        </header>


        {/* ================= PAGE CONTENT ================= */}

        <main className="min-w-0 flex-1 p-6">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default BarLayout;   