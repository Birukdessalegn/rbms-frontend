import { printReportArea } from "../../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Clock3,
  CheckCircle2,
  Printer,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  Apple,
  ShoppingBag,
} from "lucide-react";
import api from "../../../../services/api";

// Helper: Check if an item belongs to Fruit station
function isFruitItem(item) {
  if (!item) return false;
  const name = String(item.product_name || item.name || item.description || "").toLowerCase().trim();
  const cat = String(item.category_name || item.category || "").toLowerCase().trim();
  const catType = String(item.category_type || "").toLowerCase().trim();
  const tags = String(item.tags || item.tag || "").toLowerCase().trim();

  const nonFruitExclusions = [
    "burger", "pizza", "fast food", "main dish", "pasta", "meat", "steak",
    "chicken", "beef", "pork", "soup", "sandwich", "bakery", "bread",
    "hot dish", "side dish", "breakfast", "appetizer", "beer", "wine",
    "whiskey", "vodka", "gin", "spirit", "liquor", "cocktail"
  ];
  if (nonFruitExclusions.some((ex) => cat.includes(ex) || catType.includes(ex))) {
    if (!name.includes("fruit") && !tags.includes("fruit")) {
      return false;
    }
  }

  if (
    cat === "fruit" ||
    catType === "fruit" ||
    cat.includes("fruit") ||
    tags.includes("fruit")
  ) {
    return true;
  }

  const fruitKeywords = [
    "fruit", "watermelon", "apple", "orange", "banana", "mango", "pineapple",
    "strawberry", "avocado", "grape", "papaya", "smoothie", "juice", "platter", "lemon"
  ];
  return fruitKeywords.some((kw) => name.includes(kw));
}

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

