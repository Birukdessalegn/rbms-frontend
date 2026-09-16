import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Flame,
  ChefHat,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
} from "lucide-react";
import api from "../../../../services/api";
import audioService from "../../../../services/audioService";
import NewOrderAlertModal from "../../../../components/common/NewOrderAlertModal";

// Helper: Check if an item belongs to Fruit or Shisha station
function isFruitOrShishaItem(item) {
  if (!item) return false;
  const name = String(item.product_name || item.name || item.description || "").toLowerCase();
  const cat = String(item.category_name || item.category || "").toLowerCase();
  const tags = String(item.tags || item.tag || "").toLowerCase();

  const keywords = [
    "fruit",
    "shisha",
    "shesha",
    "hookah",
    "apple",
    "mint",
    "grape",
    "coal",
    "watermelon",
    "juice",
    "smoothie",
    "platter",
    "lemon",
    "orange",
    "banana",
    "mango",
    "pineapple",
    "strawberry",
    "kiwi",
    "salad",
  ];

  return keywords.some((kw) => name.includes(kw) || cat.includes(kw) || tags.includes(kw));
}

// Helper: Parse items from an order
function parseOrderItems(order) {
  if (!order) return [];
  let raw = order.items || order.order_items || order.products || [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw;
  }
  if (order.items_summary) {
    return [{ product_name: order.items_summary, quantity: 1 }];
  }
  return [];
}

