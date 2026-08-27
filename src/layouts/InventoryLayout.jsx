import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Package,
  Boxes,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

import AppHeader from "../layouts/AppHeader";

const menuItems = [
  {
    name: "Inventory",
    path: "/inventory",
    icon: Package,
  },
  {
    name: "Stock",
    path: "/inventory/stock",
    icon: Boxes,
  },
  {
    name: "Low Stock",
    path: "/inventory/low-stock",
    icon: AlertTriangle,
  },
  {
    name: "Transactions",
    path: "/inventory/transactions",
    icon: ArrowLeftRight,
  },
  {
    name: "Reports",
    path: "/inventory/reports",
    icon: BarChart3,
  },
];

function InventoryLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isReportsPage =
    location.pathname === "/inventory/reports";

  const getPageTitle = () => {
    if (location.pathname === "/inventory") {
      return "Inventory";
    }

    if (location.pathname === "/inventory/stock") {
      return "Stock Management";
    }

    if (location.pathname === "/inventory/low-stock") {
      return "Low Stock";
    }

    if (location.pathname === "/inventory/transactions") {
      return "Inventory Transactions";
    }

    if (location.pathname === "/inventory/reports") {
      return "Inventory Reports";
    }

    return "Inventory";
  };

  const getPageDescription = () => {
    if (location.pathname === "/inventory") {
      return "Monitor and manage restaurant inventory.";
    }

    if (location.pathname === "/inventory/stock") {
      return "Manage available stock and quantities.";
    }

    if (location.pathname === "/inventory/low-stock") {
      return "Monitor items that need to be restocked.";
    }

    if (location.pathname === "/inventory/transactions") {
      return "Track all inventory movements.";
    }

    if (location.pathname === "/inventory/reports") {
      return "Analyze inventory performance and movements.";
    }

    return "Manage restaurant inventory.";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}

        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <Package className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-lg font-bold">
              RBMS
            </h1>

            <p className="text-xs text-slate-400">
              Inventory
            </p>
          </div>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Inventory Management
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/inventory"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
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


        {/* User */}

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800 p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
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
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
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


        {/* =================================================
            HEADER
        ================================================== */}

        <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

          <AppHeader
            title="Inventory Dashboard"
            description="Manage stock, inventory and supplies"
          />

          <main className="min-w-0 flex-1 p-6">
            <Outlet />
          </main>

        </div>


        {/* =================================================
            PAGE CONTENT
        ================================================== */}

        <main className="min-w-0 flex-1 p-6">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default InventoryLayout;