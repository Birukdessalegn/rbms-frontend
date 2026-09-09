import { printReportArea } from "../../../utils/printHelper";
import { useEffect, useMemo, useState } from "react";
import {
  Wine,
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

function BarReportsPage() {
  const [barOrdersList, setBarOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  // Pagination state
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

  const fetchBarOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const [barRes, posRes, empRes, prodRes] = await Promise.all([
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/employees").catch(() => []),
        api("/products").catch(() => []),
      ]);

      const barList = Array.isArray(barRes) ? barRes : barRes.orders || barRes.data || [];
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
        const fullName = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim() || emp.name || emp.username;
        if (idKey && fullName) empMap.set(idKey, fullName);
      });

      const combinedMap = new Map();

      posList.forEach((posOrder) => {
        const items = parseRawItems(posOrder.items);
        const drinkItems = items.filter((i) => {
          const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
          const name = String(i.product_name || i.name || "").toLowerCase();
          return cat.includes("bar") || cat.includes("drink") || cat.includes("beverage") ||
                 name.includes("beer") || name.includes("wine") || name.includes("whiskey") ||
                 name.includes("vodka") || name.includes("gin") || name.includes("rum") ||
                 name.includes("tequila") || name.includes("cocktail") || name.includes("drink") ||
                 name.includes("soda") || name.includes("water") || name.includes("juice");
        });

        if (drinkItems.length > 0) {
          const drinkTotal = drinkItems.reduce((acc, it) => {
            const qty = Number(it.quantity || it.qty || 1);
            const pr = Number(
              it.price ||
              it.unit_price ||
              productPriceMap.get(String(it.product_id)) ||
              productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
              0
            );
            return acc + (qty * pr);
          }, 0);

          combinedMap.set(String(posOrder.id), {
            ...posOrder,
            items: drinkItems,
            total: drinkTotal > 0 ? drinkTotal : Number(posOrder.total || posOrder.total_amount || 0),
          });
        }
      });

      barList.forEach((item) => {
        const key = String(item.order_id || item.id || Math.random());
        const existing = combinedMap.get(key);

        const items = parseRawItems(item.items);
        const matchedPos = posOrderMap.get(String(item.order_id || item.id));

        let calcTotal = 0;
        items.forEach((it) => {
          const qty = Number(it.quantity || it.qty || 1);
          const pr = Number(
            it.unit_price ||
            it.price ||
            productPriceMap.get(String(it.product_id)) ||
            productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
            0
          );
          calcTotal += (qty * pr);
        });

        let finalOrderTotal = Number(item.total || item.total_amount || item.amount || item.order_total || 0);
        if (finalOrderTotal === 0 && calcTotal > 0) {
          finalOrderTotal = calcTotal;
        }
        if (finalOrderTotal === 0 && matchedPos) {
          finalOrderTotal = Number(matchedPos.total || matchedPos.total_amount || 0);
        }
        if (finalOrderTotal === 0 && existing) {
          finalOrderTotal = Number(existing.total || 0);
        }

        combinedMap.set(key, {
          ...(existing || {}),
          ...item,
          items: items.length > 0 ? items : (existing?.items || []),
          total: finalOrderTotal,
        });
      });

      const finalOrders = Array.from(combinedMap.values()).map((b) => {
        const empId = String(b.waiter_id || b.waiterId || b.created_by_id || b.user_id || b.bartender_id || "");
        const waiterName = empMap.get(empId) || b.waiter_name || b.waiterName || b.waiter || b.bartender || (b.bartender_first_name ? `${b.bartender_first_name} ${b.bartender_last_name || ""}`.trim() : "Bar Staff");

        return {
          ...b,
          waiter_name: waiterName,
        };
      });

      setBarOrdersList(finalOrders);
    } catch (err) {
      console.error("Failed to fetch bar reports:", err);
      setError(err.message || "Failed to load bar orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarOrders();
  }, []);

  const formattedOrders = useMemo(() => {
    return barOrdersList.map((b) => {
      const itemsArr = parseRawItems(b.items);
      const itemsSummary = itemsArr.length > 0
        ? itemsArr.map((i) => `${i.quantity || i.qty || 1}x ${i.product_name || i.name || "Drink"}`).join(", ")
        : "Bar Beverage Order";

      const createdAtStr = b.created_at || b.createdAt || b.date || "";
      const dateStr = createdAtStr ? String(createdAtStr).split(/[T ]/)[0] : "";
      const timeStr = createdAtStr ? new Date(createdAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

      let statusFormatted = "Ready";
      const st = String(b.status || "").toLowerCase();
      if (st === "ready" || st === "served" || st === "completed") {
        statusFormatted = "Ready";
      } else if (st === "preparing" || st === "pending") {
        statusFormatted = "Preparing";
      } else if (st === "cancelled") {
        statusFormatted = "Cancelled";
      }

      return {
        id: b.order_number || `#${b.order_id || b.id || "BAR"}`,
        table: b.table_name || b.table_number || `Table ${b.table_id || "Counter"}`,
        items: itemsSummary,
        itemsRaw: itemsArr,
        bartender: b.waiter_name || "Bar Staff",
        status: statusFormatted,
        date: dateStr,
        time: timeStr,
        total: Number(b.total || 0),
        raw: b,
      };
    });
  }, [barOrdersList]);

  const filteredOrders = useMemo(() => {
    return formattedOrders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.table.toLowerCase().includes(search.toLowerCase()) ||
        order.items.toLowerCase().includes(search.toLowerCase()) ||
        order.bartender.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || order.status.toLowerCase() === statusFilter.toLowerCase();

      let matchesDate = true;
      if (fromDate && toDate) {
        matchesDate = order.date >= fromDate && order.date <= toDate;
      } else if (fromDate) {
        matchesDate = order.date >= fromDate;
      } else if (toDate) {
        matchesDate = order.date <= toDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [formattedOrders, search, statusFilter, fromDate, toDate]);

  // Aggregate Metrics
  const totalOrdersCount = filteredOrders.length;
  const readyOrders = filteredOrders.filter((o) => o.status === "Ready").length;
  const preparingOrders = filteredOrders.filter((o) => o.status === "Preparing").length;

  const totalDrinkUnits = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      const orderUnits = order.itemsRaw.reduce(
        (iSum, i) => iSum + Number(i.quantity || i.qty || 1),
        0
      );
      return sum + orderUnits;
    }, 0);
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [filteredOrders]);

  // Top Drinks calculation
  const topDrinks = useMemo(() => {
    const drinkMap = new Map();
    filteredOrders.forEach((o) => {
      o.itemsRaw.forEach((it) => {
        const name = it.product_name || it.name || "Drink";
        const qty = Number(it.quantity || it.qty || 1);
        drinkMap.set(name, (drinkMap.get(name) || 0) + qty);
      });
    });

    return Array.from(drinkMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredOrders]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("bar-reports-printable-area", "Bar & Beverage Shift Audit Report");
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No bar orders available to export.");
      return;
    }

    let csv = "THE OAK CLUB & LOUNGE - BAR & BEVERAGE AUDIT REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n`;
    csv += `Audit Period: "${fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}"\n\n`;

    // Metrics summary
    csv += "SUMMARY METRICS\n";
    csv += `Total Drink Orders,${totalOrdersCount}\n`;
    csv += `Total Drinks Dispensed,${totalDrinkUnits}\n`;
    csv += `Ready / Served Orders,${readyOrders}\n`;
    csv += `Preparing / In-Progress,${preparingOrders}\n`;
    csv += `Total Revenue,${totalRevenue.toFixed(2)} ETB\n\n`;

    // Item sales
    if (topDrinks.length > 0) {
      csv += "BEVERAGE ITEMS DISPENSED BREAKDOWN\n";
      csv += "Rank,Drink / Item Name,Total Units Dispensed\n";
      topDrinks.forEach((d, idx) => {
        csv += `${idx + 1},"${d.name.replace(/"/g, '""')}",${d.count}\n`;
      });
      csv += "\n";
    }

    // Orders transaction log
    csv += "DETAILED BAR ORDERS TRANSACTION LOG\n";
    csv += "Order / Ticket #,Table / Counter,Items Ordered,Bartender / Staff,Status,Time,Total Units,Total Amount (ETB)\n";
    filteredOrders.forEach((o) => {
      const units = o.itemsRaw.reduce((sum, i) => sum + Number(i.quantity || i.qty || 1), 0);
      csv += `"${o.id}","${o.table}","${o.items.replace(/"/g, '""')}","${o.bartender}","${o.status}","${o.time}",${units},${o.total.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bar_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bar & Beverage Audit Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dispense counts, beverage throughput, cocktail rounds, and bartender shift audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchBarOrders}
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
        <ReportStatCard
          title="Drinks Dispensed"
          value={`${totalDrinkUnits.toLocaleString()} Units`}
          description="Total beverage units served"
          icon={Wine}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
        <ReportStatCard
          title="Total Bar Orders"
          value={totalOrdersCount}
          description="Orders with beverage tickets"
          icon={TrendingUp}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <ReportStatCard
          title="Ready / Served"
          value={readyOrders}
          description="Completed drinks dispatched"
          icon={CheckCircle2}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="In-Progress / Prep"
          value={preparingOrders}
          description="Drink tickets queued"
          icon={Clock3}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
      </div>

      {/* Unified Filter Toolbar (Hidden on Print) */}
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
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search, Custom Dates & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, table, drink..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-purple-500"
              />
            </div>

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
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
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
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready / Served</option>
              <option value="Preparing">Preparing</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="bar-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                BAR BEVERAGE SHIFT, DRINK DISPENSING & SERVICE AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Bar Operations Audit</h2>
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
              <span className="text-[10px] font-bold uppercase text-slate-500">Drink Orders:</span>
              <strong className="text-slate-900 font-black">{totalOrdersCount}</strong>
              <span className="text-[10px] font-semibold text-emerald-700">({readyOrders} Served)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Drinks Dispensed:</span>
              <strong className="text-purple-700 font-black">{totalDrinkUnits.toLocaleString()} Units</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">In Preparation:</span>
              <strong className="text-amber-700 font-black">{preparingOrders} Tickets</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Avg Drinks/Ticket:</span>
              <strong className="text-indigo-700 font-black">
                {totalOrdersCount > 0 ? (totalDrinkUnits / totalOrdersCount).toFixed(1) : 0} items
              </strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Bar Revenue:</span>
              <strong className="text-emerald-700 font-black">{totalRevenue.toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

        {/* TOP DRINKS DISPENSED BREAKDOWN */}
        {topDrinks.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Wine size={16} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Top Beverage Items & Drinks Dispensed</h2>
                  <p className="text-xs text-slate-500">Ranked by total quantity served across bar orders</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-100">
                {topDrinks.length} Top Drinks
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-5 py-2.5">Beverage Item Name</th>
                    <th className="px-5 py-2.5 text-right">Total Units Dispensed</th>
                    <th className="px-5 py-2.5 text-right">% of Bar Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {topDrinks.map((drink, idx) => {
                    const pct = totalDrinkUnits > 0 ? ((drink.count / totalDrinkUnits) * 100).toFixed(1) : 0;
                    return (
                      <tr key={drink.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-2.5 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-5 py-2.5 font-bold text-slate-900">{drink.name}</td>
                        <td className="px-5 py-2.5 text-right font-black text-purple-700 bg-purple-50/40">
                          {drink.count} Unit(s)
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-slate-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ITEMIZED BAR ORDERS AUDIT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Receipt size={16} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Detailed Bar Orders Transaction Log</h2>
                <p className="text-xs text-slate-500">Audited tickets with drink quantities, tables, and server assignments</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100/70 font-extrabold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Order / Ticket #</th>
                  <th className="px-5 py-3">Table / Seat</th>
                  <th className="px-5 py-3">Beverage Items Dispensed</th>
                  <th className="px-5 py-3">Server / Staff</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Time</th>
                  <th className="px-5 py-3 text-right">Drink Count</th>
                  <th className="px-5 py-3 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-slate-400">Loading bar orders...</td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order) => {
                    const units = order.itemsRaw.reduce((sum, i) => sum + Number(i.quantity || i.qty || 1), 0);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">{order.id}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{order.table}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900 max-w-xs truncate">{order.items}</td>
                        <td className="px-5 py-3 text-slate-600">{order.bartender}</td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              order.status === "Ready"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "Preparing"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500">{order.time}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                          {units} item(s)
                        </td>
                        <td className="px-5 py-3 text-right font-black text-slate-900">
                          {order.total > 0 ? `${order.total.toLocaleString()} ETB` : "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-slate-400 italic">
                      No bar orders found for selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="px-5 py-3 text-right text-xs uppercase tracking-wider font-bold">
                      Grand Total Dispensed:
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-black text-purple-800">
                      {totalDrinkUnits.toLocaleString()} drinks
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-black text-emerald-800">
                      {totalRevenue.toLocaleString()} ETB
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
              <p className="text-[11px] text-slate-600 mt-1">Head Bartender / Operator</p>
              <div className="mt-6 border-b border-dotted border-slate-400 w-3/4"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-extrabold uppercase text-slate-900">VERIFIED BY:</p>
              <p className="text-[11px] text-slate-600 mt-1">F&B Beverage Controller / Supervisor</p>
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
            <span>THE OAK CLUB & LOUNGE • CONFIDENTIAL OPERATIONAL BEVERAGE AUDIT</span>
            <span>SYSTEM TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarReportsPage;