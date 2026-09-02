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
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

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

      // Multi-endpoint API fetch strategy like POSReportsPage
      const [barRes, posRes, empRes] = await Promise.all([
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/employees").catch(() => []),
      ]);

      const barList = Array.isArray(barRes) ? barRes : barRes.orders || barRes.data || [];
      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const empList = Array.isArray(empRes) ? empRes : empRes.employees || empRes.data || [];

      // Create Employee ID -> Name map
      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || emp.username;
        if (idKey && fullName) empMap.set(idKey, fullName);
      });

      // Merge and deduplicate bar orders
      const combinedMap = new Map();
      barList.forEach((item) => {
        const key = String(item.id || item.order_id || Math.random());
        combinedMap.set(key, item);
      });

      // If bar specific endpoint empty, extract drink items from POS orders
      if (combinedMap.size === 0 && posList.length > 0) {
        posList.forEach((posOrder) => {
          const items = parseRawItems(posOrder.items);
          const drinkItems = items.filter((i) => {
            const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
            const name = String(i.product_name || i.name || "").toLowerCase();
            return cat.includes("bar") || cat.includes("drink") || name.includes("beer") || name.includes("wine") || name.includes("whiskey") || name.includes("drink") || name.includes("soda") || name.includes("water");
          });

          if (drinkItems.length > 0) {
            combinedMap.set(String(posOrder.id), {
              ...posOrder,
              items: drinkItems,
            });
          }
        });
      }

      const finalOrders = Array.from(combinedMap.values()).map((b) => {
        const empId = String(b.waiter_id || b.waiterId || b.created_by_id || b.user_id || "");
        const waiterName = empMap.get(empId) || b.waiter_name || b.waiterName || b.waiter || b.bartender || "Bar Staff";

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

      const createdAtStr = b.created_at || b.createdAt || "";
      const dateStr = createdAtStr ? createdAtStr.split(/[T ]/)[0] : "";
      const timeStr = createdAtStr ? new Date(createdAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

      let statusFormatted = "Ready";
      if (b.status === "ready" || b.status === "served" || b.status === "completed") {
        statusFormatted = "Ready";
      } else if (b.status === "preparing" || b.status === "in_progress" || b.status === "pending") {
        statusFormatted = "Preparing";
      } else if (b.status === "cancelled") {
        statusFormatted = "Cancelled";
      }

      return {
        id: `#B-${b.id || b.order_id}`,
        table: b.table_name || b.table_number || `Table ${b.table_id || 1}`,
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

      const matchesDate = !reportDate || !order.date || order.date === reportDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [formattedOrders, search, statusFilter, reportDate]);

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
    window.print();
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
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
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
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready / Served</option>
              <option value="Preparing">Preparing</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE AUDIT REPORT */}
      <div id="printable-report" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">THE OAK CLUB</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Bar & Beverage Sales Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Audit Date: <span className="text-slate-900">{reportDate || "All Time"}</span></p>
            <p className="text-xs text-slate-400">Total Bar Orders: {filteredOrders.length}</p>
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarReportsPage;