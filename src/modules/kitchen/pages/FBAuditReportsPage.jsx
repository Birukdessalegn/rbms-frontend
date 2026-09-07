import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wine,
  UtensilsCrossed,
  Layers,
  ArrowUpRight,
  Search,
  Calendar,
  DollarSign,
  Package,
  Activity,
  ClipboardCheck,
  Flame,
  Filter,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

export default function FBAuditReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Raw fetched data
  const [products, setProducts] = useState([]);
  const [kitchenStock, setKitchenStock] = useState([]);
  const [barStock, setBarStock] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [barOrders, setBarOrders] = useState([]);
  const [audits, setAudits] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // Filters
  const [datePreset, setDatePreset] = useState("all"); // "all" | "today" | "yesterday" | "week" | "month"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all"); // "all" | "kitchen" | "bar"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeViewTab, setActiveViewTab] = useState("inventory"); // "inventory" | "audits" | "all"
  const [stockStatusFilter, setStockStatusFilter] = useState("all"); // "all" | "healthy" | "low" | "depleted" | "approved_depleted"

  // Date preset handler
  const handleApplyPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(todayStr);
    } else if (preset === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(todayStr);
    }
  };

  // Fetch all live and historical F&B data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [
        prodRes,
        kStockRes,
        bStockRes,
        kOrdersRes,
        bOrdersRes,
        auditsRes,
        transfersRes,
      ] = await Promise.all([
        api("/products").catch(() => []),
        api("/inventory/departments/kitchen").catch(() => api("/inventory").catch(() => [])),
        api("/inventory/departments/bar").catch(() => api("/inventory").catch(() => [])),
        api("/kitchen").catch(() => []),
        api("/bar").catch(() => []),
        api("/kitchen/audits").catch(() => []),
        api("/inventory/transfers").catch(() => []),
      ]);

      setProducts(
        prodRes?.products || prodRes?.data?.products || (Array.isArray(prodRes) ? prodRes : [])
      );
      setKitchenStock(
        kStockRes?.inventory || kStockRes?.data?.inventory || kStockRes?.data || (Array.isArray(kStockRes) ? kStockRes : [])
      );
      setBarStock(
        bStockRes?.inventory || bStockRes?.data?.inventory || bStockRes?.data || (Array.isArray(bStockRes) ? bStockRes : [])
      );
      setKitchenOrders(
        kOrdersRes?.orders || kOrdersRes?.data?.orders || kOrdersRes?.data || (Array.isArray(kOrdersRes) ? kOrdersRes : [])
      );
      setBarOrders(
        bOrdersRes?.orders || bOrdersRes?.data?.orders || bOrdersRes?.data || (Array.isArray(bOrdersRes) ? bOrdersRes : [])
      );
      setAudits(
        auditsRes?.audits || auditsRes?.data?.audits || (Array.isArray(auditsRes) ? auditsRes : [])
      );
      setTransfers(
        transfersRes?.transfers || transfersRes?.data?.transfers || (Array.isArray(transfersRes) ? transfersRes : [])
      );
    } catch (err) {
      console.error("Failed to load F&B report data:", err);
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute stock maps
  const kitchenStockMap = useMemo(() => {
    const map = new Map();
    (kitchenStock || []).forEach((it) => {
      const pid = it.product_id || it.productId || it.id;
      if (pid) map.set(Number(pid), it);
    });
    return map;
  }, [kitchenStock]);

  const barStockMap = useMemo(() => {
    const map = new Map();
    (barStock || []).forEach((it) => {
      const pid = it.product_id || it.productId || it.id;
      if (pid) map.set(Number(pid), it);
    });
    return map;
  }, [barStock]);

  // Live POS consumption today map
  const liveConsumptionMap = useMemo(() => {
    const map = new Map();
    const todayStr = new Date().toDateString();
    const allOrders = [...(kitchenOrders || []), ...(barOrders || [])];

    allOrders.forEach((ord) => {
      const ordDate = ord.created_at || ord.createdAt;
      const isToday = ordDate ? new Date(ordDate).toDateString() === todayStr : true;
      if (!isToday) return;

      const rawItems = ord.items || ord.order_items || ord.orderItems || ord.products || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      items.forEach((item) => {
        const pid = Number(item.product_id || item.productId || item.id);
        const pName = (item.product_name || item.name || "").toLowerCase().trim();
        const q = Number(item.quantity || 1);
        if (pid) map.set(pid, (map.get(pid) || 0) + q);
        if (pName) map.set(pName, (map.get(pName) || 0) + q);
      });
    });
    return map;
  }, [kitchenOrders, barOrders]);

  // Latest audit record map per product
  const latestAuditMap = useMemo(() => {
    const map = new Map();
    (audits || []).forEach((a) => {
      const pid = Number(a.product_id || a.productId);
      const pName = (a.product_name || a.name || "").toLowerCase().trim();
      const existing = pid ? map.get(pid) : map.get(pName);
      const aDate = new Date(a.created_at || a.createdAt || 0);

      if (!existing || aDate > new Date(existing.created_at || existing.createdAt || 0)) {
        if (pid) map.set(pid, a);
        if (pName) map.set(pName, a);
      }
    });
    return map;
  }, [audits]);

  // Combined Classified Items
  const itemsAnalysis = useMemo(() => {
    return (products || []).map((p) => {
      const pid = Number(p.id);
      const pName = (p.name || p.product_name || "").toLowerCase().trim();
      const catType = (p.category_type || p.categoryType || "").toLowerCase().trim();
      const dept = (p.department || "").toLowerCase().trim();

      const kStockData = kitchenStockMap.get(pid);
      const bStockData = barStockMap.get(pid);

      let outlet = "kitchen";
      if (dept === "bar" || dept === "beverage") outlet = "bar";
      else if (dept === "kitchen" || dept === "food") outlet = "kitchen";
      else if (p.is_bar_item === true || p.isBarItem === true) outlet = "bar";
      else if (catType === "beverage" || catType === "bar" || catType === "drink") outlet = "bar";
      else if (catType === "food" || catType === "kitchen") outlet = "kitchen";
      else if (bStockData && !kStockData) outlet = "bar";
      else if (kStockData && !bStockData) outlet = "kitchen";
      else if (bStockData && kStockData) {
        outlet = Number(bStockData.quantity) > Number(kStockData.quantity) ? "bar" : "kitchen";
      }

      const stockRecord = outlet === "bar" ? bStockData : kStockData;
      const currentStock = stockRecord ? Number(stockRecord.quantity) : Number(p.stock_quantity ?? p.stock ?? 0);
      const minStock = stockRecord?.minimum_stock ? Number(stockRecord.minimum_stock) : Number(p.minimum_stock ?? 5);
      const price = Number(p.price || 0);
      const costPrice = Number(p.cost_price || p.cost || 0);

      const rawSold = Number(stockRecord?.sold_today || 0);
      const liveSold = liveConsumptionMap.get(pid) || liveConsumptionMap.get(pName) || 0;
      const soldToday = Math.max(rawSold, liveSold);

      const isDepleted = currentStock <= 0;
      const isLow = !isDepleted && currentStock <= minStock;
      const isHealthy = currentStock > minStock;

      const inventoryValue = currentStock * (costPrice > 0 ? costPrice : price * 0.6);

      // Latest audit info
      const latestAudit = latestAuditMap.get(pid) || latestAuditMap.get(pName);
      const auditAction = (latestAudit?.action_taken || latestAudit?.action || latestAudit?.status || "").toLowerCase();
      const isApprovedDepletion = isDepleted && (auditAction.includes("deplet") || auditAction.includes("confirm"));
      const isAuditRestored = auditAction.includes("restor") || auditAction.includes("found");

      return {
        ...p,
        displayName: p.name || p.product_name || "Item",
        unit: p.unit || (outlet === "bar" ? "bottles" : "portions"),
        outlet,
        currentStock,
        minStock,
        price,
        costPrice,
        soldToday,
        inventoryValue,
        isDepleted,
        isLow,
        isHealthy,
        latestAudit,
        isApprovedDepletion,
        isAuditRestored,
      };
    });
  }, [products, kitchenStockMap, barStockMap, liveConsumptionMap, latestAuditMap]);

  // Aggregated F&B Metrics
  const metrics = useMemo(() => {
    const kitchenItems = itemsAnalysis.filter((i) => i.outlet === "kitchen");
    const barItems = itemsAnalysis.filter((i) => i.outlet === "bar");

    const totalKitchenUnits = kitchenItems.reduce((sum, i) => sum + i.currentStock, 0);
    const totalBarUnits = barItems.reduce((sum, i) => sum + i.currentStock, 0);
    const totalStockUnits = totalKitchenUnits + totalBarUnits;

    const kitchenDepleted = kitchenItems.filter((i) => i.isDepleted).length;
    const barDepleted = barItems.filter((i) => i.isDepleted).length;
    const totalDepleted = kitchenDepleted + barDepleted;

    const kitchenLow = kitchenItems.filter((i) => i.isLow).length;
    const barLow = barItems.filter((i) => i.isLow).length;
    const totalLow = kitchenLow + barLow;

    const kitchenHealthy = kitchenItems.filter((i) => i.isHealthy).length;
    const barHealthy = barItems.filter((i) => i.isHealthy).length;
    const totalHealthy = kitchenHealthy + barHealthy;

    const totalSoldToday = itemsAnalysis.reduce((sum, i) => sum + i.soldToday, 0);

    const healthyRate = itemsAnalysis.length > 0 ? Math.round((totalHealthy / itemsAnalysis.length) * 100) : 100;

    return {
      totalItems: itemsAnalysis.length,
      kitchenCount: kitchenItems.length,
      barCount: barItems.length,
      totalStockUnits,
      totalKitchenUnits,
      totalBarUnits,
      totalDepleted,
      kitchenDepleted,
      barDepleted,
      totalLow,
      kitchenLow,
      barLow,
      totalHealthy,
      healthyRate,
      totalSoldToday,
    };
  }, [itemsAnalysis]);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    return (audits || []).filter((a) => {
      // Department filter
      if (departmentFilter !== "all") {
        const aDept = (a.department || a.outlet || "").toLowerCase();
        if (aDept && aDept !== departmentFilter) return false;
      }

      // Date Range filter
      if (fromDate || toDate) {
        const aDate = new Date(a.created_at || a.createdAt);
        if (fromDate) {
          const f = new Date(fromDate);
          f.setHours(0, 0, 0, 0);
          if (aDate < f) return false;
        }
        if (toDate) {
          const t = new Date(toDate);
          t.setHours(23, 59, 59, 999);
          if (aDate > t) return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (a.product_name || a.name || "").toLowerCase();
        const code = (a.product_code || "").toLowerCase();
        const auditor = (a.audited_by_name || a.auditor_name || "").toLowerCase();
        const notes = (a.notes || "").toLowerCase();
        return pName.includes(q) || code.includes(q) || auditor.includes(q) || notes.includes(q);
      }

      return true;
    });
  }, [audits, departmentFilter, fromDate, toDate, searchQuery]);

  // Top Consumed Items
  const topConsumedItems = useMemo(() => {
    return [...itemsAnalysis]
      .filter((i) => i.soldToday > 0)
      .sort((a, b) => b.soldToday - a.soldToday)
      .slice(0, 10);
  }, [itemsAnalysis]);

  // Filtered Items for Comprehensive Stock Table
  const filteredItemsAnalysis = useMemo(() => {
    return itemsAnalysis.filter((it) => {
      // Department
      if (departmentFilter !== "all" && it.outlet !== departmentFilter) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter === "healthy" && !it.isHealthy) return false;
      if (stockStatusFilter === "low" && !it.isLow) return false;
      if (stockStatusFilter === "depleted" && !it.isDepleted) return false;
      if (stockStatusFilter === "approved_depleted" && !it.isApprovedDepletion) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = it.displayName.toLowerCase().includes(q);
        const matchCode = (it.product_code || "").toLowerCase().includes(q);
        const matchCat = (it.category_name || it.category || "").toLowerCase().includes(q);
        return matchName || matchCode || matchCat;
      }

      return true;
    });
  }, [itemsAnalysis, departmentFilter, stockStatusFilter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ========================================================
            HEADER BANNER & CONTROLS
        ======================================================== */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    F&B Analysis & Audit Report
                  </h1>
                  <span className="px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Kitchen & Bar Intelligence
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Real-time stock valuation, consumption velocity, and verified physical audit history.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full lg:w-auto justify-end">
              <Link
                to="/kitchen/audit"
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Audit Board</span>
                <ArrowUpRight className="h-3 w-3 opacity-60 hidden sm:inline shrink-0" />
              </Link>

              <button
                onClick={() =>
                  printReportArea(
                    "fb-reports-printable-area",
                    "Official F&B Executive Analysis & Stock Audit Report"
                  )
                }
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Print Report</span>
              </button>

              <button
                onClick={() => loadData(true)}
                disabled={refreshing || loading}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-medium rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
                <span className="truncate">{refreshing ? "Syncing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Date Presets & Filter Row */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto flex-nowrap">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Calendar className="h-3.5 w-3.5" /> Date:
              </span>
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "Last 7 Days" },
                { id: "month", label: "Last 30 Days" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`px-2.5 sm:px-3 py-1 text-xs rounded-lg font-medium transition shrink-0 whitespace-nowrap ${
                    datePreset === p.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Department Scope Filter */}
            <div className="w-full md:w-auto">
              <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:items-center">
                <button
                  onClick={() => setDepartmentFilter("all")}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs rounded-lg font-medium transition text-center truncate ${
                    departmentFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({itemsAnalysis.length})
                </button>
                <button
                  onClick={() => setDepartmentFilter("kitchen")}
                  className={`px-2 sm:px-3 py-1.5 sm:py-1 text-xs rounded-lg font-medium transition text-center truncate ${
                    departmentFilter === "kitchen"
                      ? "bg-orange-500 text-white"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  🍳 Kitchen ({metrics.kitchenCount})
                </button>
                <button
                  onClick={() => setDepartmentFilter("bar")}
                  className={`px-2 sm:px-3 py-1.5 sm:py-1 text-xs rounded-lg font-medium transition text-center truncate ${
                    departmentFilter === "bar"
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  🍸 Bar ({metrics.barCount})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            PRINTABLE REPORT CONTAINER
        ======================================================== */}
        <div id="fb-reports-printable-area" className="space-y-4 sm:space-y-6">

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Total Stock On Hand */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                  Stock On Hand
                </p>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 sm:mt-2">
                {metrics.totalStockUnits.toLocaleString()}{" "}
                <span className="text-xs sm:text-sm font-semibold text-slate-500">units</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">
                Kitchen: {metrics.totalKitchenUnits.toLocaleString()} &bull; Bar: {metrics.totalBarUnits.toLocaleString()}
              </p>
            </div>

            {/* Stock Health */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                  Inventory Health
                </p>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 sm:mt-2">
                {metrics.healthyRate}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">
                {metrics.totalHealthy} healthy &bull; {metrics.totalLow} low stock
              </p>
            </div>

            {/* Depletions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                  Depleted / Zero
                </p>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1 sm:mt-2">
                {metrics.totalDepleted}{" "}
                <span className="text-xs sm:text-sm font-normal text-slate-500">items</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">
                {metrics.kitchenDepleted} Kitchen &bull; {metrics.barDepleted} Bar
              </p>
            </div>

            {/* Consumption Today */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                  Consumed Today
                </p>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 sm:mt-2">
                {metrics.totalSoldToday}{" "}
                <span className="text-xs sm:text-sm font-normal text-slate-500">units</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">
                {audits.length} recorded audit checks
              </p>
            </div>
          </div>

          {/* ========================================================
              COMPARATIVE ANALYSIS (KITCHEN VS. BAR)
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Kitchen Operational Analysis */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                      <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kitchen Operations</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500">Food, starters, grills & prep lines</p>
                    </div>
                  </div>
                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                    {metrics.kitchenCount} dishes
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">On Hand</p>
                    <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5 sm:mt-1 truncate">
                      {metrics.totalKitchenUnits.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">Low / Zero</p>
                    <p className="text-xs sm:text-base font-extrabold text-rose-600 mt-0.5 sm:mt-1 truncate">
                      {metrics.kitchenDepleted} / {metrics.kitchenLow}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">Active Prep</p>
                    <p className="text-xs sm:text-base font-extrabold text-emerald-600 mt-0.5 sm:mt-1 truncate">
                      {kitchenOrders.length} orders
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span>Healthy catalog ratio</span>
                <span className="font-bold text-slate-900">
                  {metrics.kitchenCount > 0
                    ? Math.round(((metrics.kitchenCount - metrics.kitchenDepleted) / metrics.kitchenCount) * 100)
                    : 100}
                  % operational
                </span>
              </div>
            </div>

            {/* Bar Operational Analysis */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                      <Wine className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bar Operations</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500">Liquor, wines, beers, cocktails & softs</p>
                    </div>
                  </div>
                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    {metrics.barCount} beverages
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">On Hand</p>
                    <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5 sm:mt-1 truncate">
                      {metrics.totalBarUnits.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">Low / Zero</p>
                    <p className="text-xs sm:text-base font-extrabold text-rose-600 mt-0.5 sm:mt-1 truncate">
                      {metrics.barDepleted} / {metrics.barLow}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase truncate">Active Orders</p>
                    <p className="text-xs sm:text-base font-extrabold text-purple-600 mt-0.5 sm:mt-1 truncate">
                      {barOrders.length} tickets
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                <span>Healthy bar stock ratio</span>
                <span className="font-bold text-slate-900">
                  {metrics.barCount > 0
                    ? Math.round(((metrics.barCount - metrics.barDepleted) / metrics.barCount) * 100)
                    : 100}
                  % operational
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================
              FAST MOVING / HIGHEST CONSUMPTION TODAY
          ======================================================== */}
          {topConsumedItems.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Top Consumed Items Today</h3>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500">Ranked by POS orders</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {topConsumedItems.map((it, idx) => (
                  <div key={it.id} className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-slate-400">#{idx + 1}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-semibold uppercase ${
                          it.outlet === "bar" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {it.outlet}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm mt-1 truncate" title={it.displayName}>
                        {it.displayName}
                      </h4>
                    </div>
                    <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-500">Sold:</span>
                      <span className="font-extrabold text-emerald-600 text-xs sm:text-sm">{it.soldToday} {it.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              REPORT VIEW SELECTOR TABS
          ======================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-3 sm:pb-4">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar flex-nowrap">
              <button
                onClick={() => setActiveViewTab("inventory")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
                  activeViewTab === "inventory"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All F&B Stock ({filteredItemsAnalysis.length})</span>
              </button>

              <button
                onClick={() => setActiveViewTab("audits")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
                  activeViewTab === "audits"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ClipboardCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Audit Logs ({filteredAudits.length})</span>
              </button>

              <button
                onClick={() => setActiveViewTab("all")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
                  activeViewTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4 text-purple-600 shrink-0" />
                <span>Combined Report</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2 shrink-0">
              <span className="font-bold text-slate-900">{itemsAnalysis.length}</span> items &bull;
              <span className="font-bold text-slate-900">{audits.length}</span> audits
            </div>
          </div>

          {/* ========================================================
              TAB 1: COMPREHENSIVE F&B STOCK & OPERATIONAL STATUS TABLE
          ======================================================== */}
          {(activeViewTab === "inventory" || activeViewTab === "all") && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      All F&B Stock & Operational Status ({filteredItemsAnalysis.length})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 sm:mt-1">
                    Live stock quantities, threshold warnings, POS consumption, valuations, and audit verification states.
                  </p>
                </div>

                {/* Filters: Search & Stock Status */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar flex-nowrap w-full sm:w-auto pb-1">
                    {[
                      { id: "all", label: `All (${itemsAnalysis.length})` },
                      { id: "healthy", label: `In Stock (${metrics.totalHealthy})` },
                      { id: "low", label: `Low (${metrics.totalLow})` },
                      { id: "depleted", label: `Zero (${metrics.totalDepleted})` },
                      {
                        id: "approved_depleted",
                        label: `Approved (${itemsAnalysis.filter((i) => i.isApprovedDepletion).length})`,
                      },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setStockStatusFilter(st.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition shrink-0 whitespace-nowrap ${
                          stockStatusFilter === st.id
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search item, SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs">Loading F&B inventory...</p>
                </div>
              ) : filteredItemsAnalysis.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No items match your filter criteria</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or search query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 w-10">#</th>
                        <th className="py-3.5 px-4">Item & Category</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4 text-right">In-Line Stock</th>
                        <th className="py-3.5 px-4 text-right">Min Level</th>
                        <th className="py-3.5 px-4">Operational Status</th>
                        <th className="py-3.5 px-4 text-right">Sold Today</th>
                        <th className="py-3.5 px-4">Latest Audit Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItemsAnalysis.map((it, idx) => {
                        const isBar = it.outlet === "bar";

                        return (
                          <tr key={it.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div>{it.displayName}</div>
                              <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                                {it.product_code && <span>SKU: {it.product_code}</span>}
                                {it.category_name && <span>&bull; {it.category_name}</span>}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isBar
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-orange-50 text-orange-700 border border-orange-200"
                                }`}
                              >
                                {isBar ? "🍸 Bar" : "🍳 Kitchen"}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-right font-black">
                              <span
                                className={
                                  it.isDepleted
                                    ? "text-rose-600 font-bold"
                                    : it.isLow
                                    ? "text-amber-600 font-bold"
                                    : "text-slate-900"
                                }
                              >
                                {it.currentStock}
                              </span>{" "}
                              <span className="text-slate-400 font-normal text-[10px]">{it.unit}</span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-right text-slate-500 font-medium">
                              {it.minStock} <span className="text-slate-400 text-[10px]">{it.unit}</span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              {it.isApprovedDepletion ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Approved Depletion
                                </span>
                              ) : it.isDepleted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="h-3 w-3" /> Zero Stock
                                </span>
                              ) : it.isLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="h-3 w-3" /> Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> In Stock
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-slate-900">
                              {it.soldToday > 0 ? (
                                <span className="text-emerald-600">
                                  {it.soldToday} {it.unit}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">0</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                              {it.latestAudit ? (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-slate-700">
                                    {it.latestAudit.action_taken || it.latestAudit.action || "Audited"}
                                  </span>{" "}
                                  <span className="text-slate-400 text-[10px]">
                                    by {it.latestAudit.audited_by_name || it.latestAudit.auditor_name || "Auditor"} (
                                    {new Date(it.latestAudit.created_at || it.latestAudit.createdAt).toLocaleDateString()}
                                    )
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[11px]">— No audit record</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 text-xs">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 uppercase text-[11px] text-slate-500">
                          Total ({filteredItemsAnalysis.length} Items Listed)
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {filteredItemsAnalysis.reduce((sum, i) => sum + i.currentStock, 0)} units
                        </td>
                        <td></td>
                        <td></td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600">
                          {filteredItemsAnalysis.reduce((sum, i) => sum + i.soldToday, 0)} units
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: PHYSICAL STOCK AUDIT TRAIL
          ======================================================== */}
          {(activeViewTab === "audits" || activeViewTab === "all") && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Physical Stock Audit Trail ({filteredAudits.length})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 sm:mt-1">
                    Verified stock checks, restored inventory, and auditor physical logs.
                  </p>
                </div>

                {/* Search in Audits */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search auditor, item, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs">Loading audit records...</p>
                </div>
              ) : filteredAudits.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No physical audits match your criteria</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adjust date range or conduct audits on the F&B Audit Board.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Product / SKU</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Audit Result</th>
                        <th className="py-3.5 px-4">Count Verified</th>
                        <th className="py-3.5 px-4">Audited By</th>
                        <th className="py-3.5 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAudits.map((a) => {
                        const isBar = (a.department || a.outlet || "").toLowerCase() === "bar";
                        const isRestored =
                          (a.action_taken || a.action || a.status || "").toLowerCase().includes("restore") ||
                          (a.action_taken || a.action || a.status || "").toLowerCase().includes("found");

                        return (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {new Date(a.created_at || a.createdAt).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>

                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div>{a.product_name || a.name || `Item #${a.product_id}`}</div>
                              {a.product_code && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  SKU: {a.product_code}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isBar
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-orange-50 text-orange-700 border border-orange-200"
                                }`}
                              >
                                {isBar ? "🍸 Bar" : "🍳 Kitchen"}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              {isRestored ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> Stock Restored
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="h-3 w-3" /> Depleted Verified
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                              {a.physical_quantity ?? a.quantity ?? (isRestored ? "Restored" : 0)}{" "}
                              <span className="text-slate-400 font-normal text-[10px]">
                                {a.unit || "units"}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                              {a.audited_by_name || a.auditor_name || "Auditor"}
                            </td>

                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={a.notes}>
                              {a.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
