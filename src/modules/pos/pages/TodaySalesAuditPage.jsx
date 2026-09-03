import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  CreditCard,
  Clock,
  User,
  Eye,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Receipt,
  AlertCircle,
  Smartphone,
  Landmark,
  Printer,
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import PaymentProofModal from "../components/PaymentProofModal";
import { printReportArea } from "../../../utils/printHelper";

function TodaySalesAuditPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWaiter, setSelectedWaiter] = useState("all");
  const [selectedProofOrder, setSelectedProofOrder] = useState(null);

  /* Helper to parse items safely if needed */
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

  /* Helper to compute total for an order */
  const getOrderTotal = (order) => {
    if (order.total_amount && Number(order.total_amount) > 0) {
      return Number(order.total_amount);
    }
    if (order.total && Number(order.total) > 0) {
      return Number(order.total);
    }
    const items = parseItems(order.items || order.order_items);
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.unit_price || item.price || 0);
      return sum + qty * price;
    }, 0);
  };

  const extractFullName = (first, last) => {
    if (first || last) {
      return `${first || ""} ${last || ""}`.trim();
    }
    return null;
  };

  const getWaiterFromObject = (obj, empMap) => {
    if (!obj) return null;

    // 1. First Name + Last Name combinations
    const fnLn =
      extractFullName(obj.waiter_first_name, obj.waiter_last_name) ||
      extractFullName(obj.waiterFirstName, obj.waiterLastName) ||
      extractFullName(obj.created_by_first_name, obj.created_by_last_name) ||
      extractFullName(obj.user_first_name, obj.user_last_name) ||
      extractFullName(obj.waiter?.first_name || obj.waiter?.firstName, obj.waiter?.last_name || obj.waiter?.lastName) ||
      extractFullName(obj.created_by?.first_name || obj.created_by?.firstName, obj.created_by?.last_name || obj.created_by?.lastName) ||
      extractFullName(obj.user?.first_name || obj.user?.firstName, obj.user?.last_name || obj.user?.lastName);

    if (fnLn) return fnLn;

    // 2. Direct name properties
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

    // 3. Employee ID lookup in empMap
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

  const fetchDailyAuditData = async () => {
    try {
      setLoading(true);
      setError("");

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

      // Build employee map (ID -> Full Name)
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

      // Build tables map for current_waiter_name lookup
      const tableWaiterMap = new Map();
      tablesList.forEach((t) => {
        const tId = String(t.id || t.table_number || "");
        const tName = getWaiterFromObject(t, empMap) || t.current_waiter_name || t.waiter_name;
        if (tId && tName) tableWaiterMap.set(tId, tName);
      });

      // Build kitchen/bar map for order waiter lookup
      const orderExtraMap = new Map();
      [...kitchenList, ...barList].forEach((k) => {
        const kId = String(k.order_id || k.id || "");
        if (!kId) return;
        const wName = getWaiterFromObject(k, empMap);

        if (wName) {
          orderExtraMap.set(kId, wName);
        }
      });

      // Enrich POS orders with waiter attribution and filter strictly for Today's date
      const todayDateStr = new Date().toISOString().split("T")[0];

      const enriched = posList
        .filter((o) => {
          const dateVal = o.created_at || o.createdAt;
          if (!dateVal) return true;
          try {
            const orderDate = new Date(dateVal).toISOString().split("T")[0];
            return orderDate === todayDateStr;
          } catch {
            return true;
          }
        })
        .map((o) => {
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
      console.error("Failed to load daily sales audit data:", err);
      setError("Failed to fetch today's sales and payment audit records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyAuditData();
  }, []);

  /* Extract unique waiters */
  const uniqueWaiters = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name;
      if (name && name !== "Staff Waiter") set.add(name);
    });
    return Array.from(set);
  }, [orders]);

  /* Financial Metrics Math */
  const paidOrders = orders.filter(
    (o) => o.payment_status === "paid" || o.status === "completed"
  );
  const unpaidOrders = orders.filter(
    (o) => o.payment_status !== "paid" && o.status !== "completed" && o.status !== "cancelled"
  );
  const creditOrders = orders.filter((o) => o.payment_status === "credit_pending");

  const totalRevenue = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const pendingCreditTotal = creditOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);

  /* Breakdown by payment method */
  let cashTotal = 0;
  let digitalTotal = 0;

  orders.forEach((o) => {
    const isPaid = o.payment_status === "paid" || o.status === "completed";
    if (!isPaid) return;

    const pmts = o.payments || [];
    if (pmts.length > 0) {
      pmts.forEach((p) => {
        const amt = Number(p.amount || 0);
        const method = (p.payment_method || "").toLowerCase();
        if (method === "cash") {
          cashTotal += amt;
        } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
          digitalTotal += amt;
        } else {
          cashTotal += amt;
        }
      });
    } else {
      const amt = getOrderTotal(o);
      const method = (o.payment_method || "cash").toLowerCase();
      if (method === "cash") {
        cashTotal += amt;
      } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
        digitalTotal += amt;
      } else {
        cashTotal += amt;
      }
    }
  });

  /* Search & Filter logic */
  const filteredOrders = orders.filter((order) => {
    const orderNum = (order.order_number || String(order.id || "")).toLowerCase();
    const tableNum = String(order.table_number || order.table_id || "").toLowerCase();
    const waiter = (order.waiter_name || order.waiterName || order.user_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      orderNum.includes(search) || tableNum.includes(search) || waiter.includes(search);

    const pStatus = (order.payment_status || "unpaid").toLowerCase();
    const isPaid = pStatus === "paid" || order.status === "completed";

    let matchesStatus = true;
    if (statusFilter === "paid") {
      matchesStatus = isPaid;
    } else if (statusFilter === "unpaid") {
      matchesStatus = !isPaid && order.status !== "cancelled";
    } else if (statusFilter === "credit") {
      matchesStatus = pStatus === "credit_pending";
    }

    const waiterName = order.waiter_name || order.waiterName || order.user_name || "";
    const matchesWaiter = selectedWaiter === "all" || waiterName === selectedWaiter;

    return matchesSearch && matchesStatus && matchesWaiter;
  });

  const getMethodBadge = (method) => {
    const m = (method || "").toLowerCase();
    if (m === "cash") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
          💵 Cash
        </span>
      );
    }
    if (m === "telebirr") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
          <Smartphone size={12} /> Telebirr
        </span>
      );
    }
    if (m === "cbe_birr" || m === "cbe") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
          <Landmark size={12} /> CBE Birr
        </span>
      );
    }
    if (m === "card") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-200">
          <CreditCard size={12} /> Card
        </span>
      );
    }
    if (m === "credit" || m === "credit_pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
          📋 VIP Credit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
        {method || "Direct"}
      </span>
    );
  };

  const handlePrint = () => {
    printReportArea("sales-audit-report-printable", "Today's Sales & Payment Audit");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Action Buttons Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-hide">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Today's Sales & Payment Audit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <ShieldCheck size={14} /> Cashier Audit
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time daily transaction history, server waiter attribution, and payment audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDailyAuditData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-slate-800"
          >
            <Printer size={14} />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE AREA CONTAINER */}
      <div id="sales-audit-report-printable" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="header-title text-2xl font-black uppercase text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="header-subtitle text-xs font-bold uppercase text-slate-600">
                CASHIER SHIFT & DAILY SALES AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Daily Revenue Audit</h2>
              <p className="meta-text">Generated: {new Date().toLocaleString()}</p>
              <p className="meta-text">Cashier: {user?.username || user?.name || "helen"}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 grid-4">
          {/* Total Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Revenue Today
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 print-hide">
                <TrendingUp size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {totalRevenue.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">
              {paidOrders.length} Paid Order Tickets
            </p>
          </div>

          {/* Cash Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Cash Collected
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 print-hide">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {cashTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              In-Drawer Cash Received
            </p>
          </div>

          {/* Digital Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Digital Payments
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 print-hide">
                <Smartphone size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {digitalTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-purple-600">
              Telebirr / CBE Birr / Card
            </p>
          </div>

          {/* Open Unpaid & Credit */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Open / Credit Pending
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 print-hide">
                <Clock size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {pendingCreditTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-amber-700">
              {unpaidOrders.length} Unpaid Tables Open
            </p>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print-hide">
          {/* Category Pills & Waiter Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Today's ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Paid ({paidOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unpaid")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Unpaid ({unpaidOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("credit")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "credit"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              VIP Credit ({creditOrders.length})
            </button>

            {/* Waiter Filter Selector */}
            {uniqueWaiters.length > 0 && (
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700 outline-hidden focus:border-blue-500"
              >
                <option value="all">👤 All Waiters</option>
                {uniqueWaiters.map((w) => (
                  <option key={w} value={w}>👤 {w}</option>
                ))}
              </select>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order #, Table, Waiter..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 left-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Main Table View */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading sales audit records...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm font-semibold text-rose-600">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
              {error}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-extrabold text-slate-700">No orders found matching filters.</p>
              <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search criteria or filter tabs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">Table & Ticket</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">Server / Waiter</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">Total Amount</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">Kitchen / Table Status</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-4 min-w-[180px]">Payment Method & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((order) => {
                    const orderTotal = getOrderTotal(order);
                    const payments = order.payments || [];
                    const isPaid = order.payment_status === "paid" || order.status === "completed";
                    const waiterName = order.waiter_name || order.waiterName || order.user_name || "Staff Waiter";

                    return (
                      <tr key={order.id || order.order_number} className="hover:bg-slate-50/80 transition">
                        {/* Table & Ticket */}
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">
                              {order.table_number || order.table_id
                                ? `Table #${order.table_number || order.table_id}`
                                : "Takeaway"}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500">
                              #{order.order_number || order.id}
                            </span>
                            <span className="mt-0.5 text-[10px] text-slate-400">
                              {order.created_at ? new Date(order.created_at).toLocaleTimeString() : "Today"}
                            </span>
                          </div>
                        </td>

                        {/* Server / Waiter */}
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-extrabold text-indigo-900 border border-indigo-100 shadow-2xs">
                            <User size={14} className="text-indigo-600" />
                            <span>{waiterName}</span>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">
                              {orderTotal.toFixed(2)} ETB
                            </span>
                            {order.paid_amount > 0 && (
                              <span className="text-[11px] font-bold text-emerald-600">
                                Paid: {Number(order.paid_amount).toFixed(2)} ETB
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kitchen / Table Status */}
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <span
                            className={`badge ${
                              order.status === "completed"
                                ? "badge-paid"
                                : order.status === "ready"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : order.status === "preparing"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "badge-pending"
                            }`}
                          >
                            {order.status || "pending"}
                          </span>
                        </td>

                        {/* Payment Method & Audit Details */}
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <div className="space-y-1.5">
                            {payments.length > 0 ? (
                              payments.map((p, pIdx) => (
                                <div key={pIdx} className="flex flex-wrap items-center gap-2">
                                  {getMethodBadge(p.payment_method)}
                                  {p.reference && (
                                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Ref: {p.reference}
                                    </span>
                                  )}
                                  {(p.receipt_image || p.receiptImage) && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProofOrder(order)}
                                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 hover:bg-blue-100 border border-blue-200 print-hide"
                                    >
                                      <Eye size={10} />
                                      <span>View Proof</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-2">
                                {getMethodBadge(order.payment_method || (isPaid ? "cash" : "unpaid"))}
                                {!isPaid && (
                                  <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Unpaid / Pending Cashier
                                  </span>
                                )}
                                {(order.receipt_image || order.receiptImage) && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProofOrder(order)}
                                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 hover:bg-blue-100 border border-blue-200 print-hide"
                                  >
                                    <Eye size={10} />
                                    <span>View Proof</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredOrders.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                      <td colSpan="3" className="px-3 py-3.5 text-right text-xs uppercase tracking-wider">
                        Grand Total Verified Sales Revenue:
                      </td>
                      <td className="px-3 py-3.5 font-black text-sm text-emerald-800">
                        {totalPaidRevenue.toLocaleString()} ETB
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB — DAILY SALES AUDIT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • For Internal Financial Audit Use Only</p>
            </div>
            <div className="text-right">
              <p>Cashier Signature: ______________________</p>
              <p className="mt-2">Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Proof Modal */}
      {selectedProofOrder && (
        <PaymentProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
        />
      )}
    </div>
  );
}

export default TodaySalesAuditPage;
