import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Wine,
  BarChart3,
  ClipboardList,
  Flame,
  CheckCircle2,
  TrendingUp,
  Play,
  Check,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  Sparkles,
  Package,
  Droplets,
  GlassWater,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import api from "../../../services/api";
import audioService from "../../../services/audioService";
import NewOrderAlertModal from "../../../components/common/NewOrderAlertModal";
import { formatImageUrl, getCustomShotsMap } from "../../products/ProductsPage";

function BarPage() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [alertOrder, setAlertOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "list"
  const [mainSectionTab, setMainSectionTab] = useState("orders"); // "orders" | "inventory"
  const [barStockList, setBarStockList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const prevOrdersRef = useRef(null);

  // Sync tab with URL route if accessing /bar/new, /bar/preparing, etc.
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.endsWith("/new")) {
      setActiveTab("new");
    } else if (path.endsWith("/preparing")) {
      setActiveTab("preparing");
    } else if (path.endsWith("/ready")) {
      setActiveTab("ready");
    } else {
      setActiveTab("all");
    }
  }, [location.pathname]);

  // ============================================================
  // FETCH BAR ORDERS & PRODUCTS
  // ============================================================

  const fetchBarOrders = async () => {
    try {
      setError("");

      const [barRes, prodRes, barStockRes] = await Promise.all([
        api("/bar/orders").catch(() => []),
        api("/products").catch(() => api("/bar/inventory").catch(() => ([]))),
        api("/inventory/departments/bar").catch(() => api("/inventory/multi-location").catch(() => ([]))),
      ]);

      const fetchedDeptStock = Array.isArray(barStockRes)
        ? barStockRes
        : (barStockRes?.inventory || barStockRes?.data || []);
      setBarStockList(fetchedDeptStock);

      const fetchedOrders = barRes?.orders || barRes?.data || (Array.isArray(barRes) ? barRes : []);
      const fetchedProducts = prodRes?.products || prodRes?.data || (Array.isArray(prodRes) ? prodRes : []);
      if (fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
      }

      if (prevOrdersRef.current !== null) {
        // Detect new pending/new bar order
        const newBarOrder = fetchedOrders.find(
          (o) =>
            (o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "new") &&
            !prevOrdersRef.current.some((old) => old.id === o.id)
        );

        if (newBarOrder) {
          if (soundEnabled) {
            audioService.playNewOrderSound();
          }
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
      order.status === "confirmed" ||
      order.status === "new"
  ).length;

  const preparingOrders = orders.filter(
    (order) => order.status === "preparing" || order.status === "in_progress"
  ).length;

  const readyOrders = orders.filter(
    (order) => order.status === "ready"
  ).length;

  const displayedOrders = orders.filter((order) => {
    const s = (order.status || "").toLowerCase();
    if (activeTab === "new") return s === "pending" || s === "confirmed" || s === "new";
    if (activeTab === "preparing") return s === "preparing" || s === "in_progress";
    if (activeTab === "ready") return s === "ready";
    return true;
  });

  // Today's Orders Count
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((order) => {
    if (!order.created_at) return false;
    return new Date(order.created_at).toDateString() === today;
  }).length;

  // Image URL Formatter Helper
  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const cleanBase = baseUrl.replace(/\/api\/?$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  // Live Bar Drinks & Shot Level Computation
  const barDrinks = useMemo(() => {
    if (!Array.isArray(products)) return [];

    const barStockMap = new Map();
    (barStockList || []).forEach((item) => {
      const pid = item.product_id || item.productId || item.id;
      if (pid) {
        barStockMap.set(Number(pid), Number(item.bar_quantity !== undefined ? item.bar_quantity : item.quantity || 0));
      }
      const pName = (item.product_name || item.name || "").toLowerCase().trim();
      if (pName) {
        barStockMap.set(pName, Number(item.bar_quantity !== undefined ? item.bar_quantity : item.quantity || 0));
      }
    });

    return products.filter((p) => {
      const cat = (p.category_name || p.category || p.type || "").toLowerCase();
      const pName = (p.product_name || p.name || "").toLowerCase();

      const isDrinkCat =
        cat.includes("bar") ||
        cat.includes("drink") ||
        cat.includes("beverage") ||
        cat.includes("alcohol") ||
        cat.includes("beer") ||
        cat.includes("spirit") ||
        cat.includes("wine") ||
        cat.includes("cocktail") ||
        cat.includes("whiskey") ||
        cat.includes("liquor") ||
        cat.includes("gin") ||
        cat.includes("rum") ||
        cat.includes("vodka") ||
        cat.includes("tequila") ||
        cat.includes("brandy") ||
        cat.includes("cognac");

      const isDrinkName =
        pName.includes("beer") ||
        pName.includes("whiskey") ||
        pName.includes("wine") ||
        pName.includes("vodka") ||
        pName.includes("rum") ||
        pName.includes("gin") ||
        pName.includes("shot") ||
        pName.includes("bottle") ||
        pName.includes("cocktail");

      return (
        isDrinkCat ||
        isDrinkName ||
        p.is_bar_item === true ||
        p.isBarItem === true ||
        p.shots_capacity > 0 ||
        p.bottle_capacity > 0
      );
    }).map((p) => {
      // Image resolution
      const rawImg = p.image_url || p.imageUrl || p.image || p.image_path || p.product_image || p.picture || p.photo || p.filepath;
      const imageUrl = formatImageUrl(rawImg);

      // Shot capacity & volume calculations
      const cat = (p.category_name || p.category || p.type || "").toLowerCase();
      const pName = (p.product_name || p.name || "").toLowerCase();
      const isSpiritOrWhiskey = cat.includes("whiskey") || cat.includes("spirit") || cat.includes("liquor") || cat.includes("vodka") || cat.includes("gin") || cat.includes("rum") || cat.includes("tequila") || pName.includes("whiskey") || pName.includes("red label") || pName.includes("black label") || pName.includes("jack daniel") || pName.includes("jameson");

      const localMap = getCustomShotsMap();
      const localData = localMap[String(p.id)] || localMap[String(p.product_code || p.productCode)];
      const totalShotsCapacity = Number(
        p.shots_capacity ||
        p.shotsCapacity ||
        p.bottle_shots ||
        p.shots_per_bottle ||
        p.capacity_shots ||
        localData?.shots ||
        (isSpiritOrWhiskey ? 30 : 1)
      );

      // Calculate total shots purchased from order history
      let shotsPurchased = 0;
      (orders || []).forEach((ord) => {
        const rawItems = ord.items || ord.order_items || ord.orderItems || ord.products;
        const items = Array.isArray(rawItems) ? rawItems : [];
        items.forEach((it) => {
          const matchId = it.product_id === p.id || it.productId === p.id || it.id === p.id;
          const matchName = (it.product_name || it.name || "").toLowerCase() === pName;
          if (matchId || matchName) {
            const shotDeduct = Number(it.shots_deduction || it.shotsDeduction || it.shots || 0);
            if (shotDeduct > 0) {
              shotsPurchased += shotDeduct * Number(it.quantity || it.qty || 1);
            } else {
              shotsPurchased += Number(it.quantity || it.qty || 1);
            }
          }
        });
      });

      const realBarStock = barStockMap.get(Number(p.id)) ?? barStockMap.get(pName);
      const currentStock = realBarStock !== undefined ? realBarStock : Number(p.stock_quantity ?? p.stock ?? p.quantity ?? 0);
      const isShotBased = totalShotsCapacity > 1 || isSpiritOrWhiskey;

      const shotsRemaining = isShotBased
        ? Math.max(Math.round(currentStock * totalShotsCapacity), 0)
        : currentStock;

      const fillPercentage = isShotBased
        ? Math.min(Math.round((currentStock / Math.max(currentStock, 1)) * 100), 100)
        : currentStock > 0 ? 100 : 0;

      return {
        ...p,
        imageUrl,
        isShotBased,
        totalShotsCapacity,
        shotsPurchased,
        shotsRemaining,
        fillPercentage,
        currentStock,
      };
    });
  }, [products, orders, barStockList]);

  // Search filtered bar drinks
  const filteredBarDrinks = useMemo(() => {
    if (!searchQuery.trim()) return barDrinks;
    const q = searchQuery.toLowerCase();
    return barDrinks.filter(
      (d) =>
        (d.product_name || d.name || "").toLowerCase().includes(q) ||
        (d.category_name || d.category || "").toLowerCase().includes(q)
    );
  }, [barDrinks, searchQuery]);

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

  const getItemList = (order) => {
    if (!order) return [];

    const rawItems =
      order.items || order.order_items || order.orderItems || order.products;
    const items = parseItems(rawItems);

    if (items && items.length > 0) {
      return items.map((item) => {
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

        const price = Number(item.unit_price || item.price || item.product_price || 0);
        const notes = item.notes || "";
        return { quantity, name, price, notes };
      });
    }

    if (order.drink_name || order.product_name) {
      return [
        {
          quantity: Number(order.quantity || 1),
          name: order.drink_name || order.product_name || order.description || "Drink Item",
          price: Number(order.unit_price || order.price || order.total_amount || 0),
          notes: order.notes || "",
        },
      ];
    }

    if (order.items_summary || order.description) {
      return [
        {
          quantity: 1,
          name: order.items_summary || order.description,
          price: 0,
          notes: "",
        },
      ];
    }

    return [{ quantity: 1, name: "Drink Item", price: 0, notes: "" }];
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

        {/* HEADER CONTROLS */}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-sm transition ${
              soundEnabled
                ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            title={soundEnabled ? "Sound Alerts Enabled" : "Sound Alerts Muted"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-500" />}
            <span>{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>

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
          MAIN SECTION SWITCHER TABS
      ====================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setMainSectionTab("orders")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            mainSectionTab === "orders"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Wine className="h-4 w-4" />
          Active Drink Orders ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setMainSectionTab("inventory")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            mainSectionTab === "inventory"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          Live Bar Drink Inventory & Shot Radar ({barDrinks.length})
        </button>

        <Link
          to="/kitchen/assets"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition shadow-xs"
        >
          <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          Live Kitchen Assets
        </Link>

        <Link
          to="/bar/reports"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-900 text-white shadow-xs hover:bg-slate-800 transition sm:ml-auto"
        >
          <BarChart3 className="h-4 w-4 text-purple-300" />
          Bar Reports
        </Link>
      </div>

      {mainSectionTab === "inventory" ? (
        /* ======================================================
            LIVE BAR DRINK INVENTORY & SHOT LEVEL MONITOR
        ====================================================== */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <GlassWater className="h-5 w-5 text-purple-600" />
                Live Bar Drink Inventory & Shot Level Monitor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stock status, bottle images, shots purchased, and remaining liquid volume.
              </p>
            </div>

            {/* Search Drink Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drink or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {filteredBarDrinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Package className="h-10 w-10 mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No bar drinks found</p>
              <p className="text-xs text-slate-400 mt-1">
                Make sure products are registered with category "Bar" or "Drink" in Products management.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBarDrinks.map((drink) => {
                const isLowStock = drink.isShotBased
                  ? drink.shotsRemaining < 5
                  : drink.currentStock <= 3;

                const isOutOfStock = drink.isShotBased
                  ? drink.shotsRemaining === 0
                  : drink.currentStock === 0;

                return (
                  <div
                    key={drink.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                      isOutOfStock
                        ? "border-rose-200 bg-rose-50/30 opacity-75"
                        : isLowStock
                        ? "border-amber-300 bg-amber-50/30 ring-1 ring-amber-300/50"
                        : "border-slate-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    {/* TOP BADGE */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-purple-700 border border-purple-200 truncate">
                        {drink.category_name || drink.category || "Bar Drink"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          isOutOfStock
                            ? "bg-rose-100 text-rose-700 border border-rose-300"
                            : isLowStock
                            ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {isOutOfStock
                          ? "🔴 OUT OF STOCK"
                          : isLowStock
                          ? "⚠️ LOW STOCK"
                          : "🟢 IN STOCK"}
                      </span>
                    </div>

                    {/* DRINK IMAGE & NAME */}
                    <div className="flex items-center gap-3.5 mb-4">
                      {drink.imageUrl ? (
                        <img
                          src={drink.imageUrl}
                          alt={drink.product_name || drink.name}
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-slate-100 bg-slate-50 shadow-xs"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = "none";
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}

                      <div
                        className={`h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 ${
                          drink.imageUrl ? "hidden" : "flex"
                        }`}
                      >
                        <Wine className="h-8 w-8" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug truncate">
                          {drink.product_name || drink.name}
                        </h3>

                        <p className="mt-1 text-xs font-black text-purple-700">
                          {Number(drink.unit_price || drink.price || 0).toFixed(2)} ETB
                          <span className="text-[10px] font-semibold text-slate-400 ml-1">
                            {drink.isShotBased ? "/ shot" : "/ unit"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* SHOT VOLUME RADAR PROGRESS BAR */}
                    <div className="mt-auto rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          <Droplets className="h-3.5 w-3.5 text-blue-600" />
                          {drink.isShotBased ? "Shot Liquid Level" : "Unit Stock"}
                        </span>
                        <span className="font-black text-slate-900">
                          {drink.fillPercentage}%
                        </span>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden p-0.5 border border-slate-300/40">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            drink.fillPercentage > 50
                              ? "bg-emerald-500"
                              : drink.fillPercentage > 20
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${drink.fillPercentage}%` }}
                        />
                      </div>

                      {/* SHOTS PURCHASED VS REMAINING */}
                      <div className="flex justify-between items-center text-[11px] font-bold pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">
                          Purchased: <strong className="text-purple-700">{drink.shotsPurchased}</strong> {drink.isShotBased ? "Shots" : "Units"}
                        </span>
                        <span className="text-slate-800">
                          Left: <strong className={isLowStock ? "text-rose-600" : "text-emerald-700"}>{drink.shotsRemaining}</strong> {drink.isShotBased ? "Shots" : "Units"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================
            ORDERS
        ====================================================== */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Drink Orders
            </h2>

            <p className="text-sm text-slate-500">
              Manage drink preparation
            </p>
          </div>

          {/* FILTER TABS & VIEW TOGGLE */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-purple-600" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="h-3.5 w-3.5 text-purple-600" />
                List
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab("new")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "new"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-blue-600"
                }`}
              >
                New ({newOrders})
              </button>
              <button
                onClick={() => setActiveTab("preparing")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "preparing"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-amber-600"
                }`}
              >
                Preparing ({preparingOrders})
              </button>
              <button
                onClick={() => setActiveTab("ready")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "ready"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                Ready ({readyOrders})
              </button>
            </div>
          </div>

        </div>


        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {displayedOrders.length === 0 && !error && (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-500">
              <Wine className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-800">
              {activeTab === "all" ? "No drink orders" : `No ${activeTab} drink orders`}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {activeTab === "all"
                ? "New drink orders from the POS will appear here."
                : `There are currently no orders with status "${activeTab}".`}
            </p>

          </div>
        )}


        {/* ====================================================
            ORDER CARDS GRID OR LIST VIEW
        ==================================================== */}

        {displayedOrders.length > 0 && (
          viewMode === "cards" ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedOrders.map((order) => {
                const displayStatus = getDisplayStatus(order.status);
                const isUpdating = updatingOrder === order.id;
                const itemList = getItemList(order);

                const minutesAgo = order.created_at
                  ? Math.max(0, Math.floor((new Date() - new Date(order.created_at)) / (1000 * 60)))
                  : 0;

                const isDelayed =
                  minutesAgo >= 7 &&
                  (order.status === "pending" ||
                    order.status === "confirmed" ||
                    order.status === "new" ||
                    order.status === "preparing");

                return (
                  <div
                    key={order.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                      isDelayed
                        ? "border-rose-300 bg-rose-50/40 shadow-rose-100/50 ring-1 ring-rose-300/40"
                        : order.status === "preparing"
                        ? "border-amber-200 bg-amber-50/20"
                        : order.status === "ready"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* CARD HEADER */}
                    <div className="space-y-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-slate-900 tracking-tight">
                          {order.order_number || `#B-${order.id}`}
                        </span>

                        <StatusBadge status={displayStatus} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                          {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
                        </span>

                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatTime(order.created_at)} ({minutesAgo}m ago)
                        </span>

                        {isDelayed && (
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 animate-pulse border border-rose-300">
                            <AlertTriangle className="h-3 w-3" /> Delayed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ITEM LIST INSIDE CARD */}
                    <div className="my-4 space-y-2 flex-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Drink Items ({itemList.length})
                      </p>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {itemList.map((it, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-100 font-extrabold text-purple-700 text-xs">
                                {it.quantity}x
                              </span>

                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">
                                  {it.name}
                                </p>
                                {it.notes && (
                                  <p className="text-[11px] text-amber-700 font-semibold truncate">
                                    Note: {it.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {it.price > 0 && (
                              <span className="font-bold text-slate-600 shrink-0 ml-2">
                                {(it.price * it.quantity).toFixed(2)} ETB
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CARD FOOTER / ACTION BUTTON */}
                    <div className="pt-3 border-t border-slate-100">
                      {(order.status === "pending" ||
                        order.status === "confirmed" ||
                        order.status === "new") && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateOrderStatus(order.id, "preparing")}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 active:scale-95 disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Start Preparing
                        </button>
                      )}

                      {order.status === "preparing" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateOrderStatus(order.id, "ready")}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Mark Ready
                        </button>
                      )}

                      {order.status === "ready" && (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-100 py-2.5 text-xs font-extrabold text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Ready for Waiter
                        </div>
                      )}

                      {(order.status === "served" || order.status === "completed") && (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Served
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* COMPACT LIST VIEW */
            <div className="divide-y divide-slate-200">
              {displayedOrders.map((order) => {
                const displayStatus = getDisplayStatus(order.status);
                const isUpdating = updatingOrder === order.id;

                const minutesAgo = order.created_at
                  ? Math.max(0, Math.floor((new Date() - new Date(order.created_at)) / (1000 * 60)))
                  : 0;

                const isDelayed =
                  minutesAgo >= 7 &&
                  (order.status === "pending" ||
                    order.status === "confirmed" ||
                    order.status === "new" ||
                    order.status === "preparing");

                return (
                  <div
                    key={order.id}
                    className={`p-5 transition hover:bg-slate-50 ${
                      isDelayed ? "border-l-4 border-l-red-500 bg-red-50/20" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-bold text-slate-900">
                            {order.order_number || `#B-${order.id}`}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
                          </span>
                          <StatusBadge status={displayStatus} />
                          {isDelayed && (
                            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 animate-pulse">
                              <AlertTriangle className="h-3 w-3" /> Delayed ({minutesAgo}m)
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {formatItems(order)}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Ordered {formatTime(order.created_at)} ({minutesAgo} mins ago)</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {(order.status === "pending" ||
                          order.status === "confirmed" ||
                          order.status === "new") && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(order.id, "preparing")}
                            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 active:scale-95 disabled:opacity-60"
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            Start Preparing
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Mark Ready
                          </button>
                        )}
                        {order.status === "ready" && (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Ready for Waiter
                          </div>
                        )}
                        {(order.status === "served" || order.status === "completed") && (
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
          )
        )}

      </div>
      )}


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