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

  // Table Radar Filter & Work Journey Timeframe
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "occupied" | "unpaid" | "available"
  const [timeframe, setTimeframe] = useState("today"); // "today" | "lifetime"

  // ============================================================
  // FETCH ALL ADMIN LIVE COMMAND DATA
  // ============================================================
  const fetchAdminLiveData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError("");

      const [dashRes, tablesRes, ordersRes, empRes, prodRes, kitchenRes, barRes] = await Promise.all([
        api("/dashboard").catch(() => ({})),
        api("/tables").catch(() => api("/pos/tables").catch(() => ({}))),
        api("/orders").catch(() => api("/pos/orders").catch(() => ({}))),
        api("/employees").catch(() => ({})),
        api("/products").catch(() => ({})),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => []),
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

    // Financial Tax & Net Earnings Calculation
    const totalVatTax = Math.round(activeGrossRevenue * 0.15 * 100) / 100;
    const totalServiceCharge = Math.round(activeGrossRevenue * 0.10 * 100) / 100;
    const netRevenue = Math.max(activeGrossRevenue - totalVatTax - totalServiceCharge, 0);

    const lifetimeVatTax = Math.round(lifetimeGrossRevenue * 0.15 * 100) / 100;
    const lifetimeServiceCharge = Math.round(lifetimeGrossRevenue * 0.10 * 100) / 100;
    const lifetimeNetRevenue = Math.max(lifetimeGrossRevenue - lifetimeVatTax - lifetimeServiceCharge, 0);

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
      netRevenue,
      lifetimeNetRevenue,
      completedOrders,
      activeStaffCount,
    };
  }, [tableRadarData, dashboardStats, orders, employees, timeframe]);

  // Filtered Table Radar List
  const filteredRadarTables = useMemo(() => {
    return tableRadarData.filter((t) => {
      if (tableFilter === "occupied") return t.isOccupied;
      if (tableFilter === "unpaid") return t.isUnpaid;
      if (tableFilter === "available") return !t.isOccupied;
      return true;
    });
  }, [tableRadarData, tableFilter]);

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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
              LIVE CLUB RADAR ACTIVE
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              Owner Executive View
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            👑 Owner Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time floor radar, occupied tables, live pending tabs, and club revenue flow.
          </p>
        </div>

        {/* Live Refresh & Timeframe Selector Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* TIMEFRAME SELECTOR */}
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-slate-200 text-xs font-extrabold shadow-sm">
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

          <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 border border-slate-200 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
                autoRefresh ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
          EXECUTIVE FINANCIAL PULSE & METRICS CARDS
      ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Gross Revenue (Today / Active) */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {timeframe === "lifetime" ? "All-Time Journey Revenue" : "Total Revenue Today"}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
            {formatMoney(metrics.grossRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>{timeframe === "lifetime" ? "Cumulative Revenue" : "Settled Payments"}</span>
            <span className="font-bold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Live
            </span>
          </div>
        </div>

        {/* All-Time Club Work Journey Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Club Work Journey (All-Time)
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-black shadow-xs text-sm">
              👑
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-950">
            {formatMoney(metrics.lifetimeGrossRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Net Profit: {formatMoney(metrics.lifetimeNetRevenue)}</span>
            <span className="text-amber-700 font-extrabold">Lifetime Total</span>
          </div>
        </div>

        {/* Live Open Pending Tabs */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Unpaid Pending Tabs
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-bold">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-600">
            {formatMoney(metrics.totalUnpaidPendingMoney)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-amber-700 font-bold">
            <span>{metrics.openUnpaidTabsCount} Open Unpaid Tables</span>
            <span>Pending Cashier Pay</span>
          </div>
        </div>

        {/* Floor Occupancy Radar */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Floor Table Occupancy
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <Grid className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
            {metrics.occupiedTablesCount} <span className="text-sm font-normal text-slate-500">/ {metrics.totalTablesCount} Tables</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>
              {metrics.totalTablesCount > 0
                ? `${Math.round((metrics.occupiedTablesCount / metrics.totalTablesCount) * 100)}% Capacity`
                : "0% Capacity"}
            </span>
            <span className="text-emerald-700 font-bold">
              {metrics.totalTablesCount - metrics.occupiedTablesCount} Free
            </span>
          </div>
        </div>

        {/* Active Staff Shift */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Active Shift Staff
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
            {metrics.activeStaffCount} <span className="text-sm font-normal text-slate-500">Staff Duty</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-purple-700 font-semibold">
            <span>Waiters & Bartenders</span>
            <span className="font-semibold">On Floor</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          REAL-TIME LIVE TABLE FLOOR RADAR & ORDERS MONITOR
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Grid className="h-5 w-5 text-blue-600" />
              Live Club Floor Radar & Table Tab Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant breakdown of occupied tables, assigned waiters, served items, and unpaid tab balances.
            </p>
          </div>

          {/* Table Radar Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTableFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                tableFilter === "all" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Tables ({tableRadarData.length})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("occupied")}
              className={`rounded-lg px-3 py-1.5 transition ${
                tableFilter === "occupied" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Occupied ({tableRadarData.filter((t) => t.isOccupied).length})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("unpaid")}
              className={`rounded-lg px-3 py-1.5 transition ${
                tableFilter === "unpaid" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unpaid Pending Tabs ({tableRadarData.filter((t) => t.isUnpaid).length})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("available")}
              className={`rounded-lg px-3 py-1.5 transition ${
                tableFilter === "available" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Available ({tableRadarData.filter((t) => !t.isOccupied).length})
            </button>
          </div>
        </div>

        {/* Radar Table Grid */}
        {filteredRadarTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Building2 className="h-10 w-10 mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No tables match the selected filter</p>
            <p className="text-xs text-slate-400 mt-1">
              Select "All Tables" or check the POS to assign orders to tables.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRadarTables.map((tbl) => (
              <div
                key={tbl.id}
                className={`relative rounded-2xl border p-4 transition-all hover:shadow-md ${
                  tbl.isUnpaid
                    ? "border-rose-300 bg-rose-50/70"
                    : tbl.isOccupied
                    ? "border-amber-300 bg-amber-50/70"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                {/* Table Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm ${
                        tbl.isUnpaid
                          ? "bg-rose-100 text-rose-700 border border-rose-300"
                          : tbl.isOccupied
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      T-{tbl.number}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{tbl.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{tbl.section}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      tbl.isUnpaid
                        ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                        : tbl.isOccupied
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {tbl.isUnpaid ? "🔴 UNPAID TAB" : tbl.isOccupied ? "🟡 OCCUPIED" : "🟢 FREE"}
                  </span>
                </div>

                {/* Table Info & Waiter */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 font-medium">Assigned Waiter:</span>
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> {tbl.waiterName}
                    </span>
                  </div>

                  {tbl.isOccupied ? (
                    <>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500 font-medium">Active Orders:</span>
                        <span className="font-bold text-slate-900">{tbl.activeOrdersCount} Order(s) ({tbl.itemCount} items)</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-sm">
                        <span className="text-slate-500 font-medium">Total Bill:</span>
                        <span className={`font-black ${tbl.isUnpaid ? "text-rose-600" : "text-emerald-700"}`}>
                          {formatMoney(tbl.totalAmount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 text-center text-slate-400 text-xs font-medium">
                      Table ready for guests
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          EXECUTIVE FINANCIAL TAX & NET EARNINGS BREAKDOWN BAR
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Owner Financial Tax & Net Earnings Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Automated 15% VAT Tax, 10% Service Charge, and Net Earnings calculation.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            Real-Time Tax Ledger
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* 15% VAT */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
              15% VAT Tax Collected
            </p>
            <p className="mt-2 text-xl font-black text-slate-900">
              {formatMoney(metrics.totalVatTax)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Computed 15% VAT on sales
            </p>
          </div>

          {/* 10% Service Charge */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              10% Service Charge
            </p>
            <p className="mt-2 text-xl font-black text-slate-900">
              {formatMoney(metrics.totalServiceCharge)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Staff & facility fee allocation
            </p>
          </div>

          {/* Net Earnings */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Owner Net Earnings
            </p>
            <p className="mt-2 text-xl font-black text-emerald-700">
              {formatMoney(metrics.netRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-slate-600 font-medium">
              Gross Revenue minus Tax & Fees
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          ITEMIZED FOOD & DRINK PORTION LEADERBOARD
      ============================================================ */}
      <ItemizedPortionLeaderboard
        dashboardStats={dashboardStats}
        orders={orders}
        kitchenOrders={kitchenOrders}
        barOrders={barOrders}
        products={products}
        formatMoney={formatMoney}
      />

      {/* ============================================================
          OWNER QUICK COMMAND ACTION CENTER
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-blue-600" />
          Owner Quick Command Shortcuts
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/pos/sales-audit"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-blue-400 hover:shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Daily Sales Audit</p>
                <p className="text-[11px] text-slate-500">View real-time cashier shift sales</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </Link>

          <Link
            to="/pos/reports"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-emerald-400 hover:shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">POS Reports</p>
                <p className="text-[11px] text-slate-500">Detailed sales & category analytics</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </Link>

          <Link
            to="/employees/attendance"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-purple-400 hover:shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Attendance Terminal</p>
                <p className="text-[11px] text-slate-500">Check-in / check-out shift logs</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition" />
          </Link>

          <Link
            to="/products"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-amber-400 hover:shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Products Catalog</p>
                <p className="text-[11px] text-slate-500">Manage food & drink images</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ITEMIZED FOOD & DRINK PORTION LEADERBOARD COMPONENT
// ============================================================

function ItemizedPortionLeaderboard({ dashboardStats, orders, kitchenOrders = [], barOrders = [], products, formatMoney }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const parseRawItems = (itemsInput) => {
    if (!itemsInput) return [];
    if (typeof itemsInput === "string") {
      try {
        return JSON.parse(itemsInput);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(itemsInput) ? itemsInput : [];
  };

  const rawProducts = useMemo(() => {
    // 1. Build real-time sales map from POS, Kitchen, and Bar orders
    const salesMap = {};
    const allOrdersList = [
      ...(Array.isArray(orders) ? orders : []),
      ...(Array.isArray(kitchenOrders) ? kitchenOrders : []),
      ...(Array.isArray(barOrders) ? barOrders : []),
    ];

    allOrdersList.forEach((ord) => {
      if (ord.status !== "cancelled") {
        const itemsList = parseRawItems(ord.items || ord.order_items);
        itemsList.forEach((item) => {
          const pid = String(item.product_id || item.id || "");
          const pName = String(item.product_name || item.name || "").toLowerCase().trim();
          const qty = Number(item.quantity || item.qty || 1);
          const price = Number(item.unit_price || item.price || 0);
          const tot = Number(item.total || qty * price);

          if (pid) {
            if (!salesMap[pid]) salesMap[pid] = { quantity: 0, revenue: 0 };
            salesMap[pid].quantity += qty;
            salesMap[pid].revenue += tot;
          }
          if (pName) {
            if (!salesMap[pName]) salesMap[pName] = { quantity: 0, revenue: 0 };
            salesMap[pName].quantity += qty;
            salesMap[pName].revenue += tot;
          }
        });
      }
    });

    // 2. Map from registered products list if available
    if (Array.isArray(products) && products.length > 0) {
      return products.map((p) => {
        const pidKey = String(p.id);
        const nameKey = String(p.name || "").toLowerCase().trim();
        const realSales = salesMap[pidKey] || salesMap[nameKey] || {};

        const qty = Number(realSales.quantity || p.quantity_sold || p.quantity || 0);
        const unitPrice = Number(p.price || p.unit_price || p.cost_price || 0);
        const rev = Number(realSales.revenue || p.revenue || p.total_revenue || (qty * unitPrice));

        return {
          id: p.id,
          name: p.name,
          category: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
          categoryType: p.category_type || (p.category_name?.toLowerCase().includes("bar") || p.category_name?.toLowerCase().includes("drink") ? "bar" : "food"),
          quantity: qty,
          unit: p.unit || "pcs",
          imageUrl: p.image_url || p.imageUrl || p.image || p.image_path || p.product_image || p.picture || p.photo || p.filepath,
          revenue: rev,
        };
      }).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
    }

    // 3. Fallback to top_products
    const topProds = dashboardStats?.top_products || dashboardStats?.topProducts || [];
    if (!Array.isArray(topProds) || topProds.length === 0) return [];

    return topProds.map((p) => {
      const qty = Number(p.quantity_sold || p.quantity || 0);
      const unitPrice = Number(p.price || p.unit_price || p.cost_price || 0);
      const rev = Number(p.revenue || p.total_revenue || (qty * unitPrice));

      return {
        id: p.id,
        name: p.name,
        category: p.category_name || (p.category_type === "bar" ? "Bar & Drinks" : "Kitchen Food"),
        categoryType: p.category_type || "food",
        quantity: qty,
        unit: p.unit || "pcs",
        imageUrl: p.image_url || p.imageUrl || p.image || p.image_path || p.product_image || p.picture || p.photo || p.filepath,
        revenue: rev,
      };
    });
  }, [products, orders, kitchenOrders, barOrders, dashboardStats]);

  const filteredProducts = useMemo(() => {
    return rawProducts.filter((item) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "food") return item.categoryType === "food" || item.category.toLowerCase().includes("food") || item.category.toLowerCase().includes("kitchen");
      if (categoryFilter === "bar") return item.categoryType === "bar" || item.category.toLowerCase().includes("bar") || item.category.toLowerCase().includes("cocktail") || item.category.toLowerCase().includes("drink");
      return true;
    });
  }, [rawProducts, categoryFilter]);

  const formatPortionLabel = (unit, qty = 1) => {
    const u = String(unit || "pcs").toLowerCase().trim();
    if (u === "shot" || u === "shots") return `${qty} ${qty === 1 ? "Shot" : "Shots"}`;
    if (u === "glass" || u === "glasses") return `${qty} ${qty === 1 ? "Glass" : "Glasses"}`;
    if (u === "half_bottle" || u === "half_bottles") return `${qty} ${qty === 1 ? "Half Bottle" : "Half Bottles"}`;
    if (u === "bottle" || u === "bottles") return `${qty} ${qty === 1 ? "Full Bottle" : "Full Bottles"}`;
    if (u === "plate" || u === "plates") return `${qty} ${qty === 1 ? "Plate" : "Plates"}`;
    if (u === "kg") return `${qty} kg`;
    if (u === "liter" || u === "l") return `${qty} l`;
    return `${qty} ${qty === 1 ? "Pcs" : "Pcs"}`;
  };

  const formatImageUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;
    if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) return cleanUrl;
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) return cleanUrl;

    const baseUrl = (import.meta.env?.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");
    return `${baseUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Itemized Food & Drink Portion Sales Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Card view showing item images, portion measurement units (Shots, Glasses, Bottles, Plates), and revenue.
          </p>
        </div>

        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition ${
              categoryFilter === "all" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("food")}
            className={`rounded-lg px-3 py-1.5 transition ${
              categoryFilter === "food" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kitchen Food
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("bar")}
            className={`rounded-lg px-3 py-1.5 transition ${
              categoryFilter === "bar" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
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
            const formattedImg = formatImageUrl(prod.imageUrl);
            const rank = idx + 1;

            return (
              <div
                key={prod.id || prod.name}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-amber-400 hover:shadow-md"
              >
                {/* Top Header: Rank + Category */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black shadow-sm ${
                      rank === 1
                        ? "bg-amber-400 text-slate-950 ring-2 ring-amber-400/40"
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

                {/* Main Content: Thumbnail Photo + Title */}
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                    {formattedImg ? (
                      <img
                        src={formattedImg}
                        alt={prod.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = "none";
                          if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      className={`h-full w-full items-center justify-center bg-slate-100 text-slate-400 ${
                        formattedImg ? "hidden" : "flex"
                      }`}
                    >
                      {prod.categoryType === "bar" || prod.category?.toLowerCase().includes("drink") ? (
                        <Wine className="h-6 w-6 text-purple-600" />
                      ) : (
                        <Utensils className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-amber-600 transition">
                      {prod.name}
                    </h3>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-700 border border-amber-200">
                      <span>{formatPortionLabel(prod.unit, prod.quantity)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Revenue */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-500 font-medium">Total Sales</span>
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
  );
}
