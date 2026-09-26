import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  Printer,
  User,
  Users,
  Award,
  Download,
  Package,
  CreditCard,
  Smartphone,
  Landmark,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";
import { parseItemPortion } from "../../../utils/drinkServingHelper";

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

function POSReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedWaiter, setSelectedWaiter] = useState("All");

  /* Pagination State */
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

  /* Helper to parse items safely */
  const parseItems = (itemsInput) => {
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

  const extractFullName = (first, last) => {
    if (first || last) {
      return `${first || ""} ${last || ""}`.trim();
    }
    return null;
  };

  const getWaiterFromObject = (obj, empMap) => {
    if (!obj) return null;

    const fnLn =
      extractFullName(obj.waiter_first_name, obj.waiter_last_name) ||
      extractFullName(obj.waiterFirstName, obj.waiterLastName) ||
      extractFullName(obj.created_by_first_name, obj.created_by_last_name) ||
      extractFullName(obj.user_first_name, obj.user_last_name) ||
      extractFullName(obj.waiter?.first_name || obj.waiter?.firstName, obj.waiter?.last_name || obj.waiter?.lastName) ||
      extractFullName(obj.created_by?.first_name || obj.created_by?.firstName, obj.created_by?.last_name || obj.created_by?.lastName) ||
      extractFullName(obj.user?.first_name || obj.user?.firstName, obj.user?.last_name || obj.user?.lastName);

    if (fnLn) return fnLn;

    const directName =
      (typeof obj.waiter_name === "string" && obj.waiter_name) ||
      (typeof obj.waiterName === "string" && obj.waiterName) ||
      (typeof obj.waiter === "string" && obj.waiter) ||
      (typeof obj.server_name === "string" && obj.server_name) ||
      (typeof obj.user_name === "string" && obj.user_name) ||
      (typeof obj.created_by_name === "string" && obj.created_by_name) ||
      (typeof obj.employee_name === "string" && obj.employee_name) ||
      obj.waiter?.name ||
      obj.waiter?.username ||
      obj.created_by?.name ||
      obj.created_by?.username ||
      obj.user?.name ||
      obj.user?.username;

    if (directName && directName !== "Staff Waiter") return directName;

    const empId =
      obj.waiter_id ||
      obj.waiterId ||
      obj.created_by_id ||
      obj.created_by ||
      obj.user_id ||
      obj.userId ||
      obj.employee_id ||
      obj.employeeId;

    if (empId && empMap.has(String(empId))) {
      return empMap.get(String(empId));
    }

    return null;
  };

  const fetchPosOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const [posRes, kitchenRes, barRes, tablesRes, empRes] = await Promise.all([
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => []),
        api("/tables").catch(() => api("/pos/tables").catch(() => [])),
        api("/employees").catch(() => []),
      ]);

      const posList = posRes.orders || posRes.data || (Array.isArray(posRes) ? posRes : []);
      const kitchenList = Array.isArray(kitchenRes) ? kitchenRes : (kitchenRes.orders || []);
      const barList = Array.isArray(barRes) ? barRes : (barRes.orders || []);
      const tablesList =
        (Array.isArray(tablesRes) ? tablesRes : null) ||
        tablesRes.tables ||
        tablesRes.data?.tables ||
        tablesRes.data ||
        [];
      const empList =
        (Array.isArray(empRes) ? empRes : null) ||
        empRes.employees ||
        empRes.data?.employees ||
        empRes.data ||
        [];

      const empMap = new Map();
      empList.forEach((emp) => {
        const idKey = String(emp.id);
        const fullName =
          extractFullName(emp.first_name || emp.firstName, emp.last_name || emp.lastName) ||
          emp.name ||
          emp.username;
        if (idKey && fullName) {
          empMap.set(idKey, fullName);
        }
      });

      const tableWaiterMap = new Map();
      tablesList.forEach((t) => {
        const tId = String(t.id || t.table_number || "");
        const tName = getWaiterFromObject(t, empMap) || t.current_waiter_name || t.waiter_name;
        if (tId && tName) tableWaiterMap.set(tId, tName);
      });

      const orderExtraMap = new Map();
      [...kitchenList, ...barList].forEach((k) => {
        const kId = String(k.order_id || k.id || "");
        if (!kId) return;
        const wName = getWaiterFromObject(k, empMap);

        if (wName) {
          orderExtraMap.set(kId, wName);
        }
      });

      const enriched = posList.map((o) => {
        const oId = String(o.id || o.order_number || "");
        const tId = String(o.table_id || o.table_number || "");
        const extraWaiter = orderExtraMap.get(oId);
        const tableWaiter = tableWaiterMap.get(tId);

        const waiterName =
          getWaiterFromObject(o, empMap) ||
          extraWaiter ||
          tableWaiter ||
          "Staff Waiter";

        return {
          ...o,
          waiter_name: waiterName,
        };
      });

      setOrders(enriched);
    } catch (err) {
      console.error("Failed to fetch POS reports:", err);
      setError(err.message || "Failed to load POS sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosOrders();
  }, []);

  /* Extract unique waiters from orders */
  const uniqueWaiters = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name;
      if (name && name !== "Staff Waiter") set.add(name);
    });
    return Array.from(set);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDate = o.created_at ? o.created_at.split("T")[0] : "";
      const dateFromMatch = !fromDate || (orderDate && orderDate >= fromDate);
      const dateToMatch = !toDate || (orderDate && orderDate <= toDate);

      const isPaidOrCompleted = o.payment_status === "paid" || o.status === "completed";
      const statusMatch =
        statusFilter === "All" ||
        (statusFilter === "paid" && isPaidOrCompleted) ||
        (statusFilter === "unpaid" && !isPaidOrCompleted) ||
        o.status === statusFilter;

      const waiterName = o.waiter_name || o.waiterName || o.user_name || "";
      const waiterMatch = selectedWaiter === "All" || waiterName === selectedWaiter;

      return dateFromMatch && dateToMatch && statusMatch && waiterMatch;
    });
  }, [orders, fromDate, toDate, statusFilter, selectedWaiter]);

  /* Reset pagination on filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, statusFilter, selectedWaiter]);

  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(
    (o) => o.payment_status === "paid" || o.status === "completed"
  ).length;

  const totalSales = filteredOrders.reduce((sum, o) => {
    const isPaid = o.payment_status === "paid" || o.status === "completed";
    if (!isPaid) return sum;
    const amount = Number(o.total || o.total_amount || o.subtotal || 0);
    return sum + amount;
  }, 0);

  const avgOrderValue = completedOrders > 0 ? totalSales / completedOrders : 0;

  /* Total Menu Items Sold Count & Total Shots Served Calculation */
  const { totalItemsSoldQuantity, totalShotsServedAcrossOrders, totalFullBottlesAcrossOrders } = useMemo(() => {
    let units = 0;
    let shots = 0;
    let bottles = 0;
    filteredOrders.forEach((o) => {
      const items = parseItems(o.items || o.order_items);
      items.forEach((item) => {
        const portion = parseItemPortion(item);
        units += portion.quantity;
        shots += portion.totalShots;
        if (portion.isFullBottle) bottles += portion.quantity;
      });
    });
    return {
      totalItemsSoldQuantity: units,
      totalShotsServedAcrossOrders: shots,
      totalFullBottlesAcrossOrders: bottles,
    };
  }, [filteredOrders]);

  /* Item-Wise Sales & Products Sold Breakdown Calculation with Shots / Bottle Details */
  const itemSalesSummary = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const items = parseItems(o.items || o.order_items);

      items.forEach((item) => {
        const portion = parseItemPortion(item);
        const name =
          item.name ||
          item.product_name ||
          item.item_name ||
          item.title ||
          "Custom Item";
        const category = item.category || item.category_name || "General";
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(item.unit_price || item.price || 0);
        const itemTotal = Number(
          item.total || item.total_price || qty * price
        );

        if (!map.has(name)) {
          map.set(name, {
            name,
            category,
            quantitySold: 0,
            totalRevenue: 0,
            unitPrice: price,
            totalShots: 0,
            fullBottles: 0,
            halfBottles: 0,
            isDrink: portion.isDrink,
            isShot: portion.isShot,
            isBottle: portion.isBottle,
            portionName: portion.portionName,
          });
        }

        const stat = map.get(name);
        stat.quantitySold += qty;
        if (portion.isShot) {
          stat.isShot = true;
          stat.totalShots += portion.totalShots;
        }
        if (portion.isFullBottle) {
          stat.fullBottles += qty;
          stat.totalShots += portion.totalShots;
        }
        if (portion.isHalfBottle) {
          stat.halfBottles += qty;
          stat.totalShots += portion.totalShots;
        }
        if (portion.isDrink) stat.isDrink = true;

        if (isPaid) {
          stat.totalRevenue += itemTotal > 0 ? itemTotal : qty * price;
        }
        if (price > 0) stat.unitPrice = price;
      });
    });

    return Array.from(map.values())
      .map((item) => {
        let servingBadge = `${item.quantitySold} units`;
        if (item.fullBottles > 0 && item.totalShots > item.fullBottles * 30) {
          const loose = item.totalShots - item.fullBottles * 30;
          servingBadge = `${item.fullBottles} Full Bottle${item.fullBottles > 1 ? "s" : ""} + ${loose} Shots`;
        } else if (item.fullBottles > 0) {
          servingBadge = `${item.fullBottles} Full Bottle${item.fullBottles > 1 ? "s" : ""} (${item.totalShots} Shots)`;
        } else if (item.halfBottles > 0) {
          servingBadge = `${item.halfBottles} Half Bottle${item.halfBottles > 1 ? "s" : ""} (${item.totalShots} Shots)`;
        } else if (item.isShot || item.totalShots > 0) {
          servingBadge = `${item.totalShots} Shot${item.totalShots > 1 ? "s" : ""}`;
        } else if (item.isBottle) {
          servingBadge = `${item.quantitySold} Bottle${item.quantitySold > 1 ? "s" : ""}`;
        }
        return {
          ...item,
          servingBadge,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders]);

  /* Aggregated Payment Methods Breakdown */
  const paymentMethodSummary = useMemo(() => {
    const methods = {
      cash: { label: "Cash", amount: 0, count: 0 },
      telebirr: { label: "Telebirr / Mobile", amount: 0, count: 0 },
      bank: { label: "Bank Transfer", amount: 0, count: 0 },
      credit: { label: "Credit / Account", amount: 0, count: 0 },
    };

    filteredOrders.forEach((o) => {
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const total = Number(o.total || o.total_amount || o.subtotal || 0);

      let payments = [];
      if (Array.isArray(o.payments)) {
        payments = o.payments;
      } else if (typeof o.payments === "string") {
        try {
          payments = JSON.parse(o.payments);
        } catch (e) {
          payments = [];
        }
      }

      if (payments.length > 0) {
        payments.forEach((p) => {
          const m = (p.payment_method || "").toLowerCase();
          const amt = Number(p.amount || 0);
          if (m.includes("cash")) {
            methods.cash.amount += amt;
            methods.cash.count += 1;
          } else if (m.includes("telebirr") || m.includes("mobile") || m.includes("cbe")) {
            methods.telebirr.amount += amt;
            methods.telebirr.count += 1;
          } else if (m.includes("bank") || m.includes("transfer")) {
            methods.bank.amount += amt;
            methods.bank.count += 1;
          } else if (m.includes("credit")) {
            methods.credit.amount += amt;
            methods.credit.count += 1;
          } else {
            methods.cash.amount += amt;
            methods.cash.count += 1;
          }
        });
      } else {
        const pm = (o.payment_method || o.method || "").toLowerCase();
        if (pm.includes("cash")) {
          methods.cash.amount += isPaid ? total : 0;
          methods.cash.count += 1;
        } else if (pm.includes("telebirr") || pm.includes("mobile") || pm.includes("cbe")) {
          methods.telebirr.amount += isPaid ? total : 0;
          methods.telebirr.count += 1;
        } else if (pm.includes("bank") || pm.includes("transfer")) {
          methods.bank.amount += isPaid ? total : 0;
          methods.bank.count += 1;
        } else if (pm.includes("credit") || o.payment_status === "credit_pending") {
          methods.credit.amount += total;
          methods.credit.count += 1;
        } else {
          methods.cash.amount += isPaid ? total : 0;
          methods.cash.count += 1;
        }
      }
    });

    return methods;
  }, [filteredOrders]);

  /* Aggregated Waiter Performance Summary Calculation */
  const waiterSummary = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name || "Staff Waiter";
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      const total = Number(o.total || o.total_amount || o.subtotal || 0);

      if (!map.has(name)) {
        map.set(name, {
          name,
          ticketsServed: 0,
          paidSales: 0,
          pendingSales: 0,
        });
      }
      const stat = map.get(name);
      stat.ticketsServed += 1;
      if (isPaid) {
        stat.paidSales += total;
      } else {
        stat.pendingSales += total;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.paidSales - a.paidSales);
  }, [filteredOrders]);

  /* Net Sales and 15% VAT Math */
  const netSalesSubtotal = totalSales > 0 ? Number((totalSales / 1.15).toFixed(2)) : 0;
  const vatTotal = Number((totalSales - netSalesSubtotal).toFixed(2));

  /* Pagination Logic for Transaction Log */
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePrint = () => {
    printReportArea("pos-reports-printable-area", "POS Sales & Waiter Audit Report");
  };

  /* CSV Export Functionality */
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No sales orders available to export.");
      return;
    }

    let csv = "POS TRANSACTION SALES REPORT\n";
    csv += `Generated: "${new Date().toLocaleString()}"\n\n`;

    // 1. Transaction Table
    csv += "Order #,Date & Time,Server / Waiter,Type,Payment Method,Payment Status,Total Amount (ETB)\n";
    filteredOrders.forEach((o) => {
      const orderNum = `"${o.order_number || '#' + o.id}"`;
      const dateStr = `"${o.created_at ? new Date(o.created_at).toLocaleString() : '-'}"`;
      const waiter = `"${(o.waiter_name || o.waiterName || 'Staff Waiter').replace(/"/g, '""')}"`;
      const type = `"${o.order_type || 'Dine In'}"`;
      const method = `"${(o.payment_method || 'N/A').replace(/"/g, '""')}"`;
      const status = `"${o.payment_status === 'paid' || o.status === 'completed' ? 'Paid' : 'Pending'}"`;
      const total = Number(o.total || o.total_amount || 0).toFixed(2);

      csv += `${orderNum},${dateStr},${waiter},${type},${method},${status},${total}\n`;
    });

    // 2. Item-Wise Sales Section
    if (itemSalesSummary.length > 0) {
      csv += "\n\nITEM & PRODUCT SALES SUMMARY\n";
      csv += "Product / Item Name,Category,Quantity Sold,Unit Price (ETB),Total Revenue (ETB)\n";
      itemSalesSummary.forEach((item) => {
        const name = `"${item.name.replace(/"/g, '""')}"`;
        const cat = `"${item.category.replace(/"/g, '""')}"`;
        const qty = item.quantitySold;
        const price = item.unitPrice.toFixed(2);
        const rev = item.totalRevenue.toFixed(2);
        csv += `${name},${cat},${qty},${price},${rev}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `POS_Sales_Report_${new Date().toISOString().split("T")[0]}.csv`);
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
            POS Sales & Orders Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze revenue, items sold, waiter performance, and payment breakdowns live from database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchPosOrders}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
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
          title="Gross Sales Revenue"
          value={`${totalSales.toLocaleString()} ETB`}
          description={`${completedOrders} paid & completed tickets`}
          icon={DollarSign}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <ReportStatCard
          title="Orders Processed"
          value={totalOrders}
          description="Total customer orders created"
          icon={TrendingUp}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <ReportStatCard
          title="Items & Drinks Sold"
          value={`${totalItemsSoldQuantity.toLocaleString()} Units`}
          description={totalShotsServedAcrossOrders > 0 ? `${totalShotsServedAcrossOrders} shots portioned` : "Total quantity fulfilled"}
          icon={Package}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
        <ReportStatCard
          title="Average Order Ticket"
          value={`${avgOrderValue.toFixed(2)} ETB`}
          description="Mean expenditure per ticket"
          icon={ShoppingBag}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
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
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Dates & Dropdowns */}
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
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
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
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="paid">Paid / Completed</option>
              <option value="unpaid">Unpaid / Pending</option>
            </select>

            <select
              value={selectedWaiter}
              onChange={(e) => {
                setSelectedWaiter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="All">All Waiters / Staff</option>
              {uniqueWaiters.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT AREA */}
      <div id="pos-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                CASHIER SHIFT, ITEM SALES & WAITER AUDIT REPORT
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official POS Revenue Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600">
                Audit Scope:{" "}
                <span className="font-bold text-slate-900">
                  {selectedWaiter} • {fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CARDLESS HORIZONTAL METRICS BAR (SIDE-BY-SIDE WITHOUT CARDS) */}
        <div className="side-metrics-bar border-y border-slate-300 py-2.5 my-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-700 w-full">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Orders:</span>
              <strong className="text-slate-900 font-black">{totalOrders}</strong>
              <span className="text-[10px] font-semibold text-emerald-700">({completedOrders} Settled)</span>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Items Sold:</span>
              <strong className="text-purple-700 font-black">{totalItemsSoldQuantity} Units</strong>
              {totalShotsServedAcrossOrders > 0 && (
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 ml-0.5">
                  ({totalShotsServedAcrossOrders} Shots{totalFullBottlesAcrossOrders > 0 ? ` • ${totalFullBottlesAcrossOrders} Bottles` : ""})
                </span>
              )}
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Gross Sales:</span>
              <strong className="text-blue-700 font-black">{totalSales.toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Avg Ticket:</span>
              <strong className="text-indigo-700 font-black">{avgOrderValue.toFixed(2)} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Cash:</span>
              <strong className="text-emerald-700 font-black">{paymentMethodSummary.cash.amount.toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Digital:</span>
              <strong className="text-sky-700 font-black">{(paymentMethodSummary.telebirr.amount + paymentMethodSummary.bank.amount).toLocaleString()} ETB</strong>
            </div>
            <span className="text-slate-300 select-none hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-slate-500">Credit:</span>
              <strong className="text-amber-700 font-black">{paymentMethodSummary.credit.amount.toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

        {/* PRODUCT & ITEM-WISE SALES BREAKDOWN TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Package size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Products & Menu Items Sold Breakdown</h2>
                <p className="text-xs text-slate-500">Items and drinks sold with shot portions, bottle counts, and revenue generated</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {itemSalesSummary.length} Unique Menu Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Product / Menu Item Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Serving Portion / Quantity Sold</th>
                  <th className="px-5 py-3">Unit Price (ETB)</th>
                  <th className="px-5 py-3">Total Money Made (ETB)</th>
                  <th className="px-5 py-3">% Sales Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-6 text-center text-slate-400 text-xs">
                      Calculating product sales statistics...
                    </td>
                  </tr>
                ) : itemSalesSummary.length > 0 ? (
                  itemSalesSummary.map((item, idx) => {
                    const pct = totalSales > 0 ? (item.totalRevenue / totalSales) * 100 : 0;
                    return (
                      <tr key={item.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-500 capitalize">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center font-black">
                          <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black border ${
                            item.isShot || item.totalShots > 0
                              ? "bg-purple-50 text-purple-900 border-purple-200"
                              : item.fullBottles > 0
                              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}>
                            {item.servingBadge}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-700">
                          {item.unitPrice > 0 ? `${item.unitPrice.toLocaleString()} ETB` : "-"}
                        </td>
                        <td className="px-5 py-3 font-black text-emerald-700">
                          {item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden print-hide">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-purple-900">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-6 text-center text-slate-400 text-xs">
                      No item-level sales data found in orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WAITER PERFORMANCE & SALES SUMMARY SECTION */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Users size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Server & Waiter Sales Breakdown</h2>
                <p className="text-xs text-slate-500">Total tickets served, collected revenue, and average sales calculated per waiter</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              {waiterSummary.length} Active Staff Servers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Server / Waiter Name</th>
                  <th className="px-5 py-3">Tables / Tickets Served</th>
                  <th className="px-5 py-3">Total Paid Sales</th>
                  <th className="px-5 py-3">Pending / Unpaid Sales</th>
                  <th className="px-5 py-3">Avg Ticket Value</th>
                  <th className="px-5 py-3">% Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center text-slate-400 text-xs">
                      Calculating waiter performance...
                    </td>
                  </tr>
                ) : waiterSummary.length > 0 ? (
                  waiterSummary.map((w, idx) => {
                    const avg = w.ticketsServed > 0 ? w.paidSales / w.ticketsServed : 0;
                    const pct = totalSales > 0 ? (w.paidSales / totalSales) * 100 : 0;
                    return (
                      <tr key={w.name} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                              #{idx + 1}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 border border-indigo-100">
                              <User size={12} />
                              {w.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-slate-800">
                          {w.ticketsServed} Tickets
                        </td>
                        <td className="px-5 py-3.5 font-black text-emerald-700">
                          {w.paidSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                        </td>
                        <td className="px-5 py-3.5 font-bold text-amber-700">
                          {w.pendingSales > 0 ? `${w.pendingSales.toFixed(2)} ETB` : "-"}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700">
                          {avg.toFixed(2)} ETB
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden print-hide">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-indigo-900">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-5 py-6 text-center text-slate-400 text-xs">
                      No waiter transaction data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Detailed POS Transaction Log</h2>
            <span className="text-xs font-semibold text-slate-500 print-hide">
              Showing {paginatedOrders.length} of {filteredOrders.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Order #</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Server / Waiter</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Type</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">Items & Portions Served (In Detail)</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Payment Method</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Total Amount</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-slate-400">
                      Loading sales data...
                    </td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o) => {
                    const isPaid = o.payment_status === "paid" || o.status === "completed";
                    const total = Number(o.total || o.total_amount || o.subtotal || 0);
                    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : "-";
                    const waiterName = o.waiter_name || o.waiterName || o.user_name || "Staff Waiter";
                    const payMethod = o.payment_method || o.method || "Cash";
                    const orderItems = parseItems(o.items || o.order_items);

                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 align-top">
                          {o.order_number || `#${o.id}`}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs align-top">
                          {dateStr}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 align-top">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-100">
                            <User size={11} className="print-hide" />
                            {waiterName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-slate-700 font-medium text-xs align-top">
                          {o.order_type || "Dine In"}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          {orderItems.length > 0 ? (
                            <div className="space-y-1">
                              {orderItems.map((it, idx) => {
                                const portion = parseItemPortion(it);
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs gap-2 py-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black border ${portion.badgeClass}`}>
                                        {portion.displayServing}
                                      </span>
                                      <span className="font-bold text-slate-800">
                                        {it.product_name || it.name || "Item"}
                                      </span>
                                      {it.notes && !it.notes.includes(portion.portionName) && (
                                        <span className="text-[10px] text-slate-400 italic">({it.notes})</span>
                                      )}
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                      {(Number(it.total || (it.unit_price * it.quantity) || 0)).toFixed(2)} ETB
                                    </span>
                                  </div>
                                );
                              })}
                              <div className="text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                                <span>Order Items:</span>
                                <span className="text-slate-800 font-bold">{orderItems.reduce((s, i) => s + Number(i.quantity || 1), 0)} items</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">No items detailed</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-xs font-bold text-slate-600 align-top">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                            {payMethod}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 align-top whitespace-nowrap">
                          {total.toLocaleString()} ETB
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          <span
                            className={`badge ${
                              isPaid ? "badge-paid" : "badge-pending"
                            }`}
                          >
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-slate-400">
                      No POS transaction records found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-400 bg-slate-100 font-black text-slate-900">
                    <td colSpan="4" className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      Total Items Sold Across Orders:
                    </td>
                    <td className="px-4 py-2.5 font-black text-xs text-purple-800">
                      {totalItemsSoldQuantity} Units Sold
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs uppercase tracking-wider">
                      Gross Sales:
                    </td>
                    <td colSpan="2" className="px-4 py-2.5 font-black text-sm text-emerald-800 whitespace-nowrap">
                      {totalSales.toLocaleString()} ETB
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Table Pagination Controls (Hidden on Print) */}
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

        {/* BOTTOM FINANCIAL AUDIT & RECONCILIATION SUMMARY (THE LAST PART) */}
        <div className="print-summary-box mt-6 border-2 border-slate-900 rounded-lg p-4 bg-slate-50/80 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Official Shift Revenue & Tax Audit Summary
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              A4 Financial Verification
            </span>
          </div>

          {/* Side-by-side summary metrics - no big cards */}
          <div className="flex flex-wrap justify-between items-center gap-4 text-xs border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Order Volume</span>
              <span className="font-extrabold text-slate-900">{totalOrders} Orders • {totalItemsSoldQuantity} Items Sold</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Sales Subtotal</span>
              <span className="font-extrabold text-slate-900">{netSalesSubtotal.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">15% VAT Tax</span>
              <span className="font-extrabold text-amber-800">{vatTotal.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Physical Cash In Till</span>
              <span className="font-extrabold text-emerald-800">{paymentMethodSummary.cash.amount.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Digital (Telebirr / Bank)</span>
              <span className="font-extrabold text-purple-800">{(paymentMethodSummary.telebirr.amount + paymentMethodSummary.bank.amount).toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">VIP</span>
              <span className="font-extrabold text-rose-700">{paymentMethodSummary.credit.amount.toFixed(2)} ETB</span>
            </div>
          </div>

          {/* Grand Total Bar */}
          <div className="mt-3 flex justify-between items-center text-xs font-black text-slate-900">
            <span className="uppercase tracking-wider">GRAND TOTAL SALES REVENUE (VAT INCLUSIVE):</span>
            <span className="text-base text-emerald-800 font-black">
              {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </span>
          </div>
        </div>

        {/* FORMAL 3-COLUMN AUDIT SIGN-OFF */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800">
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Prepared By</p>
            <p className="mt-1 font-bold text-slate-900">Cashier / Lead POS Operator</p>
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
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
          <span>THE OAK CLUB & LOUNGE • Cashier Sales & Shift Audit</span>
          <span>Generated: {new Date().toLocaleString()} • Confidential Internal Document</span>
        </div>
      </div>
    </div>
  );
}

export default POSReportsPage;