export default function FruitReportsPage() {
  const [fruitOrdersList, setFruitOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleApplyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (preset === "today") {
      const todayStr = formatDate(today);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setFromDate(formatDate(w));
      setToDate(formatDate(today));
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDate(m));
      setToDate(formatDate(today));
    } else {
      setFromDate("");
      setToDate("");
    }
    setCurrentPage(1);
  };

  const parseRawItems = (itemsInput) => {
    if (!itemsInput) return [];
    if (typeof itemsInput === "string") {
      try {
        return JSON.parse(itemsInput);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(itemsInput) ? itemsInput : [];
  };

  const fetchFruitOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const [kitchenRes, posRes, empRes, prodRes] = await Promise.all([
        api("/kitchen").catch(() => []),
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/employees").catch(() => []),
        api("/products").catch(() => []),
      ]);

      const kitchenList = Array.isArray(kitchenRes) ? kitchenRes : kitchenRes.orders || kitchenRes.data || [];
      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const empList = Array.isArray(empRes) ? empRes : empRes.employees || empRes.data || [];
      const prodList = Array.isArray(prodRes) ? prodRes : prodRes.products || prodRes.data || [];

      const productPriceMap = new Map();
      prodList.forEach((p) => {
        const price = Number(p.price || p.unit_price || p.selling_price || 0);
        if (p.id) productPriceMap.set(String(p.id), price);
        if (p.name) productPriceMap.set(String(p.name).toLowerCase().trim(), price);
      });

      const posOrderMap = new Map();
      posList.forEach((po) => {
        posOrderMap.set(String(po.id), po);
        if (po.order_number) posOrderMap.set(String(po.order_number), po);
      });

      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name || emp.username || "Staff";
        empMap.set(idKey, fullName);
      });

      const combinedMap = new Map();

      // Process kitchen tickets for fruit items
      kitchenList.forEach((kOrder) => {
        const rawItems = parseRawItems(kOrder.items || kOrder.order_items);
        const fruitItems = rawItems.filter(isFruitItem);
        if (fruitItems.length === 0) return;

        const posMatch = posOrderMap.get(String(kOrder.id)) || posOrderMap.get(String(kOrder.order_number)) || {};
        const key = String(kOrder.id || kOrder.order_number);

        const waiter =
          posMatch.waiter_name ||
          [posMatch.waiter_first_name, posMatch.waiter_last_name].filter(Boolean).join(" ") ||
          empMap.get(String(kOrder.waiter_id || kOrder.server_id || posMatch.waiter_id)) ||
          kOrder.waiter_name ||
          "Staff Waiter";

        combinedMap.set(key, {
          id: kOrder.id,
          order_number: kOrder.order_number || posMatch.order_number || `#${kOrder.id}`,
          created_at: kOrder.created_at || posMatch.created_at || new Date().toISOString(),
          status: String(kOrder.status || posMatch.status || "ready").toLowerCase(),
          table_number: kOrder.table_number || posMatch.table_number || posMatch.table_id || "1",
          waiter_name: waiter,
          payment_method: String(posMatch.payment_method || posMatch.paymentMethod || "CASH").toUpperCase(),
          payment_status: String(posMatch.payment_status || posMatch.paymentStatus || "PAID").toUpperCase(),
          items: fruitItems.map((fi) => {
            const pId = String(fi.product_id || fi.id || "");
            const pName = String(fi.product_name || fi.name || "Fruit Item").toLowerCase().trim();
            const fallbackPrice = productPriceMap.get(pId) || productPriceMap.get(pName) || 0;
            const unitPrice = Number(fi.price || fi.unit_price || fallbackPrice);
            const qty = Number(fi.quantity || fi.qty || 1);
            return {
              ...fi,
              name: fi.product_name || fi.name || "Fruit Item",
              quantity: qty,
              unit_price: unitPrice,
              total_price: Number(fi.total || fi.total_price || qty * unitPrice),
            };
          }),
        });
      });

      // Also process POS orders that contain fruit items
      posList.forEach((po) => {
        const key = String(po.id || po.order_number);
        if (combinedMap.has(key)) return;

        const rawItems = parseRawItems(po.items || po.order_items);
        const fruitItems = rawItems.filter(isFruitItem);
        if (fruitItems.length === 0) return;

        const waiter =
          po.waiter_name ||
          [po.waiter_first_name, po.waiter_last_name].filter(Boolean).join(" ") ||
          empMap.get(String(po.waiter_id)) ||
          "Staff Waiter";

        combinedMap.set(key, {
          id: po.id,
          order_number: po.order_number || `#${po.id}`,
          created_at: po.created_at || new Date().toISOString(),
          status: String(po.status || "paid").toLowerCase(),
          table_number: po.table_number || po.table_id || "1",
          waiter_name: waiter,
          payment_method: String(po.payment_method || po.paymentMethod || "CASH").toUpperCase(),
          payment_status: String(po.payment_status || po.paymentStatus || "PAID").toUpperCase(),
          items: fruitItems.map((fi) => {
            const pId = String(fi.product_id || fi.id || "");
            const pName = String(fi.product_name || fi.name || "Fruit Item").toLowerCase().trim();
            const fallbackPrice = productPriceMap.get(pId) || productPriceMap.get(pName) || 0;
            const unitPrice = Number(fi.price || fi.unit_price || fallbackPrice);
            const qty = Number(fi.quantity || fi.qty || 1);
            return {
              ...fi,
              name: fi.product_name || fi.name || "Fruit Item",
              quantity: qty,
              unit_price: unitPrice,
              total_price: Number(fi.total || fi.total_price || qty * unitPrice),
            };
          }),
        });
      });

      const list = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setFruitOrdersList(list);
    } catch (err) {
      console.error("Failed to load Fruit report data:", err);
      setError("Unable to synchronize Fruit shift transactions. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFruitOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return fruitOrdersList.filter((order) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(order.order_number).toLowerCase().includes(q) ||
        String(order.waiter_name).toLowerCase().includes(q) ||
        String(order.table_number).toLowerCase().includes(q) ||
        order.items.some((i) => i.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "All" ||
        order.status.toLowerCase() === statusFilter.toLowerCase();

      let matchesDate = true;
      if (fromDate || toDate) {
        const orderDateStr = new Date(order.created_at).toISOString().split("T")[0];
        if (fromDate && orderDateStr < fromDate) matchesDate = false;
        if (toDate && orderDateStr > toDate) matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [fruitOrdersList, search, statusFilter, fromDate, toDate]);

  // Aggregate metrics
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter((o) =>
    ["ready", "served", "delivered", "paid", "completed"].includes(o.status.toLowerCase())
  ).length;

  let totalFruitRevenue = 0;
  let totalFruitItemsQuantity = 0;
  const fruitItemAggMap = new Map();

  filteredOrders.forEach((o) => {
    o.items.forEach((it) => {
      const q = Number(it.quantity || 1);
      const rev = Number(it.total_price || q * (it.unit_price || 0));
      totalFruitRevenue += rev;
      totalFruitItemsQuantity += q;

      const key = it.name.trim();
      if (!fruitItemAggMap.has(key)) {
        fruitItemAggMap.set(key, {
          name: key,
          quantity: 0,
          revenue: 0,
          avgPrice: it.unit_price || 0,
        });
      }
      const existing = fruitItemAggMap.get(key);
      existing.quantity += q;
      existing.revenue += rev;
    });
  });

  const topFruitItems = useMemo(() => {
    return Array.from(fruitItemAggMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [fruitItemAggMap]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let digital = 0;
    let credit = 0;

    filteredOrders.forEach((o) => {
      const orderRev = o.items.reduce((sum, it) => sum + Number(it.total_price || 0), 0);
      const method = (o.payment_method || "CASH").toUpperCase();
      if (method.includes("CASH")) {
        cash += orderRev;
      } else if (method.includes("CREDIT") || method.includes("VIP")) {
        credit += orderRev;
      } else {
        digital += orderRev;
      }
    });

    return { cash, digital, credit };
  }, [filteredOrders]);

  const netFruitSales = totalFruitRevenue / 1.15;
  const vatAmount = totalFruitRevenue - netFruitSales;

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("fruit-reports-printable-area", "Fruit & Juice Outlet Shift Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    let csv = "Order Number,Date & Time,Table,Waiter,Items Ordered,Payment Method,Payment Status,Preparation Status,Total Fruit Revenue\n";
    filteredOrders.forEach((o) => {
      const dateStr = new Date(o.created_at).toLocaleString().replace(/,/g, " ");
      const itemsStr = o.items.map((it) => `${it.quantity}x ${it.name}`).join(" + ").replace(/,/g, ";");
      const rev = o.items.reduce((s, it) => s + (it.total_price || 0), 0);
      csv += `"${o.order_number}","${dateStr}","${o.table_number}","${o.waiter_name}","${itemsStr}","${o.payment_method}","${o.payment_status}","${o.status}","${rev.toFixed(2)} ETB"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Fruit_Sales_Audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Apple className="h-5 w-5" />
            </div>
            Fruit & Juice Bar Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Comprehensive fruit platters, smoothies, and portion dispensing shift audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Printer size={15} /> Print Report
          </button>
          <button
            type="button"
            onClick={fetchFruitOrders}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Screen Overview Cards (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print-hide">
        <ReportStatCard
          title="Fruit Orders"
          value={totalOrders}
          description={`${completedOrders} settled tickets`}
          icon={Receipt}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Gross Fruit Sales"
          value={`${totalFruitRevenue.toLocaleString()} ETB`}
          description="Total fruit collections"
          icon={TrendingUp}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <ReportStatCard
          title="Platters & Portions"
          value={`${totalFruitItemsQuantity} Units`}
          description="Platters & servings dispensed"
          icon={Apple}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
        <ReportStatCard
          title="Cash in Till"
          value={`${paymentBreakdown.cash.toLocaleString()} ETB`}
          description={`Digital: ${paymentBreakdown.digital.toLocaleString()} ETB`}
          icon={ShoppingBag}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
      </div>

      {/* Unified Filter Toolbar (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset("custom");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
            >
              <option value="All">All Statuses</option>
              <option value="ready">Ready / Served</option>
              <option value="preparing">Preparing</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="fruit-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">BOOST ADDIS</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                FRUIT & JUICE OUTLET SALES, PORTIONS & SHIFT AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Fruit Operations Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600 font-semibold">
                Audit Scope: {fromDate && toDate ? `${fromDate} to ${toDate}` : "All Recorded Orders"}
              </p>
            </div>
          </div>
        </div>

        {/* 4 CLEAN METRIC CARDS IN 2x2 COMPACT GRID */}
        <div className="kpi-grid-2x2 grid grid-cols-2 gap-3 my-3">
          <div className="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="card-title text-[10px] font-bold uppercase tracking-wider text-slate-500">Orders Handled</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="card-value text-xl font-black text-slate-900">{totalOrders}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{completedOrders} Settled
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Customer fruit orders served</p>
          </div>

          <div className="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="card-title text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Fruit Revenue</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="card-value text-xl font-black text-amber-700">{totalFruitRevenue.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                ETB
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Total fruit station collections</p>
          </div>

          <div className="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="card-title text-[10px] font-bold uppercase tracking-wider text-slate-500">Platters & Servings</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="card-value text-xl font-black text-purple-700">{totalFruitItemsQuantity}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                Units
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Fruit platters & juices dispensed</p>
          </div>

          <div className="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="card-title text-[10px] font-bold uppercase tracking-wider text-slate-500">Cash / Digital Inflow</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="card-value text-xl font-black text-slate-900">{paymentBreakdown.cash.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>Digital: {paymentBreakdown.digital.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Physical cash vs digital telebirr/bank</p>
          </div>
        </div>

        {/* TOP FRUIT ITEMS DISPENSED BREAKDOWN */}
        {topFruitItems.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Apple size={15} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Top Fruit Platters & Items Sold</h2>
                  <p className="text-[11px] text-slate-500">Most requested fruit items ranked by volume</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                {topFruitItems.length} Key Items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-5 py-2.5">Platter / Fruit Item</th>
                    <th className="px-5 py-2.5">Portions Sold</th>
                    <th className="px-5 py-2.5">Total Revenue</th>
                    <th className="px-5 py-2.5">% Sales Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                  {topFruitItems.map((item, idx) => {
                    const share = totalFruitRevenue > 0 ? ((item.revenue / totalFruitRevenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={item.name} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-2 text-slate-400 font-bold">#{idx + 1}</td>
                        <td className="px-5 py-2 font-bold text-slate-900">{item.name}</td>
                        <td className="px-5 py-2 font-extrabold text-amber-700">{item.quantity} units</td>
                        <td className="px-5 py-2 font-black text-slate-900">{item.revenue.toLocaleString()} ETB</td>
                        <td className="px-5 py-2">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            {share}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DETAILED FRUIT ORDERS TRANSACTION LOG */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Detailed Fruit Shift Transaction Log</h2>
              <p className="text-xs text-slate-500">Every ticket containing fruit items with portions and service status</p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Showing {filteredOrders.length} Fruit Tickets
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3">Fruit Items Dispensed</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o) => {
                    const orderRevenue = o.items.reduce((s, it) => s + (it.total_price || 0), 0);
                    const isSettled = ["ready", "served", "delivered", "paid", "completed"].includes(o.status.toLowerCase());
                    return (
                      <tr key={o.id || o.order_number} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-2.5 font-bold font-mono text-slate-900">
                          {o.order_number}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-extrabold text-slate-800">
                          T#{o.table_number}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-semibold">
                          {o.waiter_name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">
                          <div className="flex flex-col gap-0.5">
                            {o.items.map((it, idx) => (
                              <span key={idx} className="font-medium">
                                <b className="text-amber-800 font-black">{it.quantity}x</b> {it.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-700">
                          {o.payment_method}
                        </td>
                        <td className="px-4 py-2.5 font-black text-slate-900 whitespace-nowrap">
                          {orderRevenue.toLocaleString()} ETB
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`badge ${
                              isSettled ? "badge-paid" : "badge-pending"
                            }`}
                          >
                            {isSettled ? "Served" : "Preparing"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-slate-400">
                      No fruit station transactions found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-400 bg-slate-100 font-black text-slate-900">
                    <td colSpan="4" className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      Total Platters Dispensed:
                    </td>
                    <td className="px-4 py-2.5 font-black text-xs text-amber-800">
                      {totalFruitItemsQuantity} Units
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      Fruit Gross Sales:
                    </td>
                    <td colSpan="2" className="px-4 py-2.5 font-black text-sm text-emerald-800 whitespace-nowrap">
                      {totalFruitRevenue.toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 print-hide">
              <p className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OFFICIAL FRUIT REVENUE & SHIFT SUMMARY */}
        <div className="print-summary-box mt-6 border-2 border-slate-900 rounded-lg p-4 bg-slate-50/80 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Official Fruit Outlet Revenue & Shift Summary
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              A4 Financial Verification
            </span>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4 text-xs border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Orders Volume</span>
              <span className="font-extrabold text-slate-900">{totalOrders} Orders • {totalFruitItemsQuantity} Items</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Fruit Subtotal</span>
              <span className="font-extrabold text-slate-900">{netFruitSales.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">15% VAT Tax</span>
              <span className="font-extrabold text-amber-800">{vatAmount.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Cash In Till</span>
              <span className="font-extrabold text-emerald-800">{paymentBreakdown.cash.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Digital (Telebirr / Bank)</span>
              <span className="font-extrabold text-purple-800">{paymentBreakdown.digital.toFixed(2)} ETB</span>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center text-xs font-black text-slate-900">
            <span className="uppercase tracking-wider">TOTAL FRUIT REVENUE (VAT INCLUSIVE):</span>
            <span className="text-base text-emerald-800 font-black">
              {totalFruitRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </span>
          </div>
        </div>

        {/* FORMAL 3-COLUMN AUDIT SIGN-OFF */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800 sign-off-section">
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Prepared By</p>
            <p className="mt-1 font-bold text-slate-900">Fruit Station Lead / Chef</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Verified By</p>
            <p className="mt-1 font-bold text-slate-900">Shift Supervisor / Auditor</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Approved By</p>
            <p className="mt-1 font-bold text-slate-900">General Manager</p>
            <div className="mt-6 border-b border-dashed border-slate-300 w-3/4"></div>
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 confidential-footer">
          <span>BOOST ADDIS • Fruit & Juice Bar Sales & Shift Audit</span>
          <span>Generated: {new Date().toLocaleString()} • Confidential Internal Document</span>
        </div>
      </div>
    </div>
  );
}
