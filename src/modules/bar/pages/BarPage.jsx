import { useEffect, useState, useRef } from "react";
import {
  Wine,
  ClipboardList,
  Flame,
  CheckCircle2,
  TrendingUp,
  Play,
  Check,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import NewOrderAlertModal from "../../../components/common/NewOrderAlertModal";

function BarPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [alertOrder, setAlertOrder] = useState(null);

  const prevOrdersRef = useRef(null);

  // ============================================================
  // FETCH BAR ORDERS
  // ============================================================

  const fetchBarOrders = async () => {
    try {
      setError("");

      const response = await api("/bar/orders");
      const fetchedOrders = response.orders || response.data || (Array.isArray(response) ? response : []);

      if (prevOrdersRef.current !== null) {
        // Detect new pending/new bar order
        const newBarOrder = fetchedOrders.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "new") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newBarOrder) {
          audioService.playNewOrderSound();
          setAlertOrder(newBarOrder);
        }
      }

      prevOrdersRef.current = fetchedOrders;
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch bar orders:", error);

      setError(
        error.message || "Failed to load bar orders"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD ORDERS & POLLING
  // ============================================================

  useEffect(() => {
    fetchBarOrders();
    const interval = setInterval(fetchBarOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // UPDATE BAR ORDER STATUS
  // ============================================================

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrder(orderId);

      console.log(
        "Updating bar order:",
        orderId,
        newStatus
      );

      const response = await api(
        `/bar/orders/${orderId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      console.log(
        "BAR STATUS UPDATE RESPONSE:",
        response
      );

      // Refresh from database
      await fetchBarOrders();

    } catch (error) {
      console.error(
        "Failed to update bar order:",
        error
      );

      alert(
        error.message ||
          "Failed to update bar order status"
      );
    } finally {
      setUpdatingOrder(null);
    }
  };

  // ============================================================
  // STATUS HELPERS
  // ============================================================

  const getDisplayStatus = (status) => {
    switch (status) {
      case "pending":
      case "confirmed":
        return "New";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "served":
      case "completed":
        return "Served";

      case "cancelled":
        return "Cancelled";

      default:
        return status;
    }
  };

  // ============================================================
  // COUNTERS
  // ============================================================

  const newOrders = orders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "confirmed"
  ).length;

  const preparingOrders = orders.filter(
    (order) => order.status === "preparing"
  ).length;

  const readyOrders = orders.filter(
    (order) => order.status === "ready"
  ).length;

  // ============================================================
  // TODAY'S ORDERS
  // ============================================================

  const today = new Date().toDateString();

  const todaysOrders = orders.filter((order) => {
    if (!order.created_at) return false;

    return (
      new Date(order.created_at).toDateString() ===
      today
    );
  }).length;

  // ============================================================
  // FORMAT ORDER ITEMS
  // ============================================================

  const parseItems = (rawItems) => {
    if (!rawItems) return [];
    if (Array.isArray(rawItems)) return rawItems;
    if (typeof rawItems === "string") {
      try {
        return JSON.parse(rawItems);
      } catch {
        return [];
      }
    }
    return [];
  };

  const formatItems = (order) => {
    if (!order) return "No drink items specified";

    const rawItems =
      order.items || order.order_items || order.orderItems || order.products;
    const items = parseItems(rawItems);

    if (items && items.length > 0) {
      return items
        .map((item) => {
          const quantity = Number(item.quantity || item.qty || 1);
          const name =
            item.product_name ||
            item.name ||
            item.title ||
            item.item_name ||
            item.productName ||
            item.description ||
            (item.productId || item.product_id
              ? `Product #${item.productId || item.product_id}`
              : "Drink Item");

          const notes = item.notes ? ` (${item.notes})` : "";
          return `${quantity}x ${name}${notes}`;
        })
        .join(", ");
    }

    if (order.items_summary) return order.items_summary;
    if (order.drink_name) return order.drink_name;
    if (order.product_name)
      return `${order.quantity || 1}x ${order.product_name}`;
    if (order.description) return order.description;

    return "No drink items specified";
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (createdAt) => {
    if (!createdAt) return "";

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading && orders.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />

          <span className="text-sm font-medium">
            Loading bar orders...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Wine className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bar Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Monitor drink orders and bar operations.
            </p>
          </div>

        </div>

        {/* REFRESH BUTTON */}

        <button
          type="button"
          onClick={fetchBarOrders}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">

          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchBarOrders}
            className="mt-2 text-sm font-bold text-red-700 underline"
          >
            Try again
          </button>

        </div>
      )}


      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="New Orders"
          value={newOrders}
          description="Waiting for preparation"
          icon={ClipboardList}
        />

        <StatCard
          title="Preparing"
          value={preparingOrders}
          description="Currently being prepared"
          icon={Flame}
        />

        <StatCard
          title="Ready Orders"
          value={readyOrders}
          description="Ready for pickup"
          icon={CheckCircle2}
        />

        <StatCard
          title="Today's Orders"
          value={todaysOrders}
          description="Total drink orders today"
          icon={TrendingUp}
        />

      </div>


      {/* ======================================================
          ORDERS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Drink Orders
            </h2>

            <p className="text-sm text-slate-500">
              Manage drink preparation
            </p>
          </div>

          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
            {orders.length} Orders
          </span>

        </div>


        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {orders.length === 0 && !error && (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-500">
              <Wine className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-800">
              No drink orders
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              New drink orders from the POS will appear here.
            </p>

          </div>
        )}


        {/* ====================================================
            ORDER LIST
        ==================================================== */}

        {orders.length > 0 && (
          <div className="divide-y divide-slate-200">

            {orders.map((order) => {

              const displayStatus =
                getDisplayStatus(order.status);

              const isUpdating =
                updatingOrder === order.id;

              return (
                <div
                  key={order.id}
                  className="p-5 transition hover:bg-slate-50"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    {/* ==================================================
                        ORDER INFORMATION
                    ================================================== */}

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-3">

                        <span className="text-base font-bold text-slate-900">
                          {order.order_number ||
                            `#B-${order.id}`}
                        </span>

                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {order.table_number
                            ? `Table ${order.table_number}`
                            : "Takeaway"}
                        </span>

                        <StatusBadge
                          status={displayStatus}
                        />

                      </div>


                      {/* ITEMS */}

                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {formatItems(order)}
                      </p>


                      {/* TIME */}

                      <p className="mt-1 text-xs text-slate-400">
                        Ordered{" "}
                        {formatTime(order.created_at)}
                      </p>

                    </div>


                    {/* ==================================================
                        ACTION BUTTONS
                    ================================================== */}

                    <div className="flex shrink-0 items-center gap-3">

                      {/* NEW */}




                      {/* PREPARING */}

                      {order.status === "preparing" && (

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            updateOrderStatus(
                              order.id,
                              "ready"
                            )
                          }
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                          {isUpdating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}

                          Mark Ready

                        </button>
                      )}


                      {/* READY */}

                      {order.status === "ready" && (

                        <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700">

                          <CheckCircle2 className="h-4 w-4" />

                          Ready for Waiter

                        </div>
                      )}


                      {/* SERVED */}

                      {(order.status === "served" ||
                        order.status === "completed") && (

                        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600">

                          <CheckCircle2 className="h-4 w-4" />

                          Served

                        </div>
                      )}

                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>


      {/* ======================================================
          BAR STATUS
      ====================================================== */}

      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
            <Wine className="h-5 w-5" />
          </div>

          <div>

            <p className="font-bold text-purple-900">
              Bar is operational
            </p>

            <p className="text-sm text-purple-700">
              Orders are being processed normally.
            </p>

          </div>

        </div>

      </div>

      {/* NEW BAR DRINK ORDER POPUP */}
      <NewOrderAlertModal
        order={alertOrder}
        department="bar"
        onAccept={(orderToAccept) => updateOrderStatus(orderToAccept.id, "preparing")}
        onDismiss={() => setAlertOrder(null)}
      />
    </div>
  );
}


/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

          <Icon className="h-5 w-5" />

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({ status }) {

  if (status === "New") {
    return (
      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        New
      </span>
    );
  }

  if (status === "Preparing") {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Preparing
      </span>
    );
  }

  if (status === "Ready") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        Ready
      </span>
    );
  }

  if (status === "Served") {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        Served
      </span>
    );
  }

  if (status === "Cancelled") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      {status}
    </span>
  );
}


export default BarPage;