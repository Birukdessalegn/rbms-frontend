import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Wine,
  TrendingUp,
  Clock3,
  CheckCircle2,
  Printer,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  Receipt,
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

function BarReportsPage() {
  const [barOrdersList, setBarOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  const handleApplyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (preset === "today") {
      const todayStr = formatDate(today);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setFromDate(formatDate(w));
      setToDate(formatDate(today));
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDate(m));
      setToDate(formatDate(today));
    } else {
      setFromDate("");
      setToDate("");
    }
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

  const fetchBarOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Multi-endpoint API fetch strategy like POSReportsPage & KitchenReportsPage
      const [barRes, posRes, empRes, prodRes] = await Promise.all([
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/employees").catch(() => []),
        api("/products").catch(() => []),
      ]);

      const barList = Array.isArray(barRes) ? barRes : barRes.orders || barRes.data || [];
      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const empList = Array.isArray(empRes) ? empRes : empRes.employees || empRes.data || [];
      const prodList = Array.isArray(prodRes) ? prodRes : prodRes.products || prodRes.data || [];

      // Create Product lookup map for pricing
      const productPriceMap = new Map();
      prodList.forEach((p) => {
        const price = Number(p.price || p.unit_price || p.selling_price || 0);
        if (p.id) productPriceMap.set(String(p.id), price);
        if (p.name) productPriceMap.set(String(p.name).toLowerCase().trim(), price);
      });

      // Create POS Order lookup map
      const posOrderMap = new Map();
      posList.forEach((po) => {
        posOrderMap.set(String(po.id), po);
        if (po.order_number) posOrderMap.set(String(po.order_number), po);
      });

      // Create Employee ID -> Name map
      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || emp.username;
        if (idKey && fullName) empMap.set(idKey, fullName);
      });

      // Merge and deduplicate bar orders
      const combinedMap = new Map();

      // 1. Populate with beverage orders from POS (historical completed sales)
      posList.forEach((posOrder) => {
        const items = parseRawItems(posOrder.items);
        const drinkItems = items.filter((i) => {
          const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
          const name = String(i.product_name || i.name || "").toLowerCase();
          return cat.includes("bar") || cat.includes("drink") || cat.includes("beverage") ||
                 name.includes("beer") || name.includes("wine") || name.includes("whiskey") ||
                 name.includes("vodka") || name.includes("gin") || name.includes("rum") ||
                 name.includes("tequila") || name.includes("cocktail") || name.includes("drink") ||
                 name.includes("soda") || name.includes("water") || name.includes("juice");
        });

        if (drinkItems.length > 0) {
          const drinkTotal = drinkItems.reduce((acc, it) => {
            const qty = Number(it.quantity || it.qty || 1);
            const pr = Number(
              it.price ||
              it.unit_price ||
              productPriceMap.get(String(it.product_id)) ||
              productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
              0
            );
            return acc + (qty * pr);
          }, 0);

          combinedMap.set(String(posOrder.id), {
            ...posOrder,
            items: drinkItems,
            total: drinkTotal > 0 ? drinkTotal : Number(posOrder.total || posOrder.total_amount || 0),
          });
        }
      });

      // 2. Overlay live/dedicated bar tickets from /bar/orders
      barList.forEach((item) => {
        const key = String(item.order_id || item.id || Math.random());
        const existing = combinedMap.get(key);

        const items = parseRawItems(item.items);
        const matchedPos = posOrderMap.get(String(item.order_id || item.id));

        let calcTotal = 0;
        items.forEach((it) => {
          const qty = Number(it.quantity || it.qty || 1);
          const pr = Number(
            it.unit_price ||
            it.price ||
            productPriceMap.get(String(it.product_id)) ||
            productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
            0
          );
          calcTotal += (qty * pr);
        });

        let finalOrderTotal = Number(item.total || item.total_amount || item.amount || item.order_total || 0);
        if (finalOrderTotal === 0 && calcTotal > 0) {
          finalOrderTotal = calcTotal;
        }
        if (finalOrderTotal === 0 && matchedPos) {
          finalOrderTotal = Number(matchedPos.total || matchedPos.total_amount || 0);
        }
        if (finalOrderTotal === 0 && existing) {
          finalOrderTotal = Number(existing.total || 0);
        }

        combinedMap.set(key, {
          ...(existing || {}),
          ...item,
          items: items.length > 0 ? items : (existing?.items || []),
          total: finalOrderTotal,
        });
      });

      const finalOrders = Array.from(combinedMap.values()).map((b) => {
        const empId = String(b.waiter_id || b.waiterId || b.created_by_id || b.user_id || b.bartender_id || "");
        const waiterName = empMap.get(empId) || b.waiter_name || b.waiterName || b.waiter || b.bartender || (b.bartender_first_name ? `${b.bartender_first_name} ${b.bartender_last_name || ""}`.trim() : "Bar Staff");

        return {
          ...b,
          waiter_name: waiterName,
        };
      });

      setBarOrdersList(finalOrders);
    } catch (err) {
      console.error("Failed to fetch bar reports:", err);
      setError(err.message || "Failed to load bar orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarOrders();
  }, []);

  const formattedOrders = useMemo(() => {
    return barOrdersList.map((b) => {
      const itemsArr = parseRawItems(b.items);
      const itemsSummary = itemsArr.length > 0
        ? itemsArr.map((i) => `${i.quantity || i.qty || 1}x ${i.product_name || i.name || "Drink"}`).join(", ")
        : "Bar Beverage Order";

      const createdAtStr = b.created_at || b.createdAt || b.date || "";
      const dateStr = createdAtStr ? String(createdAtStr).split(/[T ]/)[0] : "";
      const timeStr = createdAtStr ? new Date(createdAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

      let statusFormatted = "Ready";
      const st = String(b.status || "").toLowerCase();
      if (st === "ready" || st === "served" || st === "completed") {
        statusFormatted = "Ready";
      } else if (st === "preparing" || st === "in_progress" || st === "pending" || st === "new" || st === "confirmed") {
        statusFormatted = "Preparing";
      } else if (st === "cancelled") {
        statusFormatted = "Cancelled";
      }

      return {
        id: `#B-${b.id || b.order_id || "101"}`,
        table: b.table_name || b.table_number || (b.table_id ? `Table ${b.table_id}` : "Bar Counter"),
        items: itemsSummary,
        itemsRaw: itemsArr,
        bartender: b.waiter_name || b.bartender || "Bar Staff",
        status: statusFormatted,
        date: dateStr,
        time: timeStr,
        total: Number(b.total || b.total_amount || b.amount || 0),
      };
    });
  }, [barOrdersList]);

  const filteredOrders = useMemo(() => {
    return formattedOrders.filter((order) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        String(order.id).toLowerCase().includes(query) ||
        String(order.table).toLowerCase().includes(query) ||
        String(order.items).toLowerCase().includes(query) ||
        String(order.bartender).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      // Date Range filter
      if (fromDate || toDate) {
        const oDate = order.date;
        if (fromDate && oDate && oDate < fromDate) return false;
        if (toDate && oDate && oDate > toDate) return false;
        if (!oDate && (fromDate || toDate)) return false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [formattedOrders, search, statusFilter, fromDate, toDate]);

  const totalOrdersCount = filteredOrders.length;
  const readyOrders = filteredOrders.filter((o) => o.status === "Ready").length;
  const preparingOrders = filteredOrders.filter((o) => o.status === "Preparing").length;
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

  // Top Drinks Prepared
  const topDrinks = useMemo(() => {
    const drinkMap = new Map();
    filteredOrders.forEach((o) => {
      o.itemsRaw.forEach((i) => {
        const name = i.product_name || i.name || "Beverage Drink";
        const q = Number(i.quantity || i.qty || 1);
        drinkMap.set(name, (drinkMap.get(name) || 0) + q);
      });
    });

    return Array.from(drinkMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const handlePrint = () => {
    printReportArea("bar-reports-printable-area", "Bar Sales & Drink Audit Report");
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Wine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Bar Department Audit Report
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Live multi-endpoint database audit for beverage sales & drinks served.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBarOrders}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-purple-700"
          >
            <Printer className="h-4 w-4" />
            Print Audit Report
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Total Bar Orders"
          value={loading ? "..." : totalOrdersCount}
          description="Beverage tickets received"
          icon={Wine}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
        <ReportStatCard
          title="Drinks Ready / Served"
          value={loading ? "..." : readyOrders}
          description="Dispatched by bartender"
          icon={CheckCircle2}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Orders Preparing"
          value={loading ? "..." : preparingOrders}
          description="Currently at counter"
          icon={Clock3}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Total Drink Sales"
          value={loading ? "..." : `${totalSales.toLocaleString()} ETB`}
          description="Gross bar sales value"
          icon={TrendingUp}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden space-y-3">
        {/* TOP ROW: PRESETS + CLEAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1">Date Range:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  datePreset === p.id
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => handleApplyPreset("all")}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>

        {/* BOTTOM ROW: SEARCH + FROM/TO DATE + STATUS FILTER */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search drink, order ID, table #, staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
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
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
              >
                <option value="All">All Statuses</option>
                <option value="Ready">Ready / Served</option>
                <option value="Preparing">Preparing</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE AUDIT REPORT */}
      <div id="bar-reports-printable-area" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">THE OAK CLUB</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Bar & Beverage Sales Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">
              Audit Period:{" "}
              <span className="text-slate-900">
                {fromDate && toDate && fromDate === toDate
                  ? fromDate
                  : fromDate && toDate
                  ? `${fromDate} to ${toDate}`
                  : fromDate
                  ? `From ${fromDate}`
                  : toDate
                  ? `Up to ${toDate}`
                  : "All Time"}
              </span>
            </p>
            <p className="text-xs text-slate-400">Total Bar Orders: {filteredOrders.length}</p>
          </div>
        </div>

        {/* EXECUTIVE FINANCIAL & BEVERAGE SUMMARY BOX (Matching Executive Report Format) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Verified Bar Sales</p>
            <p className="mt-1 text-xl font-black text-indigo-700">
              {totalSales.toLocaleString()} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Gross drink sales value</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Drink Tickets</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {totalOrdersCount}
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Bar orders served</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Orders Ready / Served</p>
            <p className="mt-1 text-xl font-black text-emerald-600">
              {readyOrders}
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Completed drink rounds</p>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200/60 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Average Drink Ticket</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {(totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0).toFixed(2)} ETB
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Avg spend per beverage order</p>
          </div>
        </div>

        {/* TOP DRINKS SERVED */}
        {topDrinks.length > 0 && (
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <Wine className="h-4 w-4 text-purple-600" />
              Beverage Items & Drinks Served Breakdown
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Beverage Drink Name</th>
                    <th className="px-4 py-3 text-right">Total Units Served</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {topDrinks.map((drink, idx) => (
                    <tr key={drink.name} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{drink.name}</td>
                      <td className="px-4 py-2.5 text-right font-black text-purple-700 bg-purple-50/50">
                        {drink.count} Bottle(s) / Can(s)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ITEMIZED TABLE */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-700" />
            Itemized Bar Orders Audit Table
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Time</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">Loading bar orders...</td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{order.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{order.table}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{order.items}</td>
                      <td className="px-4 py-3 text-slate-600">{order.bartender}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${
                          order.status === "Ready"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "Preparing"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{order.time}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{order.total.toLocaleString()} ETB</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400 italic">No bar orders found for selected criteria.</td>
                  </tr>
                )}
              </tbody>
              {/* GRAND TOTAL TFOOT */}
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                      Grand Total Bar Sales Revenue:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black text-indigo-800">
                      {totalSales.toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs text-slate-900 font-bold">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB — BAR SHIFT AUDIT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Operational & Beverage Audit Report</p>
            </div>
            <div className="text-right">
              <p>Head Bartender Signature: ______________________</p>
              <p className="mt-2">Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarReportsPage;