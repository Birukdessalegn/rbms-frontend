import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChefHat,
  BarChart3,
} from "lucide-react";

import AppHeader from "../layouts/AppHeader";

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
  const location = useLocation();

  const isReportsPage = location.pathname === "/kitchen/reports";

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ================= SIDEBAR ================= */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}

        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <ChefHat className="h-5 w-5" />
          </div>

          <div>
            <h1 className="font-black tracking-wide">
              THE OAK CLUB
            </h1>

            <p className="text-xs text-slate-400">
              Kitchen
            </p>
          </div>

        </div>


        {/* ================= NAVIGATION ================= */}

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
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
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

      </aside>


      {/* ================= MAIN AREA ================= */}

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

        {/* Reusable Header */}

        <AppHeader
          title={
            isReportsPage
              ? "Kitchen Reports"
              : "Kitchen Dashboard"
          }
          description={
            isReportsPage
              ? "View and analyze kitchen performance"
              : "Monitor kitchen orders and operations"
          }
        />


        {/* Page Content */}

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default KitchenLayout;