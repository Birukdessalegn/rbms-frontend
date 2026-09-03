import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Flame,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  Layers,
  ChefHat,
  XCircle,
} from "lucide-react";
import api from "../../../services/api";
import { formatImageUrl } from "../../products/ProductsPage";

function KitchenLiveAssetsPage() {
  const [products, setProducts] = useState([]);
  const [kitchenStock, setKitchenStock] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "list"
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // FETCH KITCHEN ASSETS & REAL-TIME STOCK
  // ============================================================

  const fetchKitchenAssets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError("");

      const [prodRes, stockRes, ordersRes] = await Promise.all([
        api("/products").catch(() => []),
        api("/inventory/departments/kitchen").catch(() => api("/inventory").catch(() => [])),
        api("/kitchen").catch(() => []),
      ]);

      const rawProducts =
        prodRes?.products || prodRes?.data?.products || (Array.isArray(prodRes) ? prodRes : []);
      setProducts(rawProducts);

      const rawStock =
        stockRes?.inventory || stockRes?.data?.inventory || stockRes?.data || (Array.isArray(stockRes) ? stockRes : []);
      setKitchenStock(rawStock);

      const rawOrders =
        ordersRes?.orders || ordersRes?.data?.orders || ordersRes?.data || (Array.isArray(ordersRes) ? ordersRes : []);
      setKitchenOrders(rawOrders);
    } catch (err) {
      console.error("Failed to fetch kitchen live assets:", err);
      setError(err.message || "Failed to load live kitchen assets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKitchenAssets();
    const interval = setInterval(() => fetchKitchenAssets(true), 5000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // BUILD KITCHEN STOCK MAP & DISH DATA
  // ============================================================

  const kitchenStockMap = useMemo(() => {
    const map = new Map();
    (kitchenStock || []).forEach((it) => {
      const pid = it.product_id || it.productId || it.id;
      const qty = Number(it.quantity ?? it.stock ?? it.stock_quantity ?? 0);
      const minStock = Number(it.minimum_stock ?? it.min_stock ?? 5);
      if (pid) map.set(Number(pid), { quantity: qty, minStock, unit: it.unit });

      const pName = (it.product_name || it.name || "").toLowerCase().trim();
      if (pName) map.set(pName, { quantity: qty, minStock, unit: it.unit });
    });
    return map;
  }, [kitchenStock]);

  // Count active orders currently in prep or pending for each food item
  const ordersInPrepMap = useMemo(() => {
    const map = new Map();
    (kitchenOrders || []).forEach((ord) => {
      const st = (ord.status || "").toLowerCase();
      if (st === "pending" || st === "new" || st === "confirmed" || st === "preparing") {
        const rawItems = ord.items || ord.order_items || ord.orderItems || ord.products || [];
        const items = Array.isArray(rawItems) ? rawItems : [];
        items.forEach((it) => {
          const pid = it.product_id || it.productId || it.id;
          const qty = Number(it.quantity || it.qty || 1);
          if (pid) map.set(Number(pid), (map.get(Number(pid)) || 0) + qty);
          const pName = (it.product_name || it.name || "").toLowerCase().trim();
          if (pName) map.set(pName, (map.get(pName) || 0) + qty);
        });
      }
    });
    return map;
  }, [kitchenOrders]);

  // Filter products to only Food, Kitchen Dishes, Salads, Pizza, Hookah/Shisha
  const kitchenDishes = useMemo(() => {
    return products
      .filter((p) => {
        const cat = (p.category_name || p.category || p.type || "").toLowerCase();
        const pName = (p.product_name || p.name || "").toLowerCase();

        const isDrinkOrBar =
          cat.includes("beer") ||
          cat.includes("whiskey") ||
          cat.includes("vodka") ||
          cat.includes("cocktail") ||
          cat.includes("spirit") ||
          cat.includes("wine") ||
          cat.includes("liquor") ||
          cat.includes("soft") ||
          pName.includes("beer") ||
          pName.includes("whiskey") ||
          pName.includes("vodka") ||
          pName.includes("coca");

        if (isDrinkOrBar) return false;

        const isFoodCat =
          cat.includes("food") ||
          cat.includes("kitchen") ||
          cat.includes("meal") ||
          cat.includes("dish") ||
          cat.includes("appetizer") ||
          cat.includes("salad") ||
          cat.includes("dessert") ||
          cat.includes("pizza") ||
          cat.includes("shisha") ||
          cat.includes("hookah");

        const isFoodName =
          pName.includes("steak") ||
          pName.includes("chicken") ||
          pName.includes("salad") ||
          pName.includes("pasta") ||
          pName.includes("pizza") ||
          pName.includes("burger") ||
          pName.includes("cake") ||
          pName.includes("shisha") ||
          pName.includes("hookah") ||
          pName.includes("soup") ||
          pName.includes("fries") ||
          pName.includes("rice");

        return isFoodCat || isFoodName || p.is_kitchen_item === true;
      })
      .map((p) => {
        const pName = (p.product_name || p.name || "").toLowerCase().trim();
        const rawImg =
          p.image_url ||
          p.imageUrl ||
          p.image ||
          p.image_path ||
          p.product_image ||
          p.picture ||
          p.photo;
        const imageUrl = formatImageUrl(rawImg);

        const stockData = kitchenStockMap.get(Number(p.id)) || kitchenStockMap.get(pName);
        const currentStock =
          stockData !== undefined
            ? Number(stockData.quantity)
            : Number(p.stock_quantity ?? p.stock ?? p.quantity ?? 25);
        const minStock = stockData?.minStock ?? Number(p.minimum_stock ?? 5);

        const activePrepCount =
          ordersInPrepMap.get(Number(p.id)) || ordersInPrepMap.get(pName) || 0;

        // Visual Fill Percentage (normalized against capacity or safety margin)
        const baselineCapacity = Math.max(minStock * 4, 30);
        const fillPercentage = Math.min(
          Math.max(Math.round((currentStock / baselineCapacity) * 100), 0),
          100
        );

        const isOutOfStock = currentStock <= 0;
        const isLowStock = !isOutOfStock && currentStock <= minStock;

        // Subcategory tag
        let subCategory = "Mains / Plates";
        const cat = (p.category_name || p.category || "").toLowerCase();
        if (pName.includes("salad") || cat.includes("salad") || p.unit === "portion") {
          subCategory = "Salads & Starters";
        } else if (pName.includes("pizza") || pName.includes("burger") || pName.includes("fries")) {
          subCategory = "Pizza & Fast Food";
        } else if (pName.includes("shisha") || pName.includes("hookah")) {
          subCategory = "Hookah / Shisha";
        } else if (pName.includes("cake") || pName.includes("dessert") || pName.includes("ice cream")) {
          subCategory = "Desserts";
        }

        return {
          ...p,
          displayName: p.name || p.product_name || "Food Item",
          unit: p.unit || "plate",
          imageUrl,
          currentStock,
          minStock,
          activePrepCount,
          fillPercentage,
          isOutOfStock,
          isLowStock,
          subCategory,
        };
      });
  }, [products, kitchenStockMap, ordersInPrepMap]);

  // Filter by category tabs & search input
  const filteredDishes = useMemo(() => {
    return kitchenDishes.filter((d) => {
      // Category filter
      if (activeCategory === "mains" && !d.subCategory.includes("Mains")) return false;
      if (activeCategory === "salads" && !d.subCategory.includes("Salads")) return false;
      if (activeCategory === "fast_food" && !d.subCategory.includes("Pizza")) return false;
      if (activeCategory === "shisha" && !d.subCategory.includes("Shisha")) return false;
      if (activeCategory === "low_stock" && !d.isLowStock && !d.isOutOfStock) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.displayName.toLowerCase().includes(q);
        const matchCode = (d.product_code || d.productCode || "").toLowerCase().includes(q);
        const matchCat = d.subCategory.toLowerCase().includes(q);
        return matchName || matchCode || matchCat;
      }
      return true;
    });
  }, [kitchenDishes, activeCategory, searchQuery]);

  // Summary Metrics
  const totalAssetsCount = kitchenDishes.length;
  const inStockCount = kitchenDishes.filter((d) => !d.isLowStock && !d.isOutOfStock).length;
  const lowStockCount = kitchenDishes.filter((d) => d.isLowStock).length;
  const outOfStockCount = kitchenDishes.filter((d) => d.isOutOfStock).length;
  const totalInPrepCount = useMemo(() => {
    return Array.from(ordersInPrepMap.values()).reduce((acc, v) => acc + v, 0);
  }, [ordersInPrepMap]);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
        <ChefHat className="h-10 w-10 animate-bounce text-amber-600" />
        <p className="text-sm font-semibold">Loading Live Kitchen Assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER WITH TAB SWITCHER
      ====================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Kitchen Live Assets & Stock
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Real-time food inventory levels, active meal orders in prep, and dish availability
              </p>
            </div>
          </div>
        </div>

        {/* TOP TAB SWITCHER: KDS ORDERS vs LIVE ASSETS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
            <Link
              to="/kitchen"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              Food Orders (KDS)
              {totalInPrepCount > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                  {totalInPrepCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-sm transition"
            >
              <Package className="h-3.5 w-3.5 text-amber-600" />
              Live Kitchen Assets
            </button>
          </div>

          <button
            onClick={() => fetchKitchenAssets(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition disabled:opacity-60"
            title="Refresh Live Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* ======================================================
          KPI METRIC SUMMARY CARDS
      ====================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Assets */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Food Items</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalAssetsCount}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Dishes managed in Kitchen</p>
        </div>

        {/* Ready / In Stock */}
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Well Stocked</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{inStockCount}</p>
          <p className="text-[11px] font-medium text-emerald-600/80 mt-0.5">Ready for cooking</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Low Stock Alert</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{lowStockCount}</p>
          <p className="text-[11px] font-medium text-amber-600/80 mt-0.5">At or below reorder level</p>
        </div>

        {/* Out of Stock */}
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Out of Stock (86)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{outOfStockCount}</p>
          <p className="text-[11px] font-medium text-rose-600/80 mt-0.5">Needs immediate prep/re-stock</p>
        </div>
      </div>

      {/* ======================================================
          CONTROLS: SEARCH, CATEGORY PILLS, VIEW MODE
      ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, plates, salads, shisha, or code..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-amber-600" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5 text-amber-600" />
              List
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {[
            { id: "all", label: "All Kitchen Assets" },
            { id: "mains", label: "🍽️ Plates & Mains" },
            { id: "salads", label: "🥗 Salads & Starters" },
            { id: "fast_food", label: "🍕 Pizza & Fast Food" },
            { id: "shisha", label: "💨 Hookah / Shisha" },
            { id: "low_stock", label: "⚠️ Low & Out of Stock" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                activeCategory === cat.id
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================
          LIVE ASSET DISPLAY: CARDS OR LIST
      ====================================================== */}
      {filteredDishes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700">No Kitchen Assets Found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or category filter</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDishes.map((dish) => {
            const isAlert = dish.isLowStock || dish.isOutOfStock;

            return (
              <div
                key={dish.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 shadow-xs transition hover:shadow-md ${
                  dish.isOutOfStock
                    ? "border-rose-300/80 bg-rose-50/20"
                    : dish.isLowStock
                    ? "border-amber-300/80 bg-amber-50/10"
                    : "border-slate-200 hover:border-amber-300/60"
                }`}
              >
                <div>
                  {/* TOP ROW: IMAGE + DISH TITLE + BADGES */}
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {dish.imageUrl ? (
                        <img
                          src={dish.imageUrl}
                          alt={dish.displayName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-amber-700 bg-amber-50">
                          <ChefHat className="h-7 w-7 opacity-80" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {dish.product_code || dish.productCode || `PRD-${dish.id}`}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                          /{dish.unit}
                        </span>
                      </div>

                      <h3 className="truncate font-black text-sm text-slate-900 mt-0.5" title={dish.displayName}>
                        {dish.displayName}
                      </h3>

                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        {dish.subCategory}
                      </p>
                    </div>
                  </div>

                  {/* STATUS PILL */}
                  <div className="mt-3 flex items-center justify-between">
                    {dish.isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800">
                        <XCircle className="h-3 w-3" />
                        OUT OF STOCK (86)
                      </span>
                    ) : dish.isLowStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        LOW STOCK ALERT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        READY & AVAILABLE
                      </span>
                    )}

                    <span className="text-xs font-black text-slate-800">
                      {Number(dish.price || 0).toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* VISUAL STOCK FILL METER */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                      Prep Level
                    </span>
                    <span className="font-black text-slate-900">{dish.fillPercentage}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden p-0.5 border border-slate-300/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dish.fillPercentage > 50
                          ? "bg-emerald-500"
                          : dish.fillPercentage > 20
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${dish.fillPercentage}%` }}
                    />
                  </div>

                  {/* ACTIVE PREP VS REMAINING QUANTITY */}
                  <div className="flex justify-between items-center text-[11px] font-bold pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">
                      In Prep: <strong className="text-orange-600">{dish.activePrepCount}</strong> {dish.unit}s
                    </span>
                    <span className="text-slate-800">
                      Remaining:{" "}
                      <strong className={isAlert ? "text-rose-600" : "text-emerald-700"}>
                        {dish.currentStock}
                      </strong>{" "}
                      {dish.unit}s
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================
            CONDENSED TABLE LIST VIEW
        ====================================================== */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-extrabold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Dish / Asset</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">In Prep</th>
                  <th className="px-5 py-3.5">Live Stock</th>
                  <th className="px-5 py-3.5">Availability Radar</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredDishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          {dish.imageUrl ? (
                            <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-amber-700 bg-amber-50">
                              <ChefHat className="h-5 w-5 opacity-75" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{dish.displayName}</p>
                          <p className="text-[10px] text-slate-400">{dish.product_code || `PRD-${dish.id}`}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">{dish.subCategory}</td>

                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {Number(dish.price || 0).toLocaleString()} ETB / {dish.unit}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-extrabold text-orange-600">{dish.activePrepCount}</span> {dish.unit}s
                    </td>

                    <td className="px-5 py-3.5 font-black text-slate-900">
                      {dish.currentStock} {dish.unit}s
                    </td>

                    <td className="px-5 py-3.5 w-44">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Capacity</span>
                          <span>{dish.fillPercentage}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dish.fillPercentage > 50
                                ? "bg-emerald-500"
                                : dish.fillPercentage > 20
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${dish.fillPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {dish.isOutOfStock ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-800">
                          86 / OUT
                        </span>
                      ) : dish.isLowStock ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          AVAILABLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default KitchenLiveAssetsPage;
