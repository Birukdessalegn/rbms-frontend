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
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

function ReportStatCard({ title, value, description, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </h3>
          {description && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {description}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

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

  // Pagination state
  const [currentInventoryPage, setCurrentInventoryPage] = useState(1);
  const [currentAuditPage, setCurrentAuditPage] = useState(1);
  const pageSize = 15;

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
    setCurrentInventoryPage(1);
    setCurrentAuditPage(1);
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
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/kitchen/audit").catch(() => []),
        api("/transfers").catch(() => []),
      ]);

      const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (data?.data && Array.isArray(data.data)) return data.data;
        if (data?.products && Array.isArray(data.products)) return data.products;
        if (data?.orders && Array.isArray(data.orders)) return data.orders;
        if (data?.items && Array.isArray(data.items)) return data.items;
        return [];
      };

      setProducts(normalizeList(prodRes));
      setKitchenStock(normalizeList(kStockRes));
      setBarStock(normalizeList(bStockRes));
      setKitchenOrders(normalizeList(kOrdersRes));
      setBarOrders(normalizeList(bOrdersRes));
      setAudits(normalizeList(auditsRes));
      setTransfers(normalizeList(transfersRes));
    } catch (err) {
      console.error("Failed to load F&B Audit Report data:", err);
      setError("Failed to load data. Please click Refresh to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute lookup maps
  const kitchenStockMap = useMemo(() => {
    const map = new Map();
    kitchenStock.forEach((item) => {
      const pid = item.product_id || item.productId || item.id;
      if (pid) {
        map.set(String(pid), {
          quantity: Number(item.quantity ?? item.current_stock ?? item.stock ?? 0),
          min_stock: Number(item.min_stock ?? item.minimum_stock ?? 5),
          reorder_point: Number(item.reorder_point ?? item.min_stock ?? 5),
        });
      }
    });
    return map;
  }, [kitchenStock]);

  const barStockMap = useMemo(() => {
    const map = new Map();
    barStock.forEach((item) => {
      const pid = item.product_id || item.productId || item.id;
      if (pid) {
        map.set(String(pid), {
          quantity: Number(item.quantity ?? item.current_stock ?? item.stock ?? 0),
          min_stock: Number(item.min_stock ?? item.minimum_stock ?? 5),
          reorder_point: Number(item.reorder_point ?? item.min_stock ?? 5),
        });
      }
    });
    return map;
  }, [barStock]);

  // Live consumption calculation
  const liveConsumptionMap = useMemo(() => {
    const map = new Map();

    const parseItems = (raw) => {
      if (!raw) return [];
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(raw) ? raw : [];
    };

    kitchenOrders.forEach((o) => {
      const items = parseItems(o.items);
      items.forEach((it) => {
        const pid = String(it.product_id || it.productId || it.id || "");
        const name = (it.name || it.product_name || "").toLowerCase().trim();
        const qty = Number(it.quantity || it.qty || 1);
        if (pid) map.set(pid, (map.get(pid) || 0) + qty);
        if (name) map.set(name, (map.get(name) || 0) + qty);
      });
    });

    barOrders.forEach((o) => {
      const items = parseItems(o.items);
      items.forEach((it) => {
        const pid = String(it.product_id || it.productId || it.id || "");
        const name = (it.name || it.product_name || "").toLowerCase().trim();
        const qty = Number(it.quantity || it.qty || 1);
        if (pid) map.set(pid, (map.get(pid) || 0) + qty);
        if (name) map.set(name, (map.get(name) || 0) + qty);
      });
    });

    return map;
  }, [kitchenOrders, barOrders]);

  // Latest audit status per product
  const latestAuditMap = useMemo(() => {
    const map = new Map();
    (audits || []).forEach((a) => {
      const pid = String(a.product_id || a.productId || "");
      if (pid && !map.has(pid)) {
        map.set(pid, a);
      }
    });
    return map;
  }, [audits]);

  // Unified items list with analysis
  const itemsAnalysis = useMemo(() => {
    return products.map((p) => {
      const pid = String(p.id);
      const cat = (p.category || p.category_name || "").toLowerCase();
      const pName = (p.name || p.product_name || "").toLowerCase();

      const isBarDrink =
        cat.includes("drink") ||
        cat.includes("beverage") ||
        cat.includes("bar") ||
        cat.includes("wine") ||
        cat.includes("liquor") ||
        cat.includes("beer") ||
        cat.includes("whiskey") ||
        cat.includes("vodka") ||
        pName.includes("beer") ||
        pName.includes("wine") ||
        pName.includes("whiskey") ||
        pName.includes("vodka") ||
        pName.includes("juice") ||
        pName.includes("soda");

      const outlet = isBarDrink ? "bar" : "kitchen";
      const deptStock = outlet === "bar" ? barStockMap.get(pid) : kitchenStockMap.get(pid);

      const currentStock = deptStock
        ? deptStock.quantity
        : Number(p.current_stock ?? p.quantity ?? p.stock ?? 0);

      const minStock = deptStock
        ? deptStock.min_stock
        : Number(p.min_stock ?? p.minimum_stock ?? 5);

      const price = Number(p.price || p.unit_price || p.selling_price || 0);
      const costPrice = Number(p.cost_price || p.cost || price * 0.6);

      const soldToday =
        liveConsumptionMap.get(pid) ||
        liveConsumptionMap.get(pName) ||
        0;

      const inventoryValue = currentStock * price;
      const isDepleted = currentStock <= 0;
      const isLow = currentStock > 0 && currentStock <= minStock;
      const isHealthy = currentStock > minStock;

      const latestAudit = latestAuditMap.get(pid) || null;
      const isApprovedDepletion =
        isDepleted &&
        latestAudit &&
        String(latestAudit.action_taken || latestAudit.status || "")
          .toLowerCase()
          .includes("approved");

      const isAuditRestored =
        latestAudit &&
        String(latestAudit.action_taken || latestAudit.status || "")
          .toLowerCase()
          .includes("restore");

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

  // Pagination for Inventory Table
  const inventoryTotalPages = Math.ceil(filteredItemsAnalysis.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentInventoryPage - 1) * pageSize;
    return filteredItemsAnalysis.slice(start, start + pageSize);
  }, [filteredItemsAnalysis, currentInventoryPage, pageSize]);

  // Pagination for Audit Table
  const auditTotalPages = Math.ceil(filteredAudits.length / pageSize) || 1;
  const paginatedAudits = useMemo(() => {
    const start = (currentAuditPage - 1) * pageSize;
    return filteredAudits.slice(start, start + pageSize);
  }, [filteredAudits, currentAuditPage, pageSize]);

  const handlePrint = () => {
    printReportArea("fb-reports-printable-area", "Official F&B Executive Analysis & Stock Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredItemsAnalysis.length === 0 && filteredAudits.length === 0) {
      alert("No F&B audit or stock data available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - F&B AUDIT & INVENTORY CONTROL REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n`;
    csv += `Audit Scope: "${departmentFilter.toUpperCase()}"\n`;
    csv += `Audit Period: "${fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}"\n\n`;

    // Metrics summary
    csv += "SUMMARY METRICS\n";
    csv += `Total Monitored Items,${metrics.totalItems}\n`;
    csv += `Total Stock On Hand,${metrics.totalStockUnits} units\n`;
    csv += `Kitchen Stock Units,${metrics.totalKitchenUnits}\n`;
    csv += `Bar Stock Units,${metrics.totalBarUnits}\n`;
    csv += `Healthy Stock Ratio,${metrics.healthyRate}%\n`;
    csv += `Low Stock Alerts,${metrics.totalLow}\n`;
    csv += `Depleted / Zero Stock,${metrics.totalDepleted}\n`;
    csv += `Total Consumed Today,${metrics.totalSoldToday} units\n\n`;

    // Top Consumed Items
    if (topConsumedItems.length > 0) {
      csv += "TOP CONSUMED ITEMS TODAY\n";
      csv += "Rank,Item Name,Outlet,Quantity Consumed,Unit\n";
      topConsumedItems.forEach((it, idx) => {
        csv += `${idx + 1},"${it.displayName.replace(/"/g, '""')}","${it.outlet.toUpperCase()}",${it.soldToday},"${it.unit}"\n`;
      });
      csv += "\n";
    }

    // Comprehensive Inventory Stock Valuation
    csv += "F&B OUTLET INVENTORY LEDGER\n";
    csv += "Item Name,Code / SKU,Outlet,Category,Current Stock,Min Stock,Status,Unit Price (ETB),Est. Valuation (ETB)\n";
    filteredItemsAnalysis.forEach((it) => {
      const statusStr = it.isDepleted ? "DEPLETED" : it.isLow ? "LOW STOCK" : "HEALTHY";
      csv += `"${it.displayName.replace(/"/g, '""')}","${it.product_code || "-"}","${it.outlet.toUpperCase()}","${it.category_name || it.category || "-"}","${it.currentStock} ${it.unit}","${it.minStock} ${it.unit}","${statusStr}",${it.price.toFixed(2)},${it.inventoryValue.toFixed(2)}\n`;
    });
    csv += "\n";

    // Audits Log
    if (filteredAudits.length > 0) {
      csv += "RECORDED PHYSICAL AUDIT CHECKS\n";
      csv += "Timestamp,Item Name,Department,Audit Result,Verified Qty,Audited By,Notes\n";
      filteredAudits.forEach((a) => {
        csv += `"${new Date(a.created_at || a.createdAt).toLocaleString()}","${(a.product_name || a.name || "").replace(/"/g, '""')}","${(a.department || a.outlet || "").toUpperCase()}","${a.action_taken || a.action || a.status || "Audit"}","${a.physical_quantity ?? a.quantity ?? 0}","${(a.audited_by_name || a.auditor_name || "").replace(/"/g, '""')}","${(a.notes || "").replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FB_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              F&B Analysis & Audit Report
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Kitchen & Bar Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time stock valuation, consumption velocity, and verified physical audit history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/kitchen/audit"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            Audit Board
            <ArrowUpRight className="h-3 w-3 opacity-60 hidden sm:inline" />
          </Link>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print-hide">
        <ReportStatCard
          title="Stock On Hand"
          value={`${metrics.totalStockUnits.toLocaleString()} Units`}
          description={`Kitchen: ${metrics.totalKitchenUnits.toLocaleString()} • Bar: ${metrics.totalBarUnits.toLocaleString()}`}
          icon={Package}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Inventory Health"
          value={`${metrics.healthyRate}%`}
          description={`${metrics.totalHealthy} healthy • ${metrics.totalLow} low stock`}
          icon={Activity}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <ReportStatCard
          title="Out of Stock (0)"
          value={`${metrics.totalDepleted} Items`}
          description={`${metrics.kitchenDepleted} Kitchen • ${metrics.barDepleted} Bar`}
          icon={AlertTriangle}
          colorClass="text-rose-600"
          bgClass="bg-rose-50"
        />
        <ReportStatCard
          title="Consumed Today"
          value={`${metrics.totalSoldToday} Units`}
          description={`${audits.length} recorded audit checks`}
          icon={TrendingUp}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
      </div>

      {/* Unified Filter Toolbar (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Department Scope & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search item, SKU..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentInventoryPage(1);
                  setCurrentAuditPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentInventoryPage(1);
                  setCurrentAuditPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentInventoryPage(1);
                  setCurrentAuditPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentInventoryPage(1);
                setCurrentAuditPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Outlets ({itemsAnalysis.length})</option>
              <option value="kitchen">🍳 Kitchen ({metrics.kitchenCount})</option>
              <option value="bar">🍸 Bar ({metrics.barCount})</option>
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) => {
                setStockStatusFilter(e.target.value);
                setCurrentInventoryPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Stock Statuses</option>
              <option value="healthy">In Stock ({metrics.totalHealthy})</option>
              <option value="low">Low Stock ({metrics.totalLow})</option>
              <option value="depleted">Out of Stock ({metrics.totalDepleted})</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="fb-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                FOOD & BEVERAGE INVENTORY CONTROL & PHYSICAL AUDIT STATEMENT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official F&B Operations Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Audit Scope:{" "}
                <span className="font-bold text-slate-900">
                  {departmentFilter.toUpperCase()} • {fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Monitored Items:</span>
              <strong className="text-slate-900 font-black">{metrics.totalItems} Items</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Stock On Hand:</span>
              <strong className="text-emerald-700 font-black">{metrics.totalStockUnits.toLocaleString()} Units</strong>
              <span className="text-[10px] font-semibold text-slate-500">({metrics.totalKitchenUnits}K / {metrics.totalBarUnits}B)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Healthy Ratio:</span>
              <strong className="text-blue-700 font-black">{metrics.healthyRate}%</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Low Stock:</span>
              <strong className="text-amber-700 font-black">{metrics.totalLow} Items</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Depleted:</span>
              <strong className="text-rose-700 font-black">{metrics.totalDepleted} Items</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Consumed Today:</span>
              <strong className="text-purple-700 font-black">{metrics.totalSoldToday} Units</strong>
            </div>
          </div>
        </div>

        {/* COMPARATIVE ANALYSIS (KITCHEN VS. BAR) */}
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
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                  {metrics.kitchenCount} dishes
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">On Hand</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {metrics.totalKitchenUnits.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Low / Zero</p>
                  <p className="text-sm font-extrabold text-rose-600 mt-0.5">
                    {metrics.kitchenDepleted} / {metrics.kitchenLow}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Active Prep</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-0.5">
                    {kitchenOrders.length} orders
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Healthy catalog ratio</span>
              <span className="font-bold text-slate-900">
                {metrics.kitchenCount > 0
                  ? Math.round(((metrics.kitchenCount - metrics.kitchenDepleted) / metrics.kitchenCount) * 100)
                  : 100}% operational
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
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                  {metrics.barCount} beverages
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">On Hand</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {metrics.totalBarUnits.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Low / Zero</p>
                  <p className="text-sm font-extrabold text-rose-600 mt-0.5">
                    {metrics.barDepleted} / {metrics.barLow}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Active Orders</p>
                  <p className="text-sm font-extrabold text-purple-600 mt-0.5">
                    {barOrders.length} tickets
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Healthy bar stock ratio</span>
              <span className="font-bold text-slate-900">
                {metrics.barCount > 0
                  ? Math.round(((metrics.barCount - metrics.barDepleted) / metrics.barCount) * 100)
                  : 100}% operational
              </span>
            </div>
          </div>
        </div>

        {/* TOP CONSUMED ITEMS TODAY */}
        {topConsumedItems.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-slate-900 text-base">Top Consumed Items Today</h3>
              </div>
              <span className="text-xs text-slate-500">Ranked by POS customer consumption</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {topConsumedItems.map((it, idx) => (
                <div key={it.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-400">#{idx + 1}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        it.outlet === "bar" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {it.outlet}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mt-1 truncate" title={it.displayName}>
                      {it.displayName}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Sold:</span>
                    <span className="font-extrabold text-emerald-600 text-sm">{it.soldToday} {it.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT VIEW SELECTOR TABS (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print-hide">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar flex-nowrap">
            <button
              onClick={() => setActiveViewTab("inventory")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
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
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
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
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
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

        {/* TAB 1: COMPREHENSIVE F&B STOCK & OPERATIONAL STATUS TABLE */}
        {(activeViewTab === "inventory" || activeViewTab === "all") && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600 shrink-0" />
                  <h3 className="font-bold text-slate-900 text-base">
                    All F&B Stock & Operational Status ({filteredItemsAnalysis.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Live stock quantities, threshold warnings, POS consumption, valuations, and audit verification states.
                </p>
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
                    {paginatedItems.map((it, idx) => {
                      const isBar = it.outlet === "bar";
                      const globalIdx = (currentInventoryPage - 1) * pageSize + idx + 1;

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                            {globalIdx}
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

                          <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                            {it.currentStock}{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              {it.unit}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                            {it.minStock} {it.unit}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {it.isApprovedDepletion ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <ShieldCheck className="h-3 w-3" /> Approved Out of Stock
                              </span>
                            ) : it.isDepleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="h-3 w-3" /> Out of Stock (0)
                              </span>
                            ) : it.isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Healthy Stock
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {it.soldToday > 0 ? (
                              <span className="font-extrabold text-emerald-600">
                                +{it.soldToday} {it.unit}
                              </span>
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                            {it.latestAudit ? (
                              <div>
                                <span className="font-semibold text-slate-700">
                                  {it.latestAudit.action_taken || it.latestAudit.status || "Audited"}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(it.latestAudit.created_at || it.latestAudit.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">No audits</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold text-slate-700 border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan="3" className="py-3 px-4 font-bold text-slate-900">
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

            {/* Pagination Controls */}
            {inventoryTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing page {currentInventoryPage} of {inventoryTotalPages} ({filteredItemsAnalysis.length} items total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentInventoryPage === 1}
                    onClick={() => setCurrentInventoryPage((p) => Math.max(p - 1, 1))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    disabled={currentInventoryPage === inventoryTotalPages}
                    onClick={() => setCurrentInventoryPage((p) => Math.min(p + 1, inventoryTotalPages))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PHYSICAL STOCK AUDIT TRAIL */}
        {(activeViewTab === "audits" || activeViewTab === "all") && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Physical Stock Audit Trail ({filteredAudits.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Verified stock checks, restored inventory, and auditor physical logs.
                </p>
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
                    {paginatedAudits.map((a) => {
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
                                <XCircle className="h-3 w-3" /> Out of Stock Verified
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

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing page {currentAuditPage} of {auditTotalPages} ({filteredAudits.length} audits total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentAuditPage === 1}
                    onClick={() => setCurrentAuditPage((p) => Math.max(p - 1, 1))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    disabled={currentAuditPage === auditTotalPages}
                    onClick={() => setCurrentAuditPage((p) => Math.min(p + 1, auditTotalPages))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FORMAL 3-COLUMN AUDIT SIGN-OFF */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800">
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Prepared By</p>
            <p className="mt-1 font-bold text-slate-900">F&B Controller / Internal Auditor</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Verified By</p>
            <p className="mt-1 font-bold text-slate-900">Head Chef & Head Bartender</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Approved By</p>
            <p className="mt-1 font-bold text-slate-900">General Manager</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
        </div>
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
          <span>THE OAK CLUB & LOUNGE • Food & Beverage Inventory Control & Audit</span>
          <span>Generated: {new Date().toLocaleString()} • Confidential Internal Document</span>
        </div>
      </div>
    </div>
  );
}
