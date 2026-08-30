import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  BarChart3,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  ChevronDown,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";

const menuItems = [
  {
    name: "POS",
    path: "/pos",
    icon: ShoppingCart,
  },
  {
    name: "Reports",
    path: "/pos/reports",
    icon: BarChart3,
  },
];

function POSLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  const isReportsPage = location.pathname === "/pos/reports";

  /* =====================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  ====================================================== */

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}

        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ShoppingCart className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-lg font-black tracking-wide">
              THE OAK CLUB
            </h1>

            <p className="text-xs text-slate-400">
              POS & Waiter
            </p>
          </div>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Operations
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/pos"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />

                <span>
                  {item.name}
                </span>

              </NavLink>
            );
          })}

        </nav>


        {/* Sidebar user */}

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold">

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


      {/* =====================================================
          MAIN AREA
      ====================================================== */}

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">


        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 md:px-6 backdrop-blur-md">


          {/* LEFT */}

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2 text-sm">

              <span className="hidden sm:inline font-semibold text-slate-500">
                {isReportsPage ? "Reports" : "Operations"}
              </span>

              <span className="hidden sm:inline text-slate-400 font-bold">
                /
              </span>

              <span className="font-bold text-blue-950 text-base md:text-lg tracking-tight">
                {isReportsPage ? "POS Reports" : "Point of Sale"}
              </span>

            </div>

          </div>


          {/* RIGHT */}

          <div className="flex items-center gap-2.5 md:gap-4">


            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <div
              className="relative"
              ref={notificationRef}
            >

              <button
                onClick={() =>
                  setShowNotifications(!showNotifications)
                }
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition"
                aria-label="Notifications"
              >

                <Bell className="h-5 w-5" />

                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />

              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">

                  <div className="border-b border-slate-100 pb-3">

                    <h3 className="text-sm font-semibold text-slate-900">
                      Notifications
                    </h3>

                  </div>

                  <div className="py-4 text-xs text-slate-500">
                    No new notifications.
                  </div>

                </div>
              )}

            </div>


            {/* Divider */}

            <div className="hidden h-6 w-px bg-slate-200 sm:block" />


            {/* =================================================
                USER PROFILE
            ================================================= */}

            <div
              className="relative"
              ref={userMenuRef}
            >

              <button
                onClick={() =>
                  setShowUserMenu(!showUserMenu)
                }
                className="flex items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-slate-100"
              >

                {/* Avatar */}

                <div className="relative">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-sm font-semibold text-white shadow-sm">

                    {user?.name?.charAt(0)}

                  </div>

                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />

                </div>


                {/* Name */}

                <div className="hidden flex-col md:flex">

                  <span className="text-xs font-bold text-slate-900">
                    {user?.name}
                  </span>

                  <span className="text-[11px] font-medium text-slate-500">
                    {user?.role}
                  </span>

                </div>


                <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />

              </button>


              {/* =================================================
                  USER DROPDOWN
              ================================================= */}

              {showUserMenu && (

                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">


                  {/* User info */}

                  <div className="border-b border-slate-100 px-3 py-2">

                    <p className="text-xs font-bold text-slate-900">
                      {user?.name}
                    </p>

                    <p className="truncate text-[11px] text-slate-500">
                      {user?.email}
                    </p>

                  </div>


                  {/* Menu */}

                  <div className="space-y-0.5 py-1">

                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >

                      <User className="h-4 w-4 text-slate-400" />

                      My Profile

                    </button>


                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >

                      <Settings className="h-4 w-4 text-slate-400" />

                      Store Settings

                    </button>


                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >

                      <ShieldCheck className="h-4 w-4 text-slate-400" />

                      Audit Logs

                    </button>

                  </div>


                  {/* Logout */}

                  <div className="border-t border-slate-100 pt-1">

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >

                      <LogOut className="h-4 w-4 text-rose-500" />

                      Log Out

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </header>


        {/* =====================================================
            PAGE CONTENT
        ====================================================== */}

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default POSLayout;