// Helper: Format elapsed time
function getElapsedTime(timestamp) {
  if (!timestamp) return "-";
  const start = new Date(timestamp);
  if (isNaN(start.getTime())) return "-";
  const now = new Date();
  const diffMinutes = Math.floor((now - start) / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ${diffMinutes % 60}m ago`;
}

export default function FruitOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // "active" | "pending" | "preparing" | "ready" | "completed" | "all"
  const [onlyFruitShisha, setOnlyFruitShisha] = useState(true);
  const [search, setSearch] = useState("");
  const [alertOrder, setAlertOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const prevOrdersRef = useRef(null);

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError("");

      const response = await api("/kitchen");
      const orderList =
        response.orders ||
        response.data?.orders ||
        response.data ||
        (Array.isArray(response) ? response : []);

      if (prevOrdersRef.current !== null && soundEnabled) {
        const newOrder = orderList.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" ||
              o.status?.toLowerCase() === "new" ||
              o.status?.toLowerCase() === "confirmed") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newOrder) {
          // Check if this new order has fruit/shisha items
          const items = parseOrderItems(newOrder);
          const hasFruitItem = items.some(isFruitOrShishaItem);
          if (hasFruitItem || !onlyFruitShisha) {
            audioService.playNewOrderSound();
            setAlertOrder(newOrder);
          }
        }
      }

      prevOrdersRef.current = orderList;
      setOrders(orderList);
    } catch (err) {
      console.error("Failed to fetch fruit orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => fetchOrders(false), 4000);
    return () => clearInterval(timer);
  }, [soundEnabled, onlyFruitShisha]);

  // Handle status transitions
  const handleUpdateStatus = async (order, nextStatus) => {
    if (!order) return;
    try {
      setActionLoadingId(order.id);
      setError("");

      await api(`/kitchen/${order.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      await fetchOrders(false);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err.message || "Failed to update order status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const items = parseOrderItems(o);

      // 1. Station relevance filter
      if (onlyFruitShisha) {
        const hasFruitOrShisha = items.some(isFruitOrShishaItem);
        if (!hasFruitOrShisha) return false;
      }

      // 2. Status filter
      const st = String(o.status || "").toLowerCase();
      if (statusFilter === "active") {
        if (st === "completed" || st === "served" || st === "cancelled") return false;
      } else if (statusFilter === "pending") {
        if (st !== "pending" && st !== "new" && st !== "confirmed") return false;
      } else if (statusFilter === "preparing") {
        if (st !== "preparing") return false;
      } else if (statusFilter === "ready") {
        if (st !== "ready") return false;
      } else if (statusFilter === "completed") {
        if (st !== "completed" && st !== "served") return false;
      }

      // 3. Text search
      if (search.trim()) {
        const s = search.toLowerCase();
        const table = String(o.table_number || o.table_id || "").toLowerCase();
        const orderNum = String(o.order_number || o.id || "").toLowerCase();
        const waiter = String(o.waiter_name || o.waiter_first_name || "").toLowerCase();
        const itemMatch = items.some((it) =>
          String(it.product_name || it.name || "").toLowerCase().includes(s)
        );

        if (!table.includes(s) && !orderNum.includes(s) && !waiter.includes(s) && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, onlyFruitShisha, statusFilter, search]);

  // Statistics counters
  const stats = useMemo(() => {
    let pendingCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let totalFruitOrders = 0;

    orders.forEach((o) => {
      const items = parseOrderItems(o);
      const hasFruit = items.some(isFruitOrShishaItem);
      if (!hasFruit && onlyFruitShisha) return;

      totalFruitOrders++;
      const st = String(o.status || "").toLowerCase();
      if (st === "pending" || st === "new" || st === "confirmed") pendingCount++;
      else if (st === "preparing") preparingCount++;
      else if (st === "ready") readyCount++;
    });

    return { pendingCount, preparingCount, readyCount, totalFruitOrders };
  }, [orders, onlyFruitShisha]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* NEW ORDER MODAL ALERT */}
      {alertOrder && (
        <NewOrderAlertModal
          order={alertOrder}
          onClose={() => setAlertOrder(null)}
          title="🍉 New Fruit & Shisha Order!"
        />
      )}

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20 text-white font-bold">
              🍉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Fruit & Shisha Station
                </h1>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold">
                  LIVE KDS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fruit Manager Live Queue • Shisha, Fresh Fruit Platters & Juices
              </p>
            </div>
          </div>

          {/* QUICK CONTROLS */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* SOUND TOGGLE */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                soundEnabled
                  ? "bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-slate-700"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              }`}
              title={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? "Sound On" : "Muted"}</span>
            </button>

            {/* FRUIT & SHISHA ONLY FILTER TOGGLE */}
            <button
              onClick={() => setOnlyFruitShisha((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                onlyFruitShisha
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Filter size={15} />
              <span>{onlyFruitShisha ? "Fruit & Shisha Only" : "All Orders"}</span>
            </button>

            {/* REFRESH */}
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin text-orange-400" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* STATUS COUNTER KPI BAR */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => setStatusFilter("pending")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              statusFilter === "pending"
                ? "bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                New / Pending
              </span>
              <span className="text-xl font-black text-amber-300">
                {stats.pendingCount}
              </span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("preparing")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              statusFilter === "preparing"
                ? "bg-blue-500/20 border-blue-500/50 shadow-md shadow-blue-500/10"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                In Preparation
              </span>
              <span className="text-xl font-black text-blue-300">
                {stats.preparingCount}
              </span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("ready")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              statusFilter === "ready"
                ? "bg-emerald-500/20 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Ready for Pickup
              </span>
              <span className="text-xl font-black text-emerald-300">
                {stats.readyCount}
              </span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("active")}
            className={`cursor-pointer rounded-xl border p-3 transition ${
              statusFilter === "active"
                ? "bg-orange-500/20 border-orange-500/50 shadow-md shadow-orange-500/10"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-orange-400" />
                Total Active
              </span>
              <span className="text-xl font-black text-white">
                {stats.pendingCount + stats.preparingCount + stats.readyCount}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* FILTER TABS & SEARCH */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* TAB BUTTONS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "active", label: "Active Queue" },
              { id: "pending", label: "New Orders" },
              { id: "preparing", label: "Preparing" },
              { id: "ready", label: "Ready" },
              { id: "completed", label: "History" },
              { id: "all", label: "All" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table, item, waiter..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 my-3">
          <div className="flex items-center gap-2 rounded-xl bg-red-950/70 border border-red-800 p-3 text-sm text-red-200">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ORDERS GRID */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw size={32} className="animate-spin text-orange-500 mb-3" />
            <p className="text-sm font-medium">Loading Fruit & Shisha orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-20 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-3xl mb-4">
              🍉
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              No Orders in This View
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {search
                ? `No orders matching "${search}". Try clearing your search.`
                : statusFilter === "pending"
                ? "All caught up! No pending Fruit or Shisha orders waiting to prepare."
                : "There are currently no orders under this status."}
            </p>
            {(search || statusFilter !== "active") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("active");
                }}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const items = parseOrderItems(order);
              const status = String(order.status || "pending").toLowerCase();
              const isPending = status === "pending" || status === "new" || status === "confirmed";
              const isPreparing = status === "preparing";
              const isReady = status === "ready";
              const isCompleted = status === "completed" || status === "served";
              const isUpdating = actionLoadingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl border transition shadow-xl ${
                    isPending
                      ? "border-amber-500/40 bg-slate-900/90 hover:border-amber-500/70"
                      : isPreparing
                      ? "border-blue-500/40 bg-slate-900/90 hover:border-blue-500/70"
                      : isReady
                      ? "border-emerald-500/40 bg-slate-900/90 hover:border-emerald-500/70"
                      : "border-slate-800 bg-slate-900/50 opacity-70"
                  }`}
                >
                  {/* CARD HEADER */}
                  <div className="border-b border-slate-800/80 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-md ${
                            isPending
                              ? "bg-amber-500 text-slate-950 shadow-amber-500/20"
                              : isPreparing
                              ? "bg-blue-500 text-white shadow-blue-500/20"
                              : isReady
                              ? "bg-emerald-500 text-white shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {order.table_number || (order.table_id ? `T-${order.table_id}` : "POS")}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-base leading-tight">
                            {order.table_number ? `Table ${order.table_number}` : "Walk-in / Bar"}
                          </h3>
                          <p className="text-xs text-slate-400">
                            #{order.order_number || String(order.id).padStart(4, "0")} • {order.waiter_name || "Staff"}
                          </p>
                        </div>
                      </div>

                      {/* STATUS BADGE */}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                          isPending
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : isPreparing
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : isReady
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {getElapsedTime(order.created_at || order.started_at)}
                      </span>
                      {order.order_type && (
                        <span className="capitalize bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {order.order_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ITEMS LIST */}
                  <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-64">
                    {items.map((item, idx) => {
                      const isSpecialFruit = isFruitOrShishaItem(item);
                      const itemName = item.product_name || item.name || "Item";

                      return (
                        <div
                          key={idx}
                          className={`flex items-start justify-between gap-3 rounded-xl p-2.5 transition ${
                            isSpecialFruit
                              ? "bg-slate-800/70 border border-orange-500/20"
                              : "bg-slate-800/30 border border-slate-800/60"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/20 text-orange-400 font-black text-xs border border-orange-500/30">
                              {item.quantity || 1}x
                            </span>
                            <div>
                              <p className="font-bold text-sm text-slate-100 leading-snug">
                                {itemName}
                              </p>
                              {item.item_notes && (
                                <p className="text-xs text-amber-400/90 font-medium italic mt-0.5">
                                  Note: {item.item_notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSpecialFruit && (
                            <span className="shrink-0 rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/30">
                              {itemName.toLowerCase().includes("shisha") || itemName.toLowerCase().includes("hookah")
                                ? "💨 Shisha"
                                : "🍉 Fruit"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="border-t border-slate-800/80 p-4 bg-slate-900/60 rounded-b-2xl">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(order, "preparing")}
                        disabled={isUpdating}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition disabled:opacity-60"
                      >
                        {isUpdating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Flame size={16} />
                        )}
                        <span>Start Preparing</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleUpdateStatus(order, "ready")}
                        disabled={isUpdating}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-60"
                      >
                        {isUpdating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        <span>Mark Ready (Notify Waiter)</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleUpdateStatus(order, "completed")}
                        disabled={isUpdating}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm font-bold text-emerald-400 transition disabled:opacity-60"
                      >
                        {isUpdating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        <span>Complete / Served</span>
                      </button>
                    )}

                    {isCompleted && (
                      <div className="text-center py-1 text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Order Fulfilled</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
