import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Search,
  Package,
  ShoppingCart,
  RefreshCw,
  ArrowDownToLine,
  SlidersHorizontal,
  X,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import api from "../../../services/api";
import StockThresholdModal from "../components/StockThresholdModal";

function InventoryLowStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusItemParam = searchParams.get("focusItem") || "";
  const productIdParam = searchParams.get("productId") || "";

  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Threshold modal state
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [selectedThresholdProduct, setSelectedThresholdProduct] = useState(null);

  const openThresholdModal = (item) => {
    setSelectedThresholdProduct({
      id: item.productId || item.id,
      product_id: item.productId || item.id,
      name: item.name,
      product_name: item.name,
      category_name: item.category,
      unit: item.unit,
      low_stock_threshold: item.minimum,
      minimum_stock: item.minimum,
    });
    setShowThresholdModal(true);
  };

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try low-stock endpoint first, fallback to filtering /inventory
      let res;
      try {
        res = await api("/inventory/low-stock");
      } catch {
        res = await api("/inventory");
      }
      
      const rawData = res.inventory || res.data || [];
      const filteredLow = rawData.filter((item) => {
        const qty = Number(item.quantity || 0);
        const min = Number(item.minimum_stock || 0);
        return qty <= min || item.stock_status === "low_stock" || item.stock_status === "out_of_stock";
      });

      setLowStockList(filteredLow);
    } catch (err) {
      console.error("Failed to fetch low stock inventory:", err);
      setError(err.message || "Failed to load low stock inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const lowStockItems = useMemo(() => {
    return lowStockList.map((item) => ({
      id: item.id,
      productId: item.product_id || item.id,
      name: item.product_name || `Product #${item.product_id || item.id}`,
      category: item.category_name || "General",
      current: Number(item.quantity || 0),
      minimum: Number(item.minimum_stock || 0),
      unit: item.unit || "pcs",
      supplier: item.supplier_name || "Primary Supplier",
      lastRestocked: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "Recent",
    }));
  }, [lowStockList]);

  const filteredItems = useMemo(() => {
    return lowStockItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        category === "All" || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [lowStockItems, search, category]);

  const categories = useMemo(() => {
    return ["All", ...new Set(lowStockItems.map((item) => item.category))];
  }, [lowStockItems]);

  const spotlightItem = useMemo(() => {
    if (!focusItemParam && !productIdParam) return null;
    const pId = productIdParam ? Number(productIdParam) : null;
    const fName = focusItemParam.toLowerCase().trim();

    const found = lowStockItems.find((item) => {
      const matchId = pId && (Number(item.id) === pId || Number(item.productId) === pId);
      const matchName = fName && item.name.toLowerCase().includes(fName);
      return matchId || matchName;
    });

    if (found) return found;

    if (focusItemParam) {
      return {
        id: productIdParam || "spotlight-item",
        productId: productIdParam || 0,
        name: focusItemParam,
        category: "Central Store Inventory",
        current: 0,
        minimum: 5,
        unit: "units",
        supplier: "Warehouse Supplier",
      };
    }
    return null;
  }, [lowStockItems, focusItemParam, productIdParam]);

  // Smooth scroll to highlighted item
  useEffect(() => {
    if (spotlightItem) {
      const timer = setTimeout(() => {
        const row = document.getElementById(`low-stock-row-${spotlightItem.id || spotlightItem.productId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [spotlightItem]);

  const clearSpotlight = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("focusItem");
    newParams.delete("productId");
    setSearchParams(newParams, { replace: true });
  };

  const getUrgency = (current, minimum) => {
    if (current <= 0) {
      return {
        label: "Out of Stock",
        className: "bg-red-100 text-red-800 font-bold",
      };
    }
    const percentage = minimum > 0 ? (current / minimum) * 100 : 50;
    if (percentage <= 30) {
      return {
        label: "Critical",
        className: "bg-red-50 text-red-700 font-semibold",
      };
    }
    if (percentage <= 60) {
      return {
        label: "Urgent",
        className: "bg-orange-50 text-orange-700 font-semibold",
      };
    }
    return {
      label: "Low",
      className: "bg-yellow-50 text-yellow-700 font-semibold",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Low Stock Warning
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live items that are below safety thresholds in database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 px-4 py-2.5 text-right">
            <p className="text-xs font-medium text-orange-600">
              Items Requiring Attention
            </p>
            <p className="text-xl font-bold text-orange-700">
              {filteredItems.length}
            </p>
          </div>
          <button
            onClick={fetchLowStock}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ======================================================
          LOW STOCK ITEM SPOTLIGHT BANNER (BANNER METHOD)
      ====================================================== */}
      {spotlightItem && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-rose-400 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-orange-500/15 p-5 shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-md">
                <Package className="h-8 w-8 text-rose-600" />
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock Item Spotlight
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {spotlightItem.category}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {spotlightItem.name}
                </h2>

                <p className="text-xs font-bold text-rose-700 flex items-center gap-2 mt-0.5">
                  <span>
                    Current Warehouse Balance:{" "}
                    <strong className="text-sm font-black underline">
                      {spotlightItem.current} {spotlightItem.unit}
                    </strong>{" "}
                    (Minimum Threshold: {spotlightItem.minimum} {spotlightItem.unit})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <button
                type="button"
                onClick={() => openThresholdModal(spotlightItem)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-slate-800 active:scale-95 transition cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Adjust Threshold</span>
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

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search low stock items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert */}
      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div>
          <p className="text-sm font-semibold text-orange-800">
            Automated Low Stock Alert
          </p>
          <p className="mt-1 text-xs leading-5 text-orange-700">
            These items have fallen below their minimum safety thresholds. Create a Purchase Order in Purchasing to restock.
          </p>
        </div>
      </div>

      {/* Low Stock Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-orange-600 mb-2" />
            Fetching low stock data...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 font-semibold">
            {error}
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const urgency = getUrgency(item.current, item.minimum);
            const isSpotlighted = spotlightItem && (
              Number(item.id) === Number(spotlightItem.id) ||
              Number(item.productId) === Number(spotlightItem.productId || spotlightItem.id) ||
              item.name.toLowerCase() === spotlightItem.name.toLowerCase()
            );

            return (
              <div
                key={item.id}
                id={`low-stock-row-${item.id || item.productId}`}
                className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
                  isSpotlighted
                    ? "border-amber-400 bg-amber-50/50 ring-4 ring-amber-400 ring-offset-2 animate-pulse shadow-xl shadow-amber-500/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${urgency.className}`}>
                        {urgency.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Category: {item.category} | Supplier: {item.supplier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Stock Status</p>
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="text-red-600">{item.current}</span> / {item.minimum} {item.unit}
                    </p>
                  </div>
                  <button
                    onClick={() => openThresholdModal(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs shrink-0 active:scale-95"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
                    <span>Edit Limit</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">All Stock Levels Normal!</p>
            <p className="text-xs text-slate-400 mt-1">No items currently below minimum stock threshold.</p>
          </div>
        )}
      </div>

      {/* Stock Threshold Customization Modal */}
      <StockThresholdModal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        onSuccess={fetchLowStock}
        product={selectedThresholdProduct}
        initialDepartment="all"
      />
    </div>
  );
}

export default InventoryLowStockPage;