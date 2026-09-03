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
      setError("");
      const res = await api("/purchases").catch(() => []);
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
        const itemDate = new Date(d).toISOString().split("T")[0];
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/purchasing"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
              <Truck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Purchasing & Procurement Reports
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Supplier expenditure audits, goods receipt tracking, and vendor credit accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => printReportArea("purchasing-reports-printable-area", "Purchasing_Audit_Report")}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            Print Purchasing Audit
          </button>

          <button
            onClick={fetchPurchases}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print-hide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Period:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activePreset === preset.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 bg-slate-50">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset("");
                  setCurrentPage(1);
                }}
                className="bg-transparent outline-none text-slate-800 font-bold"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 bg-slate-50">
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset("");
                  setCurrentPage(1);
                }}
                className="bg-transparent outline-none text-slate-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Status + Supplier Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Received">Received (Delivered)</option>
              <option value="Ordered">Pending Delivery</option>
              <option value="Paid">Paid Out</option>
              <option value="Credit">Credit / Unpaid</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400">Supplier:</span>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 outline-none"
            >
              <option value="All">All Suppliers</option>
              {suppliersList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO number, vendor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-56 rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT AREA */}
      <div id="purchasing-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                PURCHASING, SUPPLIER PROCUREMENT & VENDOR AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Procurement Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">Vendor Filter: {selectedSupplier}</p>
            </div>
          </div>
        </div>

        {/* KPI STAT CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Purchases Spend</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-950">{formatMoney(kpis.totalSpend)}</p>
            <p className="mt-1 text-xs text-emerald-700">{kpis.totalOrders} total purchase orders placed</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders Received</span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">
              {kpis.receivedCount} <span className="text-sm font-bold text-slate-400">/ {kpis.totalOrders}</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {kpis.totalItemsReceived} units checked into stock
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Unpaid Credit Balance</span>
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-amber-950">{formatMoney(kpis.creditBalance)}</p>
            <p className="mt-1 text-xs text-amber-700 font-semibold">Payables due to suppliers</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average PO Value</span>
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(kpis.avgPO)}</p>
            <p className="mt-1 text-xs text-slate-400">Average procurement order size</p>
          </div>
        </div>

        {/* TOP SUPPLIERS RANKING & ANALYTICS */}
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

        {/* PURCHASES DETAILED LEDGER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Itemized Purchase Orders Ledger
              </h2>
              <p className="text-xs text-slate-400">
                {filteredPurchases.length} total procurement records matching criteria
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items / Details</th>
                  <th className="py-3 px-4 text-center">Fulfillment</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-center">Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      Loading purchasing report data...
                    </td>
                  </tr>
                ) : paginatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      No purchase records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((p) => {
                    const st = String(p.status || "").toLowerCase();
                    const paySt = String(p.payment_status || "").toLowerCase();

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {p.purchase_number || `PO-#${p.id}`}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {p.supplier_name || "General Supplier"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={p.notes || ""}>
                          {Array.isArray(p.items) && p.items.length > 0
                            ? p.items.map((it) => `${it.quantity}x ${it.product_name || it.name}`).join(", ")
                            : p.notes || `${p.total_items || 1} items`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              st === "received"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status || "ordered"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              paySt === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {p.payment_status || "credit"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                          {p.purchase_date || p.created_at
                            ? new Date(p.purchase_date || p.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {formatMoney(p.total || p.subtotal || p.total_amount || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="rounded-xl border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="rounded-xl border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
              {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs text-slate-900 font-bold">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB — PURCHASING & PROCUREMENT AUDIT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Operational & Financial Audit Report</p>
            </div>
            <div className="text-right">
              <p>Purchasing Officer Signature: ______________________</p>
              <p className="mt-2">General Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}