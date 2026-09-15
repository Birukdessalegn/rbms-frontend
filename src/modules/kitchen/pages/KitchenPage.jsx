import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Package,
  Flame,
  UtensilsCrossed,
  AlertTriangle,
  X,
  Truck,
  ArrowUpRight,
  Tag,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import NewOrderAlertModal from "../../../components/common/NewOrderAlertModal";
import IncomingDeliveryBanner from "../../../components/common/IncomingDeliveryBanner";
import StockTransferModal from "../../inventory/components/StockTransferModal";

const parseOrderItems = (order) => {
  if (!order) return [];
  let rawItems = order.items || order.order_items || order.products || [];
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

function KitchenPage({ filterStatus = "all", pageTitle = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusProductParam = searchParams.get("focusProduct") || "";
  const productIdParam = searchParams.get("productId") || "";
  const targetOrderId = searchParams.get("orderId") || "";

  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertOrder, setAlertOrder] = useState(null);
  const [kitchenStock, setKitchenStock] = useState([]);
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "inventory"
  const [kitchenTagFilter, setKitchenTagFilter] = useState("all");

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);

  const prevOrdersRef = useRef(null);

  const displayedOrders = useMemo(() => {
    return kitchenOrders.filter((o) => {
      // 1. Status Filter
      if (filterStatus && filterStatus !== "all") {
        const fs = filterStatus.toLowerCase();
        const s = (o.status || "").toLowerCase();
        if (fs === "new" || fs === "pending") {
          if (s !== "pending" && s !== "new" && s !== "confirmed") return false;
        } else if (fs === "preparing") {
          if (s !== "preparing") return false;
        } else if (fs === "ready") {
          if (s !== "ready") return false;
        } else if (fs === "completed" || fs === "history") {
          if (s !== "completed" && s !== "served" && s !== "ready") return false;
        }
      }

      // 2. Kitchen Tag / Station Filter
      if (kitchenTagFilter && kitchenTagFilter !== "all") {
        const items = parseOrderItems(o);
        const tf = kitchenTagFilter.toLowerCase();
        const hasMatchingItem = items.some((item) => {
          const name = (item.product_name || item.name || item.description || "").toLowerCase();
          const cat = (item.category || item.category_name || "").toLowerCase();
          const tags = (item.tags || item.tag || "").toLowerCase();

          if (tags.includes(tf) || cat.includes(tf) || name.includes(tf)) return true;
          if (tf === "fruit" && (tags.includes("fruit") || cat.includes("fruit") || name.includes("fruit"))) return true;
          if (tf === "fast food" && (tags.includes("fast") || tags.includes("burger") || tags.includes("pizza") || name.includes("burger") || name.includes("pizza"))) return true;
          if (tf === "salad" && (tags.includes("salad") || name.includes("salad"))) return true;
          if (tf === "hot meals" && (tags.includes("main") || tags.includes("hot") || tags.includes("habesha") || cat.includes("food"))) return true;
          return false;
        });

        if (!hasMatchingItem) return false;
      }

      return true;
    });
  }, [kitchenOrders, filterStatus, kitchenTagFilter]);

  const fetchKitchenOrders = async () => {
    try {
      setError("");

      const response = await api("/kitchen");
      console.log("KITCHEN FETCH RESPONSE:", response);

      const orders =
        response.orders ||
        response.data?.orders ||
        response.data ||
        (Array.isArray(response) ? response : []);

      console.log("PARSED KITCHEN ORDERS:", orders);

      if (prevOrdersRef.current !== null) {
        // Detect new pending orders
        const newPendingOrder = orders.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" ||
              o.status?.toLowerCase() === "new" ||
              o.status?.toLowerCase() === "confirmed") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newPendingOrder) {
          audioService.playNewOrderSound();
          setAlertOrder(newPendingOrder);
        }
      }

      prevOrdersRef.current = orders;
      setKitchenOrders(orders);
    } catch (error) {
      console.error("Failed to fetch kitchen orders:", error);
      setError(error.message || "Failed to load kitchen orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  // Smooth scroll to targeted kitchen order
  useEffect(() => {
    if (targetOrderId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`kitchen-order-${targetOrderId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [targetOrderId]);

  const clearSpotlight = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("focusProduct");
    newParams.delete("productId");
    newParams.delete("orderId");
    setSearchParams(newParams, { replace: true });
  };

  const handleAction = async (order) => {
    if (!order) return;
    let nextStatus;

    const currentStatus = (order.status || "").toLowerCase();
    if (
      currentStatus === "pending" ||
      currentStatus === "new" ||
      currentStatus === "confirmed"
    ) {
      nextStatus = "preparing";
    } else if (currentStatus === "preparing") {
      nextStatus = "ready";
    } else {
      return;
    }

    try {
      setError("");

      await api(`/kitchen/${order.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      await fetchKitchenOrders();
    } catch (error) {
      console.error("Failed to update kitchen order:", error);

      setError(
        error.message || "Failed to update kitchen order"
      );
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700";

      case "preparing":
        return "bg-blue-50 text-blue-700";

      case "ready":
        return "bg-green-50 text-green-700";

      case "completed":
        return "bg-gray-100 text-gray-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "completed":
        return "Completed";

      default:
        return status;
    }
  };

  const getActionText = (status) => {
    switch (status) {
      case "pending":
        return "Start Preparing";

      case "preparing":
        return "Mark Ready";

      default:
        return "Completed";
    }
  };

  const parseOrderItems = (order) => {
    if (!order) return [];
    let rawItems = order.items || order.order_items || order.products || [];
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

  const kitchenStockMap = new Map();
  (kitchenStock || []).forEach((item) => {
    const pid = item.product_id || item.productId || item.id;
    if (pid) kitchenStockMap.set(Number(pid), item);
    const pName = (item.product_name || item.name || "").toLowerCase().trim();
    if (pName) kitchenStockMap.set(pName, item);
  });

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        Loading kitchen orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pageTitle || "Kitchen Display (KDS)"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage live food orders and dish preparation tickets.
          </p>
        </div>

        {/* TOP TAB SWITCHER: KDS ORDERS vs LIVE ASSETS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-sm transition"
            >
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              Food Orders (KDS)
              {kitchenOrders.filter((o) => o.status === "pending" || o.status === "preparing").length > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                  {kitchenOrders.filter((o) => o.status === "pending" || o.status === "preparing").length}
                </span>
              )}
            </button>

            <Link
              to="/kitchen/assets"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              <Package className="h-3.5 w-3.5 text-amber-600" />
              Live Kitchen Assets
            </Link>
          </div>

          <Link
            to="/kitchen/reports"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
            Reports
          </Link>
        </div>
      </div>

      {/* Incoming Stock Deliveries Banner */}
      <IncomingDeliveryBanner
        department="kitchen"
        onReceived={fetchKitchenOrders}
      />

      {/* ======================================================
          KITCHEN LOW STOCK ITEM SPOTLIGHT BANNER
      ====================================================== */}
      {focusProductParam && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 p-5 shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-md">
                <UtensilsCrossed className="h-7 w-7 text-amber-600" />
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    <AlertTriangle className="h-3 w-3" />
                    Kitchen Low Stock Item
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Kitchen Inventory
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {focusProductParam}
                </h2>

                <p className="text-xs font-bold text-rose-700 flex items-center gap-2 mt-0.5">
                  <span>Kitchen inventory running low — immediate restock requisition advised.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setRestockProduct({
                    id: productIdParam || 0,
                    product_id: productIdParam || 0,
                    name: focusProductParam,
                    product_name: focusProductParam,
                  });
                  setIsRestockModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-700 active:scale-95 transition cursor-pointer"
              >
                <Truck className="h-4 w-4" />
                <span>Request Restock from Warehouse</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={clearSpotlight}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-white hover:text-slate-900 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            New Orders
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "pending"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Preparing
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "preparing"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Ready
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "ready"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Total Orders
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {kitchenOrders.length}
          </p>
        </div>

      </div>

      {/* Orders */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Kitchen Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Orders sent from the POS system.
            </p>
          </div>

          {/* Kitchen Station / Tag Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mr-1">
              <Tag className="h-3.5 w-3.5" /> Station:
            </span>
            {[
              { id: "all", label: "All Stations" },
              { id: "hot meals", label: "Hot Meals / Main" },
              { id: "fruit", label: "Fruit Station" },
              { id: "salad", label: "Salads / Cold" },
              { id: "fast food", label: "Fast Food / Grill" },
              { id: "dessert", label: "Dessert" },
            ].map((station) => {
              const active = kitchenTagFilter === station.id;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setKitchenTagFilter(station.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-amber-500 text-white shadow-xs font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {station.label}
                </button>
              );
            })}
          </div>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-gray-400">
            No {filterStatus !== "all" ? filterStatus : "kitchen"} orders at this moment.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Table</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {[...displayedOrders]
                  .sort((a, b) => {
                    if (
                      a.status === "pending" &&
                      b.status !== "pending"
                    ) {
                      return -1;
                    }

                    if (
                      a.status !== "pending" &&
                      b.status === "pending"
                    ) {
                      return 1;
                    }

                    return b.id - a.id;
                  })
                  .map((order) => {
                    const isOrderSpotlighted = targetOrderId && (
                      String(order.id) === String(targetOrderId) ||
                      String(order.order_number) === String(targetOrderId)
                    );

                    return (
                      <tr
                        key={order.id}
                        id={`kitchen-order-${order.id}`}
                        className={
                          isOrderSpotlighted
                            ? "bg-amber-50/90 ring-2 ring-amber-400 font-semibold shadow-xs"
                            : "hover:bg-gray-50"
                        }
                      >

                      {/* Order */}
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        #{order.order_number}
                      </td>

                      {/* Table */}
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {order.table_number || "-"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-gray-600">
                        {order.order_type || "-"}
                      </td>

                      {/* Items */}
                      <td className="min-w-[260px] px-5 py-4">

                        <div className="flex flex-col gap-1.5">

                          {parseOrderItems(order).length > 0 ? (
                            parseOrderItems(order).map((item, idx) => {
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

                              return (
                                <div
                                  key={item.id || idx}
                                  className={`flex items-center justify-between gap-3 rounded-lg border ${
                                    isDrink
                                      ? "border-purple-200/70 bg-purple-50/70 text-purple-900"
                                      : "border-amber-200/70 bg-amber-50/70 text-amber-900"
                                  } px-2.5 py-1 text-xs font-semibold shadow-xs transition hover:shadow-sm`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`h-2 w-2 rounded-full shrink-0 ${
                                        isDrink ? "bg-purple-500" : "bg-amber-500"
                                      }`}
                                    />
                                    <span className="truncate font-semibold text-slate-800">
                                      {name}
                                    </span>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-md ${
                                      isDrink
                                        ? "bg-purple-600 text-white"
                                        : "bg-amber-600 text-white"
                                    } px-2 py-0.5 text-[11px] font-extrabold shadow-xs`}
                                  >
                                    ×{qty}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">
                              {order.items_summary || "1x Order Item"}
                            </span>
                          )}

                        </div>

                      </td>

                      {/* Time */}
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">

                        {order.status === "ready" ||
                        order.status === "completed" ? (
                          <span className="text-xs font-medium text-gray-400">
                            {getStatusLabel(order.status)}
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleAction(order)
                            }
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            {getActionText(order.status)}
                          </button>
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

      {/* NEW KITCHEN ORDER ALERT POPUP */}
      <NewOrderAlertModal
        order={alertOrder}
        department="kitchen"
        onAccept={(orderToAccept) => handleAction(orderToAccept)}
        onDismiss={() => setAlertOrder(null)}
      />

      {/* RESTOCK REQUISITION MODAL FOR KITCHEN */}
      <StockTransferModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockProduct(null);
        }}
        onSuccess={() => {
          setIsRestockModalOpen(false);
          setRestockProduct(null);
          fetchKitchenOrders();
        }}
        initialProduct={restockProduct}
        initialDepartment="kitchen"
      />
    </div>
  );
}

export default KitchenPage;