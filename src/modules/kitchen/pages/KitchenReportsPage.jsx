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
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

      // Multi-endpoint API fetch strategy like POSReportsPage
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

      // Create Employee ID -> Name map
      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || emp.username;
        if (idKey && fullName) empMap.set(idKey, fullName);
      });

      // Merge and deduplicate kitchen orders
      const combinedMap = new Map();
      [...list1, ...list2].forEach((item) => {
        const key = String(item.id || item.order_id || Math.random());
        combinedMap.set(key, item);
      });

      // If kitchen specific endpoint empty, extract food items from POS orders
      if (combinedMap.size === 0 && posList.length > 0) {
        posList.forEach((posOrder) => {
          const items = parseRawItems(posOrder.items);
          const foodItems = items.filter((i) => {
            const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
            const name = String(i.product_name || i.name || "").toLowerCase();
            return cat.includes("food") || cat.includes("kitchen") || name.includes("doro") || name.includes("burger") || name.includes("pizza") || name.includes("steak") || name.includes("meat");
          });

          if (foodItems.length > 0 || !posOrder.items) {
            combinedMap.set(String(posOrder.id), {
              ...posOrder,
              items: foodItems.length > 0 ? foodItems : posOrder.items,
            });
          }
        });
      }

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

  // Filter orders by date, search term & status
  const filteredOrders = useMemo(() => {
    return kitchenOrders.filter((o) => {
      // Date filter
      if (reportDate) {
        const rawDate = o.created_at || o.createdAt || o.date;
        const oDate = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
        if (oDate && oDate !== reportDate) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const st = String(o.status || "").toLowerCase();
        if (statusFilter === "ready" && !(st === "ready" || st === "served" || st === "completed")) return false;
        if (statusFilter === "preparing" && !(st === "pending" || st === "preparing" || st === "in_progress")) return false;
        if (statusFilter === "cancelled" && st !== "cancelled") return false;
      }

      // Search filter
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
  }, [kitchenOrders, reportDate, statusFilter, search]);

  // Aggregate metrics
  const reportSummary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completed = filteredOrders.filter(
      (o) => o.status === "served" || o.status === "completed" || o.status === "ready"
    ).length;
    const pending = filteredOrders.filter(
      (o) => o.status === "pending" || o.status === "preparing" || o.status === "in_progress"
    ).length;
    const cancelled = filteredOrders.filter((o) => o.status === "cancelled").length;

    // Production counts per dish
    const itemMap = new Map();
    filteredOrders.forEach((o) => {
      const items = parseRawItems(o.items || o.order_items);
      items.forEach((item) => {
        const name = item.product_name || item.name || "Kitchen Dish";
        const qty = Number(item.quantity || item.qty || 1);
        itemMap.set(name, (itemMap.get(name) || 0) + qty);
      });
    });

    const popularDishes = Array.from(itemMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOrders,
      completed,
      pending,
      cancelled,
      avgPrepTime: 12,
      dishes: popularDishes,
    };
  }, [filteredOrders]);

  const handlePrint = () => {
    printReportArea("kitchen-reports-printable-area", "Kitchen Production & Order Audit Report");
  };

  const getStatusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "ready" || st === "served" || st === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Ready / Served
        </span>
      );
    }
    if (st === "preparing" || st === "in_progress" || st === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
          <Clock className="h-3 w-3" /> Cooking / Preparing
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-800">
          <AlertCircle className="h-3 w-3" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
        {status || "Pending"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Kitchen Performance Audit
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Live multi-endpoint database audit for kitchen orders, cooking times & portion counts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKitchenData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-orange-700"
          >
            <Printer className="h-4 w-4" />
            Print Audit Report
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Total Kitchen Tickets"
          value={loading ? "..." : reportSummary.totalOrders}
          description="Total tickets received"
          icon={Flame}
          colorClass="text-orange-600"
          bgClass="bg-orange-50"
        />
        <ReportStatCard
          title="Dishes Ready / Served"
          value={loading ? "..." : reportSummary.completed}
          description="Fully cooked & dispatched"
          icon={CheckCircle2}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Cooking / Preparing"
          value={loading ? "..." : reportSummary.pending}
          description="Currently on stove/grill"
          icon={Clock}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Cancelled Tickets"
          value={loading ? "..." : reportSummary.cancelled}
          description="Voided by staff"
          icon={AlertCircle}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dish, table #, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-orange-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready / Served</option>
              <option value="preparing">Cooking / Preparing</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE AUDIT REPORT DOCUMENT */}
      <div id="printable-report" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">THE OAK CLUB</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Kitchen Production & Performance Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Audit Date: <span className="text-slate-900">{reportDate || "All Time"}</span></p>
            <p className="text-xs text-slate-400">Total Items Filtered: {filteredOrders.length}</p>
          </div>
        </div>

        {/* TOP DISHES PREPARED BREAKDOWN */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-orange-600" />
            Food Items & Portions Prepared Today
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Food Dish Name</th>
                  <th className="px-4 py-3 text-right">Total Portions Cooked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-400">Loading kitchen data...</td>
                  </tr>
                ) : reportSummary.dishes.length > 0 ? (
                  reportSummary.dishes.map((dish, idx) => (
                    <tr key={dish.name} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{dish.name}</td>
                      <td className="px-4 py-2.5 text-right font-black text-orange-600 bg-orange-50/50">
                        {dish.count} Portion(s)
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-400 italic">No food items prepared for selected criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ITEMIZED KITCHEN TICKETS TABLE */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-slate-700" />
            Itemized Kitchen Tickets Audit Table
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ticket #</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Waiter</th>
                  <th className="px-4 py-3">Ordered Items</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-400">Loading tickets...</td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => {
                    const items = parseRawItems(o.items || o.order_items);
                    const itemsSummary = items.length > 0
                      ? items.map(i => `${i.quantity || i.qty || 1}x ${i.product_name || i.name || "Dish"}`).join(", ")
                      : "Food Ticket";
                    const rawTime = o.created_at || o.createdAt;
                    const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

                    return (
                      <tr key={o.id || Math.random()} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">#{o.id || o.order_id || "K-101"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{o.table_name || o.table_number || `Table ${o.table_id || 1}`}</td>
                        <td className="px-4 py-3 text-slate-600">{o.waiter_name || "Staff Waiter"}</td>
                        <td className="px-4 py-3 max-w-xs truncate font-semibold text-slate-900">{itemsSummary}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(o.status)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{timeStr}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-400 italic">No kitchen tickets match your search or date filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs text-slate-900 font-bold">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB — KITCHEN SHIFT AUDIT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Food Safety & Production Audit Report</p>
            </div>
            <div className="text-right">
              <p>Head Chef Signature: ______________________</p>
              <p className="mt-2">Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitchenReportsPage;