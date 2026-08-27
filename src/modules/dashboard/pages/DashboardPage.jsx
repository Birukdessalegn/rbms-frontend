import { useEffect, useState } from "react";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Wine,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [error, setError] = useState("");
  const [ordersError, setOrdersError] = useState("");

  // ============================================================
  // FETCH DASHBOARD SUMMARY
  // ============================================================

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api("/dashboard");

      console.log("Dashboard response:", response);

      if (response.success) {
        setDashboard(response.stats);
      } else {
        throw new Error(
          response.message || "Failed to load dashboard"
        );
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);

      setError(
        error.message || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH RECENT ORDERS
  // ============================================================

  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError("");

      const response = await api(
        "/dashboard/orders/recent"
      );

      console.log(
        "Recent orders response:",
        response
      );

      if (response.success) {
        setRecentOrders(response.orders || []);
      } else {
        throw new Error(
          response.message ||
            "Failed to load recent orders"
        );
      }
    } catch (error) {
      console.error(
        "Failed to fetch recent orders:",
        error
      );

      setOrdersError(
        error.message ||
          "Failed to load recent orders"
      );
    } finally {
      setOrdersLoading(false);
    }
  };

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  useEffect(() => {
    fetchDashboard();
    fetchRecentOrders();
  }, []);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {
    await Promise.all([
      fetchDashboard(),
      fetchRecentOrders(),
    ]);
  };

  // ============================================================
  // FORMAT MONEY
  // ============================================================

  const formatMoney = (amount) => {
    return `${Number(amount || 0).toLocaleString()} ETB`;
  };

  // ============================================================
  // FORMAT ORDER TYPE
  // ============================================================

  const formatOrderType = (type) => {
    if (!type) return "-";

    switch (type.toLowerCase()) {
      case "dine_in":
        return "Restaurant";

      case "takeaway":
        return "Takeaway";

      case "delivery":
        return "Delivery";

      case "bar":
        return "Bar";

      default:
        return type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          );
    }
  };

  // ============================================================
  // FORMAT STATUS
  // ============================================================

  const formatStatus = (status) => {
    if (!status) return "-";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "served":
        return "bg-green-100 text-green-700";

      case "preparing":
      case "confirmed":
        return "bg-blue-100 text-blue-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />

          <span className="text-sm">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here's what's happening in
            your restaurant and bar today.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-red-800">
                Failed to load dashboard
              </h2>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD VALUES
  // ============================================================

  const todayOrders = Number(
    dashboard?.today_orders || 0
  );

  const activeTables = Number(
    dashboard?.active_tables || 0
  );

  const todaySales = Number(
    dashboard?.today_sales || 0
  );

  const pendingKitchenOrders = Number(
    dashboard?.pending_kitchen_orders || 0
  );

  const pendingBarOrders = Number(
    dashboard?.pending_bar_orders || 0
  );

  // ============================================================
  // STAT CARDS
  // ============================================================

  const stats = [
    {
      title: "Today's Orders",
      value: todayOrders.toLocaleString(),
      description: "Orders created today",
      icon: ShoppingCart,
    },

    {
      title: "Active Tables",
      value: activeTables.toLocaleString(),
      description: "Currently occupied",
      icon: Utensils,
    },

    {
      title: "Today's Revenue",
      value: formatMoney(todaySales),
      description: "Paid sales today",
      icon: DollarSign,
    },

    {
      title: "Pending Orders",
      value: (
        pendingKitchenOrders +
        pendingBarOrders
      ).toLocaleString(),
      description: `${pendingKitchenOrders} kitchen · ${pendingBarOrders} bar`,
      icon: Clock,
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here's what's happening in
            your restaurant and bar today.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || ordersLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading || ordersLoading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </h2>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-sm text-gray-400">
                  {stat.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================
          ADDITIONAL SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Products */}

        <SummaryCard
          title="Active Products"
          value={Number(
            dashboard?.total_products || 0
          ).toLocaleString()}
          description={`${Number(
            dashboard?.available_products || 0
          )} available`}
          icon={ShoppingCart}
        />

        {/* Low Stock */}

        <SummaryCard
          title="Low Stock"
          value={Number(
            dashboard?.low_stock_products || 0
          ).toLocaleString()}
          description="Products need attention"
          icon={Clock}
        />

        {/* Employees */}

        <SummaryCard
          title="Active Employees"
          value={Number(
            dashboard?.active_employees || 0
          ).toLocaleString()}
          description="Currently active"
          icon={Users}
        />

        {/* Expenses */}

        <SummaryCard
          title="Today's Expenses"
          value={formatMoney(
            dashboard?.today_expenses
          )}
          description="Paid expenses today"
          icon={DollarSign}
        />
      </div>

      {/* ======================================================
          MAIN DASHBOARD CONTENT
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ====================================================
            RECENT ORDERS
        ==================================================== */}

        <div className="rounded-xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h2 className="font-semibold text-gray-900">
                Recent Orders
              </h2>

              <p className="text-sm text-gray-500">
                Latest restaurant and bar orders
              </p>
            </div>

            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>

          {/* Orders Loading */}

          {ordersLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />

                Loading orders...
              </div>
            </div>
          ) : ordersError ? (
            <div className="p-5">
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {ordersError}
              </div>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No recent orders found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 p-5 transition hover:bg-gray-50"
                >
                  {/* Order Information */}

                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {order.order_number
                        ? `#${order.order_number}`
                        : `#${order.id}`}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatOrderType(
                        order.order_type
                      )}

                      {order.table_number && (
                        <>
                          {" "}
                          · Table{" "}
                          {order.table_number}
                        </>
                      )}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {order.created_at
                        ? new Date(
                            order.created_at
                          ).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  {/* Order Amount */}

                  <div className="shrink-0 text-right">
                    <p className="font-medium text-gray-900">
                      {formatMoney(order.total)}
                    </p>

                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {formatStatus(
                        order.status
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900">
              Quick Actions
            </h2>

            <p className="text-sm text-gray-500">
              Common restaurant and bar operations
            </p>
          </div>

          <div className="space-y-3 p-5">
            {/* New Order */}

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />

              <div>
                <p className="font-medium text-gray-900">
                  New Order
                </p>

                <p className="text-xs text-gray-500">
                  Create a restaurant or bar order
                </p>
              </div>
            </button>

            {/* Tables */}

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Utensils className="h-5 w-5 text-green-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Table Management
                </p>

                <p className="text-xs text-gray-500">
                  View and manage tables
                </p>
              </div>
            </button>

            {/* Customers */}

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Users className="h-5 w-5 text-purple-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Customers
                </p>

                <p className="text-xs text-gray-500">
                  Manage customer information
                </p>
              </div>
            </button>

            {/* Bar */}

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Wine className="h-5 w-5 text-pink-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Bar Operations
                </p>

                <p className="text-xs text-gray-500">
                  Monitor drink orders
                </p>
              </div>
            </button>

            {/* Activity */}

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Clock className="h-5 w-5 text-orange-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Today's Activity
                </p>

                <p className="text-xs text-gray-500">
                  View today's restaurant and bar
                  activity
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
      </div>
    </div>
  );
}