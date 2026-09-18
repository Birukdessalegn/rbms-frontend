/**
 * Determines the target route for a notification based on its reference type,
 * title, message, and the current user's role.
 * Attaches query parameters to spotlight specific items in banner method
 * or automatically open modals.
 */
export const getNotificationRoute = (notification, userRole = "") => {
  if (!notification) return "/dashboard";

  const refType = String(
    notification.referenceType || notification.reference_type || ""
  ).toLowerCase();
  const type = String(notification.type || "").toLowerCase();
  const title = String(notification.title || "").toLowerCase();
  const message = String(notification.message || "").toLowerCase();
  const role = String(userRole || "").toLowerCase();

  // Extract metadata (Product name in quotes, Transfer number, Reference ID)
  const matchName =
    notification.message?.match(/"([^"]+)"/)?.[1] ||
    notification.title?.match(/"([^"]+)"/)?.[1] ||
    "";

  const matchTrf =
    notification.message?.match(/(TRF-[\w-]+)/i)?.[1] ||
    notification.title?.match(/(TRF-[\w-]+)/i)?.[1] ||
    "";

  const refId =
    notification.referenceId ||
    notification.reference_id ||
    notification.orderId ||
    notification.order_id ||
    "";

  // Helper to build queries
  const buildQuery = (params) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return qs ? `?${qs}` : "";
  };

  // 1. Stock Transfers / Deliveries / Acceptance
  if (
    refType === "transfer" ||
    title.includes("transfer") ||
    title.includes("delivery") ||
    title.includes("restock") ||
    title.includes("requisition") ||
    message.includes("transfer") ||
    message.includes("dispatched") ||
    message.includes("accepted")
  ) {
    const transferQuery = buildQuery({
      transferId: refId,
      transferNumber: matchTrf,
    });

    // If incoming to Bar and user is bartender, lead directly to Bar page with delivery modal
    if (title.includes("bar") || message.includes("bar") || message.includes("to bar")) {
      if (role === "bartender") return `/bar${transferQuery}`;
      if (role === "admin" || role === "manager" || role === "storekeeper") {
        return `/inventory/transactions${transferQuery}`;
      }
      return `/bar${transferQuery}`;
    }

    // If incoming to Kitchen and user is chef, lead to Kitchen with delivery modal
    if (title.includes("kitchen") || message.includes("kitchen") || message.includes("to kitchen")) {
      if (role === "chef") return `/kitchen${transferQuery}`;
      if (role === "admin" || role === "manager" || role === "storekeeper") {
        return `/inventory/transactions${transferQuery}`;
      }
      return `/kitchen${transferQuery}`;
    }

    // Default for storekeepers and managers to see full audit trail
    return `/inventory/transactions${transferQuery}`;
  }

  // 1.5. Stock Shortage Discrepancy & Approvals
  if (
    refType === "stock_shortage" ||
    title.includes("shortage") ||
    message.includes("shortage")
  ) {
    return `/kitchen/stock-audit?tab=shortages`;
  }

  // 2. Low Stock Alerts (Drink / Kitchen / Warehouse)
  if (
    refType.includes("stock") ||
    title.includes("low stock") ||
    message.includes("low stock") ||
    message.includes("minimum")
  ) {
    const isBar = title.includes("bar") || message.includes("bar") || message.includes("drink");
    const isKitchen = title.includes("kitchen") || message.includes("kitchen");

    if (isBar) {
      const barDrinkQuery = buildQuery({
        focusDrink: matchName,
        productId: refId,
      });
      return `/bar${barDrinkQuery}`;
    }

    if (isKitchen) {
      const kitchenQuery = buildQuery({
        focusProduct: matchName,
        productId: refId,
      });
      return `/kitchen${kitchenQuery}`;
    }

    // Central Store / General Low Stock
    const centralQuery = buildQuery({
      focusItem: matchName,
      productId: refId,
    });
    return `/inventory/low-stock${centralQuery}`;
  }

  // 3. New Kitchen / Food Orders
  if (
    type === "new_order" ||
    title.includes("kitchen order") ||
    title.includes("food order") ||
    message.includes("kitchen order")
  ) {
    const orderQuery = buildQuery({ orderId: refId });
    return role === "chef" ? `/chef/kitchen/new${orderQuery}` : `/kitchen${orderQuery}`;
  }

  // 4. Order Ready for pickup (Waiter / Cashier / POS)
  if (
    type === "ready" ||
    title.includes("order ready") ||
    title.includes("dish ready") ||
    message.includes("is ready")
  ) {
    const orderQuery = buildQuery({ orderId: refId });
    return `/pos${orderQuery}`;
  }

  // 5. Bar Orders
  if (
    title.includes("bar order") ||
    message.includes("bar order") ||
    title.includes("drink")
  ) {
    const barOrderQuery = buildQuery({ orderId: refId });
    return `/bar${barOrderQuery}`;
  }

  // 6. Expenses & Recurring Bills
  if (
    refType === "expense" ||
    refType === "recurring_expense" ||
    title.includes("expense") ||
    message.includes("expense") ||
    title.includes("recurring") ||
    message.includes("recurring") ||
    title.includes("payment due") ||
    message.includes("payment due") ||
    title.includes("bill") ||
    message.includes("bill")
  ) {
    const isRecurring =
      refType === "recurring_expense" ||
      title.includes("recurring") ||
      message.includes("recurring") ||
      title.includes("due") ||
      message.includes("due");

    const matchExp =
      notification.message?.match(/(EXP-[\w-]+)/i)?.[1] ||
      notification.title?.match(/(EXP-[\w-]+)/i)?.[1] ||
      "";

    const expenseQuery = buildQuery({
      expenseId: !isRecurring ? refId : undefined,
      recurringId: isRecurring ? refId : undefined,
      tab: isRecurring ? "recurring" : undefined,
      expenseNumber: matchExp,
    });
    return `/expenses${expenseQuery}`;
  }

  // 7. Purchasing
  if (refType === "purchase" || title.includes("purchase") || title.includes("supplier")) {
    return "/purchasing";
  }

  // Fallback by role
  if (role === "chef") return "/kitchen";
  if (role === "bartender") return "/bar";
  if (role === "waiter" || role === "cashier") return "/pos";
  return "/dashboard";
};
