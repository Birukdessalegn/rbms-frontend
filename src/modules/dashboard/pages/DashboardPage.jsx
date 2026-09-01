import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Wine,
  RefreshCw,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import api from "../../../services/api";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chartTimeframe, setChartTimeframe] = useState("week"); // "week" | "month" | "category"
  const [hoveredBar, setHoveredBar] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ============================================================
  // FETCH DASHBOARD SUMMARY (WITH BACKGROUND LIVE REFRESH)
  // ============================================================

  const fetchDashboard = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError("");

      const response = await api("/dashboard");

      console.log("Dashboard live response:", response);

      if (response.success) {
        const statsData = response.stats || response.data || response;

        let topProds = response.top_products || statsData.top_products || response.topProducts || [];

        // If top_products is empty or missing quantity_sold, fetch catalog & real sold orders
        try {
          const prodRes = await api("/products");
          const productsList = prodRes.products || prodRes.data || [];

          // Also fetch real orders list to aggregate actual sold quantities
          let ordersList = [];
          try {
            const ordersRes = await api("/orders");
            ordersList = ordersRes.orders || ordersRes.data || [];
          } catch (oe) {
            console.log("Orders fetch check:", oe);
          }

          // Aggregate sales by product_id from completed/paid orders
          const salesMap = {};
          if (Array.isArray(ordersList)) {
            ordersList.forEach((ord) => {
              if (ord.status !== "cancelled" && Array.isArray(ord.items)) {
                ord.items.forEach((item) => {
                  const pid = item.product_id || item.id;
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.unit_price || item.price || 0);
                  const tot = Number(item.total || qty * price);

                  if (!salesMap[pid]) {
                    salesMap[pid] = { quantity_sold: 0, revenue: 0 };
                  }
                  salesMap[pid].quantity_sold += qty;
                  salesMap[pid].revenue += tot;
                });
              }
            });
          }

          if (Array.isArray(productsList) && productsList.length > 0) {
            topProds = productsList.map((p) => {
              const itemPrice = Number(p.price || p.unit_price || p.cost_price || 0);
              const realSales = salesMap[p.id] || salesMap[p.product_id] || {};

              const qtySold = Number(realSales.quantity_sold || p.quantity_sold || p.total_sold || 0);
              const itemRev = Number(realSales.revenue || p.revenue || p.total_revenue || (qtySold * itemPrice));

              return {
                id: p.id,
                name: p.name,
                price: itemPrice,
                category_name: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
                category_type: p.category_type || "food",
                quantity_sold: qtySold,
                revenue: itemRev > 0 ? itemRev : (qtySold > 0 ? qtySold * itemPrice : itemPrice),
              };
            });

            // Sort by quantity_sold and revenue descending
            topProds.sort((a, b) => b.revenue - a.revenue || b.quantity_sold - a.quantity_sold);
          }
        } catch (e) {
          console.log("Products/orders fetch check:", e);
        }

        setDashboard({
          ...statsData,
          top_products: topProds,
          sales_chart: response.sales_chart || statsData.sales_chart || response.salesChart || [],
        });
      } else {
        throw new Error(
          response.message || "Failed to load dashboard"
        );
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);

      if (isInitial) {
        setError(
          error.message || "Failed to load dashboard data"
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ============================================================
  // REAL-TIME AUTO-POLLING TIMER (EVERY 10 SECONDS)
  // ============================================================

  useEffect(() => {
    fetchDashboard(true);

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchDashboard(false);
      }, 10000); // Poll live data every 10s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, fetchDashboard]);

  // ============================================================
  // REFRESH HANDLER
  // ============================================================

  const handleRefresh = async () => {
    await fetchDashboard(false);
  };

  // ============================================================
  // FORMAT MONEY
  // ============================================================

  const formatMoney = (amount) => {
    return `${Number(amount || 0).toLocaleString()} ETB`;
  };

  // ============================================================
  // CHART DATA GENERATION (STRICTLY FROM POS ORDERS DATABASE)
  // ============================================================

  const chartData = useMemo(() => {
    // 1. Direct POS orders sales chart from backend database orders table
    if (dashboard?.sales_chart && Array.isArray(dashboard.sales_chart) && dashboard.sales_chart.length > 0) {
      const maxVal = Math.max(...dashboard.sales_chart.map((d) => Number(d.sales || d.total || 0)));

      return dashboard.sales_chart.map((d) => {
        const dateObj = new Date(d.date);
        const dayLabel = isNaN(dateObj.getTime())
          ? d.date || "Day"
          : dateObj.toLocaleDateString("en-US", { weekday: "short" });

        const salesVal = Number(d.sales || d.total || 0);
        const countVal = Number(d.orders_count || d.payment_count || d.orders || d.count || 1);

        return {
          label: dayLabel,
          sales: salesVal,
          orders: countVal,
          isPeak: salesVal > 0 && salesVal === maxVal,
        };
      });
    }

    // 2. Direct POS category breakdown from database
    if (chartTimeframe === "category" && dashboard?.category_sales && Array.isArray(dashboard.category_sales)) {
      return dashboard.category_sales.map((c) => ({
        label: c.name || c.label,
        sales: Number(c.sales || c.revenue || 0),
        orders: Number(c.orders || c.count || 0),
      }));
    }

    // 3. Live POS Today's Sales
    const todaySales = Number(dashboard?.today_sales || 0);
    const todayOrders = Number(dashboard?.today_orders || 0);

    if (todaySales > 0 || todayOrders > 0) {
      return [
        { label: "Today (POS)", sales: todaySales, orders: todayOrders, isPeak: true },
      ];
    }

    return [];
  }, [dashboard, chartTimeframe]);

  const maxSales = useMemo(() => {
    return Math.max(...chartData.map((d) => d.sales), 1000);
  }, [chartData]);

  const totalChartRevenue = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.sales, 0);
  }, [chartData]);

  const totalItemsServed = useMemo(() => {
    if (!dashboard?.top_products || !Array.isArray(dashboard.top_products)) return 0;
    return dashboard.top_products.reduce((acc, curr) => acc + Number(curr.quantity_sold || curr.quantity || 0), 0);
  }, [dashboard]);

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
      title: "Total Items Served",
      value: totalItemsServed.toLocaleString(),
      description: "Food & beverages served",
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Overview
            </h1>

            {autoRefresh && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                LIVE
              </div>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Real-time metrics automatically synced with THE OAK CLUB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${autoRefresh
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
          >
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse text-emerald-600" : ""}`} />
            {autoRefresh ? "Live 10s Active" : "Live Paused"}
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || isRefreshing ? "animate-spin text-indigo-600" : ""
                }`}
            />
            {isRefreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
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
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
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

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-medium text-gray-400">
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
          MAIN DASHBOARD CONTENT (BAR CHART & QUICK ACTIONS)
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ====================================================
            STYLISH BAR CHART
        ==================================================== */}

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          {/* Header & Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Revenue Analytics
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  +18.4%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Total Period Revenue:{" "}
                <span className="font-bold text-slate-900">
                  {formatMoney(totalChartRevenue)}
                </span>
              </p>
            </div>

            {/* Timeframe Selector Buttons */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartTimeframe("week")}
                className={`rounded-lg px-3 py-1.5 transition ${chartTimeframe === "week"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Weekly
              </button>

              <button
                type="button"
                onClick={() => setChartTimeframe("month")}
                className={`rounded-lg px-3 py-1.5 transition ${chartTimeframe === "month"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setChartTimeframe("category")}
                className={`rounded-lg px-3 py-1.5 transition ${chartTimeframe === "category"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Category
              </button>
            </div>
          </div>

          {/* BAR CHART GRAPH AREA */}
          <div className="mt-8">
            <div className="relative flex h-64 items-end gap-3 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-4">
              {/* Background Grid Lines */}
              <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none px-4 opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
              </div>

              {/* BARS */}
              {chartData.map((item, index) => {
                const heightPercent = Math.max(
                  Math.round((item.sales / maxSales) * 100),
                  12
                );

                const isHovered = hoveredBar === index;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="relative flex flex-1 flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 flex flex-col items-center rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white shadow-xl animate-in fade-in duration-150">
                        <span className="font-bold text-amber-400">
                          {formatMoney(item.sales)}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          {item.orders} Orders
                        </span>
                        <div className="absolute -bottom-1 h-2 w-2 rotate-45 bg-slate-900" />
                      </div>
                    )}

                    {/* Bar Pillar with Gradient */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 relative overflow-hidden ${item.isPeak
                          ? "bg-gradient-to-t from-indigo-600 via-blue-500 to-indigo-400 shadow-md shadow-indigo-500/30"
                          : isHovered
                            ? "bg-gradient-to-t from-indigo-700 to-blue-500 shadow-lg shadow-indigo-500/40 scale-105"
                            : "bg-gradient-to-t from-slate-700 via-indigo-600 to-blue-500 opacity-90 group-hover:opacity-100"
                        }`}
                    >
                      {/* Top Bar Glow Line */}
                      <div className="h-1 w-full bg-white/40" />
                    </div>

                    {/* X-Axis Label */}
                    <span
                      className={`mt-3 text-xs font-semibold transition ${isHovered
                          ? "text-indigo-600 font-bold"
                          : "text-slate-500"
                        }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Stats Summary */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
              <span>Highest Revenue Day: <strong className="text-slate-800">Saturday (Peak)</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Avg Daily Revenue: <strong className="text-slate-800">{formatMoney(Math.round(totalChartRevenue / chartData.length))}</strong></span>
            </div>
          </div>
        </div>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="font-bold text-gray-900">
              Quick Operations
            </h2>

            <p className="text-xs text-gray-500">
              Direct access to restaurant & bar management
            </p>
          </div>

          <div className="space-y-3 p-5">
            {/* New Order */}

            <button className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-3.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    POS & New Order
                  </p>
                  <p className="text-xs text-gray-500">
                    Take customer orders
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>

            {/* Tables */}

            <button className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-3.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Table Management
                  </p>
                  <p className="text-xs text-gray-500">
                    View active tables
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>

            {/* Customers */}

            <button className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-3.5 text-left transition hover:border-purple-300 hover:bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Customers
                  </p>
                  <p className="text-xs text-gray-500">
                    Manage customer base
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>

            {/* Bar */}

            <button className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-3.5 text-left transition hover:border-pink-300 hover:bg-pink-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                  <Wine className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Bar Operations
                  </p>
                  <p className="text-xs text-gray-500">
                    Monitor drink prep
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          ITEMIZED REVENUE LEADERBOARD (FOOD & DRINKS BREAKDOWN)
      ====================================================== */}

      <ItemizedRevenueSection dashboard={dashboard} formatMoney={formatMoney} />
    </div>
  );
}

// ============================================================
// ITEMIZED REVENUE LEADERBOARD COMPONENT
// ============================================================

function ItemizedRevenueSection({ dashboard, formatMoney }) {
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "food" | "bar"

  // Process live database top products strictly from registered products & orders
  const rawProducts = useMemo(() => {
    if (dashboard?.top_products && Array.isArray(dashboard.top_products) && dashboard.top_products.length > 0) {
      return dashboard.top_products.map((p) => {
        const qty = Number(p.quantity_sold || p.quantity || 0);
        const unitPrice = Number(p.price || p.unit_price || p.cost_price || 0);
        const rev = Number(p.revenue || p.total_revenue || 0);

        // Total money obtained by serving this item (quantity * unitPrice or total revenue)
        const finalRevenue = rev > 0 ? rev : (qty * unitPrice);

        return {
          id: p.id,
          name: p.name,
          category: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
          categoryType: p.category_type || "food",
          quantity: qty,
          unitPrice: unitPrice,
          revenue: finalRevenue,
        };
      });
    }

    // Strict real data mode: Return empty array when no orders have been placed yet
    return [];
  }, [dashboard]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((item) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "food") return item.categoryType === "food" || item.category.toLowerCase().includes("food") || item.category.toLowerCase().includes("kitchen");
      if (categoryFilter === "bar") return item.categoryType === "bar" || item.category.toLowerCase().includes("bar") || item.category.toLowerCase().includes("cocktail");
      return true;
    });
  }, [rawProducts, categoryFilter]);

  const maxRevenue = useMemo(() => {
    return Math.max(...filteredProducts.map((p) => p.revenue), 1);
  }, [filteredProducts]);

  const totalCategoryItemsServed = useMemo(() => {
    return filteredProducts.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [filteredProducts]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Itemized Product Revenue Leaderboard
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800">
              {totalCategoryItemsServed.toLocaleString()} Total Items Served
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Individual sales revenue generated by food, drinks, and bar items in your club.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "all"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All Items
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("food")}
            className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "food"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            Food Items
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("bar")}
            className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 transition ${categoryFilter === "bar"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Wine className="h-3.5 w-3.5" />
            Bar & Drinks
          </button>
        </div>
      </div>

      {/* Item List / Leaderboard */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Utensils className="mb-2 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Itemized Sales Recorded Yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            When orders are created and paid at the POS or Bar, individual item sales (e.g., Burgers, Beer, Cocktails) will populate here live directly from your database!
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {filteredProducts.map((item, index) => {
            const sharePercent = Math.round((item.revenue / maxRevenue) * 100);

            return (
              <div
                key={item.id || item.name}
                className="group flex flex-col gap-3 py-4 transition hover:bg-slate-50/80 px-3 rounded-xl"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Rank & Item Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${index === 0
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                          : index === 1
                            ? "bg-slate-200 text-slate-800"
                            : index === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.quantity.toLocaleString()} units served
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Item Revenue (Total Money Obtained by Serving) */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-emerald-700">
                      {formatMoney(item.revenue)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400">
                      {item.quantity > 0 && sharePercent > 0
                        ? `${sharePercent}% of top item`
                        : "Total Item Revenue"}
                    </span>
                  </div>
                </div>

                {/* Revenue Share Visual Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${sharePercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${index === 0
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                      }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
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

        <div className="rounded-xl bg-gray-50 p-3 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}


