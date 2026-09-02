import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  Users,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  Radio,
  Grid,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  UserCheck,
  Building2,
  Sliders,
  FileText,
  Utensils,
  ChevronRight,
  Shield,
  Eye,
  Wine,
} from "lucide-react";
import api from "../../../services/api";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Core Data States
  const [dashboardStats, setDashboardStats] = useState(null);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [barOrders, setBarOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Table Radar Filter & Work Journey Timeframe
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "occupied" | "unpaid" | "available"
  const [timeframe, setTimeframe] = useState("today"); // "today" | "lifetime"
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ============================================================
  // FETCH ALL ADMIN LIVE COMMAND DATA
  // ============================================================
  const fetchAdminLiveData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError("");

      const [dashRes, tablesRes, ordersRes, empRes, prodRes, kitchenRes, barRes, expRes] = await Promise.all([
        api("/dashboard").catch(() => ({})),
        api("/tables").catch(() => api("/pos/tables").catch(() => ({}))),
        api("/orders").catch(() => api("/pos/orders").catch(() => ({}))),
        api("/employees").catch(() => ({})),
        api("/products").catch(() => ({})),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => []),
        api("/expenses").catch(() => []),
      ]);

      if (dashRes && (dashRes.success || dashRes.stats || dashRes.data)) {
        setDashboardStats(dashRes.stats || dashRes.data || dashRes);
      }

      setTables(tablesRes.tables || tablesRes.data || (Array.isArray(tablesRes) ? tablesRes : []));
      setOrders(ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []));
      setEmployees(empRes.employees || empRes.data || (Array.isArray(empRes) ? empRes : []));
      setProducts(prodRes.products || prodRes.data || (Array.isArray(prodRes) ? prodRes : []));
      setKitchenOrders(Array.isArray(kitchenRes) ? kitchenRes : kitchenRes.orders || []);
      setBarOrders(Array.isArray(barRes) ? barRes : barRes.orders || []);
      setExpenses(Array.isArray(expRes) ? expRes : expRes.expenses || expRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch admin live data:", err);
      if (isInitial) setError(err.message || "Failed to load live command data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Live 10-Second Auto-Polling
  useEffect(() => {
    fetchAdminLiveData(true);
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => fetchAdminLiveData(false), 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAdminLiveData]);

  // ============================================================
  // DERIVED COMPUTATION: TABLE RADAR & LIVE TABS
  // ============================================================
  const tableRadarData = useMemo(() => {
    if (!Array.isArray(tables)) return [];

    return tables.map((tbl) => {
      // Match active unpaid orders associated with this table
      const tblOrders = (orders || []).filter((ord) => {
        const isCompletedOrPaid =
          ord.status === "completed" ||
          ord.status === "paid" ||
          ord.status === "cancelled" ||
          ord.payment_status === "paid" ||
          ord.is_paid === true;

        if (isCompletedOrPaid) return false;

        return (
          ord.table_id === tbl.id ||
          ord.table_number === tbl.table_number ||
          ord.table_name === tbl.name ||
          String(ord.table_number) === String(tbl.table_number)
        );
      });

      const hasActiveOrders = tblOrders.length > 0;
      const isOccupied = (tbl.status === "occupied" || tbl.is_occupied) && hasActiveOrders ? true : hasActiveOrders;

      // Sum active order amounts
      let totalAmount = 0;
      let isUnpaid = false;
      let waiterName = "Staff Waiter";
      let itemCount = 0;

      tblOrders.forEach((ord) => {
        const amt = Number(ord.total_amount || ord.total || ord.grand_total || 0);
        totalAmount += amt;

        const isOrdPaid = ord.payment_status === "paid" || ord.is_paid === true || ord.status === "completed" || ord.status === "paid";
        if (!isOrdPaid) {
          isUnpaid = true;
        }

        if (ord.waiter_name || ord.server_name || ord.created_by_name) {
          waiterName = ord.waiter_name || ord.server_name || ord.created_by_name;
        }

        if (Array.isArray(ord.items)) {
          itemCount += ord.items.reduce((acc, item) => acc + Number(item.quantity || 1), 0);
        }
      });

      return {
        id: tbl.id,
        number: tbl.table_number || tbl.number || tbl.id,
        name: tbl.name || `Table ${tbl.table_number || tbl.id}`,
        section: tbl.section || tbl.location || "Main Floor",
        capacity: tbl.capacity || 4,
        isOccupied,
        activeOrdersCount: tblOrders.length,
        itemCount,
        totalAmount,
        isUnpaid: isOccupied && (isUnpaid || totalAmount > 0),
        waiterName,
        orders: tblOrders,
      };
    });
  }, [tables, orders]);

  // Executive Summary Metrics
  const metrics = useMemo(() => {
    const totalTablesCount = tableRadarData.length;
    const occupiedTablesCount = tableRadarData.filter((t) => t.isOccupied).length;
    const openUnpaidTabsCount = tableRadarData.filter((t) => t.isUnpaid).length;
    const totalUnpaidPendingMoney = tableRadarData
      .filter((t) => t.isUnpaid)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const todayGrossRevenue = Number(dashboardStats?.today_sales ?? dashboardStats?.todaySales ?? 0);

    const lifetimeGrossRevenue = Number(
      dashboardStats?.all_time_sales ??
      dashboardStats?.lifetime_sales ??
      dashboardStats?.total_sales ??
      dashboardStats?.allTimeSales ??
      dashboardStats?.lifetimeRevenue ??
      (orders || []).reduce((sum, ord) => {
        const isPaid = ord.status === "completed" || ord.status === "paid" || ord.payment_status === "paid" || ord.is_paid === true;
        return isPaid ? sum + Number(ord.total_amount || ord.total || 0) : sum;
      }, 0)
    );

    const activeGrossRevenue = timeframe === "lifetime" ? (lifetimeGrossRevenue || todayGrossRevenue) : (todayGrossRevenue || lifetimeGrossRevenue);

    const completedOrders = Number(dashboardStats?.today_orders || dashboardStats?.total_orders || orders.length || 0);
    const activeStaffCount = employees.filter((e) => e.is_active || e.status === "active").length || employees.length;

    // Operating expenses sum
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || e.total || 0), 0);

    // Financial Tax & Net Earnings Calculation
    const totalVatTax = Math.round(activeGrossRevenue * 0.15 * 100) / 100;
    const totalServiceCharge = Math.round(activeGrossRevenue * 0.10 * 100) / 100;
    const netRevenue = Math.max(activeGrossRevenue - totalVatTax - totalServiceCharge - totalExpenses, 0);

    const lifetimeVatTax = Math.round(lifetimeGrossRevenue * 0.15 * 100) / 100;
    const lifetimeServiceCharge = Math.round(lifetimeGrossRevenue * 0.10 * 100) / 100;
    const lifetimeNetRevenue = Math.max(lifetimeGrossRevenue - lifetimeVatTax - lifetimeServiceCharge - totalExpenses, 0);

    return {
      totalTablesCount,
      occupiedTablesCount,
      openUnpaidTabsCount,
      totalUnpaidPendingMoney,
      grossRevenue: activeGrossRevenue,
      todayGrossRevenue,
      lifetimeGrossRevenue,
      totalVatTax,
      totalServiceCharge,
      totalExpenses,
      netRevenue,
      lifetimeNetRevenue,
      completedOrders,
      activeStaffCount,
    };
  }, [tableRadarData, dashboardStats, orders, employees, expenses, timeframe]);

  // Filtered Table Radar List
  const filteredRadarTables = useMemo(() => {
    return tableRadarData.filter((t) => {
      if (tableFilter === "occupied") return t.isOccupied;
      if (tableFilter === "unpaid") return t.isUnpaid;
      if (tableFilter === "available") return !t.isOccupied;
      return true;
    });
  }, [tableRadarData, tableFilter]);

  // Products Leaderboard Calculation
  const rawProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];
    return products.map((p) => {
      const qty = Number(p.quantity_sold || p.stock_quantity || 10);
      const unitPrice = Number(p.price || p.unit_price || 0);
      const rev = Number(p.revenue || (qty * unitPrice));
      return {
        id: p.id,
        name: p.name,
        category: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
        categoryType: p.category_type || (p.category_name?.toLowerCase().includes("bar") || p.category_name?.toLowerCase().includes("drink") ? "bar" : "food"),
        quantity: qty,
        unit: p.unit || "pcs",
        imageUrl: p.image_url || p.imageUrl || p.image,
        revenue: rev,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return rawProducts.filter((item) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "food") return item.categoryType === "food" || item.category.toLowerCase().includes("food");
      if (categoryFilter === "bar") return item.categoryType === "bar" || item.category.toLowerCase().includes("bar") || item.category.toLowerCase().includes("drink");
      return true;
    });
  }, [rawProducts, categoryFilter]);

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Connecting to Club Live Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900 min-h-screen rounded-3xl">
      {/* ============================================================
          EXECUTIVE COMMAND HEADER
      ============================================================ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-xs">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
              LIVE CLUB RADAR ACTIVE
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              Owner Executive View
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            👑 Owner Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time floor radar, occupied tables, live pending tabs, and club revenue flow.
          </p>
        </div>

        {/* Live Refresh & Timeframe Selector Switch */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/customers"
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <Users className="h-4 w-4" />
            VIP Customers & Ledger
          </Link>

          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-slate-200 text-xs font-extrabold shadow-xs">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "today"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Today Sales
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("lifetime")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                timeframe === "lifetime"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              👑 All-Time Club Journey
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 border border-slate-200 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
                autoRefresh ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Radio className={`h-3 w-3 ${autoRefresh ? "animate-pulse" : ""}`} />
              Auto 10s Live Sync
            </button>
            <button
              type="button"
              onClick={() => fetchAdminLiveData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              Sync Now
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-medium hidden lg:block">
            Updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* ============================================================
          TOP SECTION: REAL-TIME LIVE TABLE FLOOR RADAR & ORDERS MONITOR
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Grid className="h-5 w-5 text-blue-600" />
              Live Club Floor Radar & Table Tab Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live floor visualizer: Occupied tables, unpaid open tabs, waiter assignments & live order counts.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Radar:</span>
            <button
              type="button"
              onClick={() => setTableFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Tables ({metrics.totalTablesCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("occupied")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "occupied"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Occupied ({metrics.occupiedTablesCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("unpaid")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ⚠️ Unpaid Tabs ({metrics.openUnpaidTabsCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("available")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Free / Available ({metrics.totalTablesCount - metrics.occupiedTablesCount})
            </button>
          </div>
        </div>

        {/* RADAR TABLES GRID */}
        {filteredRadarTables.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No tables match the selected radar filter criteria.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRadarTables.map((tbl) => (
              <div
                key={tbl.id || tbl.number}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                  tbl.isUnpaid
                    ? "border-amber-300 bg-amber-50/40 shadow-xs"
                    : tbl.isOccupied
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-slate-200 bg-slate-50/50 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        tbl.isOccupied ? (tbl.isUnpaid ? "bg-amber-500 animate-ping" : "bg-blue-500") : "bg-emerald-500"
                      }`}
                    />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {tbl.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      tbl.isUnpaid
                        ? "bg-amber-200 text-amber-900"
                        : tbl.isOccupied
                        ? "bg-blue-200 text-blue-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {tbl.isUnpaid ? "Open Tab Unpaid" : tbl.isOccupied ? "Occupied" : "Free"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Section:</span>
                    <span className="font-bold text-slate-700">{tbl.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waiter Assigned:</span>
                    <span className="font-bold text-slate-800">{tbl.waiterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Items Ordered:</span>
                    <span className="font-bold text-slate-900">{tbl.itemCount} Items ({tbl.activeOrdersCount} Tickets)</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <span className="text-[11px] font-bold text-slate-500">Current Tab Total:</span>
                  <span className={`text-base font-black ${tbl.isUnpaid ? "text-amber-700" : "text-slate-900"}`}>
                    {formatMoney(tbl.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          MIDDLE SECTION: PORTION SALES LEADERBOARD
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Itemized Food & Drink Portion Sales Leaderboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live sales performance for food plates, beverage shots, glasses, and bottle items.
            </p>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                categoryFilter === "all" ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("food")}
              className={`rounded-lg px-3 py-1.5 transition ${
                categoryFilter === "food" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kitchen Food
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("bar")}
              className={`rounded-lg px-3 py-1.5 transition ${
                categoryFilter === "bar" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bar & Drinks
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No itemized sales records found. As sales occur at the POS, portion unit earnings will populate live here!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((prod, idx) => {
              const rank = idx + 1;

              return (
                <div
                  key={prod.id || prod.name}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-amber-400 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black shadow-xs ${
                        rank === 1
                          ? "bg-amber-400 text-slate-950"
                          : rank === 2
                          ? "bg-slate-200 text-slate-800"
                          : rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      #{rank}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 truncate max-w-[120px]">
                      {prod.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold border border-slate-200">
                      {prod.categoryType === "bar" ? (
                        <Wine className="h-6 w-6 text-purple-600" />
                      ) : (
                        <Utensils className="h-6 w-6 text-amber-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {prod.name}
                      </h3>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-700 border border-amber-200">
                        <span>{prod.quantity} {prod.unit} Sold</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] text-slate-500 font-medium">Total Revenue</span>
                    <span className="font-black text-emerald-700 text-base">
                      {formatMoney(prod.revenue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          BOTTOM SECTION: OWNER FINANCIAL TAX & NET EARNINGS BREAKDOWN
      ============================================================ */}
      <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30">
                👑 OWNER FINANCIAL STATEMENT
              </span>
              <span className="text-xs text-slate-400 font-semibold">Government Tax & Take-Home Profit Breakdown</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <DollarSign className="h-7 w-7 text-emerald-400" />
              Owner Financial Tax & Net Earnings Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Final executive statement: Gross sales, 15% VAT government tax, 10% staff service charge allocation, operating costs, and net owner profit.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                timeframe === "today" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              Today's Statement
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("lifetime")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                timeframe === "lifetime" ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              👑 All-Time Journey
            </button>
          </div>
        </div>

        {/* 5 FINANCIAL BREAKDOWN CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Gross Revenue */}
          <div className="rounded-2xl bg-slate-900/90 p-4 border border-slate-800 space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Business Revenue</p>
            <p className="text-2xl font-black text-white">{formatMoney(metrics.grossRevenue)}</p>
            <p className="text-[11px] text-emerald-400 font-semibold">Total POS Cash & Digital</p>
          </div>

          {/* 15% VAT Tax */}
          <div className="rounded-2xl bg-slate-900/90 p-4 border border-red-900/40 space-y-1">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Gov VAT Tax (15%)</p>
            <p className="text-2xl font-black text-red-300">-{formatMoney(metrics.totalVatTax)}</p>
            <p className="text-[11px] text-slate-400">Government Tax Deduction</p>
          </div>

          {/* 10% Service Charge */}
          <div className="rounded-2xl bg-slate-900/90 p-4 border border-amber-900/40 space-y-1">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Staff Service (10%)</p>
            <p className="text-2xl font-black text-amber-300">-{formatMoney(metrics.totalServiceCharge)}</p>
            <p className="text-[11px] text-slate-400">Tip & Staff Allocation</p>
          </div>

          {/* Operating Costs */}
          <div className="rounded-2xl bg-slate-900/90 p-4 border border-purple-900/40 space-y-1">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Operating & Stock Costs</p>
            <p className="text-2xl font-black text-purple-300">-{formatMoney(metrics.totalExpenses || 0)}</p>
            <p className="text-[11px] text-slate-400">Expenses & Stock POs</p>
          </div>

          {/* Net Owner Take-Home Profit */}
          <div className="rounded-2xl bg-emerald-950 p-4 border-2 border-emerald-400 space-y-1 shadow-lg">
            <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">👑 Owner Net Take-Home</p>
            <p className="text-2xl font-black text-emerald-400">{formatMoney(metrics.netRevenue)}</p>
            <p className="text-[11px] text-emerald-300 font-bold">Pure Net Profit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
