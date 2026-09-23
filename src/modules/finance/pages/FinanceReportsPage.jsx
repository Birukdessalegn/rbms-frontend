import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Printer,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
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

function FinanceReportsPage() {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [datePreset, setDatePreset] = useState("today");
  const [typeFilter, setTypeFilter] = useState("All");

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
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
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

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all financial data streams in parallel
      const [posRes, expensesRes, purchasesRes] = await Promise.all([
        api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] }))),
        api("/expenses").catch(() => []),
        api("/purchasing").catch(() => ({ purchases: [] })),
      ]);

      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const expList = Array.isArray(expensesRes) ? expensesRes : expensesRes.expenses || expensesRes.data || [];
      const purList = purchasesRes.purchases || purchasesRes.data || (Array.isArray(purchasesRes) ? purchasesRes : []);

      setOrders(posList);
      setExpenses(expList);
      setPurchases(purList);
    } catch (err) {
      console.error("Failed to fetch financial report data:", err);
      setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Consolidate all financial transactions into a single audit stream
  const ledgerTransactions = useMemo(() => {
    const stream = [];

    // 1. POS Revenue Transactions
    orders.forEach((o) => {
      const rawDate = o.created_at || o.createdAt || o.date;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(o.total || o.total_amount || o.amount || 0);

      const isPaid = o.payment_status === "paid" || o.status === "completed" || o.status === "served";
      const isCredit = o.payment_method === "credit" || o.payment_status === "credit_pending";

      const rawTimestamp = rawDate ? new Date(rawDate).getTime() : 0;

      stream.push({
        id: `REV-${o.id || o.order_id}`,
        type: "Revenue",
        title: `POS Ticket #${o.id || o.order_id} (${o.table_name || o.table_number || "Order"})`,
        category: "Sales Revenue",
        paymentMethod: o.payment_method || "cash",
        amount: amt,
        isIncome: true,
        date: dateStr,
        time: timeStr,
        timestamp: isNaN(rawTimestamp) ? 0 : rawTimestamp,
        status: isPaid ? "Verified" : isCredit ? "Credit Pending" : "Pending",
        raw: o,
      });
    });

    // 2. Expense Transactions
    expenses.forEach((e) => {
      const rawDate = e.date || e.created_at || e.createdAt;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(e.amount || e.total || 0);
      const rawTimestamp = rawDate ? new Date(rawDate).getTime() : 0;

      stream.push({
        id: `EXP-${e.id}`,
        type: "Expense",
        title: e.description || e.title || e.category || "Operating Expense",
        category: e.category || "General Expense",
        paymentMethod: e.payment_method || e.paymentMethod || "cash",
        amount: amt,
        isIncome: false,
        date: dateStr,
        time: timeStr,
        timestamp: isNaN(rawTimestamp) ? 0 : rawTimestamp,
        status: e.status === "approved" || e.status === "paid" ? "Verified" : "Logged",
        raw: e,
      });
    });

    // 3. Purchase Order Expenses
    purchases.forEach((p) => {
      const rawDate = p.created_at || p.createdAt || p.date;
      const dateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const amt = Number(p.total || p.amount || p.total_amount || 0);
      const rawTimestamp = rawDate ? new Date(rawDate).getTime() : 0;

      stream.push({
        id: `PUR-${p.id}`,
        type: "Purchase",
        title: `Supplier PO #${p.po_number || p.id} (${p.supplier_name || "Supplier"})`,
        category: "Stock Purchase",
        paymentMethod: p.payment_status || "credit",
        amount: amt,
        isIncome: false,
        date: dateStr,
        time: timeStr,
        timestamp: isNaN(rawTimestamp) ? 0 : rawTimestamp,
        status: p.status === "received" ? "Verified" : "Pending Supply",
        raw: p,
      });
    });

    return stream.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [orders, expenses, purchases]);

  // Filter transactions by date range, search & type
  const filteredLedger = useMemo(() => {
    return ledgerTransactions.filter((tx) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        tx.id.toLowerCase().includes(query) ||
        tx.title.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query);

      const matchesDate =
        (!startDate || (tx.date && tx.date >= startDate)) &&
        (!endDate || (tx.date && tx.date <= endDate));

      const matchesType =
        typeFilter === "All" ||
        (typeFilter === "Revenue" && tx.isIncome) ||
        (typeFilter === "Expense" && !tx.isIncome);

      return matchesSearch && matchesDate && matchesType;
    });
  }, [ledgerTransactions, search, startDate, endDate, typeFilter]);

  // Financial KPI Metrics Calculation
  const totalRevenue = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.isIncome && tx.status === "Verified")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const totalExpenses = useMemo(() => {
    return filteredLedger
      .filter((tx) => !tx.isIncome)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const netProfit = useMemo(() => {
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);

  const cashInflow = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.isIncome && (tx.paymentMethod || "").toLowerCase().includes("cash"))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const digitalInflow = useMemo(() => {
    return filteredLedger
      .filter(
        (tx) =>
          tx.isIncome &&
          ((tx.paymentMethod || "").toLowerCase().includes("telebirr") ||
            (tx.paymentMethod || "").toLowerCase().includes("bank") ||
            (tx.paymentMethod || "").toLowerCase().includes("transfer") ||
            (tx.paymentMethod || "").toLowerCase().includes("cbe"))
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLedger.length / pageSize) || 1;
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLedger.slice(start, start + pageSize);
  }, [filteredLedger, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("finance-reports-printable-area", "Consolidated Financial Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredLedger.length === 0) {
      alert("No financial records available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - CONSOLIDATED FINANCIAL AUDIT STATEMENT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n`;
    csv += `Audit Period: "${startDate && endDate ? `${startDate} to ${endDate}` : "All Time"}"\n\n`;

    // Metrics summary
    csv += "FINANCIAL EXECUTIVE SUMMARY\n";
    csv += `Total Verified Revenue,${totalRevenue.toFixed(2)} ETB\n`;
    csv += `Total Expenses & Purchases,${totalExpenses.toFixed(2)} ETB\n`;
    csv += `Net Cash Margin,${netProfit.toFixed(2)} ETB\n`;
    csv += `Verified Cash Inflow,${cashInflow.toFixed(2)} ETB\n`;
    csv += `Verified Digital Inflow,${digitalInflow.toFixed(2)} ETB\n\n`;

    // Ledger stream
    csv += "CONSOLIDATED FINANCIAL LEDGER STREAM\n";
    csv += "Ref ID,Type,Transaction Details,Category,Payment Method,Status,Date,Time,Amount (ETB)\n";
    filteredLedger.forEach((tx) => {
      const sign = tx.isIncome ? "+" : "-";
      csv += `"${tx.id}","${tx.type}","${tx.title.replace(/"/g, '""')}","${tx.category.replace(/"/g, '""')}","${tx.paymentMethod}","${tx.status}","${tx.date}","${tx.time}",${sign}${tx.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Consolidated Financial Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit live restaurant revenue, operating expenditures, supplier bills, and net cash margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchFinancialData}
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

      {/* KPI STAT CARDS (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print-hide">
        <ReportStatCard
          title="Verified Revenue"
          value={loading ? "..." : `${totalRevenue.toLocaleString()} ETB`}
          description="Total settled POS sales inflow"
          icon={TrendingUp}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Operating & Stock Expenses"
          value={loading ? "..." : `${totalExpenses.toLocaleString()} ETB`}
          description="Costs, purchases, and vouchers"
          icon={TrendingDown}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <ReportStatCard
          title="Net Cash Margin"
          value={loading ? "..." : `${netProfit.toLocaleString()} ETB`}
          description={netProfit >= 0 ? "Operating profit surplus" : "Operating deficit"}
          icon={Wallet}
          colorClass={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          bgClass={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
        />
        <ReportStatCard
          title="Digital vs Cash Ratio"
          value={loading ? "..." : `${digitalInflow.toLocaleString()} ETB`}
          description={`Cash: ${cashInflow.toLocaleString()} ETB`}
          icon={CreditCard}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
      </div>

      {/* UNIFIED FILTER TOOLBAR (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search, Custom Dates & Type */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transaction, ref, method..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Transactions</option>
              <option value="Revenue">Revenue Inflow Only</option>
              <option value="Expense">Expense & Purchases Outflow</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="finance-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                CONSOLIDATED FINANCIAL STATEMENT, REVENUE & EXPENSE AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Financial Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Audit Period:{" "}
                <span className="font-bold text-slate-900">
                  {startDate && endDate ? `${startDate} to ${endDate}` : "All Time"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Verified Revenue:</span>
              <strong className="text-emerald-700 font-black">+{totalRevenue.toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Outflows:</span>
              <strong className="text-red-700 font-black">-{totalExpenses.toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">NET CASH MARGIN:</span>
              <strong className={`font-black ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {netProfit.toLocaleString()} ETB
              </strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Cash Inflow:</span>
              <strong className="text-slate-900 font-black">{cashInflow.toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Digital / Bank:</span>
              <strong className="text-sky-700 font-black">{digitalInflow.toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

        {/* FINANCIAL LEDGER STREAM TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <FileText size={16} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Consolidated Financial Ledger Stream</h2>
                <p className="text-xs text-slate-500">Comprehensive chronological audit trail of all revenue, operating costs, and purchases</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredLedger.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredLedger.length)} of {filteredLedger.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Ref ID</th>
                  <th className="px-5 py-3">Transaction Details</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Payment Method</th>
                  <th className="px-5 py-3 text-center">Audit Status</th>
                  <th className="px-5 py-3 text-right">Date & Time</th>
                  <th className="px-5 py-3 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400">Loading financial ledger records...</td>
                  </tr>
                ) : paginatedLedger.length > 0 ? (
                  paginatedLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{tx.id}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">{tx.title}</td>
                      <td className="px-5 py-3 font-semibold text-slate-600">{tx.category}</td>
                      <td className="px-5 py-3 capitalize font-semibold text-slate-700">{tx.paymentMethod.replace("_", " ")}</td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            tx.status === "Verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500">{tx.date} {tx.time}</td>
                      <td
                        className={`px-5 py-3 text-right font-black text-sm ${
                          tx.isIncome ? "text-emerald-700 bg-emerald-50/40" : "text-red-700 bg-red-50/40"
                        }`}
                      >
                        {tx.isIncome ? "+" : "-"}{tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-400 italic">
                      No financial transactions match your selected search or date range.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredLedger.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider">
                      Verified Revenue Subtotal:
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-black text-emerald-800">
                      +{totalRevenue.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-2.5 text-right text-xs uppercase tracking-wider">
                      Total Expenses & Purchases:
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-black text-red-700">
                      -{totalExpenses.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="bg-slate-200/90 font-black text-slate-950 border-t border-slate-300">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider">
                      NET CASH MARGIN:
                    </td>
                    <td
                      className={`px-5 py-3 text-right text-base font-black ${
                        netProfit >= 0 ? "text-emerald-800" : "text-red-800"
                      }`}
                    >
                      {netProfit.toLocaleString()} ETB
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
              <p className="text-[11px] text-slate-600 mt-1">Finance Officer / Head Accountant</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">VERIFIED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">Internal Financial Auditor</p>
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
            <span>THE OAK CLUB & LOUNGE • CONFIDENTIAL FINANCIAL STATEMENT & FISCAL AUDIT</span>
            <span>SYSTEM TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceReportsPage;
