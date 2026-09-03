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
  const [typeFilter, setTypeFilter] = useState("All");

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
        status: p.status === "received" ? "Verified" : "Pending Supply",
        raw: p,
      });
    });

    return stream.sort((a, b) => new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time));
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

  const netProfit = totalRevenue - totalExpenses;

  const totalDigitalSales = useMemo(() => {
    return filteredLedger
      .filter((tx) => tx.isIncome && (tx.paymentMethod.includes("mobile") || tx.paymentMethod.includes("card") || tx.paymentMethod.includes("telebirr")))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredLedger]);

  const handlePrint = () => {
    printReportArea("finance-reports-printable-area", "Finance Revenue & Expense Audit Report");
  };

  return (
    <div className="space-y-6">
      {/* SCREEN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Executive Financial Audit & Profit Report
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Real-time financial ledger, verified sales revenue, operating expenses & net margin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFinancialData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print Financial Audit
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Verified Sales Revenue"
          value={loading ? "..." : `${totalRevenue.toLocaleString()} ETB`}
          description="Gross POS sales collected"
          icon={TrendingUp}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Total Expenses & Purchases"
          value={loading ? "..." : `${totalExpenses.toLocaleString()} ETB`}
          description="Operating & stock costs"
          icon={TrendingDown}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
        <ReportStatCard
          title="Net Cash Margin"
          value={loading ? "..." : `${netProfit.toLocaleString()} ETB`}
          description={netProfit >= 0 ? "Positive Net Cashflow" : "Net Deficit"}
          icon={netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
          colorClass={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          bgClass={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
        />
        <ReportStatCard
          title="Digital Money (Telebirr/Card)"
          value={loading ? "..." : `${totalDigitalSales.toLocaleString()} ETB`}
          description="Non-cash transactions"
          icon={CreditCard}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transaction ID, category, or payment method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="All">All Transactions</option>
              <option value="Revenue">Sales Revenue Only</option>
              <option value="Expense">Expenses & Purchases Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE FINANCIAL AUDIT REPORT */}
      <div id="printable-report" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {/* REPORT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">THE OAK CLUB</h2>
            <p className="text-xs font-bold text-slate-500 uppercase">Executive Financial & Profit Margin Audit Report</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Period: <span className="text-slate-900">{startDate} to {endDate}</span></p>
            <p className="text-xs text-slate-400">Total Ledger Entries: {filteredLedger.length}</p>
          </div>
        </div>

        {/* FINANCIAL LEDGER STREAM TABLE */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Consolidated Financial Revenue & Expense Ledger Stream
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 font-extrabold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ref ID</th>
                  <th className="px-4 py-3">Transaction Details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-center">Audit Status</th>
                  <th className="px-4 py-3 text-right">Date & Time</th>
                  <th className="px-4 py-3 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">Loading financial ledger records...</td>
                  </tr>
                ) : filteredLedger.length > 0 ? (
                  filteredLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{tx.title}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{tx.category}</td>
                      <td className="px-4 py-3 capitalize font-semibold text-slate-700">{tx.paymentMethod.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${
                          tx.status === "Verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{tx.date} {tx.time}</td>
                      <td className={`px-4 py-3 text-right font-black text-sm ${
                        tx.isIncome ? "text-emerald-700 bg-emerald-50/40" : "text-red-700 bg-red-50/40"
                      }`}>
                        {tx.isIncome ? "+" : "-"}{tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400 italic">No financial transactions match your selected search or date range.</td>
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
              <p className="font-extrabold uppercase">THE OAK CLUB — FINANCIAL AUDIT STATEMENT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Executive Financial & Fiscal Audit Report</p>
            </div>
            <div className="text-right">
              <p>Finance Officer / Accountant: ______________________</p>
              <p className="mt-2">General Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceReportsPage;
