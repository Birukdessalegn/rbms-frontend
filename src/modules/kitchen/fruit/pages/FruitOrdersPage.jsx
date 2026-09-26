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
  Apple,
  Package,
  Truck,
  AlertTriangle,
  Tag,
  ArrowUpRight,
  X,
  Ban,
} from "lucide-react";
import api from "../../../../services/api";
import audioService from "../../../../services/audioService";
import NewOrderAlertModal from "../../../../components/common/NewOrderAlertModal";
import IncomingDeliveryBanner from "../../../../components/common/IncomingDeliveryBanner";
import StockRequestModal from "../../../inventory/components/StockRequestModal";

// Helper: Format product image URL
function formatImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const cleanBase = baseUrl.replace(/\/api\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

// Helper: Check if an item belongs strictly to Fruit station / category
function isFruitItem(item) {
  if (!item) return false;
  const name = String(item.product_name || item.name || item.description || "").toLowerCase().trim();
  const cat = String(item.category_name || item.category || "").toLowerCase().trim();
  const catType = String(item.category_type || "").toLowerCase().trim();
  const tags = String(item.tags || item.tag || "").toLowerCase().trim();

  // 1. Strict Exclusions: Exclude standard kitchen food and bar categories
  const nonFruitExclusions = [
    "burger", "pizza", "fast food", "main dish", "pasta", "meat", "steak",
    "chicken", "beef", "pork", "soup", "sandwich", "bakery", "bread",
    "hot dish", "side dish", "breakfast", "appetizer", "beer", "wine",
    "whiskey", "vodka", "gin", "spirit", "liquor", "cocktail"
  ];
  if (nonFruitExclusions.some((ex) => cat.includes(ex) || catType.includes(ex))) {
    // If categorized under a non-fruit food or bar category, reject unless specifically containing "fruit"
    if (!name.includes("fruit") && !tags.includes("fruit")) {
      return false;
    }
  }

  // 2. Direct Fruit category / category_type / tag match
  if (
    cat === "fruit" ||
    catType === "fruit" ||
    cat.includes("fruit") ||
    tags.includes("fruit")
  ) {
    return true;
  }

  // 3. Specifically fruit items / juices / smoothies (avoid generic words like "salad" or "platter")
  const fruitKeywords = [
    "fruit",
    "watermelon",
    "apple",
    "orange",
    "banana",
    "mango",
    "pineapple",
    "strawberry",
    "grape",
    "kiwi",
    "avocado",
    "lemon",
    "fruit platter",
    "fruit salad",
    "fruit juice",
    "smoothie",
    "shisha",
    "hookah"
  ];

  return fruitKeywords.some((kw) => name.includes(kw) || tags.includes(kw));
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
  const [products, setProducts] = useState([]);
  const [fruitStockList, setFruitStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mainSectionTab, setMainSectionTab] = useState("orders"); // "orders" | "products"
  const [statusFilter, setStatusFilter] = useState("active"); // "active" | "pending" | "preparing" | "ready" | "completed" | "all"
  const [onlyFruit, setOnlyFruit] = useState(true);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productStockFilter, setProductStockFilter] = useState("all"); // "all" | "in_stock" | "low_stock" | "out_of_stock"
  const [alertOrder, setAlertOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);

  // Fruit Manager Order Rejection Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState("Fruit ingredients unavailable / Out of stock");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const prevOrdersRef = useRef(null);

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError("");

      const [kitchenRes, prodRes, stockRes] = await Promise.all([
        api("/kitchen").catch(() => []),
        api("/products").catch(() => []),
        api("/inventory/departments/fruit").catch(() => api("/inventory/multi-location").catch(() => [])),
      ]);

      const orderList =
        kitchenRes?.orders ||
        kitchenRes?.data?.orders ||
        kitchenRes?.data ||
        (Array.isArray(kitchenRes) ? kitchenRes : []);

      const fetchedProducts =
        prodRes?.products ||
        prodRes?.data ||
        (Array.isArray(prodRes) ? prodRes : []);
      setProducts(fetchedProducts);

      const fetchedStock = Array.isArray(stockRes)
        ? stockRes
        : (stockRes?.inventory || stockRes?.data || []);
      setFruitStockList(fetchedStock);

      if (prevOrdersRef.current !== null && soundEnabled) {
        const newOrder = orderList.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" ||
              o.status?.toLowerCase() === "new" ||
              o.status?.toLowerCase() === "confirmed") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newOrder) {
          // Check if this new order has fruit items
          const items = parseOrderItems(newOrder);
          const hasFruitItem = items.some(isFruitItem);
          if (hasFruitItem || !onlyFruit) {
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
  }, [soundEnabled, onlyFruit]);

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

  // Handle customer rejection of the order
  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    try {
      setRejectLoading(true);
      setError("");

      const finalReason =
        rejectReasonPreset === "Other reason" && customRejectReason.trim()
          ? customRejectReason.trim()
          : rejectReasonPreset || customRejectReason.trim() || "Rejected by Fruit Manager";

      await api(`/kitchen/${rejectModalOrder.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: "cancelled",
          reason: finalReason,
        }),
      });

      setRejectModalOrder(null);
      setCustomRejectReason("");
      setRejectReasonPreset("Fruit ingredients unavailable / Out of stock");
      await fetchOrders(false);
    } catch (err) {
      console.error("Failed to reject order:", err);
      setError(err.message || "Failed to reject order");
    } finally {
      setRejectLoading(false);
    }
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const items = parseOrderItems(o);

      // 1. Station relevance filter
      if (onlyFruit) {
        const hasFruit = items.some(isFruitItem);
        if (!hasFruit) return false;
      }

      // 2. Status filter
      const st = String(o.status || "").toLowerCase();
      if (statusFilter === "active") {
        if (st === "completed" || st === "served" || st === "cancelled" || st === "rejected") return false;
      } else if (statusFilter === "pending") {
        if (st !== "pending" && st !== "new" && st !== "confirmed") return false;
      } else if (statusFilter === "preparing") {
        if (st !== "preparing") return false;
      } else if (statusFilter === "ready") {
        if (st !== "ready") return false;
      } else if (statusFilter === "history" || statusFilter === "completed") {
        // Whole history of finished orders: both completed/served and rejected/cancelled
        if (st !== "completed" && st !== "served" && st !== "cancelled" && st !== "rejected") return false;
      } else if (statusFilter === "rejected") {
        // Specifically orders rejected by the Fruit Manager
        if (st !== "cancelled" && st !== "rejected") return false;
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
  }, [orders, onlyFruit, statusFilter, search]);

  // Statistics counters for orders
  const stats = useMemo(() => {
    let pendingCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let totalFruitOrders = 0;

    orders.forEach((o) => {
      const items = parseOrderItems(o);
      const hasFruit = items.some(isFruitItem);
      if (!hasFruit && onlyFruit) return;

      totalFruitOrders++;
      const st = String(o.status || "").toLowerCase();
      if (st === "pending" || st === "new" || st === "confirmed") pendingCount++;
      else if (st === "preparing") preparingCount++;
      else if (st === "ready") readyCount++;
    });

    const activeCount = pendingCount + preparingCount + readyCount;
    return { pendingCount, preparingCount, readyCount, activeCount, totalFruitOrders };
  }, [orders, onlyFruit]);

  // Compute registered fruit products with live fruit stock
  const fruitProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const stockMap = new Map();
    (fruitStockList || []).forEach((s) => {
      const pid = s.product_id || s.productId || s.id;
      if (pid) stockMap.set(Number(pid), s);
      const pName = (s.product_name || s.name || "").toLowerCase().trim();
      if (pName) stockMap.set(pName, s);
    });

    return products
      .filter((p) => {
        if (p.applicable_for === "inventory") return false;
        if (p.menu_type === "employee") return false;
        return isFruitItem(p);
      })
      .map((p) => {
        const stockInfo = stockMap.get(Number(p.id)) || stockMap.get((p.name || "").toLowerCase().trim());
        const rawQty = stockInfo
          ? (stockInfo.fruit_quantity !== undefined ? stockInfo.fruit_quantity : stockInfo.quantity)
          : 0;
        const currentStock = Number(rawQty || 0);

        const minStock = Number(
          stockInfo?.fruit_minimum_stock ??
          stockInfo?.minimum_stock ??
          p.fruit_minimum_stock ??
          p.low_stock_threshold ??
          5
        );

        const outStock = Number(
          stockInfo?.fruit_out_of_stock_threshold ??
          stockInfo?.out_of_stock_threshold ??
          p.fruit_out_of_stock_threshold ??
          p.out_of_stock_threshold ??
          0
        );

        let stockStatus = "in_stock";
        if (currentStock <= outStock) {
          stockStatus = "out_of_stock";
        } else if (currentStock <= minStock) {
          stockStatus = "low_stock";
        }

        return {
          ...p,
          product_id: p.id,
          currentStock,
          minStock,
          outStock,
          stockStatus,
          unit: p.unit || "pcs",
          imageUrl: formatImageUrl(p.image || p.image_url || p.imageUrl),
        };
      });
  }, [products, fruitStockList]);

  // Filtered fruit products based on search & stock status filter
  const filteredFruitProducts = useMemo(() => {
    return fruitProducts.filter((p) => {
      if (productStockFilter !== "all" && p.stockStatus !== productStockFilter) {
        return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const name = String(p.name || p.product_name || "").toLowerCase();
        const cat = String(p.category_name || p.category || "").toLowerCase();
        const tags = String(p.tags || p.tag || "").toLowerCase();
        if (!name.includes(q) && !cat.includes(q) && !tags.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [fruitProducts, productStockFilter, productSearch]);

  // Summary statistics for fruit products
  const productStats = useMemo(() => {
    const total = fruitProducts.length;
    const inStock = fruitProducts.filter((p) => p.stockStatus === "in_stock").length;
    const lowStock = fruitProducts.filter((p) => p.stockStatus === "low_stock").length;
    const outOfStock = fruitProducts.filter((p) => p.stockStatus === "out_of_stock").length;
    return { total, inStock, lowStock, outOfStock };
  }, [fruitProducts]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* NEW ORDER MODAL ALERT */}
      {alertOrder && (
        <NewOrderAlertModal
          order={alertOrder}
          onClose={() => setAlertOrder(null)}
          title="🍉 New Fruit Order!"
        />
      )}

      {/* TOP HEADER CARD */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-xl shadow-md shadow-amber-500/20">
            🍉
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Fruit Station
              </h1>
              <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                LIVE KDS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fruit Preparation Queue • Fresh Fruit Platters, Bowls & Juices
            </p>
          </div>
        </div>

        {/* QUICK CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* SOUND TOGGLE */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition border cursor-pointer ${
              soundEnabled
                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>

          {/* REFRESH */}
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-amber-500" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC KPI STATS BAR (ORDERS vs FRUIT PRODUCTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mainSectionTab === "orders" ? (
          <>
            <div
              onClick={() => setStatusFilter("pending")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                statusFilter === "pending"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                New / Pending
              </span>
              <p className="mt-1 text-2xl font-black text-amber-600">{stats.pendingCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter("preparing")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                statusFilter === "preparing"
                  ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                In Preparation
              </span>
              <p className="mt-1 text-2xl font-black text-blue-600">{stats.preparingCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter("ready")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                statusFilter === "ready"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Ready for Pickup
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-600">{stats.readyCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter("active")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                statusFilter === "active"
                  ? "bg-orange-50 border-orange-400 ring-2 ring-orange-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-orange-500" />
                Total Active
              </span>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {stats.pendingCount + stats.preparingCount + stats.readyCount}
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              onClick={() => setProductStockFilter("all")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                productStockFilter === "all"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Apple size={14} className="text-amber-500" />
                Fruit Catalog
              </span>
              <p className="mt-1 text-2xl font-black text-slate-900">{productStats.total}</p>
            </div>

            <div
              onClick={() => setProductStockFilter("in_stock")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                productStockFilter === "in_stock"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                In Stock
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-600">{productStats.inStock}</p>
            </div>

            <div
              onClick={() => setProductStockFilter("low_stock")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                productStockFilter === "low_stock"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-500" />
                Low Stock
              </span>
              <p className="mt-1 text-2xl font-black text-amber-600">{productStats.lowStock}</p>
            </div>

            <div
              onClick={() => setProductStockFilter("out_of_stock")}
              className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                productStockFilter === "out_of_stock"
                  ? "bg-rose-50 border-rose-400 ring-2 ring-rose-400/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500" />
                Out of Stock
              </span>
              <p className="mt-1 text-2xl font-black text-rose-600">{productStats.outOfStock}</p>
            </div>
          </>
        )}
      </div>

      {/* SECTION TABS SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setMainSectionTab("orders")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            mainSectionTab === "orders"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <span>🍉</span>
          <span>Active Fruit Orders</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
            mainSectionTab === "orders" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {stats.activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainSectionTab("products")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            mainSectionTab === "products"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Apple size={16} className={mainSectionTab === "products" ? "text-white" : "text-amber-500"} />
          <span>Fruit Products & Sub-Store Stock</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
            mainSectionTab === "products" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {fruitProducts.length}
          </span>
        </button>
      </div>

      {/* INCOMING STOCK DELIVERIES (CONFIRM RECEIPT) */}
      <IncomingDeliveryBanner
        department="fruit"
        onReceived={() => fetchOrders(false)}
      />

      {/* CONDITIONAL MAIN CONTENT: ORDERS vs REGISTERED PRODUCTS */}
      {mainSectionTab === "orders" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          {/* FILTER TABS & SEARCH FOR ORDERS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            {/* TAB BUTTONS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "active", label: "Active Queue" },
                { id: "pending", label: "New Orders" },
                { id: "preparing", label: "Preparing" },
                { id: "ready", label: "Ready" },
                { id: "history", label: "Order History" },
                { id: "rejected", label: "Rejected Orders" },
                { id: "all", label: "All" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-amber-500 text-white shadow-xs font-black"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/20"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ORDERS GRID */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-amber-500 mb-2" />
              <p className="text-xs font-semibold">Loading Fruit orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl mb-3 text-amber-600">
                🍉
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mb-1">
                No Orders in This View
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {search
                  ? `No orders matching "${search}". Try clearing your search.`
                  : statusFilter === "pending"
                  ? "All caught up! No pending Fruit orders waiting to prepare."
                  : "There are currently no orders under this status."}
              </p>
              {(search || statusFilter !== "active") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("active");
                  }}
                  className="mt-3 rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const items = parseOrderItems(order);
                const status = String(order.status || "pending").toLowerCase();
                const isPending = status === "pending" || status === "new" || status === "confirmed";
                const isPreparing = status === "preparing";
                const isReady = status === "ready";
                const isCompleted = status === "completed" || status === "served";
                const isCancelled = status === "cancelled" || status === "rejected";
                const isUpdating = actionLoadingId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col justify-between rounded-2xl border transition shadow-xs hover:shadow-md ${
                      isCancelled
                        ? "border-rose-200 bg-rose-50/20 opacity-80"
                        : isPending
                        ? "border-amber-300 bg-white hover:border-amber-400"
                        : isPreparing
                        ? "border-blue-300 bg-white hover:border-blue-400"
                        : isReady
                        ? "border-emerald-300 bg-white hover:border-emerald-400"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* CARD HEADER */}
                    <div className="border-b border-slate-100 p-4 bg-slate-50/50 rounded-t-2xl">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-xs ${
                              isCancelled
                                ? "bg-rose-100 text-rose-800"
                                : isPending
                                ? "bg-amber-100 text-amber-800"
                                : isPreparing
                                ? "bg-blue-100 text-blue-800"
                                : isReady
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {order.table_number || (order.table_id ? `T-${order.table_id}` : "POS")}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm leading-tight">
                              {order.table_number ? `Table ${order.table_number}` : "Walk-in / Bar"}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              #{order.order_number || String(order.id).padStart(4, "0")} • {order.waiter_name || "Staff"}
                            </p>
                          </div>
                        </div>

                        {/* STATUS BADGE */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            isCancelled
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : isPending
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : isPreparing
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : isReady
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isCancelled ? "REJECTED" : status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} className="text-slate-400" />
                          {getElapsedTime(order.created_at || order.started_at)}
                        </span>
                        {order.order_type && (
                          <span className="capitalize bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">
                            {order.order_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ITEMS LIST (ONLY FRUIT ITEMS) */}
                    <div className="p-4 space-y-2 flex-1 overflow-y-auto max-h-60">
                      {(onlyFruit ? items.filter(isFruitItem) : items).map((item, idx) => {
                        const isSpecialFruit = isFruitItem(item);
                        const itemName = item.product_name || item.name || "Item";

                        return (
                          <div
                            key={idx}
                            className={`flex items-start justify-between gap-2.5 rounded-xl p-2.5 transition ${
                              isSpecialFruit
                                ? "bg-amber-50/50 border border-amber-200/70"
                                : "bg-slate-50 border border-slate-100"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 font-black text-[11px]">
                                {item.quantity || 1}x
                              </span>
                              <div>
                                <p className="font-bold text-xs text-slate-800 leading-snug">
                                  {itemName}
                                </p>
                                {item.item_notes && (
                                  <p className="text-[11px] text-amber-800 font-medium italic mt-0.5">
                                    Note: {item.item_notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isSpecialFruit && (
                              <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800">
                                🍉 Fruit
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ORDER / REFUSAL NOTES */}
                    {order.notes && (
                      <div className="mx-4 mb-3 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                        <span className="font-medium leading-relaxed">{order.notes}</span>
                      </div>
                    )}

                    {/* ACTION CONTROLS */}
                    <div className="border-t border-slate-100 p-3.5 bg-slate-50/50 rounded-b-2xl">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(order, "preparing")}
                            disabled={isUpdating}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2.5 text-xs font-black text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
                          >
                            {isUpdating ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Flame size={14} />
                            )}
                            <span>Start Preparing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalOrder(order);
                              setRejectReasonPreset("Fruit ingredients unavailable / Out of stock");
                              setCustomRejectReason("");
                            }}
                            disabled={isUpdating}
                            title="Fruit Manager: Reject Order"
                            className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            <Ban size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {isPreparing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(order, "ready")}
                            disabled={isUpdating}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2.5 text-xs font-black text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
                          >
                            {isUpdating ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>Mark Ready</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalOrder(order);
                              setRejectReasonPreset("Fruit ingredients unavailable / Out of stock");
                              setCustomRejectReason("");
                            }}
                            disabled={isUpdating}
                            title="Fruit Manager: Reject Order"
                            className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            <Ban size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {isReady && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(order, "completed")}
                            disabled={isUpdating}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-2.5 text-xs font-black text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
                          >
                            {isUpdating ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            <span>Complete / Served</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalOrder(order);
                              setRejectReasonPreset("Fruit ingredients unavailable / Out of stock");
                              setCustomRejectReason("");
                            }}
                            disabled={isUpdating}
                            title="Fruit Manager: Reject Order"
                            className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            <Ban size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="text-center py-1 text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Order Fulfilled</span>
                        </div>
                      )}

                      {isCancelled && (
                        <div className="text-center py-1.5 text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5 bg-rose-50 rounded-xl border border-rose-200">
                          <Ban size={14} className="text-rose-600 shrink-0" />
                          <span>Order Rejected & Cancelled (Stock Restored)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================
            REGISTERED FRUIT PRODUCTS & SUB-STORE STOCK VIEW
        ====================================================== */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          {/* SEARCH & STATUS FILTER ROW */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* FILTER BUTTONS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All Fruits", count: productStats.total },
                { id: "in_stock", label: "In Stock", count: productStats.inStock },
                { id: "low_stock", label: "Low Stock", count: productStats.lowStock },
                { id: "out_of_stock", label: "Out of Stock", count: productStats.outOfStock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductStockFilter(tab.id)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    productStockFilter === tab.id
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      productStockFilter === tab.id ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search fruit by name, category..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}

              {/* Floating Dropdown for Fruit Products */}
              {productSearch.trim() && (
                <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 p-1 divide-y divide-slate-100">
                  {filteredFruitProducts.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No matching fruit items</div>
                  ) : (
                    filteredFruitProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProductSearch(p.name);
                        }}
                        className="w-full flex items-center justify-between p-2 text-left hover:bg-slate-50 rounded-lg transition group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-amber-600 truncate transition">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {p.category_name || "Fruit"} • {p.current_stock || 0} in stock
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {Number(p.price || 0).toLocaleString()} ETB
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PRODUCTS GRID */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <RefreshCw size={32} className="animate-spin text-amber-500 mb-3" />
              <p className="text-sm font-medium">Loading fruit products and stock...</p>
            </div>
          ) : filteredFruitProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-2xl mb-3 border border-amber-200">
                <Apple size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No Fruit Products Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {productSearch || productStockFilter !== "all"
                  ? "No fruits match your active search or filter. Try clearing your search."
                  : "No products are currently registered under the Fruit category or tagged with fruit keywords."}
              </p>
              {(productSearch || productStockFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch("");
                    setProductStockFilter("all");
                  }}
                  className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFruitProducts.map((p) => {
                const isOut = p.stockStatus === "out_of_stock";
                const isLow = p.stockStatus === "low_stock";
                const priceFormatted = Number(p.price || 0).toLocaleString();

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border transition flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-white ${
                      isOut
                        ? "border-rose-200 bg-rose-50/20"
                        : isLow
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* TOP PART: IMAGE & BADGES */}
                    <div>
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-100">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextSibling;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: p.imageUrl ? "none" : "flex" }}
                          className="h-full w-full flex-col items-center justify-center bg-slate-50 text-amber-500"
                        >
                          <Apple size={40} className="text-amber-500/80" />
                          <span className="text-[10px] font-bold text-slate-400 mt-1">Fresh Fruit</span>
                        </div>

                        {/* FLOATING CATEGORY BADGE */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-xs">
                          <span>🍉</span>
                          <span className="truncate max-w-[120px]">{p.category_name || "Fruit"}</span>
                        </div>

                        {/* FLOATING PRICE BADGE */}
                        <div className="absolute top-2.5 right-2.5 rounded-lg bg-emerald-600 text-white px-2.5 py-0.5 text-xs font-bold shadow-xs">
                          ETB {priceFormatted}
                        </div>
                      </div>

                      {/* DETAILS & TITLE */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-1" title={p.name}>
                            {p.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                            {p.tags || p.description || p.category_name || "Fruit Station Item"}
                          </p>
                        </div>

                        {/* SUB-STORE STOCK PILL */}
                        <div
                          className={`rounded-xl border p-2.5 flex items-center justify-between ${
                            isOut
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : isLow
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isOut ? (
                              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                            ) : isLow ? (
                              <AlertCircle size={15} className="text-amber-600 shrink-0" />
                            ) : (
                              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                            )}
                            <div>
                              <div className="text-[11px] font-bold leading-tight">
                                {isOut ? "Out of Stock" : isLow ? "Low Stock Alert" : "In Stock"}
                              </div>
                              <div className="text-[10px] opacity-90">
                                {isOut
                                  ? "0 available in Fruit Store"
                                  : `${p.currentStock} ${p.unit} in Fruit Store`}
                              </div>
                            </div>
                          </div>
                          {isLow && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                              Min: {p.minStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ACTION BUTTON */}
                    <div className="px-4 pb-4 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRestockProduct(p);
                          setIsRestockModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-98 cursor-pointer"
                      >
                        <Truck size={14} />
                        <span>Request Restock</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REJECT / CUSTOMER REFUSAL MODAL */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!rejectLoading) {
                  setRejectModalOrder(null);
                  setCustomRejectReason("");
                }
              }}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* HEADER */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                <Ban size={22} />
              </div>
              <div className="flex-1 pr-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Reject Fruit Order
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fruit Manager rejection — cancels ticket and restores inventory stock.
                </p>
              </div>
            </div>

            {/* ORDER DETAILS SUMMARY */}
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Order:</span>
                <span className="font-bold text-slate-900">
                  #{rejectModalOrder.order_number || rejectModalOrder.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-amber-700">
                  {rejectModalOrder.table_number ? `Table ${rejectModalOrder.table_number}` : "Walk-in / Bar"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Waiter:</span>
                <span className="font-medium text-slate-700">
                  {rejectModalOrder.waiter_name || "Staff"}
                </span>
              </div>

              {/* ITEMS PREVIEW */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Items to Cancel & Restore:
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {parseOrderItems(rejectModalOrder).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                      <span>• {item.quantity || 1}x {item.product_name || item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SELECT REJECTION REASON */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Select Fruit Rejection Reason:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Fruit ingredients unavailable / Out of stock",
                  "Fruit quality compromised / Damaged",
                  "Customer cancelled or left table",
                  "Customer requested modification / re-order",
                  "Other reason",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      rejectReasonPreset === reason
                        ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejection_reason"
                      value={reason}
                      checked={rejectReasonPreset === reason}
                      onChange={() => setRejectReasonPreset(reason)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {/* CUSTOM REASON INPUT */}
              {rejectReasonPreset === "Other reason" && (
                <div className="mt-2">
                  <textarea
                    rows={2}
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Type custom rejection reason..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* NOTICE */}
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2 text-[11px] text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                Rejecting removes this ticket from the active queue, restores inventory stock, and logs the order under Rejected Orders.
              </span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOrder(null);
                  setCustomRejectReason("");
                }}
                disabled={rejectLoading}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectLoading}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {rejectLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <Ban size={14} />
                    <span>Confirm Order Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL FOR FRUIT SUB-STORE */}
      <StockRequestModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockProduct(null);
        }}
        onSuccess={() => fetchOrders(false)}
        initialProduct={restockProduct}
        initialDepartment="fruit"
      />
    </div>
  );
}
