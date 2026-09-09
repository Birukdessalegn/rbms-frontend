import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Printer,
  CalendarDays,
  RefreshCw,
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Utensils,
  ReceiptText,
  DollarSign,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../../services/api";

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

function KitchenReportsPage() {
  const [datePreset, setDatePreset] = useState("all"); // "all" | "today" | "yesterday" | "week" | "month" | "custom"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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
    setCurrentPage(1);
  };

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

  const fetchKitchenData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [kitchenRes, kitchenOrdersRes, posRes, empRes] = await Promise.all([
        api("/kitchen").catch(() => []),
        api("/kitchen/orders").catch(() => []),
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/employees").catch(() => []),
      ]);

      const list1 = Array.isArray(kitchenRes) ? kitchenRes : kitchenRes.orders || kitchenRes.data || [];
      const list2 = Array.isArray(kitchenOrdersRes) ? kitchenOrdersRes : kitchenOrdersRes.orders || kitchenOrdersRes.data || [];
      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const empList = Array.isArray(empRes) ? empRes : empRes.employees || empRes.data || [];

      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || emp.username;
        if (idKey && fullName) empMap.set(idKey, fullName);
      });

      const combinedMap = new Map();

      posList.forEach((posOrder) => {
        const items = parseRawItems(posOrder.items || posOrder.order_items);
        const foodItems = items.filter((i) => {
          const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
          const name = String(i.product_name || i.name || "").toLowerCase();
          const isDrink =
            cat.includes("beer") ||
            cat.includes("wine") ||
            cat.includes("vodka") ||
            cat.includes("whiskey") ||
            cat.includes("cocktail") ||
            cat.includes("liquor") ||
            cat.includes("spirit") ||
            cat.includes("soft") ||
            name.includes("beer") ||
            name.includes("coca");

          if (isDrink) return false;

          return (
            cat.includes("food") ||
            cat.includes("kitchen") ||
            cat.includes("meal") ||
            cat.includes("dish") ||
            cat.includes("salad") ||
            cat.includes("pizza") ||
            cat.includes("burger") ||
            cat.includes("shisha") ||
            cat.includes("hookah") ||
            name.includes("steak") ||
            name.includes("chicken") ||
            name.includes("salad") ||
            name.includes("pizza") ||
            name.includes("burger") ||
            name.includes("shisha") ||
            name.includes("fries") ||
            name.includes("pasta") ||
            name.includes("rice")
          );
        });

        if (foodItems.length > 0 || !posOrder.items) {
          const key = String(posOrder.id || posOrder.order_id);
          combinedMap.set(key, {
            ...posOrder,
            items: foodItems.length > 0 ? foodItems : posOrder.items,
          });
        }
      });

      [...list1, ...list2].forEach((item) => {
        const key = String(item.id || item.order_id || Math.random());
        const existing = combinedMap.get(key);
        combinedMap.set(key, {
          ...(existing || {}),
          ...item,
          items: item.items && item.items.length > 0 ? item.items : (existing?.items || item.items),
        });
      });

      const finalOrders = Array.from(combinedMap.values()).map((o) => {
        const empId = String(o.waiter_id || o.waiterId || o.created_by_id || o.user_id || "");
        const waiterName = empMap.get(empId) || o.waiter_name || o.waiterName || o.waiter || "Staff Waiter";

        return {
          ...o,
          waiter_name: waiterName,
        };
      });

      setKitchenOrders(finalOrders);
    } catch (err) {
      console.error("Failed to fetch kitchen reports:", err);
      setError(err.message || "Failed to load kitchen data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenData();
  }, []);

  const filteredOrders = useMemo(() => {
    return kitchenOrders.filter((o) => {
      if (fromDate || toDate) {
        const rawDate = o.created_at || o.createdAt || o.date;
        const oDate = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
        if (fromDate && oDate && oDate < fromDate) return false;
        if (toDate && oDate && oDate > toDate) return false;
        if (!oDate && (fromDate || toDate)) return false;
      }

      if (statusFilter !== "all") {
        const st = String(o.status || "").toLowerCase();
        if (statusFilter === "ready" && !(st === "ready" || st === "served" || st === "completed")) return false;
        if (statusFilter === "preparing" && !(st === "pending" || st === "preparing" || st === "in_progress")) return false;
        if (statusFilter === "cancelled" && st !== "cancelled") return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const orderIdStr = String(o.id || o.order_id || "").toLowerCase();
        const tableStr = String(o.table_name || o.table_number || o.table_id || "").toLowerCase();
        const waiterStr = String(o.waiter_name || "").toLowerCase();
        const itemsArr = parseRawItems(o.items || o.order_items);
        const itemNamesStr = itemsArr.map(i => i.product_name || i.name || "").join(" ").toLowerCase();

        return (
          orderIdStr.includes(query) ||
          tableStr.includes(query) ||
          waiterStr.includes(query) ||
          itemNamesStr.includes(query)
        );
      }

      return true;
    });
  }, [kitchenOrders, fromDate, toDate, statusFilter, search]);

  const reportSummary = useMemo(() => {
    let totalPortions = 0;
    let completed = 0;
    let preparing = 0;
    const dishMap = new Map();

    filteredOrders.forEach((o) => {
      const st = String(o.status || "").toLowerCase();
      if (st === "ready" || st === "served" || st === "completed") completed++;
      else if (st === "preparing" || st === "pending" || st === "in_progress") preparing++;

      const items = parseRawItems(o.items || o.order_items);
      items.forEach((item) => {
        const name = item.product_name || item.name || "Dish";
        const qty = Number(item.quantity || item.qty || 1);
        totalPortions += qty;
        dishMap.set(name, (dishMap.get(name) || 0) + qty);
      });
    });

    const topDishes = Array.from(dishMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalOrders: filteredOrders.length,
      totalPortions,
      completed,
      preparing,
      dishes: topDishes,
    };
  }, [filteredOrders]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("kitchen-reports-printable-area", "Kitchen Production & Performance Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No kitchen orders available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - KITCHEN PRODUCTION & PERFORMANCE AUDIT REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n`;
    csv += `Audit Period: "${fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}"\n\n`;

    // Summary metrics
    csv += "KITCHEN PRODUCTION METRICS\n";
    csv += `Total Kitchen Tickets,${reportSummary.totalOrders}\n`;
    csv += `Total Portions Prepared,${reportSummary.totalPortions}\n`;
    csv += `Dishes Served / Ready,${reportSummary.completed}\n`;
    csv += `In-Preparation,${reportSummary.preparing}\n`;
    csv += `Avg Portions Per Ticket,${reportSummary.totalOrders > 0 ? (reportSummary.totalPortions / reportSummary.totalOrders).toFixed(1) : "0.0"}\n\n`;

    // Dishes breakdown
    if (reportSummary.dishes.length > 0) {
      csv += "TOP FOOD DISHES PREPARED BREAKDOWN\n";
      csv += "Rank,Food Dish Name,Total Portions Cooked\n";
      reportSummary.dishes.forEach((d, idx) => {
        csv += `${idx + 1},"${d.name.replace(/"/g, '""')}",${d.count}\n`;
      });
      csv += "\n";
    }

    // Tickets transaction log
    csv += "DETAILED KITCHEN TICKETS LOG\n";
    csv += "Ticket #,Table,Server / Waiter,Items Ordered,Status,Time,Portions Count\n";
    filteredOrders.forEach((o) => {
      const items = parseRawItems(o.items || o.order_items);
      const itemsSummary = items.length > 0
        ? items.map(i => `${i.quantity || i.qty || 1}x ${i.product_name || i.name || "Dish"}`).join("; ")
        : "Food Ticket";
      const portions = items.reduce((acc, i) => acc + Number(i.quantity || i.qty || 1), 0);
      const rawTime = o.created_at || o.createdAt;
      const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

      csv += `"#${o.id || o.order_id || 'K-101'}","${o.table_name || o.table_number || 'Table'}","${o.waiter_name || 'Staff'}","${itemsSummary.replace(/"/g, '""')}","${o.status || 'Ready'}","${timeStr}",${portions}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Kitchen_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "ready" || st === "served" || st === "completed") {
      return (
        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
          Ready
        </span>
      );
    }
    if (st === "preparing" || st === "pending" || st === "in_progress") {
      return (
        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
          Preparing
        </span>
      );
    }
    return (
      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-800">
        Cancelled
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Kitchen Production & Performance Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor culinary output, portion throughput, ticket prep times, and dish popularity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchKitchenData}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
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
          title="Portions Cooked"
          value={`${reportSummary.totalPortions.toLocaleString()} Portions`}
          description="Gross kitchen dishes prepared"
          icon={Flame}
          colorClass="text-orange-600"
          bgClass="bg-orange-50"
        />
        <ReportStatCard
          title="Kitchen Tickets"
          value={reportSummary.totalOrders}
          description="Food orders processed"
          icon={ReceiptText}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <ReportStatCard
          title="Dishes Served"
          value={reportSummary.completed}
          description="Fulfilled & dispatched plates"
          icon={CheckCircle2}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Avg Portions/Ticket"
          value={
            reportSummary.totalOrders > 0
              ? (reportSummary.totalPortions / reportSummary.totalOrders).toFixed(1)
              : "0.0"
          }
          description="Average dishes per table order"
          icon={Utensils}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
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
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search, Custom Dates & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, dish, table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-orange-500"
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
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
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
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready / Served</option>
              <option value="preparing">Preparing</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="kitchen-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                KITCHEN PRODUCTION, FOOD PORTIONS & PERFORMANCE AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Kitchen Operations Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Audit Period:{" "}
                <span className="font-bold text-slate-900">
                  {fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Tickets Processed:</span>
              <strong className="text-slate-900 font-black">{reportSummary.totalOrders}</strong>
              <span className="text-[10px] font-semibold text-emerald-700">({reportSummary.completed} Served)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Portions Cooked:</span>
              <strong className="text-orange-600 font-black">{reportSummary.totalPortions.toLocaleString()} Portions</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Currently Cooking:</span>
              <strong className="text-amber-700 font-black">{reportSummary.preparing} Tickets</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Avg Portions/Ticket:</span>
              <strong className="text-indigo-700 font-black">
                {reportSummary.totalOrders > 0 ? (reportSummary.totalPortions / reportSummary.totalOrders).toFixed(1) : "0.0"} dishes
              </strong>
            </div>
          </div>
        </div>

        {/* TOP FOOD DISHES PREPARED BREAKDOWN */}
        {reportSummary.dishes.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Utensils size={16} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Top Food Items & Portions Cooked</h2>
                  <p className="text-xs text-slate-500">Ranked by total quantity prepared across kitchen tickets</p>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-0.5 rounded-full border border-orange-100">
                {reportSummary.dishes.length} Popular Dishes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-5 py-2.5">Food Dish Name</th>
                    <th className="px-5 py-2.5 text-right">Total Portions Cooked</th>
                    <th className="px-5 py-2.5 text-right">% of Food Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {reportSummary.dishes.map((dish, idx) => {
                    const pct = reportSummary.totalPortions > 0 ? ((dish.count / reportSummary.totalPortions) * 100).toFixed(1) : 0;
                    return (
                      <tr key={dish.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-2.5 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-5 py-2.5 font-bold text-slate-900">{dish.name}</td>
                        <td className="px-5 py-2.5 text-right font-black text-orange-600 bg-orange-50/40">
                          {dish.count} Portion(s)
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-slate-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ITEMIZED KITCHEN TICKETS AUDIT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <ReceiptText size={16} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Detailed Kitchen Tickets Transaction Log</h2>
                <p className="text-xs text-slate-500">Audited tickets with food portions, tables, and server assignments</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Ticket #</th>
                  <th className="px-5 py-3">Table / Section</th>
                  <th className="px-5 py-3">Server / Waiter</th>
                  <th className="px-5 py-3">Dishes Prepared</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Time</th>
                  <th className="px-5 py-3 text-right">Portions Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">Loading tickets...</td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o) => {
                    const items = parseRawItems(o.items || o.order_items);
                    const itemsSummary = items.length > 0
                      ? items.map(i => `${i.quantity || i.qty || 1}x ${i.product_name || i.name || "Dish"}`).join(", ")
                      : "Food Ticket";
                    const rawTime = o.created_at || o.createdAt;
                    const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
                    const portionsCount = items.reduce((acc, i) => acc + Number(i.quantity || i.qty || 1), 0);

                    return (
                      <tr key={o.id || Math.random()} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">#{o.id || o.order_id || "K-101"}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{o.table_name || o.table_number || `Table ${o.table_id || 1}`}</td>
                        <td className="px-5 py-3 text-slate-600">{o.waiter_name || "Staff Waiter"}</td>
                        <td className="px-5 py-3 max-w-xs truncate font-semibold text-slate-900">{itemsSummary}</td>
                        <td className="px-5 py-3 text-center">{getStatusBadge(o.status)}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500">{timeStr}</td>
                        <td className="px-5 py-3 text-right font-black text-slate-900">
                          {portionsCount} portion(s)
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400 italic">
                      No kitchen tickets match your search or date filter.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider font-bold">
                      Grand Total Portions Prepared:
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-black text-orange-600">
                      {reportSummary.totalPortions.toLocaleString()} portions
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Bar (Hidden on Print) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/50 print-hide">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-800">{currentPage}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OFFICIAL EXECUTIVE 3-COLUMN SIGN-OFF FOOTER */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900 text-xs">
          <div className="grid grid-cols-3 gap-6 text-slate-800">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">PREPARED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Head Chef / Kitchen Supervisor</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">VERIFIED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Food & Beverage Cost Controller</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">APPROVED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">General Manager / Executive Admin</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center text-[10px] text-slate-400">
            <span>THE OAK CLUB & LOUNGE • CONFIDENTIAL OPERATIONAL KITCHEN PRODUCTION AUDIT</span>
            <span>SYSTEM TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitchenReportsPage;