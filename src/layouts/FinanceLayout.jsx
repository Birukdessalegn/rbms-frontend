import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Receipt,
  ShoppingCart,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../layouts/AppHeader";

const menuItems = [
  {
    name: "Finance Dashboard",
    path: "/finance",
    icon: Wallet,
  },
  {
    name: "Cashier Reconciliation",
    path: "/finance/cashier-reconciliation",
    icon: CreditCard,
  },
  {
    name: "Sales",
    path: "/finance/sales",
    icon: TrendingUp,
  },
  {
    name: "Expenses",
    path: "/finance/expenses",
    icon: Receipt,
  },
  {
    name: "Purchases",
    path: "/finance/purchases",
    icon: ShoppingCart,
  },
  {
    name: "Payments",
    path: "/finance/payments",
    icon: CreditCard,
  },
  {
    name: "Transactions",
    path: "/finance/transactions",
    icon: ArrowLeftRight,
  },
  {
    name: "Reports",
    path: "/finance/reports",
    icon: BarChart3,
  },
];

function FinanceLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === "/finance") {
      return "Finance Dashboard";
    }

    if (location.pathname === "/finance/cashier-reconciliation") {
      return "Cashier Money Reconciliation";
    }

    if (location.pathname === "/finance/sales") {
      return "Sales";
    }

    if (location.pathname === "/finance/expenses") {
      return "Expenses";
    }

    if (location.pathname === "/finance/purchases") {
      return "Purchases";
    }

    if (location.pathname === "/finance/payments") {
      return "Payments";
    }

    if (location.pathname === "/finance/transactions") {
      return "Transactions";
    }

    if (location.pathname === "/finance/reports") {
      return "Financial Reports";
    }

    return "Finance";
  };

  const getPageDescription = () => {
    if (location.pathname === "/finance") {
      return "Monitor restaurant financial performance.";
    }

    if (location.pathname === "/finance/cashier-reconciliation") {
      return "Verify cashier daily cash handovers, shift totals, and digital payment receipts.";
    }

    if (location.pathname === "/finance/sales") {
      return "Monitor restaurant sales and revenue.";
    }

    if (location.pathname === "/finance/expenses") {
      return "Track and manage business expenses.";
    }

    if (location.pathname === "/finance/purchases") {
      return "Monitor purchasing costs and supplier payments.";
    }

    if (location.pathname === "/finance/payments") {
      return "Track payments and outstanding balances.";
    }

    if (location.pathname === "/finance/transactions") {
      return "View financial transactions.";
    }

    if (location.pathname === "/finance/reports") {
      return "Analyze financial performance and generate reports.";
    }

    return "Manage restaurant finances.";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ================= SIDEBAR ================= */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white">

        {/* Logo */}

        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <Wallet className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-lg font-black tracking-wide">
              THE OAK CLUB
            </h1>

            <p className="text-xs text-slate-400">
              Finance
            </p>
          </div>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Finance
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/finance"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
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

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold">
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


      {/* ================= MAIN ================= */}

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

        {/* Header */}

        <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">

          <AppHeader
            title="Finance Dashboard"
            description="Manage finances and transactions"
          />

          <main className="min-w-0 flex-1 p-6">
            <Outlet />
          </main>

        </div>


        {/* Content */}

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default FinanceLayout;