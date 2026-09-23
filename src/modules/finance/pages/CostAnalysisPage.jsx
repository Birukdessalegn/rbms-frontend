import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart,
  TrendingUp,
  DollarSign,
  Utensils,
  Wine,
  Percent,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Flame,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../../services/api";

const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

export default function CostAnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [department, setDepartment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [marginFilter, setMarginFilter] = useState("all"); // 'all', 'stars', 'healthy', 'low_margin', 'uncosted'
  const [sortField, setSortField] = useState("grossProfit"); // 'grossProfit', 'marginPercent', 'soldQty', 'name'
  const [sortOrder, setSortOrder] = useState("desc");

  // Quick Inline Cost Editing Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCostPrice, setNewCostPrice] = useState("");
  const [savingCost, setSavingCost] = useState(false);
  const [costSuccessMessage, setCostSuccessMessage] = useState("");

  const fetchCostAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api(`/finance/cost-analysis?timeframe=${timeframe}&department=${department}`);
      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        setData(res || null);
      }
    } catch (err) {
      console.error("Failed to load cost analysis:", err);
      setError(err.message || "Failed to load cost analysis from server.");
    } finally {
      setLoading(false);
    }
  }, [timeframe, department]);

  useEffect(() => {
    fetchCostAnalysis();
  }, [fetchCostAnalysis]);

  // Handle Quick Cost Price Update
  const handleUpdateCost = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const parsed = parseFloat(newCostPrice);
    if (isNaN(parsed) || parsed < 0) {
      alert("Please enter a valid non-negative cost price.");
      return;
    }

    try {
      setSavingCost(true);
      await api(`/finance/cost-analysis/product/${editingProduct.id}/cost`, {
        method: "PATCH",
        body: JSON.stringify({ costPrice: parsed }),
      });

      setCostSuccessMessage(`Cost updated for ${editingProduct.name}!`);
      setTimeout(() => setCostSuccessMessage(""), 3000);
      setEditingProduct(null);
      await fetchCostAnalysis();
    } catch (err) {
      alert(err.message || "Failed to update product cost price.");
    } finally {
      setSavingCost(false);
    }
  };

  // Filter and Sort Items
  const items = useMemo(() => {
    if (!data?.items) return [];
    let list = [...data.items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.categoryName || "").toLowerCase().includes(q) ||
          (i.productCode || "").toLowerCase().includes(q)
      );
    }

    // Margin status filter
    if (marginFilter !== "all") {
      list = list.filter((i) => i.marginStatus === marginFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA || 0);
      valB = Number(valB || 0);
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return list;
  }, [data?.items, searchQuery, marginFilter, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!items.length) return;
    const headers = [
      "Product Name",
      "Category",
      "Department",
      "Unit",
      "Selling Price (ETB)",
      "Cost Price (ETB)",
      "Unit Margin (ETB)",
      "Margin %",
      "Cost %",
      "Sold Qty",
      "Total Revenue (ETB)",
      "Total COGS (ETB)",
      "Gross Profit (ETB)",
      "Status",
    ];

    const rows = items.map((i) => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${(i.categoryName || "").replace(/"/g, '""')}"`,
      i.department,
      i.unit,
      i.sellingPrice,
      i.costPrice,
      i.unitGrossProfit,
      `${i.marginPercent}%`,
      `${i.costPercent}%`,
      i.soldQty,
      i.totalRevenue,
      i.totalCost,
      i.grossProfit,
      i.marginStatus,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cost_Analysis_${timeframe}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {};
  const benchmarks = summary.benchmarks || {};

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen text-slate-900 rounded-3xl">
      {/* =========================================================
          EXECUTIVE HEADER
      ========================================================= */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <Percent className="h-3.5 w-3.5 text-emerald-600" />
              FINANCIAL INTELLIGENCE
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              COGS & Menu Engineering Matrix
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            📊 Cost Analysis & Menu Profitability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Real-time Food Cost %, Bar Pour Cost %, Fruit Department margins, and ingredient-to-selling-price analytics to maximize venue profitability.
          </p>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 text-xs font-extrabold shadow-xs">
            {[
              { id: "today", label: "Today's Shift" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All-Time" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                  timeframe === t.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchCostAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {costSuccessMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {costSuccessMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* =========================================================
          KEY EXECUTIVE KPI CARDS (INDUSTRY BENCHMARKS)
      ========================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Food Cost % */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kitchen Food Cost</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {benchmarks.food?.costPercent ?? 0}%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  benchmarks.food?.status === "optimal"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                Target: {benchmarks.food?.targetRange || "28% - 35%"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>Cost: {formatMoney(benchmarks.food?.cost || 0)}</span>
              <span>Sales: {formatMoney(benchmarks.food?.revenue || 0)}</span>
            </div>
          </div>
        </div>

        {/* Bar Pour Cost % */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bar Pour Cost</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Wine className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {benchmarks.bar?.costPercent ?? 0}%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  benchmarks.bar?.status === "optimal"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                Target: {benchmarks.bar?.targetRange || "18% - 25%"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>Cost: {formatMoney(benchmarks.bar?.cost || 0)}</span>
              <span>Sales: {formatMoney(benchmarks.bar?.revenue || 0)}</span>
            </div>
          </div>
        </div>

        {/* Fruit Department Cost % */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fruit Dept Cost</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {benchmarks.fruit?.costPercent ?? 0}%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  benchmarks.fruit?.status === "optimal"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                Target: {benchmarks.fruit?.targetRange || "15% - 20%"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>Cost: {formatMoney(benchmarks.fruit?.cost || 0)}</span>
              <span>Sales: {formatMoney(benchmarks.fruit?.revenue || 0)}</span>
            </div>
          </div>
        </div>

        {/* Total COGS (Cost of Goods Sold) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total COGS</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{formatMoney(summary.totalCogs || 0)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Raw inventory consumed across all departments
            </p>
          </div>
        </div>

        {/* Overall Gross Profit & Margin % */}
        <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-950 to-slate-900 p-5 shadow-md text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">Gross Profit Margin</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {summary.overallMarginPercent ?? 0}%
              </span>
              <span className="text-xs text-emerald-200 font-semibold">Gross Margin</span>
            </div>
            <p className="text-[11px] text-slate-300 font-bold mt-1">
              {formatMoney(summary.grossProfit || 0)} Net Gross
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          MENU ENGINEERING MATRIX (BCG QUADRANT CARDS)
      ========================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Menu Engineering Matrix (Popularity vs. Profitability)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Psychological classification of your menu to help you decide what to promote, reprice, or re-engineer.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0 text-xs font-bold text-slate-500">
            <span>{summary.activeSoldItemsCount || 0} active menu items analyzed</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* ⭐ Stars */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">
                ⭐ Stars ({summary.quadrants?.starsCount || 0})
              </span>
              <span className="text-[10px] font-bold text-amber-700 uppercase">High Vol • High Profit</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Top winners. High customer demand and excellent profit margins. Keep quality consistent and place prominently.
            </p>
          </div>

          {/* 🚜 Workhorses */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-black text-blue-900">
                🚜 Workhorses ({summary.quadrants?.workhorsesCount || 0})
              </span>
              <span className="text-[10px] font-bold text-blue-700 uppercase">High Vol • Low Profit</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Customer favorites with low margin. Increase selling price slightly or optimize recipe cost to boost gross profit.
            </p>
          </div>

          {/* 🧩 Puzzles */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-100 px-2 py-1 text-xs font-black text-purple-900">
                🧩 Puzzles ({summary.quadrants?.puzzlesCount || 0})
              </span>
              <span className="text-[10px] font-bold text-purple-700 uppercase">Low Vol • High Profit</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              High margin dishes/drinks that do not sell often. Train waitstaff to upsell or rename and feature on promo boards.
            </p>
          </div>

          {/* 📉 Underperformers */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2 py-1 text-xs font-black text-rose-900">
                📉 Underperformers ({summary.quadrants?.underperformersCount || 0})
              </span>
              <span className="text-[10px] font-bold text-rose-700 uppercase">Low Vol • Low Profit</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Low demand and low margins. Consider replacing ingredients, significantly changing presentation, or removing.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          ITEM-BY-ITEM RECIPE & MARGIN EXPLORER TABLE
      ========================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
              Menu Item Recipe & Gross Margin Explorer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed cost price, customer selling price, unit margin, and real sales volume per item.
            </p>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter Pills */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {[
                { id: "all", label: "All Depts" },
                { id: "food", label: "Kitchen Food", icon: Utensils },
                { id: "bar", label: "Bar & Drinks", icon: Wine },
                { id: "fruit", label: "Fruit Dept", icon: Flame },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartment(d.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                    department === d.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {d.icon && <d.icon className="h-3 w-3" />}
                  {d.label}
                </button>
              ))}
            </div>

            {/* Margin Status Dropdown */}
            <select
              value={marginFilter}
              onChange={(e) => setMarginFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Profit Margins</option>
              <option value="star">⭐ Star Margins (&ge;70%)</option>
              <option value="healthy">✅ Healthy Margins (55%-70%)</option>
              <option value="low_margin">⚠️ Low Margins (&lt;55%)</option>
              <option value="uncosted">🚨 Uncosted Items (0 ETB Cost)</option>
            </select>

            {/* Quick Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dish or drink..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {summary.uncostedItemsCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>{summary.uncostedItemsCount} menu items</strong> have no purchase cost assigned (`cost_price` = 0). Click the <strong>Pencil</strong> icon on any row to input the real supplier purchase price.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMarginFilter("uncosted")}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition"
            >
              Filter Uncosted Only
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>Menu Item</span>
                    {sortField === "name" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th className="py-3.5 px-4">Dept / Category</th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("sellingPrice")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Selling Price</span>
                    {sortField === "sellingPrice" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("costPrice")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cost Price</span>
                    {sortField === "costPrice" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("unitGrossProfit")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Unit Margin</span>
                    {sortField === "unitGrossProfit" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("marginPercent")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Margin %</span>
                    {sortField === "marginPercent" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("soldQty")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Sold ({timeframe})</span>
                    {sortField === "soldQty" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700"
                  onClick={() => toggleSort("grossProfit")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Gross Profit</span>
                    {sortField === "grossProfit" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <PieChart className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-600">No items match your filter criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the search or margin filter above.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isUncosted = item.costPrice <= 0;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${isUncosted ? "bg-amber-50/30" : ""}`}
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.quadrant === "star" && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-100/80 px-1.5 py-0.5 rounded">
                              ⭐ Star
                            </span>
                          )}
                        </div>
                        {item.productCode && (
                          <span className="text-[10px] text-slate-400 font-mono">{item.productCode}</span>
                        )}
                      </td>

                      {/* Dept & Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.department === "bar"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : item.department === "fruit"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.department === "bar" ? (
                            <Wine className="h-2.5 w-2.5" />
                          ) : item.department === "fruit" ? (
                            <Flame className="h-2.5 w-2.5" />
                          ) : (
                            <Utensils className="h-2.5 w-2.5" />
                          )}
                          {item.categoryName || item.department}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-800">
                        {formatMoney(item.sellingPrice)}
                      </td>

                      {/* Cost Price with Edit Trigger */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUncosted ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Uncosted (0 ETB)
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-600">
                              {formatMoney(item.costPrice)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(item);
                              setNewCostPrice(item.costPrice > 0 ? item.costPrice : "");
                            }}
                            title="Update Cost Price"
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Margin */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                        +{formatMoney(item.unitGrossProfit)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-black text-xs ${
                              isUncosted
                                ? "text-slate-400"
                                : item.marginPercent >= 70
                                ? "text-emerald-700"
                                : item.marginPercent >= 55
                                ? "text-amber-700"
                                : "text-rose-700"
                            }`}
                          >
                            {isUncosted ? "N/A" : `${item.marginPercent}%`}
                          </span>
                          {!isUncosted && (
                            <span className="text-[10px] text-slate-400">
                              Cost: {item.costPercent}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sold Qty */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                        {item.soldQty.toLocaleString()} {item.unit}
                      </td>

                      {/* Total Gross Profit */}
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatMoney(item.grossProfit)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isUncosted ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(item);
                              setNewCostPrice("");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-[10px] font-black transition cursor-pointer shadow-xs"
                          >
                            <Pencil className="h-3 w-3" />
                            Set Cost
                          </button>
                        ) : item.marginPercent >= 70 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Star Margin
                          </span>
                        ) : item.marginPercent >= 55 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            Healthy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            Low Margin
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          QUICK COST PRICE UPDATE MODAL
      ========================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-indigo-600" />
                  Assign Purchase / Recipe Cost
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCost} className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Selling Price:</span>
                  <span className="font-extrabold text-slate-900">{formatMoney(editingProduct.sellingPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Assigned Cost:</span>
                  <span className="font-bold text-slate-600">
                    {editingProduct.costPrice > 0 ? formatMoney(editingProduct.costPrice) : "0 ETB (Uncosted)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Raw Unit Cost / Purchase Price (ETB) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ETB
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    placeholder="e.g. 150.00"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-12 pr-4 text-sm font-extrabold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter how much the venue pays to acquire or prepare one {editingProduct.unit || "portion"}.
                </p>
              </div>

              {/* Dynamic Simulated Margin Preview */}
              {newCostPrice && !isNaN(parseFloat(newCostPrice)) && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-indigo-900 font-semibold">Simulated Gross Margin:</span>
                    <span className="font-black text-indigo-950">
                      +{formatMoney(Math.max(editingProduct.sellingPrice - parseFloat(newCostPrice), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700 font-semibold">Margin %:</span>
                    <span className="font-black text-indigo-700">
                      {editingProduct.sellingPrice > 0
                        ? `${Math.round(((editingProduct.sellingPrice - parseFloat(newCostPrice)) / editingProduct.sellingPrice) * 1000) / 10}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCost}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingCost ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save Cost Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
