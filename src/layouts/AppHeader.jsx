import { useState, useRef, useEffect } from "react";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function AppHeader({
  title = "Dashboard",
  description = "Restaurant & Bar Management System",
}) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

      {/* ================= LEFT ================= */}

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="text-xs text-slate-500">
          {description}
        </p>
      </div>


      {/* ================= RIGHT ================= */}

      <div className="flex items-center gap-4">

        {/* Online Status */}

        <div className="hidden items-center gap-2 sm:flex">

          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

          <span className="text-xs font-medium text-slate-500">
            Online
          </span>

        </div>


        {/* Profile */}

        <div
          ref={dropdownRef}
          className="relative border-l border-slate-200 pl-4"
        >

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
          >

            {/* Avatar */}

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>


            {/* User Info */}

            <div className="hidden text-left md:block">

              <p className="text-xs font-bold text-slate-900">
                {user?.name || "User"}
              </p>

              <p className="text-[11px] text-slate-500">
                {user?.role || "USER"}
              </p>

            </div>


            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition md:block ${
                open ? "rotate-180" : ""
              }`}
            />

          </button>


          {/* ================= DROPDOWN ================= */}

          {open && (
            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

              {/* User */}

              <div className="border-b border-slate-100 px-4 py-3">

                <p className="text-sm font-semibold text-slate-900">
                  {user?.name}
                </p>

                <p className="text-xs text-slate-500">
                  {user?.email}
                </p>

              </div>


              {/* Profile */}

              <button
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >

                <User className="h-4 w-4" />

                My Profile

              </button>


              {/* Settings */}

              <button
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >

                <Settings className="h-4 w-4" />

                Settings

              </button>


              {/* Logout */}

              <div className="border-t border-slate-100">

                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
                >

                  <LogOut className="h-4 w-4" />

                  Logout

                </button>

              </div>

            </div>
          )}

        </div>

      </div>

    </header>
  );
}

export default AppHeader;