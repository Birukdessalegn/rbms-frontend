import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Truck,
  CheckCircle2,
  RefreshCw,
  Printer,
  Package,
  CreditCard,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

export default function PurchasingReportsPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState("month");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedSupplier, setSelectedSupplier] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    // Default to last 30 days
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    setFromDate(monthAgo.toISOString().split("T")[0]);
    setToDate(todayStr);
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await api("/purchasing").catch(() => api("/purchases").catch(() => []));
      const raw = res.purchases || res.data || (Array.isArray(res) ? res : []);
      setPurchases(raw);
    } catch (err) {
      console.error("Failed to load purchases:", err);
      setError("Failed to load purchasing report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleApplyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(todayStr);
    } else if (preset === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(todayStr);
    } else if (preset === "all") {
      setFromDate("");
      setToDate("");
    }
    setCurrentPage(1);
  };

  // Distinct suppliers
  const suppliersList = useMemo(() => {
    const set = new Set();
    purchases.forEach((p) => {
      if (p.supplier_name) set.add(p.supplier_name.trim());
    });
    return Array.from(set).sort();
  }, [purchases]);

  // Date + Status + Supplier Filtering
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const d = p.purchase_date || p.created_at || p.createdAt || p.date;
      if (d) {
        let itemDate = "";
        try {
          if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
            itemDate = d.slice(0, 10);
          } else {
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
              itemDate = parsed.toISOString().split("T")[0];
            }
          }
        } catch {
          itemDate = "";
        }

        if (itemDate) {
          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
        }
      }

      if (statusFilter !== "All") {
        const st = String(p.status || "").toLowerCase();
        const paySt = String(p.payment_status || "").toLowerCase();
        if (statusFilter === "Received" && st !== "received") return false;
        if (statusFilter === "Ordered" && st !== "ordered") return false;
        if (statusFilter === "Paid" && paySt !== "paid") return false;
        if (statusFilter === "Credit" && paySt !== "credit" && paySt !== "unpaid") return false;
      }

      if (selectedSupplier !== "All" && p.supplier_name !== selectedSupplier) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = String(p.purchase_number || p.id || "").toLowerCase();
        const sName = String(p.supplier_name || "").toLowerCase();
        if (!num.includes(q) && !sName.includes(q)) return false;
      }

      return true;
    });
  }, [purchases, fromDate, toDate, statusFilter, selectedSupplier, searchQuery]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalSpend = 0;
    let receivedCount = 0;
    let pendingCount = 0;
    let creditBalance = 0;
    let totalItemsReceived = 0;

    filteredPurchases.forEach((p) => {
      const amt = Number(p.total || p.subtotal || p.total_amount || 0);
      totalSpend += amt;

      const st = String(p.status || "").toLowerCase();
      if (st === "received") receivedCount++;
      else pendingCount++;

      const paySt = String(p.payment_status || "").toLowerCase();
      if (paySt === "credit" || paySt === "unpaid") {
        creditBalance += amt;
      }

      totalItemsReceived += Number(p.total_items || 0);
    });

    const avgPO = filteredPurchases.length > 0 ? totalSpend / filteredPurchases.length : 0;

    return {
      totalSpend,
      totalOrders: filteredPurchases.length,
      receivedCount,
      pendingCount,
      creditBalance,
      settledPaid: totalSpend - creditBalance,
      avgPO,
      totalItemsReceived,
    };
  }, [filteredPurchases]);

  // Top Suppliers Breakdown
  const supplierSpendRanking = useMemo(() => {
    const map = new Map();
    filteredPurchases.forEach((p) => {
      const s = p.supplier_name || "General Supplier";
      const amt = Number(p.total || 0);
      map.set(s, (map.get(s) || 0) + amt);
    });

    return Array.from(map.entries())
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [filteredPurchases]);

  // Pagination
  const totalPages = Math.ceil(filteredPurchases.length / pageSize) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage]);

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  const handlePrint = () => {
    printReportArea("purchasing-reports-printable-area", "Purchasing & Procurement Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      alert("No purchasing records available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - PURCHASING & PROCUREMENT AUDIT REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n`;
    csv += `Audit Period: "${fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}"\n\n`;

    // Metrics
    csv += "PROCUREMENT SUMMARY METRICS\n";
    csv += `Total Procurement Spend,${kpis.totalSpend.toFixed(2)} ETB\n`;
    csv += `Total Purchase Orders,${kpis.totalOrders}\n`;
    csv += `Orders Received,${kpis.receivedCount}\n`;
    csv += `Pending Deliveries,${kpis.pendingCount}\n`;
    csv += `Unpaid Supplier Credit,${kpis.creditBalance.toFixed(2)} ETB\n`;
    csv += `Settled / Paid Cash,${kpis.settledPaid.toFixed(2)} ETB\n`;
    csv += `Average PO Value,${kpis.avgPO.toFixed(2)} ETB\n\n`;

    // Top suppliers
    if (supplierSpendRanking.length > 0) {
      csv += "TOP SUPPLIER EXPENDITURE RANKING\n";
      csv += "Rank,Vendor / Supplier Name,Total Spend (ETB)\n";
      supplierSpendRanking.forEach((s, idx) => {
        csv += `${idx + 1},"${s.name.replace(/"/g, '""')}",${s.spend.toFixed(2)}\n`;
      });
      csv += "\n";
    }

    // Orders log
    csv += "ITEMIZED PURCHASE ORDERS LEDGER\n";
    csv += "PO Number,Supplier Name,Details / Notes,Fulfillment Status,Payment Status,Date,Total Amount (ETB)\n";
    filteredPurchases.forEach((p) => {
      const pNum = p.purchase_number || `PO-#${p.id}`;
      const sName = p.supplier_name || "General Supplier";
      const notes = (p.notes || "").replace(/"/g, '""');
      const st = p.status || "ordered";
      const paySt = p.payment_status || "credit";
      const dt = p.purchase_date || p.created_at ? new Date(p.purchase_date || p.created_at).toLocaleDateString() : "-";
      const amt = Number(p.total || p.subtotal || p.total_amount || 0).toFixed(2);

      csv += `"${pNum}","${sName}","${notes}","${st}","${paySt}","${dt}",${amt}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Purchasing_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/purchasing"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Purchasing & Procurement Reports
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Supplier expenditure audits, goods receipt tracking, and vendor credit accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchPurchases}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
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

      {/* KPI Stat Cards (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print-hide">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spend</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(kpis.totalSpend)}</p>
          <p className="mt-1 text-xs text-slate-400">Total procurement expenditure</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goods Received</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {kpis.receivedCount} <span className="text-sm font-bold text-slate-400">/ {kpis.totalOrders}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">{kpis.totalItemsReceived} units checked into stock</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Unpaid Credit</span>
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-950">{formatMoney(kpis.creditBalance)}</p>
          <p className="mt-1 text-xs text-amber-700 font-semibold">Payables due to suppliers</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average PO Value</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(kpis.avgPO)}</p>
          <p className="mt-1 text-xs text-slate-400">Average procurement order size</p>
        </div>
      </div>

      {/* Unified Filter Toolbar (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activePreset === p.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search, Custom Dates & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO #, supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Received">Received / Delivered</option>
              <option value="Ordered">Ordered / Pending</option>
              <option value="Paid">Paid Fully</option>
              <option value="Credit">Credit / Unpaid</option>
            </select>

            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="All">All Suppliers</option>
              {suppliersList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="purchasing-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                PURCHASING, PROCUREMENT & VENDOR SPEND AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Procurement Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Audit Period:{" "}
                <span className="font-bold text-slate-900">
                  {fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Purchase Orders:</span>
              <strong className="text-slate-900 font-black">{kpis.totalOrders}</strong>
              <span className="text-[10px] font-semibold text-emerald-700">({kpis.receivedCount} Received)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Spend:</span>
              <strong className="text-slate-900 font-black">{formatMoney(kpis.totalSpend)}</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Settled Cash:</span>
              <strong className="text-emerald-700 font-black">{formatMoney(kpis.settledPaid)}</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Unpaid Credit:</span>
              <strong className="text-rose-700 font-black">{formatMoney(kpis.creditBalance)}</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Avg PO:</span>
              <strong className="text-indigo-700 font-black">{formatMoney(kpis.avgPO)}</strong>
            </div>
          </div>
        </div>

        {/* TOP SUPPLIERS EXPENDITURE RANKING */}
        {supplierSpendRanking.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-600" /> Top Supplier Expenditure Ranking
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 pt-1">
              {supplierSpendRanking.map((s, idx) => (
                <div key={s.name} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <span className="text-[10px] font-black text-emerald-700 uppercase">#{idx + 1} Vendor</span>
                  <p className="font-bold text-xs text-slate-900 truncate mt-0.5" title={s.name}>
                    {s.name}
                  </p>
                  <p className="font-black text-sm text-slate-900 mt-1">{formatMoney(s.spend)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ITEMIZED PURCHASES DETAILED LEDGER */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Truck size={16} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Itemized Purchase Orders Ledger</h2>
                <p className="text-xs text-slate-500">
                  {filteredPurchases.length} total procurement records matching audit criteria
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredPurchases.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredPurchases.length)} of {filteredPurchases.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">PO Number</th>
                  <th className="px-5 py-3">Supplier Name</th>
                  <th className="px-5 py-3">Purchased Items / Notes</th>
                  <th className="px-5 py-3 text-center">Fulfillment</th>
                  <th className="px-5 py-3 text-center">Payment</th>
                  <th className="px-5 py-3 text-center">Date</th>
                  <th className="px-5 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">Loading purchasing report data...</td>
                  </tr>
                ) : paginatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400 italic">
                      No purchase records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((p) => {
                    const st = String(p.status || "").toLowerCase();
                    const paySt = String(p.payment_status || "").toLowerCase();

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">
                          {p.purchase_number || `PO-#${p.id}`}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {p.supplier_name || "General Supplier"}
                        </td>
                        <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={p.notes || ""}>
                          {Array.isArray(p.items) && p.items.length > 0
                            ? p.items.map((it) => `${it.quantity}x ${it.product_name || it.name}`).join(", ")
                            : p.notes || `${p.total_items || 1} items`}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              st === "received"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status || "ordered"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              paySt === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {p.payment_status || "credit"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-400 text-[11px] font-mono">
                          {p.purchase_date || p.created_at
                            ? new Date(p.purchase_date || p.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-5 py-3 text-right font-black text-slate-900">
                          {formatMoney(p.total || p.subtotal || p.total_amount || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider font-bold">
                      Grand Total Procurement Expenditure:
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-black text-slate-900">
                      {formatMoney(kpis.totalSpend)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
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
              <p className="text-[11px] text-slate-600 mt-1">Purchasing & Procurement Officer</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">VERIFIED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Accounts Payable / Finance Officer</p>
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
            <span>THE OAK CLUB & LOUNGE • CONFIDENTIAL PROCUREMENT & SUPPLIER AUDIT</span>
            <span>SYSTEM TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}