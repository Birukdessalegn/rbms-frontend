import { NavLink, Outlet } from "react-router-dom";
import {
  ChefHat,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  {
    name: "Kitchen Dashboard",
    path: "/kitchen",
    icon: ChefHat,
  },
  {
    name: "Reports",
    path: "/kitchen/reports",
    icon: BarChart3,
  },
];

function KitchenLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <ChefHat className="h-5 w-5" />
          </div>

          <div>
            <h1 className="font-bold">RBMS</h1>
            <p className="text-xs text-slate-400">
              Kitchen
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kitchen
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/kitchen"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-orange-500 text-white"
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

        {/* User */}
        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 font-bold">
              {user?.name?.charAt(0)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name}
              </p>

              <p className="text-xs text-slate-400">
                Chef
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

      {/* Main content */}
      <main className="ml-64 min-h-screen flex-1 p-6">
        <Outlet />
      </main>

    </div>
  );
}

export default KitchenLayout;