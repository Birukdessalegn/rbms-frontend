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

  // Order Rejection / Customer Refusal Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState("Customer refused order at table");
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
          : rejectReasonPreset || customRejectReason.trim() || "Customer refused order at table";

      await api(`/kitchen/${rejectModalOrder.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: "cancelled",
          reason: finalReason,
        }),
      });

      setRejectModalOrder(null);
      setCustomRejectReason("");
      setRejectReasonPreset("Customer refused order at table");
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
      } else if (statusFilter === "completed") {
        if (st !== "completed" && st !== "served" && st !== "cancelled" && st !== "rejected") return false;
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

    return { pendingCount, preparingCount, readyCount, totalFruitOrders };
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* NEW ORDER MODAL ALERT */}
      {alertOrder && (
        <NewOrderAlertModal
          order={alertOrder}
          onClose={() => setAlertOrder(null)}
          title="🍉 New Fruit Order!"
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
                  Fruit Station
                </h1>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold">
                  LIVE KDS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fruit Manager Live Queue • Fresh Fruit Platters & Juices
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

            {/* FRUIT ONLY FILTER TOGGLE */}
            <button
              onClick={() => setOnlyFruit((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                onlyFruit
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Filter size={15} />
              <span>{onlyFruit ? "Fruit Only" : "All Orders"}</span>
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

        {/* DYNAMIC KPI STATS BAR (ORDERS vs FRUIT PRODUCTS) */}
        {mainSectionTab === "orders" ? (
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
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              onClick={() => setProductStockFilter("all")}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                productStockFilter === "all"
                  ? "bg-orange-500/20 border-orange-500/50 shadow-md shadow-orange-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-orange-400 flex items-center gap-1.5">
                  <Apple size={14} />
                  Fruit Catalog
                </span>
                <span className="text-xl font-black text-white">
                  {productStats.total}
                </span>
              </div>
            </div>

            <div
              onClick={() => setProductStockFilter("in_stock")}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                productStockFilter === "in_stock"
                  ? "bg-emerald-500/20 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  In Stock
                </span>
                <span className="text-xl font-black text-emerald-300">
                  {productStats.inStock}
                </span>
              </div>
            </div>

            <div
              onClick={() => setProductStockFilter("low_stock")}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                productStockFilter === "low_stock"
                  ? "bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Low Stock
                </span>
                <span className="text-xl font-black text-amber-300">
                  {productStats.lowStock}
                </span>
              </div>
            </div>

            <div
              onClick={() => setProductStockFilter("out_of_stock")}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                productStockFilter === "out_of_stock"
                  ? "bg-rose-500/20 border-rose-500/50 shadow-md shadow-rose-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Out of Stock
                </span>
                <span className="text-xl font-black text-rose-300">
                  {productStats.outOfStock}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* SECTION TABS SWITCHER */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setMainSectionTab("orders")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition cursor-pointer ${
              mainSectionTab === "orders"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <span>🍉</span>
            <span>Active Fruit Orders</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              mainSectionTab === "orders" ? "bg-white/25 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {stats.totalFruitOrders}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSectionTab("products")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition cursor-pointer ${
              mainSectionTab === "products"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Apple size={16} className={mainSectionTab === "products" ? "text-white" : "text-amber-400"} />
            <span>Fruit Products & Sub-Store Stock</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              mainSectionTab === "products" ? "bg-white/25 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {fruitProducts.length}
            </span>
          </button>
        </div>
      </div>

      {/* INCOMING STOCK DELIVERIES (CONFIRM RECEIPT) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-3">
        <IncomingDeliveryBanner
          department="fruit"
          onReceived={() => fetchOrders(false)}
        />
      </div>

      {/* CONDITIONAL MAIN CONTENT: ORDERS vs REGISTERED PRODUCTS */}
      {mainSectionTab === "orders" ? (
        <>
          {/* FILTER TABS & SEARCH FOR ORDERS */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* TAB BUTTONS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "active", label: "Active Queue" },
                  { id: "pending", label: "New Orders" },
                  { id: "preparing", label: "Preparing" },
                  { id: "ready", label: "Ready" },
                  { id: "completed", label: "History & Refused" },
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
                <p className="text-sm font-medium">Loading Fruit orders...</p>
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
                    ? "All caught up! No pending Fruit orders waiting to prepare."
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
                  const isCancelled = status === "cancelled" || status === "rejected";
                  const isUpdating = actionLoadingId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`flex flex-col justify-between rounded-2xl border transition shadow-xl ${
                        isCancelled
                          ? "border-rose-900/50 bg-slate-900/60 opacity-80"
                          : isPending
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
                                isCancelled
                                  ? "bg-rose-950 text-rose-300 border border-rose-800/60 shadow-rose-950/40"
                                  : isPending
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
                              isCancelled
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : isPending
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : isPreparing
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : isReady
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isCancelled ? "REFUSED / REJECTED" : status}
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

                      {/* ITEMS LIST (ONLY FRUIT ITEMS) */}
                      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-64">
                        {(onlyFruit ? items.filter(isFruitItem) : items).map((item, idx) => {
                          const isSpecialFruit = isFruitItem(item);
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
                                  🍉 Fruit
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ORDER / REFUSAL NOTES */}
                      {order.notes && (
                        <div className="mx-4 mb-3 rounded-xl bg-rose-950/30 border border-rose-800/40 p-2.5 text-xs text-rose-200 flex items-start gap-2">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                          <span className="font-medium leading-relaxed">{order.notes}</span>
                        </div>
                      )}

                      {/* ACTION CONTROLS */}
                      <div className="border-t border-slate-800/80 p-4 bg-slate-900/60 rounded-b-2xl">
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order, "preparing")}
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Flame size={16} />
                              )}
                              <span>Start Preparing</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalOrder(order);
                                setRejectReasonPreset("Customer refused order at table");
                                setCustomRejectReason("");
                              }}
                              disabled={isUpdating}
                              title="Customer refused or reject order"
                              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition text-xs font-black flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                            >
                              <Ban size={15} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {isPreparing && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order, "ready")}
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              <span>Mark Ready</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalOrder(order);
                                setRejectReasonPreset("Customer refused order at table");
                                setCustomRejectReason("");
                              }}
                              disabled={isUpdating}
                              title="Customer refused or reject order"
                              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition text-xs font-black flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                            >
                              <Ban size={15} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {isReady && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order, "completed")}
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 text-sm font-bold text-emerald-400 transition disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                              <span>Complete / Served</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalOrder(order);
                                setRejectReasonPreset("Customer refused order upon delivery");
                                setCustomRejectReason("");
                              }}
                              disabled={isUpdating}
                              title="Customer refused or reject order"
                              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition text-xs font-black flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                            >
                              <Ban size={15} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="text-center py-1 text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span>Order Fulfilled</span>
                          </div>
                        )}

                        {isCancelled && (
                          <div className="text-center py-1.5 text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 bg-rose-950/40 rounded-xl border border-rose-900/50">
                            <Ban size={14} className="text-rose-500 shrink-0" />
                            <span>Order Refused & Cancelled (Stock Restored)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      ) : (
        /* ======================================================
            REGISTERED FRUIT PRODUCTS & SUB-STORE STOCK VIEW
        ====================================================== */
        <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-12 space-y-6">
          {/* SEARCH & STATUS FILTER ROW */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
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
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      productStockFilter === tab.id ? "bg-white/25 text-white" : "bg-slate-900 text-slate-400"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}

              {/* Floating Dropdown for Fruit Products */}
              {productSearch.trim() && (
                <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50 p-1 divide-y divide-slate-800">
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
                        className="w-full flex items-center justify-between p-2 text-left hover:bg-slate-800 rounded-lg transition group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-white group-hover:text-orange-400 truncate transition">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.category_name || "Fruit"} • {p.current_stock || 0} in stock
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
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
              <RefreshCw size={32} className="animate-spin text-orange-500 mb-3" />
              <p className="text-sm font-medium">Loading fruit products and stock...</p>
            </div>
          ) : filteredFruitProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 py-20 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 text-3xl mb-4 border border-amber-500/20">
                <Apple size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                No Fruit Products Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
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
                  className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
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
                    className={`rounded-3xl border transition flex flex-col justify-between overflow-hidden shadow-lg backdrop-blur-xs ${
                      isOut
                        ? "border-rose-900/60 bg-rose-950/15 hover:border-rose-700/60"
                        : isLow
                        ? "border-amber-900/60 bg-amber-950/15 hover:border-amber-700/60"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    {/* TOP PART: IMAGE & BADGES */}
                    <div>
                      <div className="relative h-44 w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-slate-800/80">
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
                          className="h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-950/30 to-orange-950/30 text-amber-500/70"
                        >
                          <Apple size={44} />
                          <span className="text-[10px] font-bold text-slate-500 mt-1">Fresh Fruit</span>
                        </div>

                        {/* FLOATING CATEGORY BADGE */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-sm">
                          <span>🍉</span>
                          <span className="truncate max-w-[120px]">{p.category_name || "Fruit"}</span>
                        </div>

                        {/* FLOATING PRICE BADGE */}
                        <div className="absolute top-2.5 right-2.5 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 px-2.5 py-0.5 text-xs font-black text-emerald-300 shadow-sm">
                          ETB {priceFormatted}
                        </div>
                      </div>

                      {/* DETAILS & TITLE */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-extrabold text-sm text-white line-clamp-1" title={p.name}>
                            {p.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 line-clamp-1">
                            {p.tags || p.description || p.category_name || "Fruit Station Item"}
                          </p>
                        </div>

                        {/* SUB-STORE STOCK PILL */}
                        <div
                          className={`rounded-2xl border p-2.5 flex items-center justify-between ${
                            isOut
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              : isLow
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isOut ? (
                              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                            ) : isLow ? (
                              <AlertCircle size={16} className="text-amber-400 shrink-0" />
                            ) : (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            )}
                            <div>
                              <div className="text-[11px] font-extrabold leading-tight">
                                {isOut ? "Out of Stock" : isLow ? "Low Stock Alert" : "In Stock"}
                              </div>
                              <div className="text-[10px] opacity-80">
                                {isOut
                                  ? "0 available in Fruit Store"
                                  : `${p.currentStock} ${p.unit} in Fruit Store`}
                              </div>
                            </div>
                          </div>
                          {isLow && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
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
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-3 py-2.5 text-xs font-black text-white shadow-md shadow-orange-600/20 transition active:scale-98 cursor-pointer"
                      >
                        <Truck size={14} />
                        <span>Request Restock from Warehouse</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* REJECT / CUSTOMER REFUSAL MODAL */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl shadow-rose-950/40 text-slate-100">
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!rejectLoading) {
                  setRejectModalOrder(null);
                  setCustomRejectReason("");
                }
              }}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10">
                <Ban size={24} />
              </div>
              <div className="flex-1 pr-6">
                <h2 className="text-lg font-black text-white">
                  Reject / Refused Order
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer refused order or fruit items cannot be served.
                </p>
              </div>
            </div>

            {/* ORDER DETAILS SUMMARY */}
            <div className="mt-5 rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Order:</span>
                <span className="font-extrabold text-white">
                  #{rejectModalOrder.order_number || rejectModalOrder.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Location:</span>
                <span className="font-bold text-amber-400">
                  {rejectModalOrder.table_number ? `Table ${rejectModalOrder.table_number}` : "Walk-in / Bar"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Waiter:</span>
                <span className="font-medium text-slate-300">
                  {rejectModalOrder.waiter_name || "Staff"}
                </span>
              </div>

              {/* ITEMS PREVIEW */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Items to Cancel & Restore:
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {parseOrderItems(rejectModalOrder).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                      <span>• {item.quantity || 1}x {item.product_name || item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SELECT REFUSAL REASON */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Select Refusal / Rejection Reason:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Customer refused order at table",
                  "Customer changed mind / Left",
                  "Customer waited too long",
                  "Fruit ingredients unavailable / Damaged",
                  "Other reason",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      rejectReasonPreset === reason
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-200 font-bold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refusal_reason"
                      value={reason}
                      checked={rejectReasonPreset === reason}
                      onChange={() => setRejectReasonPreset(reason)}
                      className="text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"
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
                    placeholder="Type custom refusal reason..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* NOTICE */}
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2 text-[11px] text-amber-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                Rejecting removes this ticket from the active queue, restores inventory stock, and marks the order as refused in history.
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
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition active:scale-98 disabled:opacity-60"
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
