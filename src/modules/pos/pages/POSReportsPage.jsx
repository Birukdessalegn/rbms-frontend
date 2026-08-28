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
  Download,
} from "lucide-react";
import api from "../../../services/api";

function POSReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchPosOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      try {
        res = await api("/pos/orders");
      } catch {
        res = await api("/dashboard/orders/recent");
      }
      const list = res.orders || res.data || res.rows || (Array.isArray(res) ? res : []);
      setOrders(list);
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

      return dateFromMatch && dateToMatch && statusMatch;
    });
  }, [orders, fromDate, toDate, statusFilter]);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            POS Sales & Orders Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze revenue, order volume, and payment breakdowns live from database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPosOrders}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="paid">Paid / Completed</option>
              <option value="unpaid">Unpaid / Pending</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setStatusFilter("All");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Orders</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : totalOrders}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Total POS transaction count</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Completed Orders</p>
          <h2 className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? "..." : completedOrders}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Settled and paid sales</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Revenue</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-600">
            {loading ? "..." : `${totalSales.toLocaleString()} ETB`}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Collected gross total</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Avg. Order Value</p>
          <h2 className="mt-2 text-2xl font-bold text-indigo-600">
            {loading ? "..." : `${avgOrderValue.toFixed(2)} ETB`}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Average ticket size</p>
        </div>
      </div>

      {/* Detailed Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Transaction History Log</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                    Loading sales data...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const isPaid = o.payment_status === "paid" || o.status === "completed";
                  const total = Number(o.total || o.total_amount || o.subtotal || 0);
                  const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : "-";
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {o.order_number || `#${o.id}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-700 font-medium">
                        {o.order_type || "Dine In"}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {total.toLocaleString()} ETB
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
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
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                    No POS transaction records found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default POSReportsPage;