import { useState, useEffect, useMemo } from "react";
import {
  X,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  FileText,
  Building2,
  UtensilsCrossed,
  Wine,
  Wallet,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import api from "../../../services/api";
import { printZReportThermal, printReportArea } from "../../../utils/printHelper";
import { useAuth } from "../../../context/AuthContext";

export default function DailyZReportModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Load financial streams for the Z-report
  const loadZReportData = async () => {
    try {
      setLoading(true);

      const [ordersRes, shiftsRes, expensesRes, purchasesRes] = await Promise.all([
        api("/pos/orders").catch(() => api("/orders").catch(() => ({ orders: [] }))),
        api("/finance/cashier-shifts").catch(() => api("/pos/shifts").catch(() => ({ shifts: [] }))),
        api("/expenses").catch(() => []),
        api("/purchasing").catch(() => ({ purchases: [] })),
      ]);

      const orderList = ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []);
      const shiftList = shiftsRes.data?.shifts || shiftsRes.shifts || shiftsRes.data || (Array.isArray(shiftsRes) ? shiftsRes : []);
      const expList = Array.isArray(expensesRes) ? expensesRes : expensesRes.expenses || expensesRes.data || [];
      const purList = purchasesRes.purchases || purchasesRes.data || (Array.isArray(purchasesRes) ? purchasesRes : []);

      setOrders(orderList);
      setShifts(shiftList);
      setExpenses(expList);
      setPurchases(purList);
    } catch (err) {
      console.error("Failed to load Z-Report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadZReportData();
    }
  }, [isOpen]);

  // Aggregate metrics for selected date
  const zMetrics = useMemo(() => {
    // 1. Filter orders for selected business date
    const dayOrders = orders.filter((o) => {
      const rawDate = o.created_at || o.createdAt || o.date;
      const orderDateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      return orderDateStr === selectedDate;
    });

    let grossSales = 0;
    let foodSales = 0;
    let barSales = 0;
    let otherSales = 0;
    let cashSales = 0;
    let telebirrSales = 0;
    let bankSales = 0;
    let cardSales = 0;
    let creditSales = 0;

    dayOrders.forEach((o) => {
      const total = Number(o.total || o.total_amount || o.amount || 0);
      grossSales += total;

      // Method breakdown
      const method = String(o.payment_method || o.paymentMethod || "").toLowerCase();
      if (method.includes("cash") || !method) cashSales += total;
      else if (method.includes("telebirr")) telebirrSales += total;
      else if (method.includes("bank") || method.includes("cbe") || method.includes("transfer")) bankSales += total;
      else if (method.includes("card") || method.includes("pos")) cardSales += total;
      else if (method.includes("credit") || o.payment_status === "credit_approved" || o.payment_status === "credit_pending") creditSales += total;
      else cashSales += total;

      // Department breakdown from items
      const items = Array.isArray(o.items) ? o.items : [];
      let orderFood = 0;
      let orderBar = 0;

      items.forEach((it) => {
        const itemAmt = Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || it.price || 0)));
        const cat = String(it.category || it.category_name || it.category_type || "").toLowerCase();
        const name = String(it.name || it.product_name || "").toLowerCase();

        if (cat.includes("food") || cat.includes("kitchen") || name.includes("burger") || name.includes("pizza") || name.includes("salad")) {
          orderFood += itemAmt;
        } else if (cat.includes("bar") || cat.includes("beverage") || cat.includes("drink") || name.includes("beer") || name.includes("wine") || name.includes("whiskey")) {
          orderBar += itemAmt;
        } else {
          orderFood += itemAmt;
        }
      });

      if (items.length > 0) {
        foodSales += orderFood;
        barSales += orderBar;
      } else {
        // Fallback ratio
        foodSales += total * 0.6;
        barSales += total * 0.4;
      }
    });

    otherSales = Math.max(0, grossSales - (foodSales + barSales));
    const ticketsCount = dayOrders.length;
    const avgTicket = ticketsCount > 0 ? grossSales / ticketsCount : 0;

    // 2. Filter shifts for selected business date
    const dayShifts = shifts.filter((s) => {
      const rawDate = s.start_time || s.opened_at || s.created_at;
      const shiftDateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      return shiftDateStr === selectedDate;
    });

    let openingFloat = 0;
    let expectedCash = 0;
    let actualCash = 0;
    let variance = 0;

    dayShifts.forEach((s) => {
      openingFloat += Number(s.opening_cash || 0);
      expectedCash += Number(s.expected_cash || 0);
      actualCash += Number(s.actual_cash || 0);
      variance += Number(s.shortage_overage ?? (Number(s.actual_cash || 0) - Number(s.expected_cash || 0)));
    });

    // If no closed shifts recorded, fallback expected cash to cashSales + openingFloat
    if (dayShifts.length === 0) {
      expectedCash = cashSales;
      actualCash = cashSales;
    }

    // 3. Filter cash expenses for selected business date
    const dayExpenses = expenses.filter((e) => {
      const rawDate = e.date || e.created_at;
      const expDateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      return expDateStr === selectedDate;
    });

    let cashExpenses = 0;
    dayExpenses.forEach((e) => {
      const m = String(e.payment_method || e.paymentMethod || "cash").toLowerCase();
      if (m.includes("cash")) {
        cashExpenses += Number(e.amount || e.total || 0);
      }
    });

    // 4. Filter cash supplier payouts
    const dayPurchases = purchases.filter((p) => {
      const rawDate = p.created_at || p.date;
      const purDateStr = rawDate ? String(rawDate).split(/[T ]/)[0] : "";
      return purDateStr === selectedDate;
    });

    let cashPurchases = 0;
    dayPurchases.forEach((p) => {
      const isPaid = p.payment_status === "paid";
      const m = String(p.payment_method || "").toLowerCase();
      if (isPaid && (m.includes("cash") || !m)) {
        cashPurchases += Number(p.total || p.amount || 0);
      }
    });

    // 5. Net Cash to deposit in safe
    const totalCashOutflow = cashExpenses + cashPurchases;
    const netCashForSafe = Math.max(0, actualCash - totalCashOutflow);

    return {
      restaurantName: "THE OAK",
      restaurantSub: "RESTAURANT & BAR",
      businessDate: selectedDate,
      auditorName: user?.username || user?.first_name || "Manager",
      grossSales,
      foodSales,
      barSales,
      otherSales,
      ticketsCount,
      avgTicket,
      cashSales,
      telebirrSales,
      bankSales,
      cardSales,
      creditSales,
      openingFloat,
      expectedCash,
      actualCash,
      variance,
      cashExpenses,
      cashPurchases,
      totalCashOutflow,
      netCashForSafe,
      shiftCount: dayShifts.length,
    };
  }, [orders, shifts, expenses, purchases, selectedDate, user]);

  if (!isOpen) return null;

  const handlePrintReceipt = () => {
    printZReportThermal(zMetrics);
  };

  const handlePrintFullPage = () => {
    printReportArea("daily-z-report-printable-area", `Official Daily Z-Report - ${selectedDate}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl my-8">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <Receipt size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Daily Financial Z-Report</h2>
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Closing Audit
                </span>
              </div>
              <p className="text-xs text-slate-500">Official End-of-Day register audit and cash reconciliation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold">
              <Calendar size={14} className="text-slate-500" />
              <span>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Selected Audit Date:</span>
            <span className="font-black text-slate-900">{new Date(selectedDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            {zMetrics.variance !== 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800">
                <AlertTriangle size={11} /> Variance: {zMetrics.variance > 0 ? "+" : ""}{zMetrics.variance.toLocaleString()} ETB
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                <CheckCircle2 size={11} /> Drawer Balanced
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-100 transition cursor-pointer"
              title="Print on standard 80mm thermal receipt printer"
            >
              <Receipt size={14} className="text-amber-600" />
              Print Thermal (80mm)
            </button>
            <button
              type="button"
              onClick={handlePrintFullPage}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
              title="Print full A4 summary document"
            >
              <Printer size={14} />
              Print Full A4 Report
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div id="daily-z-report-printable-area" className="mt-5 space-y-5">
          {/* Executive KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gross Sales</p>
              <p className="mt-1 text-xl font-black text-slate-900">+{zMetrics.grossSales.toLocaleString()} ETB</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{zMetrics.ticketsCount} tickets served</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actual Cash Counted</p>
              <p className="mt-1 text-xl font-black text-slate-900">{zMetrics.actualCash.toLocaleString()} ETB</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">From {zMetrics.shiftCount} cashier shift{zMetrics.shiftCount === 1 ? "" : "s"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Payouts & Expenses</p>
              <p className="mt-1 text-xl font-black text-rose-600">-{zMetrics.totalCashOutflow.toLocaleString()} ETB</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Paid from drawer</p>
            </div>

            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Net Cash for Safe</p>
              <p className="mt-1 text-xl font-black text-emerald-800">{zMetrics.netCashForSafe.toLocaleString()} ETB</p>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-700">Physical cash to deposit</p>
            </div>
          </div>

          {/* 3 Detail Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Sales by Department */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <UtensilsCrossed size={15} className="text-indigo-600" />
                <span>1. Sales by Department</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Food / Kitchen Sales:</span>
                  <span className="font-bold text-slate-900">{zMetrics.foodSales.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Bar / Beverage Sales:</span>
                  <span className="font-bold text-slate-900">{zMetrics.barSales.toLocaleString()} ETB</span>
                </div>
                {zMetrics.otherSales > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Other Sales:</span>
                    <span className="font-bold text-slate-900">{zMetrics.otherSales.toLocaleString()} ETB</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                  <span>Average Bill / Ticket:</span>
                  <span className="font-semibold">{zMetrics.avgTicket.toFixed(2)} ETB</span>
                </div>
              </div>
            </div>

            {/* Column 2: Payment Tender Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <CreditCard size={15} className="text-blue-600" />
                <span>2. Payment Breakdown</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold text-slate-700">Cash Inflow:</span>
                  <span className="font-bold text-slate-900">{zMetrics.cashSales.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Telebirr Digital:</span>
                  <span className="font-bold text-slate-900">{zMetrics.telebirrSales.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>CBE / Bank Transfer:</span>
                  <span className="font-bold text-slate-900">{zMetrics.bankSales.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Card POS:</span>
                  <span className="font-bold text-slate-900">{zMetrics.cardSales.toLocaleString()} ETB</span>
                </div>
                {zMetrics.creditSales > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-amber-700">VIP Credit (Pending):</span>
                    <span className="font-bold text-amber-700">{zMetrics.creditSales.toLocaleString()} ETB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Cash Drawer Reconciliation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <Wallet size={15} className="text-emerald-600" />
                <span>3. Cash Drawer Audit</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Opening Float:</span>
                  <span className="font-bold text-slate-900">{zMetrics.openingFloat.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Expected Drawer Cash:</span>
                  <span className="font-bold text-slate-900">{zMetrics.expectedCash.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold text-slate-800">Actual Counted Cash:</span>
                  <span className="font-black text-slate-950">{zMetrics.actualCash.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-600">Drawer Variance:</span>
                  <span className={`font-black ${zMetrics.variance === 0 ? "text-emerald-700" : zMetrics.variance > 0 ? "text-blue-700" : "text-rose-700"}`}>
                    {zMetrics.variance > 0 ? "+" : ""}{zMetrics.variance.toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <span>Audited By: </span>
              <span className="font-bold text-slate-900">{zMetrics.auditorName}</span>
            </div>
            <div>
              <span>Generated at: </span>
              <span className="font-semibold text-slate-700">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
