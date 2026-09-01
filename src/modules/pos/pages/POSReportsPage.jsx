import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  Printer,
  User,
  Users,
  Award,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

function POSReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedWaiter, setSelectedWaiter] = useState("All");

  /* Helper to parse items safely */
  const parseItems = (itemsInput) => {
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

  const extractFullName = (first, last) => {
    if (first || last) {
      return `${first || ""} ${last || ""}`.trim();
    }
    return null;
  };

  const getWaiterFromObject = (obj, empMap) => {
    if (!obj) return null;

    const fnLn =
      extractFullName(obj.waiter_first_name, obj.waiter_last_name) ||
      extractFullName(obj.waiterFirstName, obj.waiterLastName) ||
      extractFullName(obj.created_by_first_name, obj.created_by_last_name) ||
      extractFullName(obj.user_first_name, obj.user_last_name) ||
      extractFullName(obj.waiter?.first_name || obj.waiter?.firstName, obj.waiter?.last_name || obj.waiter?.lastName) ||
      extractFullName(obj.created_by?.first_name || obj.created_by?.firstName, obj.created_by?.last_name || obj.created_by?.lastName) ||
      extractFullName(obj.user?.first_name || obj.user?.firstName, obj.user?.last_name || obj.user?.lastName);

    if (fnLn) return fnLn;

    const directName =
      (typeof obj.waiter_name === "string" && obj.waiter_name) ||
      (typeof obj.waiterName === "string" && obj.waiterName) ||
      (typeof obj.waiter === "string" && obj.waiter) ||
      (typeof obj.server_name === "string" && obj.server_name) ||
      (typeof obj.user_name === "string" && obj.user_name) ||
      (typeof obj.created_by_name === "string" && obj.created_by_name) ||
      (typeof obj.employee_name === "string" && obj.employee_name) ||
      obj.waiter?.name ||
      obj.waiter?.username ||
      obj.created_by?.name ||
      obj.created_by?.username ||
      obj.user?.name ||
      obj.user?.username;

    if (directName && directName !== "Staff Waiter") return directName;

    const empId =
      obj.waiter_id ||
      obj.waiterId ||
      obj.created_by_id ||
      obj.created_by ||
      obj.user_id ||
      obj.userId ||
      obj.employee_id ||
      obj.employeeId;

    if (empId && empMap.has(String(empId))) {
      return empMap.get(String(empId));
    }

    return null;
  };

  const fetchPosOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const [posRes, kitchenRes, barRes, tablesRes, empRes] = await Promise.all([
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => []),
        api("/tables").catch(() => api("/pos/tables").catch(() => [])),
        api("/employees").catch(() => []),
      ]);

      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const kitchenList = Array.isArray(kitchenRes) ? kitchenRes : (kitchenRes.orders || []);
      const barList = Array.isArray(barRes) ? barRes : (barRes.orders || []);
      const tablesList =
        (Array.isArray(tablesRes) ? tablesRes : null) ||
        tablesRes.tables ||
        tablesRes.data?.tables ||
        tablesRes.data ||
        [];
      const empList =
        (Array.isArray(empRes) ? empRes : null) ||
        empRes.employees ||
        empRes.data?.employees ||
        empRes.data ||
        [];

      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName =
          extractFullName(emp.first_name || emp.firstName, emp.last_name || emp.lastName) ||
          emp.name ||
          emp.username;
        if (idKey && fullName) {
          empMap.set(idKey, fullName);
        }
      });

      const tableWaiterMap = new Map();
      tablesList.forEach((t) => {
        const tId = String(t.id || t.table_number || "");
        const tName = getWaiterFromObject(t, empMap) || t.current_waiter_name || t.waiter_name;
        if (tId && tName) tableWaiterMap.set(tId, tName);
      });

      const orderExtraMap = new Map();
      [...kitchenList, ...barList].forEach((k) => {
        const kId = String(k.order_id || k.id || "");
        if (!kId) return;
        const wName = getWaiterFromObject(k, empMap);

        if (wName) {
          orderExtraMap.set(kId, wName);
        }
      });

      const enriched = posList.map((o) => {
        const oId = String(o.id || o.order_number || "");
        const tId = String(o.table_id || o.table_number || "");
        const extraWaiter = orderExtraMap.get(oId);
        const tableWaiter = tableWaiterMap.get(tId);

        const waiterName =
          getWaiterFromObject(o, empMap) ||
          extraWaiter ||
          tableWaiter ||
          "Staff Waiter";

        return {
          ...o,
          waiter_name: waiterName,
        };
      });

      setOrders(enriched);
    } catch (err) {
      console.error("Failed to fetch POS reports:", err);
      setError(err.message || "Failed to load POS sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosOrders();
  }, []);

  /* Extract unique waiters from orders */
  const uniqueWaiters = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name;
      if (name && name !== "Staff Waiter") set.add(name);
    });
    return Array.from(set);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDate = o.created_at ? o.created_at.split("T")[0] : "";
      const dateFromMatch = !fromDate || (orderDate && orderDate >= fromDate);
      const dateToMatch = !toDate || (orderDate && orderDate <= toDate);

      const isPaidOrCompleted = o.payment_status === "paid" || o.status === "completed";
      const statusMatch =
        statusFilter === "All" ||
        (statusFilter === "paid" && isPaidOrCompleted) ||
        (statusFilter === "unpaid" && !isPaidOrCompleted) ||
        o.status === statusFilter;

      const waiterName = o.waiter_name || o.waiterName || o.user_name || "";
      const waiterMatch = selectedWaiter === "All" || waiterName === selectedWaiter;

      return dateFromMatch && dateToMatch && statusMatch && waiterMatch;
    });
  }, [orders, fromDate, toDate, statusFilter, selectedWaiter]);

  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(
    (o) => o.payment_status === "paid" || o.status === "completed"
  ).length;

  const totalSales = filteredOrders.reduce((sum, o) => {
    const isPaid = o.payment_status === "paid" || o.status === "completed";
    if (!isPaid) return sum;
    const amount = Number(o.total || o.total_amount || o.subtotal || 0);
    return sum + amount;
  }, 0);

  const avgOrderValue = completedOrders > 0 ? totalSales / completedOrders : 0;

  /* Aggregated Waiter Performance Summary Calculation */
  const waiterSummary = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name || "Staff Waiter";
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const total = Number(o.total || o.total_amount || o.subtotal || 0);

      if (!map.has(name)) {
        map.set(name, {
          name,
          ticketsServed: 0,
          paidSales: 0,
          pendingSales: 0,
        });
      }
      const stat = map.get(name);
      stat.ticketsServed += 1;
      if (isPaid) {
        stat.paidSales += total;
      } else {
        stat.pendingSales += total;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.paidSales - a.paidSales);
  }, [filteredOrders]);

  const handlePrint = () => {
    printReportArea("pos-reports-printable-area", "POS Sales & Waiter Audit Report");
  };

  return (
    <div className="space-y-6">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            POS Sales & Orders Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze revenue, waiter sales performance, and payment breakdowns live from database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPosOrders}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
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

      {/* PRINTABLE REPORT AREA */}
      <div id="pos-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                CASHIER SHIFT & WAITER SALES REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official POS Revenue Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">Server Filter: {selectedWaiter}</p>
            </div>
          </div>
        </div>

        {/* Filters (Hidden on Print) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-hidden focus:border-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="paid">Paid / Completed</option>
                <option value="unpaid">Unpaid / Pending</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Server / Waiter
              </label>
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-hidden focus:border-blue-500"
              >
                <option value="All">All Waiters / Staff</option>
                {uniqueWaiters.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setStatusFilter("All");
                  setSelectedWaiter("All");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 grid-4">
          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-sm font-medium text-slate-500">Total Orders</p>
            <h2 className="card-value mt-2 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalOrders}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Total POS transaction count</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-sm font-medium text-slate-500">Completed Orders</p>
            <h2 className="card-value mt-2 text-2xl font-bold text-emerald-600">
              {loading ? "..." : completedOrders}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Settled and paid sales</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-sm font-medium text-slate-500">Total Revenue</p>
            <h2 className="card-value mt-2 text-2xl font-bold text-blue-600">
              {loading ? "..." : `${totalSales.toLocaleString()} ETB`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Collected gross total</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-sm font-medium text-slate-500">Avg. Order Value</p>
            <h2 className="card-value mt-2 text-2xl font-bold text-indigo-600">
              {loading ? "..." : `${avgOrderValue.toFixed(2)} ETB`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Average ticket size</p>
          </div>
        </div>

        {/* WAITER PERFORMANCE & SALES SUMMARY SECTION */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Users size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Server & Waiter Sales Breakdown</h2>
                <p className="text-xs text-slate-500">Total tickets served, collected revenue, and average sales calculated per waiter</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              {waiterSummary.length} Active Staff Servers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Server / Waiter Name</th>
                  <th className="px-5 py-3">Tables / Tickets Served</th>
                  <th className="px-5 py-3">Total Paid Sales</th>
                  <th className="px-5 py-3">Pending / Unpaid Sales</th>
                  <th className="px-5 py-3">Avg Ticket Value</th>
                  <th className="px-5 py-3">% Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center text-slate-400 text-xs">
                      Calculating waiter performance...
                    </td>
                  </tr>
                ) : waiterSummary.length > 0 ? (
                  waiterSummary.map((w, idx) => {
                    const avg = w.ticketsServed > 0 ? w.paidSales / w.ticketsServed : 0;
                    const pct = totalSales > 0 ? (w.paidSales / totalSales) * 100 : 0;
                    return (
                      <tr key={w.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                              #{idx + 1}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 border border-indigo-100">
                              <User size={12} />
                              {w.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-slate-800">
                          {w.ticketsServed} Tickets
                        </td>
                        <td className="px-5 py-3.5 font-black text-emerald-700">
                          {w.paidSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                        </td>
                        <td className="px-5 py-3.5 font-bold text-amber-700">
                          {w.pendingSales > 0 ? `${w.pendingSales.toFixed(2)} ETB` : "-"}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700">
                          {avg.toFixed(2)} ETB
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden print-hide">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-indigo-900">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center text-slate-400 text-xs">
                      No waiter transaction data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 print-hide">
            <h2 className="font-bold text-slate-900">Detailed POS Transaction Log</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Server / Waiter</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                      Loading sales data...
                    </td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => {
                    const isPaid = o.payment_status === "paid" || o.status === "completed";
                    const total = Number(o.total || o.total_amount || o.subtotal || 0);
                    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : "-";
                    const waiterName = o.waiter_name || o.waiterName || o.user_name || "Staff Waiter";
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {o.order_number || `#${o.id}`}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {dateStr}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 border border-indigo-100">
                            <User size={12} />
                            {waiterName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-slate-700 font-medium">
                          {o.order_type || "Dine In"}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {total.toLocaleString()} ETB
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`badge ${
                              isPaid ? "badge-paid" : "badge-pending"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                      No POS transaction records found matching filter criteria.
                    </td>
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
              <p className="font-extrabold uppercase">THE OAK CLUB — CASHIER SHIFT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Financial Audit Report</p>
            </div>
            <div className="text-right">
              <p>Cashier Signature: ______________________</p>
              <p className="mt-2">Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default POSReportsPage;