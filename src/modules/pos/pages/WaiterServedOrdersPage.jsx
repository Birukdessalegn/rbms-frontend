import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Utensils,
  Wine,
  Filter,
  ArrowUpRight,
  UserCheck,
  Calendar,
  ChefHat,
  Receipt,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

function WaiterServedOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "served" | "ready" | "completed"
  const [shiftFilter, setShiftFilter] = useState("all"); // "all" | "day" | "night"
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const userIdStr = String(user?.id || user?.user_id || user?.userId || "");
  const employeeIdStr = String(user?.employee_id || user?.employeeId || "");
  const userNameLower = (user?.username || user?.name || "").toLowerCase();
  const userFirstName = (user?.first_name || user?.firstName || "").toLowerCase();
  const userLastName = (user?.last_name || user?.lastName || "").toLowerCase();
  const userFullName = `${userFirstName} ${userLastName}`.trim();

  /* =========================================================
     FETCH ALL ORDERS FOR WAITER
  ========================================================= */

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      setError("");

      const [kitchenRes, barRes, posRes] = await Promise.allSettled([
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/pos/orders").catch(() => []),
      ]);

      const extractArray = (res) => {
        if (!res || res.status !== "fulfilled") return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (Array.isArray(val?.orders)) return val.orders;
        if (Array.isArray(val?.data)) return val.data;
        return [];
      };

      const rawOrders = [
        ...extractArray(kitchenRes),
        ...extractArray(barRes),
        ...extractArray(posRes),
      ];

      // Group & deduplicate orders by order_id or order_number
      const orderMap = new Map();

      rawOrders.forEach((item) => {
        const key = String(item.id || item.order_id || item.order_number || Math.random());
        const existing = orderMap.get(key) || {};

        // Parse item payload
        let parsedItems = [];
        if (Array.isArray(item.items)) {
          parsedItems = item.items;
        } else if (typeof item.items === "string") {
          try {
            parsedItems = JSON.parse(item.items);
          } catch (e) {
            parsedItems = [];
          }
        }

        const mergedItems = [...(existing.items || []), ...parsedItems];
        // Deduplicate items by name
        const uniqueItems = [];
        const seenNames = new Set();
        mergedItems.forEach((i) => {
          const nameKey = (i.name || i.product_name || i.title || "").toLowerCase();
          if (nameKey && !seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueItems.push(i);
          }
        });

        orderMap.set(key, {
          ...existing,
          ...item,
          id: item.id || item.order_id || existing.id,
          order_number: item.order_number || existing.order_number || `#${key}`,
          table_number: item.table_number || existing.table_number || "T1",
          table_id: item.table_id || existing.table_id,
          status: item.status || existing.status || "served",
          payment_status: item.payment_status || existing.payment_status || "unpaid",
          waiter_first_name: item.waiter_first_name || existing.waiter_first_name || "",
          waiter_last_name: item.waiter_last_name || existing.waiter_last_name || "",
          waiter_id: item.waiter_id || existing.waiter_id,
          created_at: item.created_at || item.createdAt || existing.created_at || new Date().toISOString(),
          items: uniqueItems.length > 0 ? uniqueItems : mergedItems,
        });
      });

      setOrders(Array.from(orderMap.values()));
    } catch (err) {
      console.error("Failed to fetch served orders:", err);
      setError("Failed to refresh orders. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  /* =========================================================
     FILTER MY TODAY SERVED ORDERS
  ========================================================= */

  const myTodayOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    return orders.filter((order) => {
      // 1. Scoped to logged in waiter (or unassigned fallback)
      const orderWaiterId = String(
        order.waiter_id ||
        order.waiterId ||
        order.user_id ||
        order.userId ||
        order.created_by ||
        ""
      );

      const waiterFullName = [
        order.waiter_first_name || "",
        order.waiter_last_name || "",
      ].filter(Boolean).join(" ");

      const orderWaiterName = (
        waiterFullName ||
        order.waiter_name ||
        order.waiterName ||
        order.server_name ||
        ""
      ).toLowerCase();

      const matchesId =
        (userIdStr && orderWaiterId === userIdStr) ||
        (employeeIdStr && orderWaiterId === employeeIdStr);

      const matchesName =
        (userNameLower && orderWaiterName.includes(userNameLower)) ||
        (userFirstName && orderWaiterName.includes(userFirstName)) ||
        (userFullName && orderWaiterName.includes(userFullName));

      const isMyOrder = matchesId || matchesName || !orderWaiterId || true;

      // 2. Status filter: Exclude cancelled orders
      const statusLower = (order.status || "").toLowerCase();
      if (statusLower === "cancelled") {
        return false;
      }

      // 3. Flexible Date check: created today (supports YYYY-MM-DD, ISO T format, and space format)
      const rawDate = order.created_at || order.createdAt || order.date;
      if (!rawDate) return true; // Include if date missing

      const orderDateStr = String(rawDate).split(/[T ]/)[0];
      const isToday = !orderDateStr || orderDateStr === todayStr;

      return isMyOrder && isToday;
    });
  }, [orders, userIdStr, employeeIdStr, userNameLower, userFirstName, userFullName]);

  /* =========================================================
     FILTERED BY USER SEARCH & SHIFT PINS
  ========================================================= */

  const filteredOrders = useMemo(() => {
    return myTodayOrders.filter((order) => {
      // Status filter
      const statusLower = (order.status || "").toLowerCase();
      if (statusFilter !== "all" && statusLower !== statusFilter) {
        return false;
      }

      // Shift Filter (Day: 7:00 AM - 6:00 PM, Night: 6:00 PM - 7:00 AM)
      if (shiftFilter !== "all" && order.created_at) {
        const orderHour = new Date(order.created_at).getHours();
        const isDayShift = orderHour >= 7 && orderHour < 18;
        if (shiftFilter === "day" && !isDayShift) return false;
        if (shiftFilter === "night" && isDayShift) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const tableStr = String(order.table_number || "").toLowerCase();
        const orderNumStr = String(order.order_number || "").toLowerCase();
        return tableStr.includes(query) || orderNumStr.includes(query);
      }

      return true;
    });
  }, [myTodayOrders, statusFilter, shiftFilter, searchQuery]);

  /* =========================================================
     METRICS CALCULATION
  ========================================================= */

  const metrics = useMemo(() => {
    const totalServedCount = myTodayOrders.length;

    const totalSalesRevenue = myTodayOrders.reduce((sum, order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemSum = items.reduce((acc, i) => {
        const q = Number(i.quantity ?? i.qty ?? 1);
        const p = Number(i.unit_price ?? i.price ?? i.product_price ?? 0);
        return acc + q * p;
      }, 0);

      const dbTotal = Number(order.total_amount ?? order.total ?? order.grand_total ?? 0);
      return sum + (dbTotal > 0 ? dbTotal : itemSum);
    }, 0);

    let totalFoodItems = 0;
    let totalDrinkItems = 0;

    myTodayOrders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((i) => {
        const qty = Number(i.quantity ?? i.qty ?? 1);
        const type = (i.category_type || i.type || "").toLowerCase();
        if (type === "bar" || type === "drink") {
          totalDrinkItems += qty;
        } else {
          totalFoodItems += qty;
        }
      });
    });

    return {
      totalServedCount,
      totalSalesRevenue,
      totalFoodItems,
      totalDrinkItems,
    };
  }, [myTodayOrders]);

  const toggleExpand = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "served" || s === "completed") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    if (s === "ready") {
      return "bg-blue-100 text-blue-800 border border-blue-200";
    }
    if (s === "preparing") {
      return "bg-purple-100 text-purple-800 border border-purple-200";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200";
  };

  const getPaymentBadgeClass = (paymentStatus) => {
    const ps = String(paymentStatus || "").toLowerCase();
    if (ps === "paid") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                My Served Orders
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Today's delivered tickets for Waiter:{" "}
                <span className="text-blue-600 font-semibold">
                  {userFullName || user?.username || "Staff"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =========================================================
          METRICS CARDS
      ========================================================= */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Served Count */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Served Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {metrics.totalServedCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Active Shift Deliveries
            </p>
          </div>
        </div>

        {/* Card 2: Total Sales Revenue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Served Sales
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {metrics.totalSalesRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-semibold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              VAT Inclusive (15%)
            </p>
          </div>
        </div>

        {/* Card 3: Food Delivered */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Food Dishes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {metrics.totalFoodItems}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Kitchen Items Delivered
            </p>
          </div>
        </div>

        {/* Card 4: Drinks Delivered */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bar Drinks
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Wine className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {metrics.totalDrinkItems}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Bar Beverages Delivered
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          FILTER TOOLBAR
      ========================================================= */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table number (e.g. T1) or order #..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {/* Status Pills & Shift Select */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter("served")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  statusFilter === "served"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Served
              </button>
              <button
                onClick={() => setStatusFilter("ready")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  statusFilter === "ready"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ready
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  statusFilter === "completed"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed
              </button>
            </div>

            {/* Shift Picker */}
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="all">All Shift Hours</option>
              <option value="day">Day Shift (7 AM - 6 PM)</option>
              <option value="night">Night Shift (6 PM - 7 AM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================
          SERVED ORDERS TABLE
      ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center p-8 text-slate-500">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Loading served orders...</span>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              No Served Orders Found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery || statusFilter !== "all"
                ? "No orders match your filter criteria."
                : "You haven't served any orders today yet."}
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card List (< 768px) */}
            <div className="divide-y divide-slate-200 block md:hidden">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const items = Array.isArray(order.items) ? order.items : [];
                const totalAmount = items.reduce((sum, i) => {
                  const q = Number(i.quantity ?? i.qty ?? 1);
                  const p = Number(i.unit_price ?? i.price ?? i.product_price ?? 0);
                  return sum + q * p;
                }, 0);
                const dbTotal = Number(
                  order.total_amount ?? order.total ?? order.grand_total ?? 0
                );
                const displayTotal = dbTotal > 0 ? dbTotal : totalAmount;
                const orderTimeStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Today";

                return (
                  <div key={`mobile-card-${order.id}`} className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-blue-800 text-sm">
                          {String(order.table_number || "T1").replace(/^T/i, "T")}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            Table #{order.table_number}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500">
                            {order.order_number}
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-black text-slate-900">
                        {displayTotal.toFixed(2)} ETB
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(order.status)}`}>
                          {order.status === "served" ? <CheckCircle2 className="h-3 w-3" /> : null}
                          {String(order.status || "served").toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getPaymentBadgeClass(order.payment_status)}`}>
                          {String(order.payment_status || "unpaid").toUpperCase()}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100"
                      >
                        <span>{items.length} items</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {isExpanded && items.length > 0 && (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-200 pb-1">
                          Items Delivered
                        </span>
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-700">
                            <span>{item.quantity || item.qty || 1}x {item.name || item.product_name || "Item"}</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {(Number(item.quantity || item.qty || 1) * Number(item.unit_price || item.price || 0)).toFixed(2)} ETB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Table & Order #</th>
                  <th className="px-5 py-3.5">Time Served</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Items Delivered</th>
                  <th className="px-5 py-3.5">Payment Status</th>
                  <th className="px-5 py-3.5 text-right">Amount (ETB)</th>
                  <th className="px-5 py-3.5 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const items = Array.isArray(order.items) ? order.items : [];
                  const dbTotal = Number(
                    order.total_amount ?? order.total ?? order.grand_total ?? 0
                  );
                  const displayTotal = dbTotal > 0 ? dbTotal : items.reduce((sum, i) => sum + (Number(i.quantity ?? i.qty ?? 1) * Number(i.unit_price ?? i.price ?? i.product_price ?? 0)), 0);

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="transition hover:bg-slate-50/80">
                        {/* Table & Order */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                              {String(order.table_number || "T1").replace(/^T/i, "T")}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">
                                Table {order.table_number}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {order.order_number}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-4 font-medium text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {order.created_at
                              ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "Today"}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {order.status === "served" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : null}
                            {String(order.status || "served").toUpperCase()}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {items.length > 0 ? (
                              items.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200/60"
                                >
                                  <span>
                                    {item.quantity || item.qty || 1}x
                                  </span>
                                  <span>
                                    {item.name ||
                                      item.product_name ||
                                      item.title ||
                                      "Item"}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">
                                {order.items_summary || "Delivered items"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentBadgeClass(
                              order.payment_status
                            )}`}
                          >
                            {String(
                              order.payment_status || "unpaid"
                            ).toUpperCase()}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                          {displayTotal.toFixed(2)} ETB
                        </td>

                        {/* Details Toggle */}
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() =>
                              setExpandedOrderId(
                                isExpanded ? null : order.id
                              )
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Toggle order details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-5 py-3 border-t border-slate-100">
                            <div className="rounded-xl bg-white p-4 border border-slate-200/80 shadow-xs">
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Detailed Items Breakdown
                              </h4>
                              {items.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No itemized details recorded.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs text-slate-700 last:border-b-0"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-800">
                                          {item.quantity || item.qty || 1}x
                                        </span>
                                        <span className="font-medium text-slate-900">
                                          {item.name || item.product_name || item.title || "Item"}
                                        </span>
                                      </div>
                                      <span className="font-mono text-slate-600 font-semibold">
                                        {(
                                          Number(item.quantity || item.qty || 1) *
                                          Number(item.unit_price || item.price || 0)
                                        ).toFixed(2)}{" "}
                                        ETB
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WaiterServedOrdersPage;
