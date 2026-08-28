import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Search,
  Package,
  ShoppingCart,
  RefreshCw,
  ArrowDownToLine,
} from "lucide-react";
import api from "../../../services/api";

function InventoryLowStockPage() {
  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

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
            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
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

                <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Stock Status</p>
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="text-red-600">{item.current}</span> / {item.minimum} {item.unit}
                    </p>
                  </div>
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
    </div>
  );
}

export default InventoryLowStockPage;