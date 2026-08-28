import { useEffect, useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";

function InventoryPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/inventory");
      console.log("INVENTORY DASHBOARD FETCH:", res);
      const items = res.inventory || res.data || [];
      setInventoryList(items);
    } catch (err) {
      console.error("Failed to fetch inventory dashboard:", err);
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute live statistics
  const statsData = useMemo(() => {
    const totalItems = inventoryList.length;

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryList.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minimum_stock || 0);
      const price = Number(item.cost_price || item.price || 0);

      totalValue += qty * price;

      if (qty <= 0 || item.stock_status === "out_of_stock") {
        outOfStockCount++;
      } else if ((min > 0 && qty <= min) || item.stock_status === "low_stock") {
        lowStockCount++;
      }
    });

    return [
      {
        title: "Total Items",
        value: loading ? "..." : totalItems.toString(),
        description: "Products in inventory",
        icon: Package,
        color: "text-blue-600 bg-blue-50",
      },
      {
        title: "Stock Value",
        value: loading ? "..." : `${totalValue.toLocaleString()} ETB`,
        description: "Calculated stock valuation",
        icon: Boxes,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        title: "Low Stock Alert",
        value: loading ? "..." : lowStockCount.toString(),
        description: "Items below minimum limit",
        icon: AlertTriangle,
        color: "text-orange-600 bg-orange-50",
      },
      {
        title: "Out of Stock",
        value: loading ? "..." : outOfStockCount.toString(),
        description: "Unavailable stock items",
        icon: TrendingDown,
        color: "text-rose-600 bg-rose-50",
      },
    ];
  }, [inventoryList, loading]);

  const lowStockItems = useMemo(() => {
    return inventoryList
      .filter((item) => {
        const qty = Number(item.quantity || 0);
        const min = Number(item.minimum_stock || 0);
        return qty <= min || item.stock_status === "low_stock" || item.stock_status === "out_of_stock";
      })
      .slice(0, 5);
  }, [inventoryList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor real-time stock levels, total valuation, and low stock warnings.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Low Stock Warning & Fast Actions Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Items Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="font-bold text-slate-900">Low Stock Alert List</h2>
            </div>
            <Link
              to="/inventory/low-stock"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Loading low stock items...
              </p>
            ) : lowStockItems.length > 0 ? (
              lowStockItems.map((item) => {
                const qty = Number(item.quantity || 0);
                const min = Number(item.minimum_stock || 0);
                const unit = item.unit || "pcs";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.product_name || `Product #${item.product_id || item.id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.category_name || "General"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-600">
                        {qty} {unit}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Min: {min} {unit}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                No items currently below minimum stock!
              </p>
            )}
          </div>
        </div>

        {/* Quick Inventory Management Links */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-bold text-slate-900">Quick Operations</h2>
            <p className="text-xs text-slate-500">Fast access to inventory tools</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/inventory/stock"
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-blue-50/60 p-4 transition hover:bg-blue-100/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">All Stock</p>
                <p className="text-xs text-slate-500">Manage products & limits</p>
              </div>
            </Link>

            <Link
              to="/inventory/low-stock"
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-orange-50/60 p-4 transition hover:bg-orange-100/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Low Stock</p>
                <p className="text-xs text-slate-500">View safety threshold alerts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryPage;