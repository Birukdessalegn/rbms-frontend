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
  Printer,
  Eye,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import { printOrderReceipt } from "../../../utils/printHelper";
import { parseItemPortion } from "../../../utils/drinkServingHelper";
import PaymentProofModal from "../components/PaymentProofModal";

function WaiterServedOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "served" | "ready" | "completed"
  const [shiftFilter, setShiftFilter] = useState("all"); // "all" | "day" | "night"
  const [dateRangeFilter, setDateRangeFilter] = useState("today"); // "today" | "week" | "month" | "custom"
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [waiterScope, setWaiterScope] = useState("mine"); // "mine" | "all"
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [selectedProofOrder, setSelectedProofOrder] = useState(null);

  const userRole = (user?.role || "").toLowerCase();
  const userIdStr = String(user?.id || user?.user_id || user?.userId || "");
  const employeeIdStr = String(user?.employee_id || user?.employeeId || "");
  const userNameLower = (user?.username || user?.name || "").toLowerCase().trim();
  const userFirstName = (user?.first_name || user?.firstName || "").toLowerCase().trim();
  const userLastName = (user?.last_name || user?.lastName || "").toLowerCase().trim();
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
        if (Array.isArray(val?.barOrders)) return val.barOrders;
        if (Array.isArray(val?.bar_orders)) return val.bar_orders;
        if (Array.isArray(val?.data?.orders)) return val.data.orders;
        return [];
      };

      const rawOrders = [
        ...extractArray(kitchenRes).map((o) => ({ ...o, _source: "kitchen" })),
        ...extractArray(barRes).map((o) => ({ ...o, _source: "bar" })),
        ...extractArray(posRes).map((o) => ({ ...o, _source: "pos" })),
      ];

      // Group & deduplicate orders by order_number or source-prefixed ID
      const orderMap = new Map();

      rawOrders.forEach((item) => {
        const orderNum = item.order_number || item.orderNumber || item.reference;
        const key = orderNum
          ? String(orderNum).trim().toLowerCase()
          : item.order_id
            ? `ord_${item.order_id}`
            : `${item._source || "ord"}_${item.id || Math.random()}`;

        const existing = orderMap.get(key) || {};

        // Parse items payload from any item candidates
        const parseItems = (rawObj) => {
          let list = [];
          const candidates = [
            rawObj.items,
            rawObj.order_items,
            rawObj.bar_items,
            rawObj.kitchen_items,
            rawObj.products,
            rawObj.details,
          ];

          for (const c of candidates) {
            if (Array.isArray(c) && c.length > 0) {
              list = c;
              break;
            } else if (typeof c === "string" && c.trim()) {
              try {
                const parsed = JSON.parse(c);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  list = parsed;
                  break;
                }
              } catch (e) {
                // ignore error
              }
            }
          }
          return list;
        };

        const parsedItems = parseItems(item);
        const existingItems = parseItems(existing);
        const mergedItems = [...existingItems, ...parsedItems];

        // Deduplicate items by name and portion
        const uniqueItems = [];
        const seenNames = new Set();
        mergedItems.forEach((i) => {
          const name = i.name || i.product_name || i.title || i.item_name || "Product";
          const portion = i.portion || i.portionTitle || i.notes || "";
          const nameKey = `${name}_${portion}`.toLowerCase();
          if (!seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueItems.push({
              ...i,
              name,
              quantity: Number(i.quantity ?? i.qty ?? 1),
              unit_price: Number(i.unit_price ?? i.price ?? i.product_price ?? 0),
            });
          }
        });

        const pm = item.payment_method || item.paymentMethod || existing.payment_method || existing.paymentMethod || "";
        const ref = item.reference || item.payment_reference || item.notes || existing.reference || existing.payment_reference || "";
        const custId = item.customer_id || item.vip_customer_id || item.vipCustomerId || existing.customer_id || existing.vip_customer_id || null;

        orderMap.set(key, {
          ...existing,
          ...item,
          id: item.id || item.order_id || existing.id,
          order_number: orderNum || existing.order_number || `#${key}`,
          table_number: item.table_number || existing.table_number || "T1",
          table_id: item.table_id || existing.table_id,
          total: item.total ?? item.total_amount ?? existing.total ?? existing.total_amount ?? 0,
          total_amount: item.total_amount ?? item.total ?? existing.total_amount ?? existing.total ?? 0,
          grand_total: item.grand_total ?? existing.grand_total ?? 0,
          tax: item.tax ?? item.tax_amount ?? existing.tax ?? existing.tax_amount ?? 0,
          tax_amount: item.tax_amount ?? item.tax ?? existing.tax_amount ?? existing.tax ?? 0,
          service_charge: item.service_charge ?? item.service_charge_amount ?? existing.service_charge ?? existing.service_charge_amount ?? 0,
          discount: item.discount ?? item.discount_amount ?? existing.discount ?? existing.discount_amount ?? 0,
          status: item.status || existing.status || "served",
          payment_status: item.payment_status || existing.payment_status || "unpaid",
          payment_method: pm,
          reference: ref,
          receipt_image: item.receipt_image || item.receiptImage || existing.receipt_image || existing.receiptImage || null,
          payments: (item.payments && item.payments.length > 0) ? item.payments : (existing.payments || []),
          customer_id: custId,
          waiter_first_name: item.waiter_first_name || existing.waiter_first_name || "",
          waiter_last_name: item.waiter_last_name || existing.waiter_last_name || "",
          waiter_name: item.waiter_name || existing.waiter_name || "",
          waiter_username: item.waiter_username || existing.waiter_username || "",
          waiter_id: item.waiter_id || item.waiter_employee_id || existing.waiter_id,
          waiter_employee_id: item.waiter_employee_id || item.waiter_id || existing.waiter_employee_id,
          waiter_user_id: item.waiter_user_id || existing.waiter_user_id,
          employee_id: item.employee_id || item.employeeId || item.waiter_employee_id || item.waiter_id || existing.employee_id || existing.employeeId,
          user_id: item.user_id || item.waiter_user_id || existing.user_id,
          created_by: item.created_by || existing.created_by,
          created_at: item.created_at || item.createdAt || existing.created_at || new Date().toISOString(),
          items: uniqueItems,
        });
      });

      const allSortedOrders = Array.from(orderMap.values()).sort(
        (a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
      );

      setOrders(allSortedOrders);
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
    return orders.filter((order) => {
      // 1. Scoped strictly to logged-in waiter
      const orderWaiterId = String(
        order.waiter_id ??
        order.waiterId ??
        order.waiter_employee_id ??
        order.employee_id ??
        order.employeeId ??
        ""
      );
      const orderUserId = String(
        order.waiter_user_id ??
        order.user_id ??
        order.userId ??
        order.created_by ??
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
        order.waiter_username ||
        order.server_name ||
        ""
      ).trim().toLowerCase();

      const orderCreatedBy = String(order.created_by || order.userId || "");

      // Check ID match against employee_id, user_id, and created_by
      const matchesId = Boolean(
        (employeeIdStr && (
          orderWaiterId === employeeIdStr ||
          orderUserId === employeeIdStr ||
          orderCreatedBy === employeeIdStr ||
          String(order.waiter_employee_id || "") === employeeIdStr
        )) ||
        (userIdStr && (
          orderWaiterId === userIdStr ||
          orderUserId === userIdStr ||
          orderCreatedBy === userIdStr ||
          String(order.waiter_user_id || "") === userIdStr
        ))
      );

      // Check Name match against username, first name, and full name
      const matchesName = Boolean(
        (userNameLower && (
          orderWaiterName.includes(userNameLower) ||
          userNameLower.includes(orderWaiterName)
        )) ||
        (userFullName && (
          orderWaiterName.includes(userFullName) ||
          userFullName.includes(orderWaiterName)
        )) ||
        (userFirstName && userFirstName.length >= 2 && orderWaiterName.includes(userFirstName))
      );

      const isMyOrder = matchesId || matchesName;

      // Scoping: default is strictly "mine", or "all" if requested by user
      if (waiterScope === "mine" && !isMyOrder) {
        return false;
      }

      // 2. Status filter: Exclude cancelled orders
      const statusLower = (order.status || "").toLowerCase();
      if (statusLower === "cancelled") {
        return false;
      }

      // 3. Date check: based on dateRangeFilter ("today", "week", "month", "custom")
      const rawDate = order.created_at || order.createdAt || order.date;
      if (!rawDate) return false;

      // Normalize date string with T so ISO-8601 parsing works reliably across all browsers/mobile
      const normalizedDateStr = typeof rawDate === "string" ? rawDate.replace(" ", "T") : rawDate;
      let orderDate = new Date(normalizedDateStr);
      if (isNaN(orderDate.getTime())) {
        orderDate = new Date(rawDate);
      }
      if (isNaN(orderDate.getTime())) return false;

      const now = new Date();

      if (dateRangeFilter === "today") {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        );
      }

      if (dateRangeFilter === "week") {
        // Current week (starting from Monday 00:00:00 to Sunday 23:59:59)
        const currentDay = now.getDay();
        const distanceToMonday = (currentDay + 6) % 7;
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      }

      if (dateRangeFilter === "month") {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth()
        );
      }

      if (dateRangeFilter === "custom") {
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : null;

        if (start && !isNaN(start.getTime()) && orderDate < start) return false;
        if (end && !isNaN(end.getTime()) && orderDate > end) return false;
        return true;
      }

      return true;
    });
  }, [
    orders,
    userIdStr,
    employeeIdStr,
    userNameLower,
    userFirstName,
    userFullName,
    userRole,
    waiterScope,
    dateRangeFilter,
    customStartDate,
    customEndDate,
  ]);

  /* =========================================================
     FILTERED BY USER SEARCH & SHIFT PINS
  ========================================================= */

  const filteredOrders = useMemo(() => {
    return myTodayOrders
      .filter((order) => {
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
      })
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
  }, [myTodayOrders, statusFilter, shiftFilter, searchQuery]);

  /* =========================================================
     GROSS TOTAL (INCL. VAT) HELPER
  ========================================================= */

  const calculateOrderGrossTotal = (order) => {
    if (!order) return 0;
    const dbTotal = Number(
      order.total_amount ??
      order.total ??
      order.grand_total ??
      order.grandTotal ??
      0
    );
    if (dbTotal > 0) return dbTotal;

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSubtotal = items.reduce((sum, i) => {
      const q = Number(i.quantity ?? i.qty ?? 1);
      const p = Number(i.unit_price ?? i.price ?? i.product_price ?? 0);
      return sum + q * p;
    }, 0);

    const tax = Number(order.tax ?? order.tax_amount ?? 0);
    const service = Number(order.service_charge ?? order.service_charge_amount ?? 0);
    const discount = Number(order.discount ?? order.discount_amount ?? 0);

    // Registered product prices already include 15% VAT - do not add on top
    return Math.max(itemsSubtotal - discount, 0);
  };

  const handlePrintOrder = (order) => {
    if (!order) return;
    printOrderReceipt(order, {
      waiterName: userFullName || user?.username,
      restaurantName: "THE OAK CLUB",
    });
  };

  /* =========================================================
     METRICS CALCULATION
  ========================================================= */

  const metrics = useMemo(() => {
    const totalServedCount = myTodayOrders.length;

    const totalSalesRevenue = myTodayOrders.reduce((sum, order) => {
      return sum + calculateOrderGrossTotal(order);
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

  const getPaymentBadgeClass = (paymentStatus, orderStatus) => {
    const ps = String(paymentStatus || "").toLowerCase();
    const os = String(orderStatus || "").toLowerCase();
    if (
      ps === "paid" ||
      ps === "partial" ||
      ps === "partially_paid" ||
      ps === "credit" ||
      ps === "vip" ||
      os === "completed" ||
      os === "served"
    ) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold";
    }
    return "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
  };

  const formatPaymentStatusLabel = (paymentStatus, orderStatus) => {
    const ps = String(paymentStatus || "").toLowerCase();
    const os = String(orderStatus || "").toLowerCase();
    if (
      ps === "paid" ||
      ps === "partial" ||
      ps === "partially_paid" ||
      ps === "credit" ||
      ps === "vip" ||
      os === "completed" ||
      os === "served"
    ) {
      return "PAID";
    }
    return (ps.toUpperCase() || "PENDING");
  };

  const formatPaymentMethodObj = (order) => {
    const pm = (
      order.payment_method ||
      order.paymentMethod ||
      order.method ||
      order.payments?.[0]?.payment_method ||
      ""
    ).toLowerCase();

    const ref = (
      order.reference ||
      order.payment_reference ||
      order.notes ||
      order.payments?.[0]?.reference ||
      ""
    ).toLowerCase();

    const custName = (
      order.customer_name ||
      order.customerName ||
      order.vip_name ||
      order.vip_customer_name ||
      ""
    ).toLowerCase();

    const ps = String(order.payment_status || "").toLowerCase();
    const st = String(order.status || "").toLowerCase();
    const hasVipId = Boolean(order.customer_id || order.vip_customer_id || order.vipCustomerId);

    if (
      pm.includes("vip") ||
      pm.includes("credit") ||
      ref.includes("vip") ||
      ref.includes("credit") ||
      ps === "credit" ||
      ps === "vip" ||
      hasVipId ||
      custName.length > 0
    ) {
      return { label: "👑 VIP Credit", class: "bg-purple-100 text-purple-900 border border-purple-200 font-extrabold" };
    }
    if (pm.includes("card")) {
      return { label: "💳 Card", class: "bg-blue-100 text-blue-900 border border-blue-200 font-extrabold" };
    }
    if (pm.includes("mobile") || pm.includes("telebirr")) {
      return { label: "📱 Telebirr", class: "bg-amber-100 text-amber-900 border border-amber-200 font-extrabold" };
    }
    if (pm.includes("cash")) {
      return { label: "💵 Cash", class: "bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold" };
    }

    if (ps === "paid" || ps === "credit" || st === "completed" || st === "served") {
      return { label: "👑 VIP Credit", class: "bg-purple-100 text-purple-900 border border-purple-200 font-extrabold" };
    }

    return { label: "⏳ Pending", class: "bg-amber-100 text-amber-900 border border-amber-200 font-bold" };
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
                {dateRangeFilter === "today" && "Today's delivered tickets for Waiter: "}
                {dateRangeFilter === "week" && "This week's delivered tickets for Waiter: "}
                {dateRangeFilter === "month" && "This month's delivered tickets for Waiter: "}
                {dateRangeFilter === "custom" && `Delivered tickets (${customStartDate} to ${customEndDate}) for Waiter: `}
                <span className="text-blue-600 font-semibold">
                  {userFullName || user?.username || "Staff"}
                </span>
                {waiterScope === "all" && (
                  <span className="ml-1.5 rounded bg-purple-100 text-purple-800 text-[10px] font-extrabold px-1.5 py-0.5 uppercase tracking-wide">
                    All Orders View
                  </span>
                )}
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
              {dateRangeFilter === "today" && "Served Today"}
              {dateRangeFilter === "week" && "Served This Week"}
              {dateRangeFilter === "month" && "Served This Month"}
              {dateRangeFilter === "custom" && "Served In Range"}
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
              <ArrowUpRight className="h-3 w-3" />
              {dateRangeFilter === "today" ? "Active Shift Deliveries" : "Filtered Deliveries"}
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
      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {/* ROW 1: Date Range Filters & Waiter Scope Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Date Range Options */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Period:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateRangeFilter("today")}
                className={`rounded-lg px-3 py-1.5 transition ${dateRangeFilter === "today"
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter("week")}
                className={`rounded-lg px-3 py-1.5 transition ${dateRangeFilter === "week"
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter("month")}
                className={`rounded-lg px-3 py-1.5 transition ${dateRangeFilter === "month"
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter("custom")}
                className={`rounded-lg px-3 py-1.5 transition ${dateRangeFilter === "custom"
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Custom Date
              </button>
            </div>

            {/* Custom Date Pickers */}
            {dateRangeFilter === "custom" && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-1 text-xs animate-fadeIn">
                <span className="text-[11px] font-semibold text-slate-600">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] font-semibold text-slate-600">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Waiter Scope Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Scope:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWaiterScope("mine")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  waiterScope === "mine"
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Orders
              </button>
              <button
                type="button"
                onClick={() => setWaiterScope("all")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  waiterScope === "all"
                    ? "bg-purple-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Orders
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Search, Status, and Shift Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition ${statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("served")}
                className={`rounded-lg px-3 py-1.5 transition ${statusFilter === "served"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Served
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ready")}
                className={`rounded-lg px-3 py-1.5 transition ${statusFilter === "ready"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Ready
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`rounded-lg px-3 py-1.5 transition ${statusFilter === "completed"
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
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {searchQuery || statusFilter !== "all" || shiftFilter !== "all" || dateRangeFilter !== "today"
                ? "No orders match your filter criteria for this period."
                : "No orders assigned to you for this period."}
            </p>
            {waiterScope === "mine" && (
              <button
                type="button"
                onClick={() => setWaiterScope("all")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition"
              >
                <span>View all active shift orders</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile Card List (< 768px) */}
            <div className="divide-y divide-slate-200 block md:hidden">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const items = Array.isArray(order.items) ? order.items : [];
                const displayTotal = calculateOrderGrossTotal(order);
                const orderTimeStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "Today";

                return (
                  <div
                    key={`mobile-card-${order.id}`}
                    onClick={() => {
                      setSelectedOrderDetail(order);
                      handlePrintOrder(order);
                    }}
                    className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition cursor-pointer"
                  >
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

                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          {displayTotal.toFixed(2)} ETB
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 block">
                          Incl. VAT
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(order.status)}`}>
                          {order.status === "served" ? <CheckCircle2 className="h-3 w-3" /> : null}
                          {String(order.status || "served").toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getPaymentBadgeClass(order.payment_status, order.status)}`}>
                          {formatPaymentStatusLabel(order.payment_status, order.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {(order.receipt_image || order.receiptImage || (Array.isArray(order.payments) && order.payments.some(p => p.receipt_image || p.receiptImage || p.image_url || p.imageUrl))) && (
                          <button
                            type="button"
                            onClick={() => setSelectedProofOrder(order)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer shadow-2xs"
                            title="View Mobile Payment Confirmation Photo"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Proof</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintOrder(order)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer shadow-2xs"
                          title="Print Receipt Slip"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          <span>{items.length} items</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && items.length > 0 && (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-200 pb-1">
                          Items Delivered
                        </span>
                        {items.map((item, idx) => {
                          const portion = parseItemPortion(item);
                          return (
                            <div key={idx} className="flex items-center justify-between text-slate-700 py-0.5">
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-extrabold border ${portion.badgeClass}`}>
                                  {portion.displayServing}
                                </span>
                                <span className="font-semibold text-slate-900">{item.name || item.product_name || "Item"}</span>
                              </span>
                              <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                                {(Number(item.quantity || item.qty || 1) * Number(item.unit_price || item.price || 0)).toFixed(2)} ETB
                              </span>
                            </div>
                          );
                        })}
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
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5 text-right">Amount (Incl. VAT) (ETB)</th>
                    <th className="px-5 py-3.5 text-center">Print / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const items = Array.isArray(order.items) ? order.items : [];
                    const displayTotal = calculateOrderGrossTotal(order);
                    const pmObj = formatPaymentMethodObj(order);

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          onClick={() => {
                            setSelectedOrderDetail(order);
                            handlePrintOrder(order);
                          }}
                          className="transition hover:bg-purple-50/40 cursor-pointer"
                        >
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
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                                order.status
                              )}`}
                            >
                              {order.status === "served" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : null}
                              {String(order.status || "served").toUpperCase()}
                            </span>
                          </td>

                          {/* Items Delivered count */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <Utensils className="h-3.5 w-3.5 text-slate-400" />
                              <span>{items.length} items</span>
                            </div>
                          </td>

                          {/* Payment Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${getPaymentBadgeClass(
                                order.payment_status,
                                order.status
                              )}`}
                            >
                              {formatPaymentStatusLabel(order.payment_status, order.status)}
                            </span>
                          </td>

                          {/* Payment Method Column */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${pmObj.class}`}>
                                {pmObj.label}
                              </span>
                              {(order.receipt_image || order.receiptImage || (Array.isArray(order.payments) && order.payments.some(p => p.receipt_image || p.receiptImage || p.image_url || p.imageUrl))) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProofOrder(order);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                                  title="View Mobile Payment Confirmation Photo"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>View Proof</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-extrabold text-slate-900 block">
                              {displayTotal.toFixed(2)} ETB
                            </span>
                            <span className="text-[10px] font-medium text-emerald-600 block">
                              Incl. 15% VAT
                            </span>
                          </td>

                          {/* Details & Print Actions */}
                          <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrintOrder(order)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 text-xs font-bold transition border border-blue-200 cursor-pointer shadow-2xs"
                                title="Print Order Receipt / Slip"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedOrderId(
                                    isExpanded ? null : order.id
                                  )
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                title="Toggle itemized details"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-5 py-3 border-t border-slate-100">
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

      {/* =========================================================
          TOUCHABLE ORDER DETAIL MODAL
      ========================================================= */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    Order Details ({selectedOrderDetail.order_number || `#${selectedOrderDetail.id}`})
                  </h3>
                  <p className="text-xs text-slate-300">Table #{selectedOrderDetail.table_number || "Counter"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintOrder(selectedOrderDetail)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  title="Print Order Receipt / Slip"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Order Meta Header Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Method</span>
                  <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-0.5 font-bold ${formatPaymentMethodObj(selectedOrderDetail).class}`}>
                    {formatPaymentMethodObj(selectedOrderDetail).label}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Status</span>
                  <span className={`inline-flex items-center mt-1 rounded-full px-2.5 py-0.5 font-bold ${getPaymentBadgeClass(selectedOrderDetail.payment_status, selectedOrderDetail.status)}`}>
                    {formatPaymentStatusLabel(selectedOrderDetail.payment_status, selectedOrderDetail.status)}
                  </span>
                </div>
              </div>

              {/* Mobile Payment Confirmation Picture Banner if Available */}
              {(selectedOrderDetail.receipt_image ||
                selectedOrderDetail.receiptImage ||
                (Array.isArray(selectedOrderDetail.payments) &&
                  selectedOrderDetail.payments.some((p) => p.receipt_image || p.receiptImage || p.image_url || p.imageUrl))) && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <Eye className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-indigo-950">
                        Mobile Payment Confirmation Attached
                      </p>
                      <p className="text-[11px] text-indigo-700">
                        {selectedOrderDetail.payment_method?.toUpperCase() || "MOBILE"} receipt photo uploaded
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProofOrder(selectedOrderDetail)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Picture</span>
                  </button>
                </div>
              )}

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Delivered Items List
                </h4>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 text-xs">
                  {Array.isArray(selectedOrderDetail.items) && selectedOrderDetail.items.length > 0 ? (
                    selectedOrderDetail.items.map((item, idx) => {
                      const qty = Number(item.quantity || item.qty || 1);
                      const price = Number(item.unit_price || item.price || 0);
                      const portion = parseItemPortion(item);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold border ${portion.badgeClass}`}>
                                {portion.displayServing}
                              </span>
                              <p className="font-extrabold text-slate-900">
                                {item.name || item.product_name || item.title || "Delivered Product"}
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Unit Price: {price.toFixed(2)} ETB
                            </p>
                          </div>
                          <span className="font-black text-slate-900 font-mono">
                            {(qty * price).toFixed(2)} ETB
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic">
                      No itemized details recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculation */}
              {(() => {
                const detailItems = Array.isArray(selectedOrderDetail.items) ? selectedOrderDetail.items : [];
                const grossTotal = calculateOrderGrossTotal(selectedOrderDetail);
                const discount = Number(selectedOrderDetail.discount ?? selectedOrderDetail.discount_amount ?? 0);
                const vatAmount = Number((grossTotal - (grossTotal / 1.15)).toFixed(2));
                const baseNet = Number((grossTotal / 1.15).toFixed(2));

                return (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal (Menu Price):</span>
                        <span className="font-mono font-medium">{(grossTotal + discount).toFixed(2)} ETB</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-medium">
                          <span>Discount:</span>
                          <span className="font-mono">-{discount.toFixed(2)} ETB</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>Net Base Amount (Excl. VAT):</span>
                        <span className="font-mono font-medium">{baseNet.toFixed(2)} ETB</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>15% VAT (Included in Price):</span>
                        <span className="font-mono font-medium text-emerald-700">{vatAmount.toFixed(2)} ETB</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-900 p-4 text-white flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                          Total Order Amount
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          (Including 15% VAT)
                        </span>
                      </div>
                      <span className="text-xl font-black text-emerald-400">
                        {grossTotal.toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePrintOrder(selectedOrderDetail)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-bold hover:bg-blue-700 transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="rounded-xl bg-slate-900 text-white px-5 py-2 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT PROOF PICTURE MODAL */}
      {selectedProofOrder && (
        <PaymentProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
        />
      )}
    </div>
  );
}

export default WaiterServedOrdersPage;
