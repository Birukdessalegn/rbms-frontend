import { useEffect, useState } from "react";
import { useRestaurant } from "../../../context/RestaurantContext";
import { useAuth } from "../../../context/AuthContext";
import { isBarSeatTable } from "./TableSelector";
import PaymentModal from "./PaymentModal";
import PaymentProofModal from "./PaymentProofModal";
import EditOrderModal from "./EditOrderModal";
import api from "../../../services/api";
import { User, Eye, ShieldCheck, UserCheck, Crown, Wine } from "lucide-react";

function ActiveOrders() {
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [selectedProofOrder, setSelectedProofOrder] = useState(null);
  const [selectedEditOrder, setSelectedEditOrder] = useState(null);
  const [barOrders, setBarOrders] = useState([]);
  const [loadingBarOrders, setLoadingBarOrders] = useState(false);
  const [paidOrderIds, setPaidOrderIds] = useState(new Set());
  const [posOrders, setPosOrders] = useState([]);

  const {
    tables = [],
    kitchenOrders,
    updateKitchenOrderStatus,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  // ============================================================
  // FETCH BAR & POS ORDERS
  // ============================================================

  const fetchBarOrders = async (isInitial = false) => {
    try {
      if (isInitial) setLoadingBarOrders(true);
      const response = await api("/bar/orders");
      setBarOrders(response.orders || []);
    } catch (error) {
      console.error("Failed to fetch bar orders:", error);
    } finally {
      if (isInitial) setLoadingBarOrders(false);
    }
  };

  const fetchPosOrders = async () => {
    try {
      const response = await api("/pos/orders");
      setPosOrders(response.orders || response.data || []);
    } catch (error) {
      console.log("POS orders fetch notice:", error);
    }
  };

  useEffect(() => {
    fetchBarOrders(true);
    fetchPosOrders();
    if (fetchKitchenOrders) fetchKitchenOrders();
    if (fetchTables) fetchTables();

    // Auto refresh so staff see active orders & table statuses live smoothly without screen flickering
    const interval = setInterval(() => {
      fetchBarOrders(false);
      fetchPosOrders();
      if (fetchKitchenOrders) fetchKitchenOrders(true);
      if (fetchTables) fetchTables(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Map of completed/paid POS order statuses from backend
  const posOrderPaymentStatusMap = new Map(
    posOrders.map((po) => [
      String(po.id),
      {
        payment_status: po.payment_status,
        status: po.status,
        paid_amount: po.paid_amount,
        payments: po.payments,
        total: po.total,
      },
    ])
  );

  // ============================================================
  // COMBINED & GROUPED BY TABLE
  // ============================================================

  const parseRawItems = (itemsInput) => {
    if (!itemsInput) return [];
    if (typeof itemsInput === "string") {
      try {
        return JSON.parse(itemsInput);
      } catch (e) {
        console.error("Failed to parse items string:", e);
        return [];
      }
    }
    return Array.isArray(itemsInput) ? itemsInput : [];
  };

  const tableOrderGroupMap = new Map();

  kitchenOrders.forEach((kOrder) => {
    const mainOrderId = kOrder.order_id || kOrder.id;

    if (kOrder.status === "cancelled") {
      return;
    }

    const tNum = kOrder.table_number || kOrder.table_id;
    const tableGroupKey = mainOrderId ? `ORD_${mainOrderId}` : (tNum ? `TBL_${tNum}` : `K_ORD_${Math.random()}`);

    const kItems = parseRawItems(kOrder.items || kOrder.order_items);
    const posMeta = posOrderPaymentStatusMap.get(String(mainOrderId));

    const isPaid =
      kOrder.payment_status === "paid" ||
      posMeta?.payment_status === "paid" ||
      paidOrderIds.has(String(mainOrderId));

    if (!tableOrderGroupMap.has(tableGroupKey)) {
      tableOrderGroupMap.set(tableGroupKey, {
        uniqueKey: tableGroupKey,
        id: mainOrderId,
        order_id: mainOrderId,
        order_number: kOrder.order_number || `#${mainOrderId}`,
        table_id: kOrder.table_id,
        table_number: kOrder.table_number,
        status: posMeta?.status || kOrder.status,
        payment_status: isPaid ? "paid" : (posMeta?.payment_status || kOrder.payment_status || "unpaid"),
        paid_amount: Number(posMeta?.paid_amount || 0),
        total: Number(posMeta?.total || kOrder.total || 0),
        created_at: kOrder.created_at,
        kitchenOrder: kOrder,
        kitchen_order_id: kOrder.id,
        items: kItems,
        barOrder: null,
        waiter_id: kOrder.waiter_id || kOrder.waiterId || kOrder.user_id || kOrder.userId,
        waiter_user_id: kOrder.waiter_user_id || kOrder.user_id,
        waiter_employee_id: kOrder.waiter_employee_id || kOrder.employee_id,
        waiter_name: kOrder.waiter_name || kOrder.waiterName || kOrder.server_name || kOrder.user_name,
      });
    } else {
      const existing = tableOrderGroupMap.get(tableGroupKey);
      if (!existing.waiter_id) existing.waiter_id = kOrder.waiter_id || kOrder.waiterId || kOrder.user_id;
      if (!existing.waiter_user_id) existing.waiter_user_id = kOrder.waiter_user_id || kOrder.user_id;
      if (!existing.waiter_employee_id) existing.waiter_employee_id = kOrder.waiter_employee_id || kOrder.employee_id;
      if (!existing.waiter_name) existing.waiter_name = kOrder.waiter_name || kOrder.waiterName || kOrder.server_name;
      if (isPaid) {
        existing.payment_status = "paid";
      } else if (posMeta?.payment_status) {
        existing.payment_status = posMeta.payment_status;
        if (posMeta.paid_amount) existing.paid_amount = posMeta.paid_amount;
        if (posMeta.total) existing.total = posMeta.total;
      }
      kItems.forEach((newItem) => {
        const hasItem = existing.items.some(
          (e) =>
            (e.id && e.id === newItem.id) ||
            (e.product_name || e.name) === (newItem.product_name || newItem.name)
        );
        if (!hasItem) {
          existing.items.push(newItem);
        }
      });
    }
  });

  barOrders.forEach((bOrder, bIdx) => {
    const orderIdRef = bOrder.order_id || bOrder.id;

    if (bOrder.status === "cancelled") {
      return;
    }

    const tNum = bOrder.table_number || bOrder.table_id;
    const tableGroupKey = orderIdRef ? `ORD_${orderIdRef}` : (tNum ? `TBL_${tNum}` : `B_ORD_${bIdx}`);

    const bItems = parseRawItems(bOrder.items).map((i) => ({
      ...i,
      category: i.category || "drink",
    }));

    const posMeta = posOrderPaymentStatusMap.get(String(orderIdRef));
    const isPaid =
      bOrder.payment_status === "paid" ||
      posMeta?.payment_status === "paid" ||
      paidOrderIds.has(String(orderIdRef));

    if (tableOrderGroupMap.has(tableGroupKey)) {
      const existing = tableOrderGroupMap.get(tableGroupKey);
      existing.barOrder = bOrder;
      if (!existing.waiter_id) existing.waiter_id = bOrder.waiter_id || bOrder.waiterId || bOrder.user_id;
      if (!existing.waiter_user_id) existing.waiter_user_id = bOrder.waiter_user_id || bOrder.user_id;
      if (!existing.waiter_employee_id) existing.waiter_employee_id = bOrder.waiter_employee_id || bOrder.employee_id;
      if (!existing.waiter_name) existing.waiter_name = bOrder.waiter_name || bOrder.waiterName;
      if (isPaid) {
        existing.payment_status = "paid";
      } else if (posMeta?.payment_status) {
        existing.payment_status = posMeta.payment_status;
        if (posMeta.paid_amount) existing.paid_amount = posMeta.paid_amount;
        if (posMeta.total) existing.total = posMeta.total;
      }

      bItems.forEach((bItem) => {
        const hasItem = existing.items.some(
          (e) =>
            (e.id && e.id === bItem.id) ||
            (e.product_name || e.name) === (bItem.product_name || bItem.name)
        );
        if (!hasItem) {
          existing.items.push(bItem);
        }
      });
    } else {
      tableOrderGroupMap.set(tableGroupKey, {
        uniqueKey: tableGroupKey,
        id: orderIdRef,
        order_id: orderIdRef,
        order_number: bOrder.order_number || `#B-${orderIdRef}`,
        table_id: bOrder.table_id,
        table_number: bOrder.table_number,
        status: posMeta?.status || bOrder.status || "pending",
        payment_status: isPaid ? "paid" : (posMeta?.payment_status || "unpaid"),
        paid_amount: Number(posMeta?.paid_amount || 0),
        total: Number(posMeta?.total || 0),
        created_at: bOrder.created_at,
        items: bItems,
        barOrder: bOrder,
        isBarOnly: true,
        waiter_id: bOrder.waiter_id || bOrder.waiterId || bOrder.user_id,
        waiter_user_id: bOrder.waiter_user_id || bOrder.user_id,
        waiter_employee_id: bOrder.waiter_employee_id || bOrder.employee_id,
        waiter_name: bOrder.waiter_name || bOrder.waiterName,
      });
    }
  });

  // Also include direct POS Orders so new orders render immediately
  posOrders.forEach((pOrder, pIdx) => {
    const mainOrderId = pOrder.id || pOrder.order_id;
    if (pOrder.status === "cancelled") return;

    const tNum = pOrder.table_number || pOrder.table_id;
    const tableGroupKey = mainOrderId ? `ORD_${mainOrderId}` : (tNum ? `TBL_${tNum}` : `POS_ORD_${pIdx}`);

    const pItems = parseRawItems(pOrder.items || pOrder.order_items);
    const isPaid =
      pOrder.payment_status === "paid" ||
      paidOrderIds.has(String(mainOrderId));

    if (!tableOrderGroupMap.has(tableGroupKey)) {
      tableOrderGroupMap.set(tableGroupKey, {
        uniqueKey: tableGroupKey,
        id: mainOrderId,
        order_id: mainOrderId,
        order_number: pOrder.order_number || `#${mainOrderId}`,
        table_id: pOrder.table_id,
        table_number: pOrder.table_number,
        status: pOrder.status,
        payment_status: isPaid ? "paid" : (pOrder.payment_status || "unpaid"),
        created_at: pOrder.created_at,
        items: pItems,
        paid_amount: pOrder.paid_amount || pOrder.paidAmount || 0,
        total: pOrder.total || pOrder.total_amount || 0,
        payments: pOrder.payments || [],
        receipt_image: pOrder.receipt_image || pOrder.receiptImage,
        waiter_id: pOrder.waiter_id || pOrder.waiterId || pOrder.user_id,
        waiter_user_id: pOrder.waiter_user_id || pOrder.user_id,
        waiter_employee_id: pOrder.waiter_employee_id || pOrder.employee_id,
        waiter_name: pOrder.waiter_name || pOrder.waiterName || pOrder.server_name || pOrder.waiter?.name,
        vip_customer_name: pOrder.vip_customer_name,
        vip_customer_tier: pOrder.vip_customer_tier,
        vip_customer_id: pOrder.vip_customer_id,
        vip_customer_phone: pOrder.vip_customer_phone,
      });
    } else {
      const existing = tableOrderGroupMap.get(tableGroupKey);
      if (pOrder.paid_amount) existing.paid_amount = pOrder.paid_amount;
      if (pOrder.payment_status) existing.payment_status = pOrder.payment_status;
      if (pOrder.total) existing.total = pOrder.total;
      if (pOrder.payments && pOrder.payments.length > 0) existing.payments = pOrder.payments;
      if (pOrder.receipt_image || pOrder.receiptImage) existing.receipt_image = pOrder.receipt_image || pOrder.receiptImage;
      if (!existing.waiter_id) existing.waiter_id = pOrder.waiter_id || pOrder.waiterId || pOrder.user_id;
      if (!existing.waiter_user_id) existing.waiter_user_id = pOrder.waiter_user_id || pOrder.user_id;
      if (!existing.waiter_employee_id) existing.waiter_employee_id = pOrder.waiter_employee_id || pOrder.employee_id;
      if (!existing.waiter_name) existing.waiter_name = pOrder.waiter_name || pOrder.waiterName || pOrder.server_name;
      if (pOrder.vip_customer_name) existing.vip_customer_name = pOrder.vip_customer_name;
      if (pOrder.vip_customer_tier) existing.vip_customer_tier = pOrder.vip_customer_tier;
      if (pOrder.vip_customer_id) existing.vip_customer_id = pOrder.vip_customer_id;
      if (pOrder.vip_customer_phone) existing.vip_customer_phone = pOrder.vip_customer_phone;
      pItems.forEach((newItem) => {
        const hasItem = existing.items.some(
          (e) => (e.id && e.id === newItem.id) || (e.product_name || e.name) === (newItem.product_name || newItem.name)
        );
        if (!hasItem) existing.items.push(newItem);
      });
    }
  });

  const { user } = useAuth();

  const allGroupedOrders = Array.from(tableOrderGroupMap.values()).filter((o) => {
    if (o.status === "cancelled") return false;
    return true;
  });

  const activeOrders = allGroupedOrders.filter((o) => {
    // 1. Exclude explicitly paid or settled tickets
    if (o.payment_status === "paid") return false;
    if (paidOrderIds.has(String(o.id || o.order_id))) return false;

    // 2. Exclude empty ghost tickets (orders with 0 items and no charges)
    const orderItems = Array.isArray(o.items) ? o.items : parseRawItems(o.items);
    const orderTotal = Number(o.total || o.total_amount || 0);
    const hasSummary = Boolean(o.items_summary && String(o.items_summary).trim().length > 0);
    if ((!orderItems || orderItems.length === 0) && !hasSummary && orderTotal <= 0) {
      return false;
    }

    // 3. Exclude if paid_amount settles the order total
    const paidAmt = Number(o.paid_amount || 0);
    const itemsTotal = (orderItems || []).reduce(
      (acc, i) => acc + Number(i.quantity || i.qty || 1) * Number(i.unit_price || i.price || 0),
      0
    );
    const effectiveTotal = orderTotal > 0 ? orderTotal : itemsTotal;
    if (paidAmt > 0 && effectiveTotal > 0 && paidAmt >= (effectiveTotal - 0.05)) {
      return false;
    }

    return true;
  });

  /* Role-Based Order Scoping: Waiters only see their own assigned/served tickets */
  const userRoleName = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || user?.role_name || user?.roleName || ""
  ).toLowerCase();

  const userRoleId = Number(
    user?.roleId || user?.role_id || user?.role?.id || 0
  );

  const isCashierOrAdmin =
    ["cashier", "admin", "manager", "finance", "superadmin"].includes(userRoleName) ||
    [1, 2, 4, 5].includes(userRoleId);

  const isBartender = !isCashierOrAdmin && (userRoleName === "bartender" || userRoleId === 8);
  const isWaiter = !isCashierOrAdmin && !isBartender && (userRoleName === "waiter" || userRoleId === 6);

  const isOrderAssignedToWaiter = (order) => {
    if (!user) return false;

    const myUserId = String(user.id || "").trim().toLowerCase();
    const myEmpId = user.employee_id || user.employeeId;
    const myEmpIdStr = myEmpId ? String(myEmpId).trim() : null;
    const myUsername = String(user.username || "").trim().toLowerCase();
    const myFirstName = String(user.first_name || user.firstName || "").trim().toLowerCase();
    const myLastName = String(user.last_name || user.lastName || "").trim().toLowerCase();
    const myFullName = String(user.name || `${myFirstName} ${myLastName}`).trim().toLowerCase();

    const orderWaiterIdStr = order.waiter_id ? String(order.waiter_id).trim().toLowerCase() : null;
    const orderWaiterEmpIdStr = order.waiter_employee_id ? String(order.waiter_employee_id).trim().toLowerCase() : null;
    const orderWaiterUserIdStr = order.waiter_user_id ? String(order.waiter_user_id).trim().toLowerCase() : null;
    const orderUserIdStr = order.user_id ? String(order.user_id).trim().toLowerCase() : null;
    const orderWaiterName = String(order.waiter_name || order.waiterName || order.server_name || "").trim().toLowerCase();

    // 1. Check ID match (UUID or Employee Integer ID)
    if (myUserId) {
      if (orderWaiterIdStr && orderWaiterIdStr === myUserId) return true;
      if (orderWaiterUserIdStr && orderWaiterUserIdStr === myUserId) return true;
      if (orderUserIdStr && orderUserIdStr === myUserId) return true;
    }
    if (myEmpIdStr) {
      if (orderWaiterIdStr && orderWaiterIdStr === myEmpIdStr) return true;
      if (orderWaiterEmpIdStr && orderWaiterEmpIdStr === myEmpIdStr) return true;
    }

    // 2. Check Name / Username match
    if (orderWaiterName) {
      if (myUsername && (orderWaiterName === myUsername || orderWaiterName.includes(myUsername) || myUsername.includes(orderWaiterName))) {
        return true;
      }
      if (myFullName && (orderWaiterName === myFullName || orderWaiterName.includes(myFullName) || myFullName.includes(orderWaiterName))) {
        return true;
      }
      if (myFirstName && myFirstName.length >= 2 && orderWaiterName.includes(myFirstName)) {
        return true;
      }
    }

    return false;
  };

  /* Bartender Order Scoping: Strictly show bar counter stools and bar direct orders */
  const isBarScopedOrder = (order) => {
    if (!order) return false;

    const tableNum = String(order.table_number || "").toLowerCase().trim();

    // 1. Check if associated with a table
    let matchedTable = null;
    if (Array.isArray(tables) && tables.length > 0) {
      matchedTable = tables.find(
        (t) =>
          (order.table_id && String(t.id) === String(order.table_id)) ||
          (tableNum && String(t.table_number || "").toLowerCase().trim() === tableNum)
      );
    }

    // 2. Strict Rule: If table is a dining table (not a bar seat), the bartender must NOT see it on Menu Page
    if (matchedTable && !isBarSeatTable(matchedTable)) {
      return false;
    }

    // If table number does not look like a bar seat and matchedTable is not bar seat, exclude
    if (tableNum && !tableNum.startsWith("b-") && !tableNum.startsWith("bar") && tableNum !== "bar" && !matchedTable) {
      return false;
    }

    // 3. Table is confirmed to be a bar seat / counter stool
    if (tableNum.startsWith("b-") || tableNum.startsWith("bar") || tableNum === "bar") {
      return true;
    }

    if (matchedTable && isBarSeatTable(matchedTable)) {
      return true;
    }

    // 4. Created by or assigned to this bartender
    if (user) {
      const myUserId = String(user.id || "").trim().toLowerCase();
      const myEmpId = user.employee_id || user.employeeId;
      const myEmpIdStr = myEmpId ? String(myEmpId).trim().toLowerCase() : null;

      const orderBartenderId = order.bartender_id ? String(order.bartender_id).trim().toLowerCase() : null;
      if (myUserId && orderBartenderId && orderBartenderId === myUserId) return true;
      if (myEmpIdStr && orderBartenderId && orderBartenderId === myEmpIdStr) return true;
    }

    // 5. Direct counter orders without any dining table
    if (!tableNum && (order.is_bar_order === true || order.is_bar_order === 1 || order.is_bar_order === "true")) {
      return true;
    }

    return false;
  };

  const visibleOrders = isWaiter
    ? activeOrders.filter(isOrderAssignedToWaiter)
    : isBartender
    ? activeOrders.filter(isBarScopedOrder)
    : activeOrders;

  // ============================================================
  // FIND BAR ORDER FOR RESTAURANT ORDER
  // ============================================================

  const getBarOrder = (order) => {
    return order.barOrder || barOrders.find(
      (barOrder) =>
        Number(barOrder.order_id) === Number(order.order_id || order.id)
    );
  };

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700";

      case "confirmed":
        return "bg-indigo-50 text-indigo-700";

      case "preparing":
        return "bg-blue-50 text-blue-700";

      case "ready":
        return "bg-green-50 text-green-700";

      case "served":
        return "bg-purple-50 text-purple-700";

      case "completed":
        return "bg-gray-100 text-gray-600";

      case "cancelled":
        return "bg-red-50 text-red-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // ============================================================
  // STATUS LABEL
  // ============================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Confirmed";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "served":
        return "Served";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      default:
        return status;
    }
  };

  // ============================================================
  // SERVE FOOD
  // ============================================================

  const handleServeFood = async (order) => {
    try {
      const kId = order.kitchen_order_id || (order.kitchenOrder ? order.kitchenOrder.id : order.id);
      console.log("Serving food for kitchen_order_id:", kId);
      await updateKitchenOrderStatus(kId, "served");
      if (fetchKitchenOrders) await fetchKitchenOrders();
    } catch (error) {
      console.error("Failed to mark food as served:", error);
    }
  };

  const calculateOrderTotal = (order) => {
    if (!order) return 0;
    const items = Array.isArray(order.items)
      ? order.items
      : parseRawItems(order.items || order.order_items);

    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const price = Number(
        item.unit_price ??
        item.unitPrice ??
        item.price ??
        item.product_price ??
        item.productPrice ??
        item.product?.price ??
        0
      );
      return sum + qty * price;
    }, 0);

    const dbTotal = Number(order.total_amount ?? order.totalAmount ?? order.total ?? 0);
    return dbTotal > 0 ? dbTotal : subtotal;
  };

  // ============================================================
  // SERVE DRINKS
  // ============================================================

  const handleServeDrinks = async (barOrder) => {
    try {
      console.log("Serving bar order:", barOrder.id);

      const response = await api(`/bar/orders/${barOrder.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "served" }),
      });

      console.log("Bar order served:", response);

      setBarOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === barOrder.id ? { ...order, status: "served" } : order
        )
      );
    } catch (error) {
      console.error("Failed to mark drinks as served:", error);
      alert(error.message || "Failed to mark drinks as served");
    }
  };

  // ============================================================
  // PAYMENT SUCCESS
  // ============================================================

  const handlePaymentSuccess = async (response, order, isFullyPaidParam) => {
    console.log("Payment recorded:", response, order, isFullyPaidParam);

    const isFullyPaid = isFullyPaidParam !== undefined
      ? isFullyPaidParam
      : Boolean(
        response?.is_fully_paid ??
        response?.data?.is_fully_paid ??
        (response?.remaining_balance !== undefined ? Number(response.remaining_balance) <= 0.05 : false)
      );

    // If order was only partially settled, keep it active on the table!
    if (!isFullyPaid) {
      console.log("Order is partially settled. Keeping active on table.");
      await fetchPosOrders();
      if (fetchKitchenOrders) await fetchKitchenOrders();
      await fetchBarOrders();
      if (fetchTables) await fetchTables();
      return;
    }

    setPaymentOrder(null);

    const targetOrderId = order.order_id || order.id;
    const targetTableId = order.table_id || order.table_number;

    // Track fully paid order in local state
    setPaidOrderIds((prev) => {
      const next = new Set(prev);
      if (order.id) next.add(String(order.id));
      if (order.order_id) next.add(String(order.order_id));
      if (order.uniqueKey) next.add(String(order.uniqueKey));
      if (targetTableId) next.add(`TBL_${targetTableId}`);
      return next;
    });

    // 1. Instantly remove fully paid order from local bar state
    setBarOrders((prev) =>
      prev.filter((o) => (o.id || o.order_id) !== targetOrderId)
    );

    // 2. Free up table in backend if table ID exists
    if (targetTableId) {
      try {
        await api(`/tables/${targetTableId}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: "available" }),
        });
      } catch (tableErr) {
        console.log("Table status auto-reset notice:", tableErr);
      }
    }

    // 3. Trigger context refresh
    try {
      if (fetchTables) await fetchTables();
      if (fetchKitchenOrders) await fetchKitchenOrders();
      await fetchBarOrders();
      await fetchPosOrders();
    } catch (e) {
      console.error("Failed to refresh state after payment:", e);
    }
  };

  const parseOrderItems = (order) => {
    if (!order) return [];
    let rawItems =
      order.items ||
      order.order_items ||
      (order.barOrder ? order.barOrder.items : null) ||
      [];

    if (typeof rawItems === "string") {
      try {
        rawItems = JSON.parse(rawItems);
      } catch {
        rawItems = [];
      }
    }

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      return rawItems;
    }

    if (order.items_summary) {
      return [{ name: order.items_summary, quantity: 1 }];
    }

    return [];
  };

  // ============================================================
  // CHECK WHETHER EVERYTHING IS SERVED
  // ============================================================

  const isOrderFullyServed = (order) => {
    if (!order) return false;
    const barOrder = getBarOrder(order);

    const kitchenServed =
      order.status === "served" ||
      order.status === "completed" ||
      order.isBarOnly;

    const drinksServed =
      !barOrder ||
      barOrder.status === "served" ||
      barOrder.status === "completed";

    return kitchenServed && drinksServed;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="border-b border-gray-200 px-5 py-4">

          <div className="flex items-center justify-between">

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">
                  Active Orders
                </h2>
                {isWaiter ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/80">
                    <UserCheck className="h-3 w-3" />
                    Waiter View ({user?.username || user?.name || "Assigned Tickets"})
                  </span>
                ) : isBartender ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/80">
                    <Wine className="h-3 w-3" />
                    Bartender View ({user?.username || user?.name || "Bar Stools & Orders"})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200/80">
                    <ShieldCheck className="h-3 w-3" />
                    Current Orders
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {isWaiter
                  ? "Showing only your active assigned table tickets."
                  : isBartender
                  ? "Showing only active bar counter stools and drink orders."
                  : "Monitor kitchen and bar orders and process customer payments."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {visibleOrders.length} Active {visibleOrders.length === 1 ? "Order" : "Orders"}
              </span>

              {visibleOrders.some(
                (order) => {
                  const barOrder = getBarOrder(order);

                  return (
                    order.status === "ready" ||
                    barOrder?.status === "ready"
                  );
                }
              ) && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Items Ready
                </span>
              )}
            </div>

          </div>

        </div>

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {visibleOrders.length === 0 ? (

          <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400">
            <User className="h-8 w-8 text-gray-300 mb-2" />
            <p className="font-semibold text-gray-600">
              {isWaiter
                ? "No active orders assigned to you."
                : isBartender
                ? "No active bar counter orders right now."
                : "No active unpaid orders open right now."}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isWaiter
                ? "New orders created for your tables will appear here."
                : isBartender
                ? "Orders placed for bar stools and drinks will appear here."
                : "Customer tickets created at tables or bar will appear here automatically."}
            </p>
          </div>

        ) : (

          <div className="overflow-x-auto -mx-1 sm:mx-0">

            <table className="w-full text-left text-xs sm:text-sm">

              <thead className="bg-slate-100/80 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">

                <tr>

                  <th className="px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap">
                    Table & Order
                  </th>

                  <th className="px-3 py-3 sm:px-5 sm:py-4 min-w-[200px]">
                    Ordered Items (Food, Drinks & Other)
                  </th>

                  <th className="px-3 py-3 sm:px-5 sm:py-4 text-center whitespace-nowrap">
                    Table Status
                  </th>

                  <th className="px-3 py-3 sm:px-5 sm:py-4 text-right whitespace-nowrap">
                    Actions & Payment
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {visibleOrders.map((order, orderIdx) => {

                  const barOrder = getBarOrder(order);
                  const fullyServed = isOrderFullyServed(order);

                  const orderItems = Array.isArray(order.items) ? order.items : [];
                  const hasFoodItems = orderItems.some((i) => {
                    const cat = String(i.category || i.category_type || "").toLowerCase();
                    const nm = String(i.name || i.product_name || i.title || "").toLowerCase();
                    if (cat === "food" || cat === "kitchen") return true;
                    if (cat === "drink" || cat === "bar") return false;
                    const isDrinkKeyword = nm.includes("chivas") || nm.includes("beer") || nm.includes("wine") || nm.includes("whiskey") || nm.includes("vodka") || nm.includes("cognac") || nm.includes("gin") || nm.includes("cocktail") || nm.includes("soda") || nm.includes("water") || nm.includes("juice") || nm.includes("drink");
                    return !isDrinkKeyword;
                  });

                  const hasDrinkItems = Boolean(barOrder) || orderItems.some((i) => {
                    const cat = String(i.category || i.category_type || "").toLowerCase();
                    const nm = String(i.name || i.product_name || i.title || "").toLowerCase();
                    if (cat === "drink" || cat === "bar") return true;
                    return nm.includes("chivas") || nm.includes("beer") || nm.includes("wine") || nm.includes("whiskey") || nm.includes("vodka") || nm.includes("cognac") || nm.includes("gin") || nm.includes("cocktail") || nm.includes("soda") || nm.includes("water") || nm.includes("juice") || nm.includes("drink");
                  });

                  const rowKey =
                    order.uniqueKey ||
                    `table-row-${order.id || order.table_id || orderIdx}-${orderIdx}`;

                  const totalBirr = calculateOrderTotal(order);
                  const paidAmount = Number(order.paid_amount || order.paidAmount || 0);
                  const remainingBalance = Math.max(0, totalBirr - paidAmount);

                  const vipCustomerName =
                    order.vip_customer_name ||
                    order.vipCustomerName ||
                    order.vip_customer?.name ||
                    (Array.isArray(order.payments)
                      ? order.payments.find((p) => p.vip_customer_name)?.vip_customer_name
                      : null) ||
                    (order.notes && order.notes.includes("VIP:")
                      ? order.notes.split("VIP:")[1]?.split(/[\n,]/)[0]?.trim()
                      : null) ||
                    (Array.isArray(order.payments)
                      ? (() => {
                          const pVip = order.payments.find(
                            (p) => p.reference && String(p.reference).startsWith("VIP_CREDIT:")
                          );
                          return pVip ? String(pVip.reference).replace("VIP_CREDIT:", "").trim() : null;
                        })()
                      : null);

                  return (

                    <tr
                      key={rowKey}
                      className="hover:bg-gray-50/80 transition"
                    >

                      {/* TABLE & ORDER */}
                      <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[160px] sm:min-w-[200px]">
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold text-slate-900">
                            {order.table_number || order.table_id
                              ? `Table #${order.table_number || order.table_id}`
                              : "Takeaway / Counter"}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            #{order.order_number || order.id}
                          </span>
                          {(() => {
                            const orderTableId = String(
                              order.table_id || order.tableId || order.table_number || order.tableNumber || ""
                            )
                              .toLowerCase()
                              .replace(/^t/, "");

                            const matchedTable = tables.find((t) => {
                              const tId = String(t.id || "").toLowerCase();
                              const tNum = String(t.table_number || "").toLowerCase().replace(/^t/, "");
                              return (orderTableId && tId && orderTableId === tId) || (orderTableId && tNum && orderTableId === tNum);
                            });

                            const waiterDisplayName =
                              order.waiter_name ||
                              order.waiterName ||
                              order.waiter?.name ||
                              order.user_name ||
                              order.server_name ||
                              matchedTable?.current_waiter_name ||
                              matchedTable?.waiter_first_name ||
                              (user?.username || user?.name || "Staff / Waiter");

                            return (
                              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 w-fit">
                                <User size={12} />
                                <span>{waiterDisplayName}</span>
                              </div>
                            );
                          })()}

                          {/* VIP Customer Tag */}
                          {vipCustomerName && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border border-amber-300 px-2.5 py-1 rounded-lg shadow-xs w-fit">
                              <Crown size={13} className="text-amber-700 shrink-0" />
                              <span>VIP: {vipCustomerName}</span>
                            </div>
                          )}

                          {/* Total Amount & Paid Balance Breakdown */}
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500">Total:</span>
                              <span className="font-black text-slate-900">{totalBirr.toFixed(2)} ETB</span>
                            </div>
                            {paidAmount > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-emerald-600">Paid:</span>
                                <span className="font-bold text-emerald-700">{paidAmount.toFixed(2)} ETB</span>
                              </div>
                            )}
                            {remainingBalance > 0 && paidAmount > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-amber-700">Remaining:</span>
                                <span className="font-extrabold text-amber-800">{remainingBalance.toFixed(2)} ETB</span>
                              </div>
                            )}
                          </div>

                          {/* Payments History List */}
                          {Array.isArray(order.payments) && order.payments.length > 0 && (
                            <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200/80 p-2 space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Payments Received ({order.payments.length})
                              </span>
                              {order.payments.map((p, pIdx) => {
                                const pVipName =
                                  p.vip_customer_name ||
                                  (p.reference && String(p.reference).startsWith("VIP_CREDIT:")
                                    ? String(p.reference).replace("VIP_CREDIT:", "").trim()
                                    : null);

                                return (
                                  <div key={p.id || pIdx} className="flex items-center justify-between text-[11px] gap-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="font-bold text-slate-800">
                                        {String(p.payment_method || p.method || "Cash").toUpperCase()}
                                      </span>
                                      {pVipName && (
                                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                                          👑 VIP: {pVipName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-emerald-700 whitespace-nowrap">
                                      {Number(p.amount || 0).toFixed(2)} ETB
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ITEMS (FOOD, DRINKS, OTHER) */}
                      <td className="min-w-[200px] sm:min-w-[280px] px-3 py-3 sm:px-5 sm:py-3">

                        <div className="flex flex-wrap items-center gap-1.5">

                          {parseOrderItems(order).length > 0 ? (
                            parseOrderItems(order).map(
                              (item, idx) => {
                                const qty = item.quantity || item.qty || 1;
                                const name =
                                  item.product_name ||
                                  item.name ||
                                  item.title ||
                                  item.item_name ||
                                  item.description ||
                                  (item.productId || item.product_id
                                    ? `Item #${item.productId || item.product_id}`
                                    : "Order Item");

                                const nameLower = name.toLowerCase();
                                const isDrink =
                                  item.category === "drink" ||
                                  item.category === "bar" ||
                                  nameLower.includes("beer") ||
                                  nameLower.includes("wine") ||
                                  nameLower.includes("whiskey") ||
                                  nameLower.includes("drink") ||
                                  nameLower.includes("cocktail") ||
                                  nameLower.includes("soda") ||
                                  nameLower.includes("water");

                                const isFood =
                                  item.category === "food" ||
                                  item.category === "kitchen" ||
                                  nameLower.includes("doro") ||
                                  nameLower.includes("burger") ||
                                  nameLower.includes("pizza") ||
                                  nameLower.includes("steak") ||
                                  nameLower.includes("pasta");

                                return (
                                  <div
                                    key={`item-${rowKey}-${item.id || idx}`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border ${isDrink
                                        ? "border-purple-200/80 bg-purple-50 text-purple-900"
                                        : isFood
                                          ? "border-amber-200/80 bg-amber-50 text-amber-900"
                                          : "border-sky-200/80 bg-sky-50 text-sky-900"
                                      } px-2.5 py-1 text-xs font-semibold shadow-xs`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${isDrink
                                          ? "bg-purple-500"
                                          : isFood
                                            ? "bg-amber-500"
                                            : "bg-sky-500"
                                        }`}
                                    />
                                    <span className="font-semibold text-slate-800">
                                      {name}
                                    </span>
                                    <span
                                      className={`rounded ${isDrink
                                          ? "bg-purple-600 text-white"
                                          : isFood
                                            ? "bg-amber-600 text-white"
                                            : "bg-sky-600 text-white"
                                        } px-1.5 py-0.2 text-[10px] font-black`}
                                    >
                                      ×{qty}
                                    </span>
                                  </div>
                                );
                              }
                            )
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">
                              {order.items_summary || "1x Order Item"}
                            </span>
                          )}

                        </div>

                      </td>

                      {/* OVERALL TABLE STATUS */}
                      <td className="px-3 py-3 sm:px-5 sm:py-3 text-center whitespace-nowrap">

                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-extrabold ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>

                          {(order.payment_status === "partial" || (paidAmount > 0 && remainingBalance > 0)) && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              🟡 Partial ({paidAmount.toFixed(0)} ETB)
                            </span>
                          )}
                        </div>

                      </td>

                      {/* ACTIONS & PAYMENT */}
                      <td className="px-3 py-3 sm:px-5 sm:py-3 text-right whitespace-nowrap">

                        {paidOrderIds.has(String(order.id)) ||
                          paidOrderIds.has(String(order.order_id)) ||
                          paidOrderIds.has(String(order.uniqueKey)) ||
                          order.payment_status === "paid" ||
                          order.status === "completed" ? (
                          <div className="flex flex-col items-end justify-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md whitespace-nowrap">
                              ✓ Paid
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedProofOrder(order)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-lg transition shadow-2xs whitespace-nowrap"
                            >
                              <Eye size={12} /> View Proof Image
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2">

                            {/* SERVE DRINKS BUTTON */}
                            {hasDrinkItems && barOrder && (barOrder.status === "ready" || barOrder.status === "preparing") && (
                              <button
                                type="button"
                                onClick={() => handleServeDrinks(barOrder)}
                                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition shadow-xs whitespace-nowrap"
                              >
                                🍺 Mark Drinks Served
                              </button>
                            )}

                            {/* SERVE FOOD BUTTON */}
                            {hasFoodItems && (order.status === "ready" || order.kitchenOrder?.status === "ready") && (
                              <button
                                type="button"
                                onClick={() => handleServeFood(order)}
                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs whitespace-nowrap"
                              >
                                🍔 Mark Food Served
                              </button>
                            )}

                            {/* PROOF IMAGE BUTTON IF AVAILABLE */}
                            {(order.receipt_image ||
                              order.receiptImage ||
                              order.proof_image ||
                              order.proofImage ||
                              order.image_url ||
                              order.imageUrl ||
                              (Array.isArray(order.payments) && order.payments.some((p) => p.receipt_image || p.receiptImage || p.image_url || p.imageUrl || p.image))) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProofOrder(order)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl transition shadow-2xs whitespace-nowrap"
                                >
                                  <Eye size={13} /> Proof Image
                                </button>
                              )}

                            {/* EDIT / ADD ITEMS BUTTON */}
                            <button
                              type="button"
                              onClick={() => {
                                const realId = order.order_id || order.id;
                                const parsedItems = parseOrderItems(order);
                                setSelectedEditOrder({
                                  ...order,
                                  id: realId,
                                  items: parsedItems,
                                });
                              }}
                              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap"
                            >
                              ✏️ Edit / Add Items
                            </button>

                            {/* COMPLETE / SETTLE REMAINING PAYMENT BUTTON */}
                            <button
                              type="button"
                              onClick={() => {
                                const tBirr = calculateOrderTotal(order);
                                setPaymentOrder({
                                  ...order,
                                  id: order.order_id || order.id,
                                  calculatedTotal: tBirr,
                                });
                              }}
                              className={`rounded-xl px-3.5 py-1.5 text-xs font-black text-white shadow-md active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap ${remainingBalance > 0 && paidAmount > 0
                                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                }`}
                            >
                              💳 {remainingBalance > 0 && paidAmount > 0
                                ? `Pay Remaining (${remainingBalance.toFixed(2)} ETB)`
                                : totalBirr > 0
                                  ? `Pay Birr ${totalBirr.toFixed(2)}`
                                  : "Complete Payment"}
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ============================================================
          PAYMENT MODAL
      ============================================================ */}

      {paymentOrder && (

        <PaymentModal
          order={paymentOrder}
          onClose={() =>
            setPaymentOrder(null)
          }
          onPaymentSuccess={(
            response,
            ord,
            isFullyPaid
          ) =>
            handlePaymentSuccess(
              response,
              ord || paymentOrder,
              isFullyPaid
            )
          }
        />

      )}

      {/* ============================================================
          PAYMENT PROOF CROSS-CHECK MODAL
      ============================================================ */}

      {selectedProofOrder && (
        <PaymentProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
        />
      )}

      {/* ============================================================
          EDIT / ADD ITEMS MODAL
      ============================================================ */}

      {selectedEditOrder && (
        <EditOrderModal
          isOpen={true}
          order={selectedEditOrder}
          onClose={async () => {
            setSelectedEditOrder(null);
            await fetchPosOrders();
            if (fetchKitchenOrders) await fetchKitchenOrders();
            await fetchBarOrders();
            if (fetchTables) await fetchTables();
          }}
          onOrderUpdated={async () => {
            await fetchPosOrders();
            if (fetchKitchenOrders) await fetchKitchenOrders();
            await fetchBarOrders();
            if (fetchTables) await fetchTables();
          }}
          onSuccess={async () => {
            await fetchPosOrders();
            if (fetchKitchenOrders) await fetchKitchenOrders();
            await fetchBarOrders();
            if (fetchTables) await fetchTables();
          }}
        />
      )}

    </>
  );
}

export default ActiveOrders;