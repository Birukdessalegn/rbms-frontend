import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Smartphone,
  Users,
  Search,
  RefreshCw,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Receipt,
  X,
  Eye,
  FileText,
  UtensilsCrossed,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

function StatCard({ title, value, subtext, icon: Icon, color, bg }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {value}
          </h3>
          {subtext && (
            <p className="mt-1 text-xs font-medium text-slate-500">{subtext}</p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const resolvePaymentMethod = (o) => {
  if (!o) return "cash";
  const explicit = o.payment_method || o.paymentMethod;
  if (explicit && String(explicit).trim() !== "") return String(explicit).toLowerCase();

  if (Array.isArray(o.payments) && o.payments.length > 0) {
    const valid = o.payments.find((p) => p.payment_method || p.method);
    if (valid) return String(valid.payment_method || valid.method).toLowerCase();
  }

  if (
    o.payment_status === "credit_approved" ||
    o.payment_status === "credit_pending" ||
    String(o.reference || "").includes("VIP_CREDIT")
  ) {
    return "credit";
  }

  return "cash";
};

const isMobilePayment = (method) => {
  return (
    method === "mobile_money" ||
    method === "telebirr" ||
    method === "mobile" ||
    method === "bank_transfer" ||
    method === "transfer" ||
    method === "cbe" ||
    method === "cbebirr"
  );
};

const isCardPayment = (method) => {
  return method === "card" || method === "pos" || method === "card_pos";
};

const isCreditPayment = (method, o) => {
  return method === "credit" || method === "vip_credit" || o?.payment_status === "credit_approved";
};

const getPaymentLabel = (method, o) => {
  if (isMobilePayment(method)) return "Mobile Banking";
  if (isCardPayment(method)) return "Card POS";
  if (isCreditPayment(method, o)) return "VIP Credit";
  return "Cash";
};

function FinanceSalesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Selected Order for Receipt Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch live orders
      const res = await api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] })));
      const list = res.orders || res.data || (Array.isArray(res) ? res : []);

      // Filter to completed / paid / served orders
      const validSales = list.filter(
        (o) =>
          o.payment_status === "paid" ||
          o.payment_status === "credit_approved" ||
          o.status === "completed" ||
          o.status === "served" ||
          Number(o.total || 0) > 0
      );

      setOrders(validSales);
    } catch (err) {
      console.error("Failed to load sales data:", err);
      setError(err.message || "Failed to load sales transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Handle Preset Date Filters
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === "today") {
      const d = today.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const d = y.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(today.getDate() - 7);
      setStartDate(w.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(m.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const rawDate = o.created_at || o.createdAt || o.date;
      const orderDate = rawDate ? String(rawDate).split(/[T ]/)[0] : "";

      // Date Range Filter
      if (startDate && orderDate && orderDate < startDate) return false;
      if (endDate && orderDate && orderDate > endDate) return false;

      // Payment Method Filter
      const method = resolvePaymentMethod(o);
      if (paymentFilter !== "all") {
        if (paymentFilter === "cash" && (isCardPayment(method) || isMobilePayment(method) || isCreditPayment(method, o))) return false;
        if (paymentFilter === "digital" && !isCardPayment(method) && !isMobilePayment(method)) return false;
        if (paymentFilter === "credit" && !isCreditPayment(method, o)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderId = String(o.id || o.order_id || "");
        const cashier = (o.cashier_name || o.waiter_name || o.user_name || "").toLowerCase();
        const table = String(o.table_number || o.table_id || "");
        const customer = (o.customer_name || o.guest_name || "").toLowerCase();

        return (
          orderId.includes(q) ||
          cashier.includes(q) ||
          table.includes(q) ||
          customer.includes(q)
        );
      }

      return true;
    });
  }, [orders, startDate, endDate, paymentFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let cashSales = 0;
    let cardSales = 0;
    let mobileSales = 0;
    let creditSales = 0;

    filteredOrders.forEach((o) => {
      const amt = Number(o.total || o.total_amount || 0);
      totalRevenue += amt;

      const method = resolvePaymentMethod(o);
      if (isCardPayment(method)) cardSales += amt;
      else if (isMobilePayment(method)) mobileSales += amt;
      else if (isCreditPayment(method, o)) creditSales += amt;
      else cashSales += amt;
    });

    const totalOrdersCount = filteredOrders.length;
    const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    return {
      totalRevenue,
      cashSales,
      cardSales,
      mobileSales,
      creditSales,
      totalOrdersCount,
      aov,
    };
  }, [filteredOrders]);

  // Parse items helper
  const parseItems = (order) => {
    if (!order) return [];
    let items = order.items || order.order_items || order.products || [];
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    if (Array.isArray(items) && items.length > 0) return items;
    if (order.items_summary) return [{ name: order.items_summary, quantity: 1, price: order.total }];
    return [];
  };

  const handlePrint = () => {
    printReportArea("finance-sales-printable-area", "Sales & Revenue Ledger Report");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Sales & Revenue Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit restaurant order transactions, payment distributions, and verified sales revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSalesData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Printer className="h-4 w-4" />
            Print Sales Ledger
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales Revenue"
          value={`${metrics.totalRevenue.toLocaleString()} ETB`}
          subtext={`Across ${metrics.totalOrdersCount} completed orders`}
          icon={TrendingUp}
          color="text-emerald-700"
          bg="bg-emerald-50 border border-emerald-100"
        />

        <StatCard
          title="Cash Handover Revenue"
          value={`${metrics.cashSales.toLocaleString()} ETB`}
          subtext={
            metrics.totalRevenue > 0
              ? `${Math.round((metrics.cashSales / metrics.totalRevenue) * 100)}% of total sales`
              : "0% of total sales"
          }
          icon={DollarSign}
          color="text-green-700"
          bg="bg-green-50 border border-green-100"
        />

        <StatCard
          title="Digital Sales (Mobile & POS)"
          value={`${(metrics.cardSales + metrics.mobileSales).toLocaleString()} ETB`}
          subtext={`Mobile Banking: ${metrics.mobileSales.toLocaleString()} | Card: ${metrics.cardSales.toLocaleString()}`}
          icon={Smartphone}
          color="text-blue-700"
          bg="bg-blue-50 border border-blue-100"
        />

        <StatCard
          title="Avg Order Value (AOV)"
          value={`${Math.round(metrics.aov).toLocaleString()} ETB`}
          subtext={`VIP Credit Tabs: ${metrics.creditSales.toLocaleString()} ETB`}
          icon={Receipt}
          color="text-indigo-700"
          bg="bg-indigo-50 border border-indigo-100"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-transparent font-medium text-slate-700 outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-transparent font-medium text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Search & Channel Filters */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Cashier, Table, or Customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}

            {/* Floating Dropdown for Sales Orders */}
            {searchQuery.trim() && (
              <div className="absolute left-0 top-full mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">No matching sales orders found</div>
                ) : (
                  filteredOrders.slice(0, 15).map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setSearchQuery(String(ord.order_number || ord.id))}
                      className="w-full flex items-center justify-between p-2.5 text-left hover:bg-emerald-50 rounded-lg transition group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate transition">
                          Order #{ord.order_number || ord.id}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ord.table_label ? `Table ${ord.table_label}` : "Quick Order"} • {ord.cashier_name || ord.waiter_name || "Staff"}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {Number(ord.total_amount || ord.total || 0).toLocaleString()} ETB
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Payment Channels</option>
              <option value="cash">Cash Only</option>
              <option value="digital">Digital (Card & Mobile Banking)</option>
              <option value="credit">VIP Credit Tabs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Recorded Sales Orders</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredOrders.length} transaction{filteredOrders.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
            <span>Loading Sales Transactions...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No Sales Transactions Found</p>
            <p className="text-xs text-slate-400 mt-1">
              No orders matched your selected date range and payment filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Order ID</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Table / Area</th>
                  <th className="px-5 py-4">Staff / Cashier</th>
                  <th className="px-5 py-4">Payment Channel</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const rawDate = order.created_at || order.createdAt || order.date;
                  const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : "—";
                  const timeStr = rawDate
                    ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—";

                  const method = resolvePaymentMethod(order);
                  const totalAmt = Number(order.total || order.total_amount || 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        #ORD-{order.id}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-semibold text-slate-800">{dateStr}</p>
                        <p className="text-slate-400">{timeStr}</p>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                        {order.table_number ? `Table #${order.table_number}` : order.table_id ? `Table #${order.table_id}` : "Takeout / Bar"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {order.cashier_name || order.waiter_name || order.user_name || "Cashier"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            isCardPayment(method)
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : isMobilePayment(method)
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isCreditPayment(method, order)
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-green-200 bg-green-50 text-green-700"
                          }`}
                        >
                          {isCardPayment(method) ? (
                            <CreditCard className="h-3 w-3" />
                          ) : isMobilePayment(method) ? (
                            <Smartphone className="h-3 w-3" />
                          ) : isCreditPayment(method, order) ? (
                            <Users className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {getPaymentLabel(method, order)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">
                        {totalAmt.toLocaleString()} ETB
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINTABLE AREA (HIDDEN EXCEPT WHEN PRINTING) */}
      <div id="finance-sales-printable-area" className="hidden print:block p-8 bg-white text-slate-900">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight">THE OAK CLUB & LOUNGE</h1>
          <p className="text-xs text-slate-600 font-medium">Sales & Revenue Audit Ledger</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Period: {startDate || "All Time"} to {endDate || "All Time"} • Generated: {new Date().toLocaleString()}
          </p>
        </div>

        <div className="my-6 grid grid-cols-4 gap-4 border border-slate-200 p-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total Revenue</span>
            <span className="font-bold text-base">{metrics.totalRevenue.toLocaleString()} ETB</span>
          </div>
          <div>
            <span className="text-slate-500 block">Cash Collected</span>
            <span className="font-bold text-base">{metrics.cashSales.toLocaleString()} ETB</span>
          </div>
          <div>
            <span className="text-slate-500 block">Digital Payments</span>
            <span className="font-bold text-base">{(metrics.cardSales + metrics.mobileSales).toLocaleString()} ETB</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Orders</span>
            <span className="font-bold text-base">{metrics.totalOrdersCount}</span>
          </div>
        </div>

        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase">
            <tr>
              <th className="p-2">Order #</th>
              <th className="p-2">Date & Time</th>
              <th className="p-2">Table</th>
              <th className="p-2">Cashier</th>
              <th className="p-2">Channel</th>
              <th className="p-2 text-right">Amount (ETB)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredOrders.map((o) => (
              <tr key={o.id}>
                <td className="p-2 font-semibold">#{o.id}</td>
                <td className="p-2">{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                <td className="p-2">{o.table_number || "Bar"}</td>
                <td className="p-2">{o.cashier_name || "Cashier"}</td>
                <td className="p-2 uppercase">{getPaymentLabel(resolvePaymentMethod(o), o)}</td>
                <td className="p-2 text-right font-bold">{Number(o.total || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RECEIPT / BILL DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Order #{selectedOrder.id} Bill Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">THE OAK CLUB</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Customer Bill & Sales Receipt</p>
                <p className="text-[10px] text-slate-400">
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block">Table:</span>
                  <span className="font-bold text-slate-800">
                    {selectedOrder.table_number ? `Table #${selectedOrder.table_number}` : "Takeout / Walk-in"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cashier / Staff:</span>
                  <span className="font-bold text-slate-800">
                    {selectedOrder.cashier_name || selectedOrder.waiter_name || "Cashier"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {getPaymentLabel(resolvePaymentMethod(selectedOrder), selectedOrder)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-bold text-emerald-700 capitalize">
                    {selectedOrder.payment_status || "Paid"}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-b border-slate-100 py-3 space-y-2">
                <div className="flex justify-between font-bold text-slate-400 uppercase text-[10px]">
                  <span>Item & Qty</span>
                  <span>Amount</span>
                </div>
                {parseItems(selectedOrder).length === 0 ? (
                  <p className="text-slate-400 italic">No itemized breakdown recorded</p>
                ) : (
                  parseItems(selectedOrder).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-800 font-medium">
                      <span>
                        {item.name || item.product_name} <span className="text-slate-400">x{item.quantity || 1}</span>
                      </span>
                      <span>
                        {Number(item.subtotal || (item.price * (item.quantity || 1)) || 0).toLocaleString()} ETB
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Total Summary */}
              <div className="space-y-1.5 pt-1 text-slate-600">
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">{Number(selectedOrder.total || 0).toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceSalesPage;
