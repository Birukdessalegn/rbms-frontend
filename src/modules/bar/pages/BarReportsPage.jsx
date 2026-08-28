import { useEffect, useMemo, useState } from "react";
import {
  Wine,
  TrendingUp,
  Clock3,
  CheckCircle2,
  ClipboardList,
  Printer,
  Search,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";

function ReportCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
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

  const fetchBarOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/bar/orders");
      console.log("BAR REPORTS FETCH:", res);
      const list = res.orders || res.data || (Array.isArray(res) ? res : []);
      setBarOrdersList(list);
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

  const formattedOrders = useMemo(() => {
    return barOrdersList.map((b) => {
      const itemsArr = parseRawItems(b.items);
      const itemsSummary = itemsArr.length > 0
        ? itemsArr.map((i) => `${i.quantity || i.qty || 1} ${i.product_name || i.name || "Drink"}`).join(", ")
        : "Drinks Order";

      const createdAtStr = b.created_at || "";
      const dateStr = createdAtStr ? createdAtStr.split("T")[0] : "";
      const timeStr = createdAtStr ? new Date(createdAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

      let statusFormatted = "New";
      if (b.status === "ready" || b.status === "served" || b.status === "completed") {
        statusFormatted = "Ready";
      } else if (b.status === "preparing" || b.status === "in_progress") {
        statusFormatted = "Preparing";
      }

      return {
        id: b.order_number || `#B-${b.id}`,
        table: b.table_number ? `Table ${b.table_number}` : (b.table_id ? `Table ${b.table_id}` : "Bar Counter"),
        items: itemsSummary,
        bartender: b.waiter_first_name || b.bartender || "Bartender",
        status: statusFormatted,
        total: Number(b.total || b.total_amount || b.subtotal || 0),
        date: dateStr,
        time: timeStr,
        raw: b,
      };
    });
  }, [barOrdersList]);

  const filteredOrders = useMemo(() => {
    return formattedOrders.filter((order) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        order.id.toLowerCase().includes(searchValue) ||
        order.table.toLowerCase().includes(searchValue) ||
        order.items.toLowerCase().includes(searchValue) ||
        order.bartender.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        order.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesFromDate =
        !fromDate || order.date >= fromDate;

      const matchesToDate =
        !toDate || order.date <= toDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [formattedOrders, search, statusFilter, fromDate, toDate]);

  const totalOrders = filteredOrders.length;
  const newOrders = filteredOrders.filter((o) => o.status === "New").length;
  const readyOrders = filteredOrders.filter((o) => o.status === "Ready").length;
  const preparingOrders = filteredOrders.filter((o) => o.status === "Preparing").length;

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setFromDate("");
    setToDate("");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bar-report-page space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Wine className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bar Reports
            </h1>
            <p className="text-sm text-slate-500">
              Monitor bar drink orders, preparation status, and sales live from database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBarOrders}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">
            Filter Bar Report
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Filter bar orders by date, status, or keyword.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {/* SEARCH */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Order, table, drink name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* FROM DATE */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500"
            />
          </div>

          {/* TO DATE */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500"
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
            </select>
          </div>
        </div>

        {/* FILTER FOOTER */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredOrders.length}</span> orders
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          title="Total Orders"
          value={loading ? "..." : totalOrders}
          description="Bar orders in period"
          icon={ClipboardList}
        />
        <ReportCard
          title="Ready / Served"
          value={loading ? "..." : readyOrders}
          description="Completed drink orders"
          icon={CheckCircle2}
        />
        <ReportCard
          title="Preparing"
          value={loading ? "..." : preparingOrders}
          description="Currently at bar"
          icon={Clock3}
        />
        <ReportCard
          title="Total Drink Sales"
          value={loading ? "..." : `${totalSales.toLocaleString()} ETB`}
          description="Gross bar sales"
          icon={TrendingUp}
        />
      </div>

      {/* REPORT TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Bar Drink Orders Log</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Order
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Table
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Items
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Bartender
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Date & Time
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-400">
                    Loading live bar orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-400">
                    No bar orders found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {order.id}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.table}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.items}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.bartender}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        order.status === "Ready"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "Preparing"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {order.date} {order.time}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {order.total.toLocaleString()} ETB
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BarReportsPage;