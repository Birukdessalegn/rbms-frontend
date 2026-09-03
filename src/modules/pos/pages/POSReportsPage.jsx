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
  Download,
  Package,
  CreditCard,
  Smartphone,
  Landmark,
  PieChart,
  ChevronLeft,
  ChevronRight,
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

  /* Pagination State */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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

  /* Reset pagination on filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, statusFilter, selectedWaiter]);

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

  /* Total Menu Items Sold Count */
  const totalItemsSoldQuantity = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const items = parseItems(o.items || o.order_items);
      return sum + items.reduce((iSum, item) => iSum + Number(item.quantity || item.qty || 1), 0);
    }, 0);
  }, [filteredOrders]);

  /* Item-Wise Sales & Products Sold Breakdown Calculation */
  const itemSalesSummary = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const items = parseItems(o.items || o.order_items);

      items.forEach((item) => {
        const name =
          item.name ||
          item.product_name ||
          item.item_name ||
          item.title ||
          "Custom Item";
        const category = item.category || item.category_name || "General";
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(item.unit_price || item.price || 0);
        const itemTotal = Number(
          item.total || item.total_price || qty * price
        );

        if (!map.has(name)) {
          map.set(name, {
            name,
            category,
            quantitySold: 0,
            totalRevenue: 0,
            unitPrice: price,
          });
        }

        const stat = map.get(name);
        stat.quantitySold += qty;
        if (isPaid) {
          stat.totalRevenue += itemTotal > 0 ? itemTotal : qty * price;
        }
        if (price > 0) stat.unitPrice = price;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders]);

  /* Aggregated Payment Methods Breakdown */
  const paymentMethodSummary = useMemo(() => {
    const methods = {
      cash: { label: "Cash", amount: 0, count: 0 },
      telebirr: { label: "Telebirr / Mobile", amount: 0, count: 0 },
      bank: { label: "Bank Transfer", amount: 0, count: 0 },
      credit: { label: "Credit / Account", amount: 0, count: 0 },
    };

    filteredOrders.forEach((o) => {
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const total = Number(o.total || o.total_amount || o.subtotal || 0);

      let payments = [];
      if (Array.isArray(o.payments)) {
        payments = o.payments;
      } else if (typeof o.payments === "string") {
        try {
          payments = JSON.parse(o.payments);
        } catch (e) {
          payments = [];
        }
      }

      if (payments.length > 0) {
        payments.forEach((p) => {
          const m = (p.payment_method || "").toLowerCase();
          const amt = Number(p.amount || 0);
          if (m.includes("cash")) {
            methods.cash.amount += amt;
            methods.cash.count += 1;
          } else if (m.includes("telebirr") || m.includes("mobile") || m.includes("cbe")) {
            methods.telebirr.amount += amt;
            methods.telebirr.count += 1;
          } else if (m.includes("bank") || m.includes("transfer")) {
            methods.bank.amount += amt;
            methods.bank.count += 1;
          } else if (m.includes("credit")) {
            methods.credit.amount += amt;
            methods.credit.count += 1;
          } else {
            methods.cash.amount += amt;
            methods.cash.count += 1;
          }
        });
      } else {
        const pm = (o.payment_method || o.method || "").toLowerCase();
        if (pm.includes("cash")) {
          methods.cash.amount += isPaid ? total : 0;
          methods.cash.count += 1;
        } else if (pm.includes("telebirr") || pm.includes("mobile") || pm.includes("cbe")) {
          methods.telebirr.amount += isPaid ? total : 0;
          methods.telebirr.count += 1;
        } else if (pm.includes("bank") || pm.includes("transfer")) {
          methods.bank.amount += isPaid ? total : 0;
          methods.bank.count += 1;
        } else if (pm.includes("credit") || o.payment_status === "credit_pending") {
          methods.credit.amount += total;
          methods.credit.count += 1;
        } else {
          methods.cash.amount += isPaid ? total : 0;
          methods.cash.count += 1;
        }
      }
    });

    return methods;
  }, [filteredOrders]);

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

  /* Pagination Logic for Transaction Log */
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("pos-reports-printable-area", "POS Sales & Waiter Audit Report");
  };

  /* CSV Export Functionality */
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No sales orders available to export.");
      return;
    }

    let csv = "POS TRANSACTION SALES REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n\n`;

    // 1. Transaction Table
    csv += "Order #,Date & Time,Server / Waiter,Type,Payment Method,Payment Status,Total Amount (ETB)\n";
    filteredOrders.forEach((o) => {
      const orderNum = `"${o.order_number || '#' + o.id}"`;
      const dateStr = `"${o.created_at ? new Date(o.created_at).toLocaleString() : '-'}"`;
      const waiter = `"${(o.waiter_name || o.waiterName || 'Staff Waiter').replace(/"/g, '""')}"`;
      const type = `"${o.order_type || 'Dine In'}"`;
      const method = `"${(o.payment_method || 'N/A').replace(/"/g, '""')}"`;
      const status = `"${o.payment_status === 'paid' || o.status === 'completed' ? 'Paid' : 'Pending'}"`;
      const total = Number(o.total || o.total_amount || 0).toFixed(2);

      csv += `${orderNum},${dateStr},${waiter},${type},${method},${status},${total}\n`;
    });

    // 2. Item-Wise Sales Section
    if (itemSalesSummary.length > 0) {
      csv += "\n\nITEM & PRODUCT SALES SUMMARY\n";
      csv += "Product / Item Name,Category,Quantity Sold,Unit Price (ETB),Total Revenue (ETB)\n";
      itemSalesSummary.forEach((item) => {
        const name = `"${item.name.replace(/"/g, '""')}"`;
        const cat = `"${item.category.replace(/"/g, '""')}"`;
        const qty = item.quantitySold;
        const price = item.unitPrice.toFixed(2);
        const rev = item.totalRevenue.toFixed(2);
        csv += `${name},${cat},${qty},${price},${rev}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `POS_Sales_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Analyze revenue, items sold, waiter performance, and payment breakdowns live from database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {/* PRINTABLE REPORT AREA */}
      <div id="pos-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                CASHIER SHIFT, ITEM SALES & WAITER AUDIT REPORT
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
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</p>
            <h2 className="card-value mt-2 text-2xl font-black text-slate-900">
              {loading ? "..." : totalOrders}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Total POS tickets</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-xs font-semibold uppercase tracking-wider text-slate-500">Settled Orders</p>
            <h2 className="card-value mt-2 text-2xl font-black text-emerald-600">
              {loading ? "..." : completedOrders}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Paid transaction count</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</p>
            <h2 className="card-value mt-2 text-2xl font-black text-blue-600">
              {loading ? "..." : `${totalSales.toLocaleString()} ETB`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Collected gross total</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-xs font-semibold uppercase tracking-wider text-slate-500">Items Sold</p>
            <h2 className="card-value mt-2 text-2xl font-black text-purple-600">
              {loading ? "..." : `${totalItemsSoldQuantity.toLocaleString()} Units`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Total food & drink items</p>
          </div>

          <div className="card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="card-title text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Ticket Size</p>
            <h2 className="card-value mt-2 text-2xl font-black text-indigo-600">
              {loading ? "..." : `${avgOrderValue.toFixed(2)} ETB`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Average spend per order</p>
          </div>
        </div>

        {/* PAYMENT METHOD BREAKDOWN CARDS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <PieChart size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Payment Method Distribution</h2>
                <p className="text-xs text-slate-500">Breakdown of gross sales collected by payment channels</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold uppercase tracking-wider">Cash Payments</span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-xl font-black text-emerald-900">
                {paymentMethodSummary.cash.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
              </p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                {paymentMethodSummary.cash.count} Cash Transactions
              </p>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <div className="flex items-center justify-between text-sky-800">
                <span className="text-xs font-bold uppercase tracking-wider">Telebirr / Mobile</span>
                <Smartphone size={18} className="text-sky-600" />
              </div>
              <p className="mt-2 text-xl font-black text-sky-900">
                {paymentMethodSummary.telebirr.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
              </p>
              <p className="mt-1 text-[11px] font-semibold text-sky-700">
                {paymentMethodSummary.telebirr.count} Mobile Transfer Payments
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-xs font-bold uppercase tracking-wider">Bank Transfer</span>
                <Landmark size={18} className="text-purple-600" />
              </div>
              <p className="mt-2 text-xl font-black text-purple-900">
                {paymentMethodSummary.bank.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
              </p>
              <p className="mt-1 text-[11px] font-semibold text-purple-700">
                {paymentMethodSummary.bank.count} Direct Bank Transfers
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold uppercase tracking-wider">Credit / Unpaid</span>
                <CreditCard size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-xl font-black text-amber-900">
                {paymentMethodSummary.credit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
              </p>
              <p className="mt-1 text-[11px] font-semibold text-amber-700">
                {paymentMethodSummary.credit.count} Unsettled Credit Orders
              </p>
            </div>
          </div>
        </div>

        {/* PRODUCT & ITEM-WISE SALES BREAKDOWN TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Package size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Products & Menu Items Sold Breakdown</h2>
                <p className="text-xs text-slate-500">Items sold with quantity and revenue generated</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {itemSalesSummary.length} Unique Menu Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Product / Menu Item Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Quantity Sold</th>
                  <th className="px-5 py-3">Unit Price (ETB)</th>
                  <th className="px-5 py-3">Total Money Made (ETB)</th>
                  <th className="px-5 py-3">% Sales Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-6 text-center text-slate-400 text-xs">
                      Calculating product sales statistics...
                    </td>
                  </tr>
                ) : itemSalesSummary.length > 0 ? (
                  itemSalesSummary.map((item, idx) => {
                    const pct = totalSales > 0 ? (item.totalRevenue / totalSales) * 100 : 0;
                    return (
                      <tr key={item.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-500 capitalize">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center font-black text-purple-700">
                          <span className="inline-flex items-center justify-center rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-900 border border-purple-100">
                            {item.quantitySold} units
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-700">
                          {item.unitPrice > 0 ? `${item.unitPrice.toLocaleString()} ETB` : "-"}
                        </td>
                        <td className="px-5 py-3 font-black text-emerald-700">
                          {item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden print-hide">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-purple-900">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-6 text-center text-slate-400 text-xs">
                      No item-level sales data found in orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Detailed POS Transaction Log</h2>
            <span className="text-xs font-semibold text-slate-500 print-hide">
              Showing {paginatedOrders.length} of {filteredOrders.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Server / Waiter</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Method</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                      Loading sales data...
                    </td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o) => {
                    const isPaid = o.payment_status === "paid" || o.status === "completed";
                    const total = Number(o.total || o.total_amount || o.subtotal || 0);
                    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : "-";
                    const waiterName = o.waiter_name || o.waiterName || o.user_name || "Staff Waiter";
                    const payMethod = o.payment_method || o.method || "Cash";

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
                        <td className="px-5 py-3.5 capitalize text-xs font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                            {payMethod}
                          </span>
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
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                      No POS transaction records found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="5" className="px-5 py-3.5 text-right text-xs uppercase tracking-wider">
                      Grand Total Paid POS Revenue:
                    </td>
                    <td className="px-5 py-3.5 font-black text-sm text-emerald-800">
                      {totalSales.toLocaleString()} ETB
                    </td>
                    <td className="px-5 py-3.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Table Pagination Controls (Hidden on Print) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 print-hide">
              <p className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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