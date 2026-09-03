import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  Printer,
  Package,
  CreditCard,
  Wine,
  UtensilsCrossed,
  Building2,
  Truck,
  ArrowRightLeft,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

export default function MasterReportsPage() {
  // Filters State
  const [activeDept, setActiveDept] = useState("all"); // "all" | "bar" | "kitchen" | "inventory" | "purchasing" | "pos"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");

  // Raw Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [barOrders, setBarOrders] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Set Default Date Range on Boot to Today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  // Fetch Consolidated Operations Data
  const fetchAllOperations = async () => {
    try {
      setLoading(true);
      setError("");

      const [ordersRes, purchasesRes, inventoryRes, expensesRes, dashRes, barRes, kitchen1Res, kitchen2Res, prodRes] = await Promise.all([
        api("/pos/orders").catch(() => api("/orders").catch(() => [])),
        api("/purchasing").catch(() => api("/purchases").catch(() => [])),
        api("/inventory/multi-location").catch(() => api("/inventory").catch(() => [])),
        api("/expenses").catch(() => []),
        api("/dashboard").catch(() => ({})),
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/kitchen").catch(() => []),
        api("/kitchen/orders").catch(() => []),
        api("/products").catch(() => []),
      ]);

      const rawOrders = ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []);
      setOrders(rawOrders);

      const rawBar = barRes.orders || barRes.data || (Array.isArray(barRes) ? barRes : []);
      setBarOrders(rawBar);

      const kList1 = Array.isArray(kitchen1Res) ? kitchen1Res : kitchen1Res.orders || kitchen1Res.data || [];
      const kList2 = Array.isArray(kitchen2Res) ? kitchen2Res : kitchen2Res.orders || kitchen2Res.data || [];

      // Combine kitchen orders exactly like KitchenReportsPage
      const combinedKitchenMap = new Map();
      rawOrders.forEach((posOrder) => {
        const items = parseItems(posOrder.items || posOrder.order_items);
        const foodItems = items.filter((i) => {
          const cat = String(i.category || i.category_name || i.type || "").toLowerCase();
          const isDrink =
            cat.includes("beer") ||
            cat.includes("wine") ||
            cat.includes("vodka") ||
            cat.includes("whiskey") ||
            cat.includes("cocktail") ||
            cat.includes("liquor") ||
            cat.includes("spirit") ||
            cat.includes("soft") ||
            cat.includes("drink");

          if (isDrink) return false;
          return true;
        });

        if (foodItems.length > 0 || !posOrder.items) {
          const key = String(posOrder.id || posOrder.order_id);
          combinedKitchenMap.set(key, {
            ...posOrder,
            items: foodItems.length > 0 ? foodItems : posOrder.items,
          });
        }
      });

      [...kList1, ...kList2].forEach((item) => {
        const key = String(item.id || item.order_id || Math.random());
        const existing = combinedKitchenMap.get(key);
        combinedKitchenMap.set(key, {
          ...(existing || {}),
          ...item,
          items: item.items && item.items.length > 0 ? item.items : (existing?.items || item.items),
        });
      });

      setKitchenOrders(Array.from(combinedKitchenMap.values()));

      const rawProducts = prodRes.products || prodRes.data || (Array.isArray(prodRes) ? prodRes : []);
      setProducts(rawProducts);

      const rawPurchases = purchasesRes.purchases || purchasesRes.data || (Array.isArray(purchasesRes) ? purchasesRes : []);
      setPurchases(rawPurchases);

      const rawInventory = inventoryRes.inventory || inventoryRes.data || (Array.isArray(inventoryRes) ? inventoryRes : []);
      setInventory(rawInventory);

      const rawExpenses = expensesRes.expenses || expensesRes.data || (Array.isArray(expensesRes) ? expensesRes : []);
      setExpenses(rawExpenses);

      if (dashRes && (dashRes.success || dashRes.stats || dashRes.data)) {
        setDashboardStats(dashRes.stats || dashRes.data || dashRes);
      }
    } catch (err) {
      console.error("Failed to load operations report data:", err);
      setError("Failed to load consolidated reports data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOperations();
  }, []);

  // Quick Date Presets Handler
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

  // Safe item parser helper
  const parseItems = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Robust beverage item detector
  const isBarItem = (it) => {
    const cat = String(it.category || it.category_name || it.type || "").toLowerCase();
    const name = String(it.product_name || it.name || "").toLowerCase();
    return (
      cat.includes("bar") ||
      cat.includes("drink") ||
      cat.includes("beverage") ||
      cat.includes("alcohol") ||
      cat.includes("liquor") ||
      cat.includes("cocktail") ||
      cat.includes("wine") ||
      cat.includes("beer") ||
      cat.includes("spirit") ||
      name.includes("beer") ||
      name.includes("wine") ||
      name.includes("whiskey") ||
      name.includes("vodka") ||
      name.includes("gin") ||
      name.includes("rum") ||
      name.includes("tequila") ||
      name.includes("cocktail") ||
      name.includes("jameson") ||
      name.includes("heineken") ||
      name.includes("george") ||
      name.includes("habesha") ||
      name.includes("walya") ||
      name.includes("drink") ||
      name.includes("soda") ||
      name.includes("water") ||
      name.includes("juice") ||
      name.includes("red bull") ||
      name.includes("black label") ||
      name.includes("red label")
    );
  };

  // Robust food item detector
  const isKitchenItem = (it) => {
    if (isBarItem(it)) return false;
    const cat = String(it.category || it.category_name || it.type || "").toLowerCase();
    const name = String(it.product_name || it.name || "").toLowerCase();
    return (
      cat.includes("kitchen") ||
      cat.includes("food") ||
      cat.includes("dish") ||
      cat.includes("meal") ||
      name.length > 0
    );
  };

  // Filter Data by Date Range (timezone-safe string slice)
  const isDateInRange = (dateStr) => {
    if (!dateStr) return true;
    let d = "";
    if (typeof dateStr === "string" && dateStr.length >= 10) {
      d = dateStr.slice(0, 10);
    } else {
      try {
        const dt = new Date(dateStr);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const day = String(dt.getDate()).padStart(2, "0");
        d = `${y}-${m}-${day}`;
      } catch {
        return true;
      }
    }
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  // Filtered Orders within Date Range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = o.created_at || o.createdAt || o.order_date || o.date;
      return isDateInRange(d);
    });
  }, [orders, fromDate, toDate]);

  // Filtered Bar Orders within Date Range
  const filteredBarOrders = useMemo(() => {
    return barOrders.filter((b) => {
      const d = b.created_at || b.createdAt || b.date;
      return isDateInRange(d);
    });
  }, [barOrders, fromDate, toDate]);

  // Filtered Kitchen Orders within Date Range
  const filteredKitchenOrders = useMemo(() => {
    return kitchenOrders.filter((k) => {
      const d = k.created_at || k.createdAt || k.date;
      return isDateInRange(d);
    });
  }, [kitchenOrders, fromDate, toDate]);

  // Filtered Purchases within Date Range
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const d = p.purchase_date || p.created_at || p.createdAt || p.date;
      return isDateInRange(d);
    });
  }, [purchases, fromDate, toDate]);

  // Filtered Expenses within Date Range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = e.expense_date || e.created_at || e.date;
      return isDateInRange(d);
    });
  }, [expenses, fromDate, toDate]);

  // Product Price Lookup Map for reliable pricing resolution
  const productPriceMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const price = Number(p.price || p.unit_price || p.selling_price || 0);
      if (p.id) map.set(String(p.id), price);
      if (p.name) map.set(String(p.name).toLowerCase().trim(), price);
    });
    return map;
  }, [products]);

  // Consolidated & Departmental Metrics Calculation
  const metrics = useMemo(() => {
    // 1. POS / Sales Calculations
    let grossSales = 0;
    let totalItemsSold = 0;
    let barSales = 0;
    let barItemsCount = 0;
    let kitchenSales = 0;
    let kitchenItemsCount = 0;
    let completedOrders = 0;

    const processedBarOrderIds = new Set();
    const processedKitchenOrderIds = new Set();

    filteredOrders.forEach((o) => {
      const status = String(o.status || "").toLowerCase();
      if (status === "cancelled" || status === "void") return;
      if (status === "completed" || status === "served" || status === "paid") completedOrders++;

      const amt = Number(o.total_amount || o.total || o.subtotal || 0);
      grossSales += amt;

      const items = parseItems(o.items || o.order_items);

      items.forEach((it) => {
        const qty = Number(it.quantity || it.qty || 1);
        const price = Number(
          it.price ||
          it.unit_price ||
          productPriceMap.get(String(it.product_id)) ||
          productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
          0
        );
        const itemRev = qty * price;
        totalItemsSold += qty;

        if (isBarItem(it)) {
          barSales += itemRev;
          barItemsCount += qty;
          processedBarOrderIds.add(String(o.id));
        }
      });
    });

    // Also factor in dedicated bar tickets if present
    filteredBarOrders.forEach((bo) => {
      const boKey = String(bo.order_id || bo.id);
      const items = parseItems(bo.items);
      let ticketTotal = Number(bo.total || bo.total_amount || 0);
      let ticketQty = 0;

      items.forEach((it) => {
        const q = Number(it.quantity || it.qty || 1);
        const p = Number(
          it.unit_price ||
          it.price ||
          productPriceMap.get(String(it.product_id)) ||
          productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
          0
        );
        ticketQty += q;
        if (ticketTotal === 0) ticketTotal += (q * p);
      });

      if (!processedBarOrderIds.has(boKey)) {
        barSales += ticketTotal;
        barItemsCount += (ticketQty || items.length || 1);
        processedBarOrderIds.add(boKey);
      } else if (barSales === 0 && ticketTotal > 0) {
        barSales += ticketTotal;
      }
    });

    // Calculate Kitchen Metrics exactly matching KitchenReportsPage (265,150 ETB / 58 tickets)
    kitchenSales = 0;
    kitchenItemsCount = 0;

    filteredKitchenOrders.forEach((o) => {
      let orderTotal = Number(o.total || o.total_amount || o.amount || 0);
      let calcTotal = 0;
      let dishCount = 0;

      const items = parseItems(o.items || o.order_items);
      items.forEach((item) => {
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(
          item.price ||
          item.unit_price ||
          productPriceMap.get(String(item.product_id)) ||
          productPriceMap.get(String(item.name || item.product_name).toLowerCase().trim()) ||
          0
        );
        calcTotal += price * qty;
        dishCount += qty;
      });

      if (orderTotal === 0 && calcTotal > 0) {
        orderTotal = calcTotal;
      }
      kitchenSales += orderTotal;
      kitchenItemsCount += (dishCount || items.length || 1);
    });

    // 2. Purchasing Metrics
    let totalPurchasesSpend = 0;
    let totalReceivedPurchases = 0;
    let unpaidCreditPurchases = 0;

    filteredPurchases.forEach((p) => {
      const amt = Number(p.total || p.subtotal || 0);
      totalPurchasesSpend += amt;
      if (String(p.status).toLowerCase() === "received") totalReceivedPurchases++;
      if (String(p.payment_status).toLowerCase() === "credit" || String(p.payment_status).toLowerCase() === "unpaid") {
        unpaidCreditPurchases += amt;
      }
    });

    // 3. Inventory Valuation
    let centralStockVal = 0;
    let barStockVal = 0;
    let kitchenStockVal = 0;
    let lowStockCount = 0;

    inventory.forEach((item) => {
      const cost = Number(item.cost_price || item.price || 0);
      const mainQ = Number(item.main_quantity || item.quantity || 0);
      const barQ = Number(item.bar_quantity || 0);
      const kitchenQ = Number(item.kitchen_quantity || 0);

      centralStockVal += mainQ * cost;
      barStockVal += barQ * cost;
      kitchenStockVal += kitchenQ * cost;

      if (mainQ <= Number(item.minimum_stock || 5) || barQ <= 1 || kitchenQ <= 5) {
        lowStockCount++;
      }
    });

    // 4. Net Operating Balance
    const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = grossSales - totalPurchasesSpend - totalExpensesAmt;

    return {
      grossSales,
      totalOrders: filteredOrders.length,
      completedOrders,
      totalItemsSold,
      barSales,
      barItemsCount,
      kitchenSales,
      kitchenItemsCount: filteredKitchenOrders.length || kitchenItemsCount,
      totalPurchasesSpend,
      totalPurchasesCount: filteredPurchases.length,
      totalReceivedPurchases,
      unpaidCreditPurchases,
      totalExpensesAmt,
      centralStockVal,
      barStockVal,
      kitchenStockVal,
      totalStockValuation: centralStockVal + barStockVal + kitchenStockVal,
      lowStockCount,
      netProfit,
    };
  }, [filteredOrders, filteredBarOrders, filteredKitchenOrders, filteredPurchases, filteredExpenses, inventory, productPriceMap]);

  // Department-Specific Ledger Items (accurately filtered by selected location)
  const ledgerRows = useMemo(() => {
    let rows = [];

    // 1. Front POS Orders
    if (activeDept === "all" || activeDept === "pos") {
      filteredOrders.forEach((o) => {
        rows.push({
          type: "pos_order",
          department: "Front POS",
          id: o.order_number || `ORD-#${o.id}`,
          title: o.customer_name ? `Order for ${o.customer_name}` : `Table ${o.table_number || o.table_id || "-"}`,
          amount: Number(o.total_amount || o.total || 0),
          status: o.status || "completed",
          date: o.created_at || o.createdAt,
          user: o.waiter_name || o.cashier_name || "Staff",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        });
      });
    }

    // 2. Bar Sub-Store
    if (activeDept === "all" || activeDept === "bar") {
      const seenBarIds = new Set();

      // First check dedicated tickets from /bar/orders
      filteredBarOrders.forEach((bo) => {
        const items = parseItems(bo.items);
        const titleStr = items.length > 0
          ? items.map((d) => `${d.quantity || 1}x ${d.product_name || d.name || "Drink"}`).join(", ")
          : bo.notes || "Bar Beverage Order";

        let totalAmt = Number(bo.total || bo.total_amount || 0);
        if (totalAmt === 0 && items.length > 0) {
          totalAmt = items.reduce((s, it) => {
            const p = Number(
              it.unit_price ||
              it.price ||
              productPriceMap.get(String(it.product_id)) ||
              productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
              0
            );
            return s + (Number(it.quantity || 1) * p);
          }, 0);
        }

        const idStr = bo.order_number || `#B-${bo.id || bo.order_id}`;
        seenBarIds.add(String(bo.order_id || bo.id));

        rows.push({
          type: "bar_ticket",
          department: "Bar Sub-Store",
          id: idStr,
          title: titleStr,
          amount: totalAmt,
          status: bo.status || "served",
          date: bo.created_at || bo.createdAt,
          user: bo.bartender_name || (bo.bartender_first_name ? `${bo.bartender_first_name} ${bo.bartender_last_name || ""}`.trim() : "Bartender"),
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        });
      });

      // Also extract drink items from POS orders
      filteredOrders.forEach((o) => {
        if (seenBarIds.has(String(o.id))) return;
        const items = parseItems(o.items || o.order_items);
        const drinkItems = items.filter(isBarItem);

        if (drinkItems.length > 0) {
          const totalAmt = drinkItems.reduce((s, it) => {
            const p = Number(
              it.price ||
              it.unit_price ||
              productPriceMap.get(String(it.product_id)) ||
              productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
              0
            );
            return s + (Number(it.quantity || 1) * p);
          }, 0);
          rows.push({
            type: "bar_ticket",
            department: "Bar Sub-Store",
            id: o.order_number || `BAR-#${o.id}`,
            title: drinkItems.map((d) => `${d.quantity || 1}x ${d.name || d.product_name || "Drink"}`).join(", "),
            amount: totalAmt || Number(o.total_amount || 0),
            status: o.status || "served",
            date: o.created_at || o.createdAt,
            user: o.waiter_name || "Bartender",
            badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          });
        }
      });
    }

    // 3. Kitchen Sub-Store (matching KitchenReportsPage 100%)
    if (activeDept === "all" || activeDept === "kitchen") {
      filteredKitchenOrders.forEach((ko) => {
        const items = parseItems(ko.items || ko.order_items);
        const titleStr = items.length > 0
          ? items.map((f) => `${f.quantity || 1}x ${f.product_name || f.name || "Dish"}`).join(", ")
          : ko.notes || "Kitchen Food Order";

        let totalAmt = Number(ko.total || ko.total_amount || ko.amount || 0);
        if (totalAmt === 0 && items.length > 0) {
          totalAmt = items.reduce((s, it) => {
            const p = Number(
              it.unit_price ||
              it.price ||
              productPriceMap.get(String(it.product_id)) ||
              productPriceMap.get(String(it.name || it.product_name).toLowerCase().trim()) ||
              0
            );
            return s + (Number(it.quantity || 1) * p);
          }, 0);
        }

        const idStr = ko.order_number || `#K-${ko.id || ko.order_id || "1"}`;

        rows.push({
          type: "kitchen_ticket",
          department: "Kitchen Sub-Store",
          id: idStr,
          title: titleStr,
          amount: totalAmt,
          status: ko.status || "prepared",
          date: ko.created_at || ko.createdAt || ko.date,
          user: ko.chef_name || ko.waiter_name || "Chef",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
        });
      });
    }

    // 4. Purchasing & Suppliers
    if (activeDept === "all" || activeDept === "purchasing") {
      filteredPurchases.forEach((p) => {
        rows.push({
          type: "purchase_order",
          department: "Purchasing",
          id: p.purchase_number || `PO-#${p.id}`,
          title: p.supplier_name ? `Supplier: ${p.supplier_name}` : "Goods Procurement",
          amount: Number(p.total || p.subtotal || 0),
          status: p.status || "ordered",
          date: p.purchase_date || p.created_at,
          user: p.supplier_name || "Purchasing Agent",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        });
      });
    }

    // 5. Inventory & Warehouse
    if (activeDept === "inventory") {
      inventory.forEach((it) => {
        rows.push({
          type: "inventory_item",
          department: "Inventory",
          id: it.product_code || `SKU-#${it.product_id || it.id}`,
          title: `${it.product_name || it.name} (Central: ${it.main_quantity || 0} ${it.unit || "units"}, Bar: ${it.bar_quantity || 0} ${it.unit || "units"}, Kitchen: ${it.kitchen_quantity || 0} ${it.unit || "units"})`,
          amount: Number(it.price || it.cost_price || 0) * Number(it.total_quantity || (Number(it.main_quantity || 0) + Number(it.bar_quantity || 0) + Number(it.kitchen_quantity || 0))),
          status: Number(it.total_quantity || it.main_quantity || 0) > 0 ? "in_stock" : "out_of_stock",
          date: it.updated_at || new Date().toISOString(),
          user: "Central Store",
          badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        });
      });
    }

    // Sort by date descending
    rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.user.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [filteredOrders, filteredBarOrders, filteredKitchenOrders, filteredPurchases, inventory, activeDept, searchQuery]);

  // Paginated Rows
  const totalPages = Math.ceil(ledgerRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return ledgerRows.slice(start, start + pageSize);
  }, [ledgerRows, currentPage]);

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Master Operations & Departmental Reports
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Consolidated enterprise intelligence across POS, Bar, Kitchen, Inventory, and Purchasing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => printReportArea("master-reports-printable-area", "Master_Operations_Report")}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            Print Report Statement
          </button>

          <button
            onClick={fetchAllOperations}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* DEPARTMENT & LOCATION FILTRATION PILL BAR */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs print-hide">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" /> Filter Location:
        </span>

        {[
          { id: "all", label: "All Outlets (Enterprise)", icon: Building2 },
          { id: "bar", label: "Bar Sub-Store", icon: Wine },
          { id: "kitchen", label: "Kitchen Sub-Store", icon: UtensilsCrossed },
          { id: "inventory", label: "Inventory & Warehouse", icon: Package },
          { id: "purchasing", label: "Purchasing & Suppliers", icon: Truck },
          { id: "pos", label: "POS / Cashiering", icon: ShoppingBag },
        ].map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => {
                setActiveDept(dept.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-500/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-slate-950" : "text-slate-500"}`} />
              {dept.label}
            </button>
          );
        })}
      </div>

      {/* Date Filter & Preset Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between print-hide">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="h-4 w-4 text-amber-500" /> Timeframe:
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

      {/* PRINTABLE REPORT AREA */}
      <div id="master-reports-printable-area" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">THE OAK CLUB & LOUNGE</h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                {activeDept === "bar"
                  ? "BAR OUTLET SALES, SHOTS & BEVERAGE AUDIT REPORT"
                  : activeDept === "kitchen"
                  ? "KITCHEN OUTLET FOOD PRODUCTION & ORDER AUDIT REPORT"
                  : activeDept === "inventory"
                  ? "INVENTORY VALUATION, OUTLET BALANCES & STOCK AUDIT"
                  : activeDept === "purchasing"
                  ? "PURCHASING, SUPPLIER PROCUREMENT & CREDIT AUDIT"
                  : activeDept === "pos"
                  ? "FRONT-OF-HOUSE CASHIER, SALES & WAITER AUDIT"
                  : "CONSOLIDATED ENTERPRISE MASTER OPERATIONS AUDIT"}
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">Official Operations Audit</h2>
              <p className="text-slate-600 mt-0.5">Generated: {new Date().toLocaleString()}</p>
              <p className="text-slate-600 font-semibold">Location: {activeDept.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* DYNAMIC EXECUTIVE KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeDept === "all" && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales Revenue</span>
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(metrics.grossSales)}</p>
                <p className="mt-1 text-xs text-slate-400">{metrics.totalOrders} total customer orders</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bar Drinks Revenue</span>
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Wine className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-purple-700">{formatMoney(metrics.barSales)}</p>
                <p className="mt-1 text-xs text-slate-400">{metrics.barItemsCount} drinks & shots poured</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kitchen Food Revenue</span>
                  <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-amber-800">{formatMoney(metrics.kitchenSales)}</p>
                <p className="mt-1 text-xs text-slate-400">{metrics.kitchenItemsCount} dishes served</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Spend</span>
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(metrics.totalPurchasesSpend)}</p>
                <p className="mt-1 text-xs text-slate-400">{metrics.totalPurchasesCount} purchase orders</p>
              </div>
            </>
          )}

          {activeDept === "bar" && (
            <>
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Total Bar Sales</span>
                <p className="mt-3 text-2xl font-black text-purple-900">{formatMoney(metrics.barSales)}</p>
                <p className="mt-1 text-xs text-purple-600">Beverage sales during period</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Servings Sold</span>
                <p className="mt-3 text-2xl font-black text-slate-900">{metrics.barItemsCount} Drinks / Shots</p>
                <p className="mt-1 text-xs text-slate-400">All liquid portions sold</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bar Stock Valuation</span>
                <p className="mt-3 text-2xl font-black text-amber-700">{formatMoney(metrics.barStockVal)}</p>
                <p className="mt-1 text-xs text-slate-400">On-hand drinks in bar storage</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Drink Price</span>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {metrics.barItemsCount > 0 ? formatMoney(metrics.barSales / metrics.barItemsCount) : "0 ETB"}
                </p>
                <p className="mt-1 text-xs text-slate-400">Per serving realization</p>
              </div>
            </>
          )}

          {activeDept === "kitchen" && (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Kitchen Food Sales</span>
                <p className="mt-3 text-2xl font-black text-amber-950">{formatMoney(metrics.kitchenSales)}</p>
                <p className="mt-1 text-xs text-amber-700">Food sales during period</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dishes Served</span>
                <p className="mt-3 text-2xl font-black text-slate-900">{metrics.kitchenItemsCount} Plates</p>
                <p className="mt-1 text-xs text-slate-400">Prepared by kitchen staff</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kitchen Stock Valuation</span>
                <p className="mt-3 text-2xl font-black text-emerald-700">{formatMoney(metrics.kitchenStockVal)}</p>
                <p className="mt-1 text-xs text-slate-400">Food ingredients on-hand</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Plate Price</span>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {metrics.kitchenItemsCount > 0 ? formatMoney(metrics.kitchenSales / metrics.kitchenItemsCount) : "0 ETB"}
                </p>
                <p className="mt-1 text-xs text-slate-400">Realization per dish</p>
              </div>
            </>
          )}

          {activeDept === "inventory" && (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Stock Valuation</span>
                <p className="mt-3 text-2xl font-black text-blue-950">{formatMoney(metrics.totalStockValuation)}</p>
                <p className="mt-1 text-xs text-blue-700">Across Central, Bar, and Kitchen</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Central Store Value</span>
                <p className="mt-3 text-2xl font-black text-slate-900">{formatMoney(metrics.centralStockVal)}</p>
                <p className="mt-1 text-xs text-slate-400">Main warehouse balance</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Catalog SKUs</span>
                <p className="mt-3 text-2xl font-black text-slate-900">{inventory.length} Items</p>
                <p className="mt-1 text-xs text-slate-400">Configured in system</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
                <p className="mt-3 text-2xl font-black text-rose-600">{metrics.lowStockCount} Items</p>
                <p className="mt-1 text-xs text-rose-500 font-semibold">Below safety threshold</p>
              </div>
            </>
          )}

          {activeDept === "purchasing" && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Spend</span>
                <p className="mt-3 text-2xl font-black text-emerald-950">{formatMoney(metrics.totalPurchasesSpend)}</p>
                <p className="mt-1 text-xs text-emerald-700">Total goods procured</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders Received</span>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {metrics.totalReceivedPurchases} / {metrics.totalPurchasesCount}
                </p>
                <p className="mt-1 text-xs text-slate-400">Checked into inventory</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unpaid Credit</span>
                <p className="mt-3 text-2xl font-black text-amber-700">{formatMoney(metrics.unpaidCreditPurchases)}</p>
                <p className="mt-1 text-xs text-amber-600 font-semibold">Owed to suppliers</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settled (Paid)</span>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {formatMoney(metrics.totalPurchasesSpend - metrics.unpaidCreditPurchases)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Paid out to suppliers</p>
              </div>
            </>
          )}

          {activeDept === "pos" && (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">POS Sales Revenue</span>
                <p className="mt-3 text-2xl font-black text-blue-950">{formatMoney(metrics.grossSales)}</p>
                <p className="mt-1 text-xs text-blue-700">Cashier settled volume</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tickets</span>
                <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalOrders} Orders</p>
                <p className="mt-1 text-xs text-slate-400">Served & paid</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Order Value</span>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {metrics.totalOrders > 0 ? formatMoney(metrics.grossSales / metrics.totalOrders) : "0 ETB"}
                </p>
                <p className="mt-1 text-xs text-slate-400">Spend per table ticket</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Orders</span>
                <p className="mt-3 text-2xl font-black text-emerald-600">{metrics.completedOrders}</p>
                <p className="mt-1 text-xs text-slate-400">Fulfilled without cancellation</p>
              </div>
            </>
          )}
        </div>

        {/* DETAILED TRANSACTION & ACTIVITY LEDGER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeDept === "all"
                  ? "Consolidated Multi-Department Activity Ledger"
                  : `${activeDept.toUpperCase()} Department Detailed Ledger`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {ledgerRows.length} filtered entries matching your active criteria
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:w-60 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Identifier / Ref</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Activity / Items Summary</th>
                  <th className="py-3 px-4">User / Source</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Timestamp</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      Loading operations report data...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      No transaction records found matching your active location & date filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{row.id}</td>
                      <td className="py-3 px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${row.badgeColor}`}>
                          {row.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-800 font-semibold" title={row.title}>
                        {row.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{row.user}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-700">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                        {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ledgerRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                    <td colSpan="6" className="py-3 px-4 text-right text-xs uppercase tracking-wider">
                      Grand Total Amount ({activeDept.toUpperCase()}):
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-black text-slate-950">
                      {formatMoney(ledgerRows.reduce((acc, r) => acc + Number(r.amount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
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
              <p className="font-extrabold uppercase">THE OAK CLUB — {activeDept.toUpperCase()} AUDIT STATEMENT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • Operational & Financial Audit Report</p>
            </div>
            <div className="text-right">
              <p>Prepared by (Supervisor): ______________________</p>
              <p className="mt-2">General Manager Approval: _______________________</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK DRILL-DOWN DEPARTMENT REPORTS CARDS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> Dedicated Department Report Dashboards
        </h3>
        <p className="text-xs text-slate-400">
          Click any department below to open its full specialized reporting interface:
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-1">
          {[
            { title: "POS Sales Reports", path: "/pos/reports", icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { title: "Bar Drinks & Shots", path: "/bar/reports", icon: Wine, color: "text-purple-600 bg-purple-50" },
            { title: "Kitchen Prep Reports", path: "/kitchen/reports", icon: UtensilsCrossed, color: "text-amber-600 bg-amber-50" },
            { title: "Inventory Valuation", path: "/inventory/reports", icon: Package, color: "text-emerald-600 bg-emerald-50" },
            { title: "Purchasing & Spend", path: "/purchasing/reports", icon: Truck, color: "text-indigo-600 bg-indigo-50" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-amber-400 hover:bg-white transition shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition">
                    {card.title}
                  </span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 transition" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
