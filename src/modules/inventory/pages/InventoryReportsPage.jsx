import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Printer,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  AlertTriangle,
  PackageCheck,
  TrendingDown,
  CircleDollarSign,
  FileSpreadsheet,
} from "lucide-react";
import api from "../../../services/api";

function ReportStatCard({ title, value, description, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </h3>
          {description && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {description}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InventoryReportsPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Multi-endpoint API fetch strategy like POSReportsPage
      const [invRes, productsRes, lowStockRes] = await Promise.all([
        api("/inventory").catch(() => []),
        api("/products").catch(() => []),
        api("/inventory/low-stock").catch(() => []),
      ]);

      const list1 = Array.isArray(invRes) ? invRes : invRes.inventory || invRes.data || [];
      const prodList = Array.isArray(productsRes) ? productsRes : productsRes.products || productsRes.data || [];

      // Combine inventory items with product catalog
      const combinedMap = new Map();
      list1.forEach((item) => {
        combinedMap.set(String(item.product_id || item.id), item);
      });

      if (combinedMap.size === 0 && prodList.length > 0) {
        prodList.forEach((prod) => {
          combinedMap.set(String(prod.id), {
            id: prod.id,
            product_id: prod.id,
            product_name: prod.name,
            category_name: prod.category || prod.category_name || "General",
            quantity: Number(prod.stock_quantity || prod.stock || 10),
            minimum_stock: Number(prod.min_stock || prod.minimum_stock || 5),
            cost_price: Number(prod.cost_price || prod.price || 0),
            unit: prod.unit || "pcs",
            updated_at: new Date().toISOString(),
          });
        });
      }

      const finalInventory = Array.from(combinedMap.values());
      setInventoryList(finalInventory);
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
      const qty = Number(item.quantity || item.stock_quantity || 0);
      const min = Number(item.minimum_stock || item.min_stock || 0);

      let movementType = "In Stock";
      if (qty <= 0) {
        movementType = "Stock Out";
      } else if (min > 0 && qty <= min) {
        movementType = "Low Stock";
      }

      const rawDate = item.updated_at || item.updatedAt || item.created_at;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";

      return {
        id: `INV-${item.id || item.product_id}`,
        productId: item.product_id || item.id,
        date: dateStr,
        item: item.product_name || item.name || `Product #${item.product_id || item.id}`,
        category: item.category_name || item.category || "General",
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
      const query = search.toLowerCase().trim();
      const searchMatch =
        !query ||
        item.item.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);

      const dateMatch =
        (!startDate || (item.date && item.date >= startDate)) &&
        (!endDate || (item.date && item.date <= endDate));

      const typeMatch =
        typeFilter === "All" || item.type === typeFilter;

      const categoryMatch =
        categoryFilter === "All" || item.category === categoryFilter;

      return searchMatch && dateMatch && typeMatch && categoryMatch;
    });
  }, [reportData, search, startDate, endDate, typeFilter, categoryFilter]);

  const totalItemsCount = filteredData.length;
  const lowStockCount = filteredData.filter((i) => i.type === "Low Stock").length;
  const outOfStockCount = filteredData.filter((i) => i.type === "Stock Out").length;
  const totalValuation = filteredData.reduce(
    (total, item) => total + item.quantity * item.costPrice,
    0
  );

  const handlePrint = () => {
    printReportArea("inventory-reports-printable-area", "Inventory Valuation & Stock Audit Report");
  };

  const getStockBadge = (type) => {
    if (type === "In Stock") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
          <PackageCheck className="h-3 w-3" /> In Stock
        </span>
      );
    }
    if (type === "Low Stock") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-800">
        <TrendingDown className="h-3 w-3" /> Out of Stock
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Inventory & Stock Audit Report
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Live multi-endpoint database audit for storekeeper assets & stock levels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventoryData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Print Audit Report
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Total Stock Items"
          value={loading ? "..." : totalItemsCount}
          description="Monitored stock catalog"
          icon={Boxes}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <ReportStatCard
          title="Low Stock Items"
          value={loading ? "..." : lowStockCount}
          description="Needs reorder soon"
          icon={AlertTriangle}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Out of Stock"
          value={loading ? "..." : outOfStockCount}
          description="Zero quantity in store"
          icon={TrendingDown}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <ReportStatCard
          title="Inventory Valuation"
          value={loading ? "..." : `${totalValuation.toLocaleString()} ETB`}
          description="Total asset value"
          icon={CircleDollarSign}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stock item, category, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="All">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Stock Out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE AUDIT REPORT */}
      <div id="printable-report" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">THE OAK CLUB</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Inventory & Stock Movement Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Audit Status: <span className="text-slate-900">Live Inventory Audit</span></p>
            <p className="text-xs text-slate-400">Total Items Audited: {filteredData.length}</p>
          </div>
        </div>

        {/* ITEMIZED INVENTORY TABLE */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            Itemized Inventory Stock Audit Table
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Item #</th>
                  <th className="px-4 py-3">Stock Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">Loading inventory data...</td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{row.item}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{row.category}</td>
                      <td className="px-4 py-3 text-center">{getStockBadge(row.type)}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {row.quantity} {row.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.costPrice.toLocaleString()} ETB</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700 bg-emerald-50/40">
                        {(row.quantity * row.costPrice).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400 italic">No inventory items match your search or filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs text-slate-900 font-bold">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB — INVENTORY AUDIT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Asset Valuation & Count Audit Report</p>
            </div>
            <div className="text-right">
              <p>Storekeeper Signature: ______________________</p>
              <p className="mt-2">Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryReportsPage;