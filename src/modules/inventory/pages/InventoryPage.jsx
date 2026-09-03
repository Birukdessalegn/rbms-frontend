import { useEffect, useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Boxes,
  RefreshCw,
  BarChart3,
  ArrowRightLeft,
  Search,
  Wine,
  UtensilsCrossed,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import StockTransferModal from "../components/StockTransferModal";

function InventoryPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [multiLocationList, setMultiLocationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferProduct, setSelectedTransferProduct] = useState(null);
  const [selectedTransferDept, setSelectedTransferDept] = useState("bar");

  // Multi-location table filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all"); // 'all' | 'bar' | 'kitchen'

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invRes, multiRes] = await Promise.all([
        api("/inventory").catch(() => ({})),
        api("/inventory/multi-location").catch(() => ({})),
      ]);

      const items = invRes.inventory || invRes.data || (Array.isArray(invRes) ? invRes : []);
      setInventoryList(items);

      const multiItems = multiRes.inventory || multiRes.data || (Array.isArray(multiRes) ? multiRes : []);
      setMultiLocationList(multiItems);
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

  // Filter multi-location stock rows
  const filteredMultiStock = useMemo(() => {
    return multiLocationList.filter((item) => {
      const name = (item.product_name || "").toLowerCase();
      const code = (item.product_code || "").toLowerCase();
      const cat = (item.category_name || "").toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchesQuery = !q || name.includes(q) || code.includes(q) || cat.includes(q);

      if (!matchesQuery) return false;

      if (deptFilter === "bar") {
        return (item.category_type === "bar" || item.category_type === "beverage" || Number(item.bar_quantity || 0) > 0);
      }
      if (deptFilter === "kitchen") {
        return (item.category_type === "food" || Number(item.kitchen_quantity || 0) > 0);
      }
      return true;
    });
  }, [multiLocationList, searchQuery, deptFilter]);

  const openTransferModal = (product = null, dept = "bar") => {
    setSelectedTransferProduct(product);
    setSelectedTransferDept(dept);
    setShowTransferModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory & Multi-Store Stock
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor real-time stock levels across Central Warehouse, Bar, and Kitchen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/inventory/reports"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            <BarChart3 className="h-4 w-4 text-amber-400" />
            Inventory Reports
          </Link>

          <button
            onClick={() => openTransferModal(null, "bar")}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md hover:bg-amber-400 transition"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Stock to Outlet
          </button>

          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
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

      {/* Multi-Location Live Stock Matrix Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-slate-900 text-base">
                Multi-Store Real-Time Stock Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live balances across Central Store, Bar, and Kitchen with POS portion consumption
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              <button
                onClick={() => setDeptFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  deptFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                All Outlets
              </button>
              <button
                onClick={() => setDeptFilter("bar")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  deptFilter === "bar" ? "bg-white text-amber-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Wine className="h-3.5 w-3.5 text-amber-600" />
                Bar
              </button>
              <button
                onClick={() => setDeptFilter("kitchen")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  deptFilter === "kitchen" ? "bg-white text-amber-900 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                Kitchen
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:w-56 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Central Store</th>
                <th className="py-3 px-4 text-center">Bar Stock</th>
                <th className="py-3 px-4 text-center">Kitchen Stock</th>
                <th className="py-3 px-4 text-center">Total On-Hand</th>
                <th className="py-3 px-4 text-center">Sold Today</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                    Loading multi-location stock...
                  </td>
                </tr>
              ) : filteredMultiStock.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMultiStock.map((prod) => {
                  const mainQty = Number(prod.main_quantity || 0);
                  const barQty = Number(prod.bar_quantity || 0);
                  const kitchenQty = Number(prod.kitchen_quantity || 0);
                  const totalQty = Number(prod.total_quantity || 0);
                  const soldToday = Number(prod.sold_today || 0);
                  const unit = prod.unit || "pcs";
                  const isBarItem = prod.category_type === "bar" || prod.category_type === "beverage";

                  return (
                    <tr key={prod.product_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{prod.product_name}</p>
                        <p className="text-[11px] text-slate-400">{prod.product_code || `ID: #${prod.product_id}`}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {prod.category_name || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${mainQty > 0 ? "text-slate-900" : "text-rose-500 font-extrabold"}`}>
                          {mainQty} {unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold rounded-lg px-2 py-0.5 ${
                          barQty > 0 ? "bg-amber-50 text-amber-900 border border-amber-200/60" : "text-slate-400"
                        }`}>
                          {barQty > 0 ? `${barQty} ${unit}` : "0"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold rounded-lg px-2 py-0.5 ${
                          kitchenQty > 0 ? "bg-emerald-50 text-emerald-900 border border-emerald-200/60" : "text-slate-400"
                        }`}>
                          {kitchenQty > 0 ? `${kitchenQty} ${unit}` : "0"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-slate-900">
                        {totalQty} {unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold rounded-full px-2 py-0.5 text-[11px] ${
                          soldToday > 0 ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-400"
                        }`}>
                          {soldToday > 0 ? `${soldToday} sold` : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openTransferModal(prod, isBarItem ? "bar" : "kitchen")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-900 transition shadow-2xs"
                        >
                          Transfer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={fetchDashboardData}
        initialProduct={selectedTransferProduct}
        initialDepartment={selectedTransferDept}
      />
    </div>
  );
}

export default InventoryPage;
