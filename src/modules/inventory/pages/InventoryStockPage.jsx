import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Package,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";

function InventoryStockPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Stock In / Out Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalType, setModalType] = useState(null); // 'in' or 'out'
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/inventory");
      console.log("FETCH INVENTORY RESPONSE:", res);
      const items = res.inventory || res.data || [];
      setInventory(items);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Standardized stock items mapping
  const stockItems = useMemo(() => {
    return inventory.map((item) => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minimum_stock || 0);

      let statusLabel = "In Stock";
      if (qty <= 0) {
        statusLabel = "Out of Stock";
      } else if (min > 0 && qty <= min) {
        statusLabel = "Low Stock";
      } else if (item.stock_status === "low_stock") {
        statusLabel = "Low Stock";
      } else if (item.stock_status === "out_of_stock") {
        statusLabel = "Out of Stock";
      }

      return {
        id: item.id,
        productId: item.product_id,
        name: item.product_name || `Product #${item.product_id}`,
        category: item.category_name || "General",
        unit: item.unit || "pcs",
        quantity: qty,
        minimum: min,
        price: Number(item.price || item.cost_price || 0),
        status: statusLabel,
        raw: item,
      };
    });
  }, [inventory]);

  const categories = useMemo(() => {
    return ["All", ...new Set(stockItems.map((item) => item.category))];
  }, [stockItems]);

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        category === "All" || item.category === category;
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stockItems, search, category, statusFilter]);

  const handleOpenModal = (product, type) => {
    setSelectedProduct(product);
    setModalType(type);
    setAdjustQty("");
    setAdjustNotes("");
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setAdjustQty("");
    setAdjustNotes("");
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || Number(adjustQty) <= 0) {
      alert("Please enter a valid positive quantity");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = modalType === "in" ? "/inventory/stock-in" : "/inventory/stock-out";
      const payload = {
        productId: selectedProduct.productId || selectedProduct.id,
        quantity: Number(adjustQty),
        notes: adjustNotes || (modalType === "in" ? "Manual Stock In" : "Manual Stock Out"),
      };

      await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert(`Stock ${modalType === "in" ? "added" : "removed"} successfully!`);
      handleCloseModal();
      fetchInventory();
    } catch (err) {
      console.error("Stock adjustment failed:", err);
      alert(err.message || "Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Stock Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage all restaurant and bar inventory items live from database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-900">Inventory Items</h2>
              <p className="text-xs text-slate-500">
                {filteredItems.length} items found
              </p>
            </div>
          </div>
          <Filter className="h-4 w-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Item
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Category
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Quantity
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Minimum
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Unit Price
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                    Loading inventory data from backend...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-red-600">
                    <p className="font-semibold">{error}</p>
                    <button
                      onClick={fetchInventory}
                      className="mt-3 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    {/* Item */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Prod ID: #{item.productId || item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.category}
                    </td>

                    {/* Quantity */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900">
                        {item.quantity}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">
                        {item.unit}
                      </span>
                    </td>

                    {/* Minimum */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.minimum} {item.unit}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {item.price.toLocaleString()} ETB
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "In Stock"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "Low Stock"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(item, "in")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                          title="Stock In"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          Stock In
                        </button>
                        <button
                          onClick={() => handleOpenModal(item, "out")}
                          className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                          title="Stock Out"
                        >
                          <ArrowUpFromLine className="h-3.5 w-3.5" />
                          Stock Out
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      No inventory items found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock In / Out Modal */}
      {selectedProduct && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {modalType === "in" ? "📦 Stock In (+)" : "📤 Stock Out (-)"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Adjusting inventory quantity for{" "}
              <span className="font-semibold text-slate-800">
                {selectedProduct.name}
              </span>
            </p>

            <form onSubmit={handleStockAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Quantity ({selectedProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Enter quantity"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Notes / Reference (Optional)
                </label>
                <textarea
                  rows="2"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                    modalType === "in"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting ? "Saving..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryStockPage;