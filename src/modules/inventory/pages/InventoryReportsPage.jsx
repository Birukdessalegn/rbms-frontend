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
  Download,
  ChevronLeft,
  ChevronRight,
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
  const [datePreset, setDatePreset] = useState("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleApplyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (preset === "today") {
      const todayStr = formatDate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setStartDate(formatDate(w));
      setEndDate(formatDate(today));
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(m));
      setEndDate(formatDate(today));
    } else {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invRes, productsRes] = await Promise.all([
        api("/inventory").catch(() => []),
        api("/products").catch(() => []),
      ]);

      const list1 = Array.isArray(invRes) ? invRes : invRes.inventory || invRes.data || [];
      const prodList = Array.isArray(productsRes) ? productsRes : productsRes.products || productsRes.data || [];

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
  const inStockCount = filteredData.filter((i) => i.type === "In Stock").length;
  const lowStockCount = filteredData.filter((i) => i.type === "Low Stock").length;
  const outOfStockCount = filteredData.filter((i) => i.type === "Stock Out").length;
  const totalValuation = filteredData.reduce(
    (total, item) => total + item.quantity * item.costPrice,
    0
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("inventory-reports-printable-area", "Inventory Valuation & Stock Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No inventory items available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - INVENTORY & STOCK VALUATION AUDIT REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n\n`;

    // Metrics summary
    csv += "INVENTORY VALUATION METRICS\n";
    csv += `Total Monitored SKUs,${totalItemsCount}\n`;
    csv += `In-Stock SKUs,${inStockCount}\n`;
    csv += `Low Stock Alerts,${lowStockCount}\n`;
    csv += `Out of Stock,${outOfStockCount}\n`;
    csv += `Total Inventory Asset Valuation,${totalValuation.toFixed(2)} ETB\n\n`;

    // Items table
    csv += "ITEMIZED INVENTORY VALUATION & REORDER AUDIT\n";
    csv += "Item #,Stock Item Name,Category,Status,Quantity,Unit,Unit Cost Price (ETB),Asset Value (ETB)\n";
    filteredData.forEach((row) => {
      const assetVal = (row.quantity * row.costPrice).toFixed(2);
      csv += `"${row.id}","${row.item.replace(/"/g, '""')}","${row.category.replace(/"/g, '""')}","${row.type}",${row.quantity},"${row.unit}",${row.costPrice.toFixed(2)},${assetVal}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Valuation_Audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStockBadge = (type) => {
    if (type === "In Stock") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
          <PackageCheck className="h-3 w-3" /> In Stock
        </span>
      );
    }
    if (type === "Low Stock") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-800">
        <TrendingDown className="h-3 w-3" /> Out of Stock
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory & Stock Valuation Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit storekeeper assets, replenishment thresholds, depletion alerts, and total stock values.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchInventoryData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI SUMMARY STAT CARDS (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print-hide">
        <ReportStatCard
          title="Monitored SKUs"
          value={loading ? "..." : totalItemsCount}
          description="Total active catalog items"
          icon={Boxes}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <ReportStatCard
          title="Stock Asset Valuation"
          value={loading ? "..." : `${totalValuation.toLocaleString()} ETB`}
          description="Total physical inventory value"
          icon={CircleDollarSign}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Low Stock Alerts"
          value={loading ? "..." : lowStockCount}
          description="Reorder threshold triggered"
          icon={AlertTriangle}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Available / Zero Stock"
          value={loading ? "..." : outOfStockCount}
          description="Requires immediate restocking"
          icon={TrendingDown}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
      </div>

      {/* UNIFIED FILTER TOOLBAR (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Items" },
              { id: "today", label: "Updated Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search & Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU, name, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="All">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Stock Out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="inventory-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                CENTRAL INVENTORY ASSET, STOCK VALUATION & REORDER AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Storekeeper Valuation Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Status Filter: <span className="font-bold text-slate-900">{typeFilter}</span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Monitored Items:</span>
              <strong className="text-slate-900 font-black">{totalItemsCount} SKUs</strong>
              <span className="text-[10px] font-semibold text-emerald-700">({inStockCount} In Stock)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Low Stock Alert:</span>
              <strong className="text-amber-700 font-black">{lowStockCount} Items</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Out of Stock:</span>
              <strong className="text-red-700 font-black">{outOfStockCount} Items</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Asset Value:</span>
              <strong className="text-emerald-700 font-black">{totalValuation.toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

        {/* ITEMIZED INVENTORY AUDIT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Itemized Inventory Stock Audit Table</h2>
                <p className="text-xs text-slate-500">Real-time inventory levels, unit cost pricing, and current asset valuations</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Item #</th>
                  <th className="px-5 py-3">Stock Item Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Current Stock</th>
                  <th className="px-5 py-3 text-right">Unit Price</th>
                  <th className="px-5 py-3 text-right">Asset Value (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">Loading inventory data...</td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{row.id}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">{row.item}</td>
                      <td className="px-5 py-3 font-semibold text-slate-600">{row.category}</td>
                      <td className="px-5 py-3 text-center">{getStockBadge(row.type)}</td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">
                        {row.quantity} {row.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{row.costPrice.toLocaleString()} ETB</td>
                      <td className="px-5 py-3 text-right font-black text-emerald-700 bg-emerald-50/40">
                        {(row.quantity * row.costPrice).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400 italic">
                      No inventory items match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider font-bold">
                      Grand Total Inventory Asset Valuation:
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-black text-emerald-800">
                      {totalValuation.toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Bar (Hidden on Print) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/50 print-hide">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-800">{currentPage}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OFFICIAL EXECUTIVE 3-COLUMN SIGN-OFF FOOTER */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900 text-xs">
          <div className="grid grid-cols-3 gap-6 text-slate-800">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">PREPARED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Storekeeper / Custodian</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">VERIFIED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Internal Inventory Auditor</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">APPROVED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">General Manager / Executive Admin</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center text-[10px] text-slate-400">
            <span>THE OAK CLUB & LOUNGE • CONFIDENTIAL ASSET & INVENTORY AUDIT</span>
            <span>SYSTEM TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryReportsPage;