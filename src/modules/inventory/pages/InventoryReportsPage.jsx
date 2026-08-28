import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Printer,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import api from "../../../services/api";

function InventoryReportsPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/inventory");
      console.log("INVENTORY REPORTS FETCH:", res);
      const list = res.inventory || res.data || (Array.isArray(res) ? res : []);
      setInventoryList(list);
    } catch (err) {
      console.error("Failed to fetch inventory reports:", err);
      setError(err.message || "Failed to load inventory report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const reportData = useMemo(() => {
    return inventoryList.map((item) => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minimum_stock || 0);

      let movementType = "In Stock";
      if (qty <= 0) {
        movementType = "Stock Out";
      } else if (min > 0 && qty <= min) {
        movementType = "Low Stock";
      }

      const dateStr = item.updated_at ? item.updated_at.split("T")[0] : "";

      return {
        id: `INV-${item.id}`,
        productId: item.product_id || item.id,
        date: dateStr,
        item: item.product_name || `Product #${item.product_id}`,
        category: item.category_name || "General",
        type: movementType,
        quantity: qty,
        unit: item.unit || "pcs",
        costPrice: Number(item.cost_price || item.price || 0),
        reference: `Ref #${item.product_code || item.id}`,
      };
    });
  }, [inventoryList]);

  const categories = useMemo(() => {
    return ["All", ...new Set(reportData.map((item) => item.category))];
  }, [reportData]);

  const filteredData = useMemo(() => {
    return reportData.filter((item) => {
      const dateMatch =
        (!startDate || (item.date && item.date >= startDate)) &&
        (!endDate || (item.date && item.date <= endDate));

      const typeMatch =
        typeFilter === "All" || item.type === typeFilter;

      const categoryMatch =
        categoryFilter === "All" || item.category === categoryFilter;

      return dateMatch && typeMatch && categoryMatch;
    });
  }, [reportData, startDate, endDate, typeFilter, categoryFilter]);

  const totalItemsCount = filteredData.length;
  const lowStockCount = filteredData.filter((i) => i.type === "Low Stock").length;
  const outOfStockCount = filteredData.filter((i) => i.type === "Stock Out").length;
  
  const totalValuation = filteredData.reduce(
    (total, item) => total + item.quantity * item.costPrice,
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const headers = [
      "Inventory ID",
      "Product Name",
      "Category",
      "Status/Type",
      "Current Quantity",
      "Unit",
      "Unit Cost (ETB)",
      "Total Value (ETB)",
    ];

    const rows = filteredData.map((item) => [
      item.id,
      item.item,
      item.category,
      item.type,
      item.quantity,
      item.unit,
      item.costPrice,
      item.quantity * item.costPrice,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Inventory_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory Audit & Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit inventory valuation, stock movements, and item levels live from database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventoryData}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Stock Status Filter
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Stock Out">Stock Out</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tracked Items</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : totalItemsCount}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Total items in report</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Stock Valuation</p>
          <h2 className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? "..." : `${totalValuation.toLocaleString()} ETB`}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Total inventory asset value</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Low Stock Warning</p>
          <h2 className="mt-2 text-2xl font-bold text-amber-600">
            {loading ? "..." : lowStockCount}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Items below threshold</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Out of Stock</p>
          <h2 className="mt-2 text-2xl font-bold text-rose-600">
            {loading ? "..." : outOfStockCount}
          </h2>
          <p className="mt-1 text-xs text-slate-400">Depleted inventory items</p>
        </div>
      </div>

      {/* INVENTORY REPORT TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Inventory Valuation & Item Audit Log</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Item Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Stock Valuation</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                    Loading inventory data...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {item.item}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.category}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {item.costPrice.toLocaleString()} ETB
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700">
                      {(item.quantity * item.costPrice).toLocaleString()} ETB
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.type === "In Stock"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.type === "Low Stock"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                    No inventory records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryReportsPage;