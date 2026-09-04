import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  Users,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  Radio,
  Grid,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  UserCheck,
  Building2,
  Sliders,
  FileText,
  Utensils,
  ChevronRight,
  Shield,
  Eye,
  Wine,
  Search,
  X,
  Phone,
} from "lucide-react";
import api from "../../../services/api";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Core Data States
  const [dashboardStats, setDashboardStats] = useState(null);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [barOrders, setBarOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vipCustomers, setVipCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [vipPaymentsList, setVipPaymentsList] = useState([]);
  const [multiLocationStock, setMultiLocationStock] = useState([]);

  // Table Radar Filter & Work Journey Timeframe
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "occupied" | "unpaid" | "available"
  const [timeframe, setTimeframe] = useState("today"); // "today" | "lifetime"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [leaderboardSort, setLeaderboardSort] = useState("quantity"); // "quantity" | "revenue"
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [showVipPaymentsModal, setShowVipPaymentsModal] = useState(false);
  const [vipSearchQuery, setVipSearchQuery] = useState("");

  // ============================================================
  // FETCH ALL ADMIN LIVE COMMAND DATA
  // ============================================================
  const fetchAdminLiveData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError("");

      const [dashRes, tablesRes, ordersRes, empRes, prodRes, kitchenRes, barRes, expRes, vipRes, pmtsRes, multiStockRes] = await Promise.all([
        api("/dashboard").catch(() => ({})),
        api("/tables").catch(() => api("/pos/tables").catch(() => ({}))),
        api("/pos/orders").catch(() => api("/orders").catch(() => ({}))),
        api("/employees").catch(() => ({})),
        api("/products").catch(() => ({})),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => api("/bar").catch(() => [])),
        api("/expenses").catch(() => []),
        api("/vip-customers").catch(() => api("/customers/vip").catch(() => ([]))),
        api("/payments").catch(() => ([])),
        api("/inventory/multi-location").catch(() => ({})),
      ]);

      if (multiStockRes) {
        setMultiLocationStock(multiStockRes.inventory || multiStockRes.data || (Array.isArray(multiStockRes) ? multiStockRes : []));
      }

      if (dashRes && (dashRes.success || dashRes.stats || dashRes.data)) {
        setDashboardStats(dashRes.stats || dashRes.data || dashRes);
      }

      setTables(tablesRes.tables || tablesRes.data || (Array.isArray(tablesRes) ? tablesRes : []));
      
      const rawPosOrders = ordersRes.orders || ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []);
      const rawKitchenOrders = Array.isArray(kitchenRes) ? kitchenRes : kitchenRes.orders || [];
      const rawBarOrders = Array.isArray(barRes) ? barRes : barRes.orders || [];
      
      // Combine POS, Bar, and Kitchen orders with deduplication so identical tickets are not counted twice
      const combinedOrdersMap = new Map();
      [...rawPosOrders, ...rawBarOrders, ...rawKitchenOrders].forEach((ord) => {
        if (!ord) return;
        const key = String(ord.order_number || ord.orderNumber || ord.id || ord.order_id || "");
        if (key && !combinedOrdersMap.has(key)) {
          combinedOrdersMap.set(key, ord);
        } else if (key) {
          const existing = combinedOrdersMap.get(key);
          const existingItems = existing.items || existing.order_items;
          const newItems = ord.items || ord.order_items;
          if ((!existingItems || existingItems.length === 0) && newItems && newItems.length > 0) {
            combinedOrdersMap.set(key, { ...existing, items: newItems });
          }
        } else {
          combinedOrdersMap.set(String(Math.random()), ord);
        }
      });
      setOrders(Array.from(combinedOrdersMap.values()));
      setEmployees(empRes.employees || empRes.data || (Array.isArray(empRes) ? empRes : []));
      setProducts(prodRes.products || prodRes.data || (Array.isArray(prodRes) ? prodRes : []));
      setKitchenOrders(rawKitchenOrders);
      setBarOrders(rawBarOrders);
      setExpenses(Array.isArray(expRes) ? expRes : expRes.expenses || expRes.data || []);
      
      const fetchedVips = vipRes.customers || vipRes.data || (Array.isArray(vipRes) ? vipRes : []);
      setVipCustomers(fetchedVips);

      // Fetch dedicated VIP customer payments from backend service endpoints
      if (Array.isArray(fetchedVips) && fetchedVips.length > 0) {
        try {
          const vipPaymentResults = await Promise.allSettled(
            fetchedVips.map((vc) =>
              api(`/vip-customers/${vc.id}/payments`)
                .catch(() => api(`/vip-customers/${vc.id}/transactions`))
                .catch(() => api(`/customers/vip/${vc.id}/payments`))
                .catch(() => ({ data: [] }))
            )
          );

          const allVipPayments = [];
          vipPaymentResults.forEach((res, idx) => {
            if (res.status === "fulfilled" && res.value) {
              const vc = fetchedVips[idx];
              const pList = res.value.data || res.value.payments || res.value.transactions || (Array.isArray(res.value) ? res.value : []);
              if (Array.isArray(pList)) {
                pList.forEach((p) => {
                  allVipPayments.push({
                    ...p,
                    id: p.payment_id || p.id,
                    amount: Number(p.payment_amount || p.amount || 0),
                    payment_method: p.payment_method || "VIP Credit",
                    reference: p.payment_reference || p.reference || "",
                    status: p.payment_status || p.status || "paid",
                    paid_at: p.paid_at || p.order_created_at || p.created_at || p.date,
                    created_at: p.paid_at || p.order_created_at || p.created_at || p.date,
                    vip_customer_id: vc.id,
                    customer_name: vc.name,
                    customer_phone: vc.phone,
                    tier: vc.tier,
                  });
                });
              }
            }
          });

          if (allVipPayments.length > 0) {
            setVipPaymentsList(allVipPayments);
          }
        } catch (vpErr) {
          console.log("VIP customer payments fetch notice:", vpErr);
        }
      }

      setPayments(pmtsRes.payments || pmtsRes.data || (Array.isArray(pmtsRes) ? pmtsRes : []));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch admin live data:", err);
      if (isInitial) setError(err.message || "Failed to load live command data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Live 10-Second Auto-Polling
  useEffect(() => {
    fetchAdminLiveData(true);
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => fetchAdminLiveData(false), 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAdminLiveData]);

  // ============================================================
  // DERIVED COMPUTATION: TABLE RADAR & LIVE TABS
  // ============================================================
  const tableRadarData = useMemo(() => {
    if (!Array.isArray(tables)) return [];

    return tables.map((tbl) => {
      // Find active unpaid non-completed orders strictly matching this table
      const tblOrders = (orders || []).filter((o) => {
        const st = String(o.status || "").toLowerCase();
        const paySt = String(o.payment_status || "").toLowerCase();

        const isCompletedOrPaid =
          st === "completed" ||
          st === "paid" ||
          st === "cancelled" ||
          st === "void" ||
          paySt === "paid" ||
          o.is_paid === true;

        if (isCompletedOrPaid) return false;

        const amt = Number(o.total_amount || o.total || o.grand_total || o.subtotal || 0);
        if (amt <= 0) return false;

        const oTableId = String(o.table_id || o.tableId || o.table?.id || "");
        const oTableNum = String(o.table_number || o.tableNumber || o.table?.table_number || "")
          .toLowerCase()
          .replace(/^t/, "");

        const tId = String(tbl.id || "");
        const tNum = String(tbl.table_number || tbl.tableNumber || "")
          .toLowerCase()
          .replace(/^t/, "");

        return (
          (oTableId && tId && oTableId === tId) ||
          (oTableNum && tNum && oTableNum === tNum) ||
          (oTableId && tNum && oTableId === tNum)
        );
      });

      // Sum active order amounts
      let totalAmount = 0;
      let waiterName = tbl.current_waiter_name || tbl.waiter_name || "Staff Waiter";
      let itemCount = 0;

      tblOrders.forEach((ord) => {
        const amt = Number(ord.total_amount || ord.total || ord.grand_total || 0);
        totalAmount += amt;

        if (ord.waiter_name || ord.server_name || ord.created_by_name) {
          waiterName = ord.waiter_name || ord.server_name || ord.created_by_name;
        }

        if (Array.isArray(ord.items)) {
          itemCount += ord.items.reduce((acc, item) => acc + Number(item.quantity || 1), 0);
        }
      });

      const isDbOccupied = String(tbl.status || "").toLowerCase() === "occupied";
      const isOccupied = isDbOccupied || tblOrders.length > 0;
      const isUnpaid = isOccupied && totalAmount > 0;

      return {
        id: tbl.id,
        number: tbl.table_number || tbl.number || tbl.id,
        name: tbl.name || `Table ${tbl.table_number || tbl.id}`,
        section: tbl.section || tbl.location || "Main Floor",
        capacity: tbl.capacity || 4,
        isOccupied,
        activeOrdersCount: isOccupied ? tblOrders.length : 0,
        itemCount: isOccupied ? itemCount : 0,
        totalAmount: isOccupied ? totalAmount : 0,
        isUnpaid,
        waiterName: isOccupied ? waiterName : "-",
        orders: isOccupied ? tblOrders : [],
      };
    });
  }, [tables, orders]);

  // Executive Summary Metrics
  const metrics = useMemo(() => {
    const totalTablesCount = tableRadarData.length;
    const occupiedTablesCount = tableRadarData.filter((t) => t.isOccupied).length;
    const openUnpaidTabsCount = tableRadarData.filter((t) => t.isUnpaid).length;
    const totalUnpaidPendingMoney = tableRadarData
      .filter((t) => t.isUnpaid)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const todayStr = new Date().toISOString().split("T")[0];

    // Helper: Check if an order is paid
    const isOrderPaid = (ord) => {
      const st = String(ord.status || "").toLowerCase();
      const paySt = String(ord.payment_status || "").toLowerCase();
      return (
        st === "completed" ||
        st === "paid" ||
        paySt === "paid" ||
        ord.is_paid === true
      );
    };

    // Calculate real revenue from today's orders
    const todayOrdersGross = (orders || []).reduce((sum, ord) => {
      if (!isOrderPaid(ord)) return sum;
      const dateVal = ord.created_at || ord.createdAt || ord.order_date || ord.date || ord.paid_at;
      let isToday = false;
      if (!dateVal) {
        isToday = true;
      } else {
        try {
          const ordDate = new Date(dateVal).toISOString().split("T")[0];
          isToday = ordDate === todayStr;
        } catch {
          isToday = true;
        }
      }
      return isToday ? sum + Number(ord.total_amount || ord.total || 0) : sum;
    }, 0);

    const statsTodaySales = Number(dashboardStats?.today_sales ?? dashboardStats?.todaySales ?? 0);
    const todayGrossRevenue = statsTodaySales > 0 ? statsTodaySales : todayOrdersGross;

    const lifetimeOrdersGross = (orders || []).reduce((sum, ord) => {
      if (!isOrderPaid(ord)) return sum;
      return sum + Number(ord.total_amount || ord.total || 0);
    }, 0);

    const statsLifetimeSales = Number(
      dashboardStats?.all_time_sales ??
      dashboardStats?.lifetime_sales ??
      dashboardStats?.total_sales ??
      dashboardStats?.allTimeSales ??
      dashboardStats?.lifetimeRevenue ??
      0
    );
    const lifetimeGrossRevenue = statsLifetimeSales > 0 ? statsLifetimeSales : (lifetimeOrdersGross || todayGrossRevenue);

    // Operating expenses: strictly filtered for today vs lifetime
    const todayExpenses = (expenses || []).reduce((sum, e) => {
      const dateVal = e.date || e.created_at || e.createdAt || e.expense_date;
      if (!dateVal) return sum;
      try {
        const dStr = String(dateVal).split(/[T ]/)[0];
        return dStr === todayStr ? sum + Number(e.amount || e.total || 0) : sum;
      } catch {
        return sum;
      }
    }, 0);

    const lifetimeExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || e.total || 0), 0);

    // Selected Active Gross Revenue & Operating Expenses based strictly on timeframe
    const activeGrossRevenue = timeframe === "lifetime" ? lifetimeGrossRevenue : todayGrossRevenue;
    const activeExpenses = timeframe === "lifetime" ? lifetimeExpenses : todayExpenses;

    const completedOrders = Number(dashboardStats?.today_orders || dashboardStats?.total_orders || orders.length || 0);
    const activeStaffCount = employees.filter((e) => e.is_active || e.status === "active").length || employees.length;

    // Financial Tax & Net Earnings Calculation strictly derived from active timeframe
    const totalVatTax = Math.round(activeGrossRevenue * 0.15 * 100) / 100;
    const totalServiceCharge = Math.round(activeGrossRevenue * 0.10 * 100) / 100;
    const netRevenue = Math.max(activeGrossRevenue - totalVatTax - totalServiceCharge - activeExpenses, 0);

    const lifetimeVatTax = Math.round(lifetimeGrossRevenue * 0.15 * 100) / 100;
    const lifetimeServiceCharge = Math.round(lifetimeGrossRevenue * 0.10 * 100) / 100;
    const lifetimeNetRevenue = Math.max(lifetimeGrossRevenue - lifetimeVatTax - lifetimeServiceCharge - lifetimeExpenses, 0);

    return {
      totalTablesCount,
      occupiedTablesCount,
      openUnpaidTabsCount,
      totalUnpaidPendingMoney,
      grossRevenue: activeGrossRevenue,
      todayGrossRevenue,
      lifetimeGrossRevenue,
      totalVatTax,
      totalServiceCharge,
      totalExpenses: activeExpenses,
      todayExpenses,
      lifetimeExpenses,
      netRevenue,
      lifetimeNetRevenue,
      completedOrders,
      activeStaffCount,
    };
  }, [tableRadarData, dashboardStats, orders, employees, expenses, timeframe]);

  // Filtered Table Radar List
  const filteredRadarTables = useMemo(() => {
    return tableRadarData.filter((t) => {
      if (tableFilter === "occupied") return t.isOccupied;
      if (tableFilter === "unpaid") return t.isUnpaid;
      if (tableFilter === "available") return !t.isOccupied;
      return true;
    });
  }, [tableRadarData, tableFilter]);

  // ============================================================
  // ITEMIZED FOOD & DRINK PORTION SALES LEADERBOARD (REAL SALES)
  // ============================================================
  const itemizedPortionSales = useMemo(() => {
    // 1. Build product catalog maps for rapid lookup
    const productById = new Map();
    const productByName = new Map();
    if (Array.isArray(products)) {
      products.forEach((p) => {
        if (p.id) productById.set(String(p.id), p);
        if (p.name) productByName.set(p.name.trim().toLowerCase(), p);
      });
    }

    // Helper: Determine if order timestamp matches active timeframe filter
    const matchesTimeframe = (ord) => {
      if (timeframe === "lifetime") return true;
      const dateVal = ord.created_at || ord.createdAt || ord.order_date || ord.date || ord.paid_at;
      if (!dateVal) return true; // Include recent active session orders without explicit timestamp
      try {
        const ordDate = new Date(dateVal).toISOString().split("T")[0];
        const todayStr = new Date().toISOString().split("T")[0];
        return ordDate === todayStr;
      } catch {
        return true;
      }
    };

    // Helper: Parse order items array or JSON string
    const parseItems = (ord) => {
      if (!ord) return [];
      let raw = ord.items || ord.order_items || ord.products || [];
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = [];
        }
      }
      if (Array.isArray(raw) && raw.length > 0) return raw;
      if (ord.items_summary && typeof ord.items_summary === "string") {
        return [{ name: ord.items_summary, quantity: 1, unit_price: Number(ord.total_amount || ord.total || 0) }];
      }
      return [];
    };

    const portionSalesMap = new Map();

    // 2. Iterate through real orders and aggregate item portion sales
    if (Array.isArray(orders)) {
      orders.forEach((ord) => {
        // Skip cancelled or voided orders
        const ordStatus = String(ord.status || "").toLowerCase();
        if (ordStatus === "cancelled" || ordStatus === "void" || ordStatus === "voided") return;

        // Filter by selected timeframe (Today vs Lifetime)
        if (!matchesTimeframe(ord)) return;

        const items = parseItems(ord);
        items.forEach((item) => {
          if (!item) return;

          const rawName = String(item.name || item.product_name || item.item_name || item.title || "").trim();
          if (!rawName) return;

          const qty = Math.max(Number(item.quantity || item.qty || 1), 0);
          if (qty <= 0) return;

          const unitPrice = Number(item.unit_price || item.price || item.product_price || 0);
          const lineTotal = Number(item.total || item.total_price || item.subtotal || (qty * unitPrice));

          // Extract portion details
          let portionTitle = item.portionTitle || item.portion_title || item.portion || "";
          let baseName = rawName;

          // Check if name contains bracketed portion, e.g. "Jameson (Single Shot)"
          const portionMatch = rawName.match(/^(.+?)\s*\((.+?)\)$/);
          if (portionMatch) {
            baseName = portionMatch[1].trim();
            if (!portionTitle) portionTitle = portionMatch[2].trim();
          }

          // Check notes for portion specification
          if (!portionTitle && item.notes && typeof item.notes === "string" && !item.notes.toLowerCase().includes("table")) {
            const noteMatch = item.notes.match(/(single shot|double shot|shot|bottle|glass|plate|portion|serving)/i);
            if (noteMatch) {
              portionTitle = noteMatch[0];
            }
          }

          // Catalog lookup for enriched categories & units
          const pId = item.product_id || item.productId || item.id;
          const matchedProd =
            (pId && productById.get(String(pId))) ||
            productByName.get(baseName.toLowerCase()) ||
            productByName.get(rawName.toLowerCase());

          // Category identification
          const rawCatName = matchedProd?.category_name || item.category_name || item.category || "";
          const rawCatType = matchedProd?.category_type || item.category_type || "";

          const isBar =
            rawCatType === "bar" ||
            rawCatName.toLowerCase().includes("bar") ||
            rawCatName.toLowerCase().includes("drink") ||
            rawCatName.toLowerCase().includes("beverage") ||
            rawCatName.toLowerCase().includes("liquor") ||
            rawCatName.toLowerCase().includes("wine") ||
            rawCatName.toLowerCase().includes("beer") ||
            rawCatName.toLowerCase().includes("cocktail") ||
            rawCatName.toLowerCase().includes("spirit") ||
            baseName.toLowerCase().includes("shot") ||
            baseName.toLowerCase().includes("beer") ||
            baseName.toLowerCase().includes("whiskey") ||
            baseName.toLowerCase().includes("vodka") ||
            baseName.toLowerCase().includes("gin") ||
            baseName.toLowerCase().includes("wine");

          const categoryType = isBar ? "bar" : "food";
          const categoryName = rawCatName || (isBar ? "Bar & Drinks" : "Kitchen Food");

          // Standardize portion name and unit label
          let displayPortion = portionTitle;
          let unitLabel = "pcs";

          if (isBar) {
            const pLower = (portionTitle || "").toLowerCase();
            if (pLower.includes("single") || pLower.includes("1x") || pLower.includes("shot")) {
              displayPortion = portionTitle || "Single Shot";
              unitLabel = "Shots";
            } else if (pLower.includes("double") || pLower.includes("2x")) {
              displayPortion = portionTitle || "Double Shot";
              unitLabel = "Shots";
            } else if (pLower.includes("bottle") || (matchedProd?.unit || "").toLowerCase().includes("bottle")) {
              displayPortion = portionTitle || "Whole Bottle";
              unitLabel = "Bottles";
            } else if (pLower.includes("glass")) {
              displayPortion = portionTitle || "Glass";
              unitLabel = "Glasses";
            } else {
              displayPortion = portionTitle || "Drink Portion";
              unitLabel = "Drinks";
            }
          } else {
            const pLower = (portionTitle || "").toLowerCase();
            if (pLower.includes("plate") || pLower.includes("half") || pLower.includes("full")) {
              displayPortion = portionTitle;
              unitLabel = "Plates";
            } else {
              displayPortion = portionTitle || "Standard Serving";
              unitLabel = matchedProd?.unit || "Plates";
            }
          }

          // Composite key: baseName + portion so Single Shot vs Double Shot are individually tracked!
          const aggKey = `${baseName.toLowerCase()}___${(displayPortion || "standard").toLowerCase()}`;

          if (!portionSalesMap.has(aggKey)) {
            portionSalesMap.set(aggKey, {
              id: aggKey,
              productId: matchedProd?.id || pId || null,
              parentProductId: matchedProd?.parent_product_id || null,
              name: baseName,
              displayName:
                displayPortion &&
                displayPortion !== "Standard Serving" &&
                displayPortion !== "Drink Portion" &&
                !baseName.toLowerCase().includes(displayPortion.toLowerCase())
                  ? `${baseName} (${displayPortion})`
                  : baseName,
              baseName,
              portion: displayPortion,
              category: categoryName,
              categoryType,
              quantity: 0,
              unit: unitLabel,
              unitPrice: unitPrice,
              revenue: 0,
              ordersCount: 0,
              imageUrl: matchedProd?.image_url || matchedProd?.imageUrl || matchedProd?.image || null,
            });
          }

          const existing = portionSalesMap.get(aggKey);
          existing.quantity += qty;
          existing.revenue += lineTotal > 0 ? lineTotal : qty * unitPrice;
          existing.ordersCount += 1;
          if (unitPrice > 0 && !existing.unitPrice) existing.unitPrice = unitPrice;
        });
      });
    }

    let results = Array.from(portionSalesMap.values());

    // Fallback: If no order items are parsed (e.g. historical orders wiped), but dashboardStats.top_products exists
    if (results.length === 0 && Array.isArray(dashboardStats?.top_products) && dashboardStats.top_products.length > 0) {
      results = dashboardStats.top_products
        .filter((p) => Number(p.quantity_sold || p.quantity || 0) > 0)
        .map((p) => {
          const qty = Number(p.quantity_sold || p.quantity || 0);
          const price = Number(p.price || p.unit_price || 0);
          const rev = Number(p.revenue || p.total_revenue || qty * price);
          const isBar = p.category_type === "bar" || (p.category_name || "").toLowerCase().includes("bar");
          return {
            id: String(p.id || p.name),
            name: p.name,
            displayName: p.name,
            baseName: p.name,
            portion: isBar ? "Drink Portion" : "Standard Serving",
            category: p.category_name || (isBar ? "Bar & Drinks" : "Kitchen Food"),
            categoryType: isBar ? "bar" : "food",
            quantity: qty,
            unit: isBar ? "Drinks" : "Plates",
            unitPrice: price,
            revenue: rev,
            ordersCount: 1,
            imageUrl: p.image_url || null,
          };
        });
    }

    return results;
  }, [orders, products, timeframe, dashboardStats]);

  // Map multi-location stock by product id for fast on-hand inventory lookup
  const stockByProductId = useMemo(() => {
    const map = new Map();
    if (Array.isArray(multiLocationStock)) {
      multiLocationStock.forEach((item) => {
        if (item.product_id) {
          map.set(String(item.product_id), item);
        }
      });
    }
    return map;
  }, [multiLocationStock]);

  // Filtered & Sorted Leaderboard Products
  const filteredProducts = useMemo(() => {
    let list = itemizedPortionSales.filter((item) => {
      // Category filter
      if (categoryFilter === "food" && item.categoryType !== "food") return false;
      if (categoryFilter === "bar" && item.categoryType !== "bar") return false;

      // Search query filter
      if (leaderboardSearch.trim()) {
        const q = leaderboardSearch.trim().toLowerCase();
        const matchesName = item.displayName.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesPortion = (item.portion || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesPortion) return false;
      }

      return true;
    });

    // Sort order: by Units Sold or by Total Revenue
    if (leaderboardSort === "quantity") {
      list.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    } else {
      list.sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
    }

    return list;
  }, [itemizedPortionSales, categoryFilter, leaderboardSearch, leaderboardSort]);

  // Executive Portions Leaderboard Summary Metrics
  const leaderboardMetrics = useMemo(() => {
    const totalItems = filteredProducts.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = filteredProducts.reduce((sum, item) => sum + item.revenue, 0);
    const foodPortions = itemizedPortionSales.filter((i) => i.categoryType === "food").reduce((sum, i) => sum + i.quantity, 0);
    const barPortions = itemizedPortionSales.filter((i) => i.categoryType === "bar").reduce((sum, i) => sum + i.quantity, 0);
    const maxQty = Math.max(...filteredProducts.map((i) => i.quantity), 1);
    const allCount = itemizedPortionSales.length;
    const foodCount = itemizedPortionSales.filter((i) => i.categoryType === "food").length;
    const barCount = itemizedPortionSales.filter((i) => i.categoryType === "bar").length;

    return {
      totalItems,
      totalRevenue,
      foodPortions,
      barPortions,
      maxQty,
      allCount,
      foodCount,
      barCount,
    };
  }, [filteredProducts, itemizedPortionSales]);

  const vipPaymentOrders = useMemo(() => {
    const list = [];
    const seenKeys = new Set();
    const registeredVips = Array.isArray(vipCustomers) ? vipCustomers : [];
    if (registeredVips.length === 0) return [];

    // Map registered VIP customers by ID and normalized name
    const vipIdMap = new Map();
    const vipNameMap = new Map();
    registeredVips.forEach((vc) => {
      if (vc.id) vipIdMap.set(String(vc.id), vc);
      if (vc.name) vipNameMap.set(vc.name.trim().toLowerCase(), vc);
      if (vc.full_name) vipNameMap.set(vc.full_name.trim().toLowerCase(), vc);
    });

    const matchRegisteredVip = (item) => {
      if (!item) return null;

      // 1. Try matching by VIP ID
      const custId = String(
        item.vip_customer_id ||
        item.customer_id ||
        item.vipCustomerId ||
        item.customerId ||
        ""
      );
      if (custId && custId !== "null" && custId !== "undefined" && vipIdMap.has(custId)) {
        return vipIdMap.get(custId);
      }

      // 2. Try matching from reference if it has "VIP_CREDIT:"
      const ref = String(item.reference || item.payment_reference || item.notes || "");
      if (ref.toUpperCase().includes("VIP_CREDIT:")) {
        const extractedName = ref.replace(/^.*VIP_CREDIT:\s*/i, "").trim().toLowerCase();
        if (extractedName && vipNameMap.has(extractedName)) {
          return vipNameMap.get(extractedName);
        }
        for (const vc of registeredVips) {
          const vcNameLower = (vc.name || vc.full_name || "").trim().toLowerCase();
          if (vcNameLower && (extractedName.includes(vcNameLower) || vcNameLower.includes(extractedName))) {
            return vc;
          }
        }
      }

      // 3. Try matching by explicit customer name
      const rawName = String(
        item.customer_name ||
        item.customerName ||
        item.vip_customer_name ||
        item.vip_name ||
        ""
      ).trim().toLowerCase();

      if (rawName && vipNameMap.has(rawName)) {
        return vipNameMap.get(rawName);
      }

      if (rawName) {
        for (const vc of registeredVips) {
          const vcNameLower = (vc.name || vc.full_name || "").trim().toLowerCase();
          if (vcNameLower && (rawName === vcNameLower || rawName.includes(vcNameLower) || vcNameLower.includes(rawName))) {
            return vc;
          }
        }
      }

      return null;
    };

    const processRecord = (item, parentOrder = null) => {
      if (!item) return;

      // Reject non-VIP split share items
      const ref = String(item.reference || item.payment_reference || "").toUpperCase();
      if (ref.includes("SPLIT_SHARE") || ref.includes("ITEMS")) return;

      const pm = String(item.payment_method || item.paymentMethod || item.method || "").toLowerCase();

      // Reject explicit cash, card, telebirr payments unless it has a VIP_CREDIT reference
      if (
        (pm.includes("cash") || pm.includes("card") || pm.includes("telebirr") || pm.includes("mobile")) &&
        !ref.includes("VIP_CREDIT")
      ) {
        return;
      }

      // STRICT RULE: Match against authentic registered VIP customer, or attribute VIP credit orders to Gold VIP profile
      let matchedVip = matchRegisteredVip(item) || (parentOrder ? matchRegisteredVip(parentOrder) : null);
      if (!matchedVip) {
        const isCreditIntent =
          pm.includes("credit") ||
          pm.includes("vip") ||
          ref.includes("vip") ||
          ref.includes("credit") ||
          item.payment_status === "paid" ||
          parentOrder?.payment_status === "paid";

        if (isCreditIntent && registeredVips.length > 0) {
          matchedVip = registeredVips.find((v) => (v.tier || "").toLowerCase().includes("gold")) || registeredVips[0];
        }
      }

      if (!matchedVip) {
        return;
      }

      // Real paid amount
      const amt = Number(
        item.amount ||
        item.payment_amount ||
        (parentOrder ? parentOrder.paid_amount || parentOrder.total : 0) ||
        item.total ||
        0
      );
      if (amt <= 0) return;

      // Real database timestamp (never current clock time)
      const realDate =
        item.paid_at ||
        item.order_created_at ||
        (parentOrder ? parentOrder.created_at : null) ||
        item.created_at ||
        item.createdAt ||
        item.payment_date ||
        item.date;

      const orderNumber =
        item.order_number ||
        (parentOrder ? parentOrder.order_number : null) ||
        item.order_id ||
        item.id;

      const tableNumber =
        item.table_number ||
        (parentOrder ? parentOrder.table_number : null) ||
        item.table_id ||
        "Counter";

      const recordId = String(item.id || item.payment_id || item.order_id || `${orderNumber}_${amt}`);
      const key = `${recordId}_${amt}_${matchedVip.id}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      list.push({
        id: item.id || item.payment_id || item.order_id || recordId,
        order_number: orderNumber ? (String(orderNumber).startsWith("#") ? orderNumber : `#${orderNumber}`) : "#VIP",
        table_number: String(tableNumber).replace(/^T/i, "T"),
        customer_name: matchedVip.name || matchedVip.full_name || "VIP Customer",
        customer_phone: matchedVip.phone || item.customer_phone || item.customerPhone || "-",
        tier: matchedVip.tier || "Gold VIP",
        amount: amt,
        payment_method: "VIP Credit",
        status: item.status || "paid",
        created_at: realDate || null,
      });
    };

    // 1. Process dedicated VIP payments from VIP backend service
    (vipPaymentsList || []).forEach((p) => processRecord(p));

    // 2. Process payments ledger
    (payments || []).forEach((p) => processRecord(p));

    // 3. Process orders and nested payments
    (orders || []).forEach((ord) => {
      if (Array.isArray(ord.payments) && ord.payments.length > 0) {
        ord.payments.forEach((p) => processRecord(p, ord));
      } else {
        processRecord(ord);
      }
    });

    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [vipPaymentsList, payments, orders, vipCustomers]);

  const filteredVipPayments = useMemo(() => {
    if (!vipSearchQuery.trim()) return vipPaymentOrders;
    const q = vipSearchQuery.trim().toLowerCase();
    return vipPaymentOrders.filter((v) => {
      return (
        v.customer_name.toLowerCase().includes(q) ||
        v.customer_phone.toLowerCase().includes(q) ||
        String(v.order_number).toLowerCase().includes(q) ||
        String(v.table_number).toLowerCase().includes(q)
      );
    });
  }, [vipPaymentOrders, vipSearchQuery]);

  const totalVipSpentAmount = useMemo(() => {
    return vipPaymentOrders.reduce((sum, v) => sum + v.amount, 0);
  }, [vipPaymentOrders]);

  const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ETB`;

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Connecting to Club Live Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900 min-h-screen rounded-3xl">
      {/* ============================================================
          EXECUTIVE COMMAND HEADER
      ============================================================ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-xs">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
              LIVE CLUB RADAR ACTIVE
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              Owner Executive View
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            👑 Owner Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time floor radar, occupied tables, live pending tabs, and club revenue flow.
          </p>
        </div>

        {/* Live Refresh & Timeframe Selector Switch */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowVipPaymentsModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <Receipt className="h-4 w-4" />
            VIP Payments & Credit Log
          </button>

          <Link
            to="/customers"
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <Users className="h-4 w-4" />
            VIP Customers & Ledger
          </Link>

          <Link
            to="/finance/cashier-reconciliation"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Cashier Reconciliation
          </Link>

          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-slate-200 text-xs font-extrabold shadow-xs">
            <button
              type="button"
              onClick={() => setTimeframe("today")}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === "today"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Today Sales
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("lifetime")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                timeframe === "lifetime"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              👑 All-Time Club Journey
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 border border-slate-200 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
                autoRefresh ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Radio className={`h-3 w-3 ${autoRefresh ? "animate-pulse" : ""}`} />
              Auto 10s Live Sync
            </button>
            <button
              type="button"
              onClick={() => fetchAdminLiveData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              Sync Now
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-medium hidden lg:block">
            Updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* ============================================================
          REAL-TIME LIVE TABLE FLOOR RADAR & ORDERS MONITOR
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Grid className="h-5 w-5 text-blue-600" />
              Live Club Floor Radar & Table Tab Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live floor visualizer: Occupied tables, unpaid open tabs, waiter assignments & live order counts.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Radar:</span>
            <button
              type="button"
              onClick={() => setTableFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Tables ({metrics.totalTablesCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("occupied")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "occupied"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Occupied ({metrics.occupiedTablesCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("unpaid")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ⚠️ Unpaid Tabs ({metrics.openUnpaidTabsCount})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("available")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Free / Available ({metrics.totalTablesCount - metrics.occupiedTablesCount})
            </button>
          </div>
        </div>

        {/* RADAR TABLES GRID */}
        {filteredRadarTables.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No tables match the selected radar filter criteria.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRadarTables.map((tbl) => (
              <div
                key={tbl.id || tbl.number}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                  tbl.isUnpaid
                    ? "border-amber-300 bg-amber-50/40 shadow-xs"
                    : tbl.isOccupied
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-slate-200 bg-slate-50/50 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        tbl.isOccupied ? (tbl.isUnpaid ? "bg-amber-500 animate-ping" : "bg-blue-500") : "bg-emerald-500"
                      }`}
                    />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {tbl.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      tbl.isUnpaid
                        ? "bg-amber-200 text-amber-900"
                        : tbl.isOccupied
                        ? "bg-blue-200 text-blue-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {tbl.isUnpaid ? "Open Tab Unpaid" : tbl.isOccupied ? "Occupied" : "Free"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Section:</span>
                    <span className="font-bold text-slate-700">{tbl.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waiter Assigned:</span>
                    <span className="font-bold text-slate-800">{tbl.waiterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Items Ordered:</span>
                    <span className="font-bold text-slate-900">{tbl.itemCount} Items ({tbl.activeOrdersCount} Tickets)</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <span className="text-[11px] font-bold text-slate-500">Current Tab Total:</span>
                  <span className={`text-base font-black ${tbl.isUnpaid ? "text-amber-700" : "text-slate-900"}`}>
                    {formatMoney(tbl.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          SMOOTH WAVE REVENUE LINE CHART (RESTOBOARD STYLE)
      ============================================================ */}
      <SmoothMonthlyRevenueChart
        dashboardStats={dashboardStats}
        orders={orders}
        expenses={expenses}
        metrics={metrics}
        formatMoney={formatMoney}
      />

      {/* ============================================================
          MIDDLE SECTION: PORTION SALES LEADERBOARD (REAL ORDERS DATA)
      ============================================================ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        {/* Leaderboard Top Header & Executive Counters */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Itemized Food & Drink Portion Sales Leaderboard
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real Orders Data
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live items and portion servings sold from actual POS, kitchen, and bar orders • Showing{" "}
              <span className="font-bold text-slate-700">
                {timeframe === "today" ? "Today's Sales" : "All-Time Lifetime Sales"}
              </span>
            </p>
          </div>

          {/* Quick Category Portion Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 font-extrabold text-amber-800 border border-amber-200/80 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>{leaderboardMetrics.totalItems.toLocaleString()} Portions Sold</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 font-extrabold text-emerald-800 border border-emerald-200/80 shadow-2xs">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>{formatMoney(leaderboardMetrics.totalRevenue)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 font-bold text-slate-600">
              <Utensils className="h-3 w-3 text-amber-600" />
              <span>{leaderboardMetrics.foodPortions.toLocaleString()} Food</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 font-bold text-slate-600">
              <Wine className="h-3 w-3 text-purple-600" />
              <span>{leaderboardMetrics.barPortions.toLocaleString()} Drinks</span>
            </div>
            {Number(dashboardStats?.bar_low_stock_products || 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 font-extrabold text-rose-700 border border-rose-200 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{dashboardStats.bar_low_stock_products} Bar Out of Stock</span>
              </div>
            )}
            {Number(dashboardStats?.kitchen_low_stock_products || 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 font-extrabold text-rose-700 border border-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{dashboardStats.kitchen_low_stock_products} Kitchen Low Stock</span>
              </div>
            )}
          </div>
        </div>

        {/* Search, Filter Tabs & Sort Controls Bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={leaderboardSearch}
              onChange={(e) => setLeaderboardSearch(e.target.value)}
              placeholder="Search dish, drink, or portion (e.g. Single Shot, Burger)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none transition"
            />
            {leaderboardSearch && (
              <button
                type="button"
                onClick={() => setLeaderboardSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  categoryFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Items ({leaderboardMetrics.allCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("food")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  categoryFilter === "food"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Utensils className="h-3 w-3" />
                Kitchen Food ({leaderboardMetrics.foodCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("bar")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                  categoryFilter === "bar"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wine className="h-3 w-3" />
                Bar & Drinks ({leaderboardMetrics.barCount})
              </button>
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLeaderboardSort("quantity")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition ${
                  leaderboardSort === "quantity"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                Most Sold
              </button>
              <button
                type="button"
                onClick={() => setLeaderboardSort("revenue")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition ${
                  leaderboardSort === "revenue"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <DollarSign className="h-3 w-3" />
                Top Revenue
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Items Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-black text-slate-800">
              {leaderboardSearch
                ? `No items found matching "${leaderboardSearch}"`
                : `No itemized ${categoryFilter === "food" ? "food" : categoryFilter === "bar" ? "drink" : "sales"} recorded for ${timeframe === "today" ? "today yet" : "lifetime"}`}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {leaderboardSearch
                ? "Check your spelling or reset the search filter to view all sold portion items."
                : "As waitstaff enter orders at the POS or Bar, real sold quantities, portion units, and earnings will automatically update here in real-time."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((prod, idx) => {
              const rank = idx + 1;
              const relativePercent = Math.min(
                Math.round((prod.quantity / leaderboardMetrics.maxQty) * 100),
                100
              );

              return (
                <div
                  key={prod.id || prod.displayName || prod.name}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-amber-400 hover:shadow-md"
                >
                  <div>
                    {/* Header: Rank, Category & Portion Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${
                            rank === 1
                              ? "bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400/40"
                              : rank === 2
                              ? "bg-slate-200 text-slate-800 font-extrabold"
                              : rank === 3
                              ? "bg-amber-700 text-white font-extrabold"
                              : "bg-slate-100 text-slate-600 font-bold"
                          }`}
                        >
                          #{rank}
                        </span>

                        {prod.portion && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border truncate max-w-[110px] ${
                              prod.portion.toLowerCase().includes("single") || prod.portion.toLowerCase().includes("shot")
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : prod.portion.toLowerCase().includes("double")
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : prod.portion.toLowerCase().includes("bottle")
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {prod.portion}
                          </span>
                        )}
                      </div>

                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 truncate max-w-[110px]">
                        {prod.category}
                      </span>
                    </div>

                    {/* Middle: Product Icon / Name / Quantity Sold */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold border border-slate-200 group-hover:scale-105 transition-transform">
                        {prod.categoryType === "bar" ? (
                          <Wine className="h-6 w-6 text-purple-600" />
                        ) : (
                          <Utensils className="h-6 w-6 text-amber-600" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-bold text-slate-900 text-sm truncate"
                          title={prod.displayName || prod.name}
                        >
                          {prod.displayName || prod.name}
                        </h3>

                        <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800 border border-amber-200/70">
                          <span>{prod.quantity.toLocaleString()} {prod.unit} Sold</span>
                        </div>
                      </div>
                    </div>

                    {/* Popularity Proportion Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                        <span>Relative Demand</span>
                        <span>{relativePercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rank === 1
                              ? "bg-gradient-to-r from-amber-400 to-amber-500"
                              : prod.categoryType === "bar"
                              ? "bg-purple-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${relativePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Real-time Sub-Store Remaining Stock Badge */}
                    {(() => {
                      const lookupId = String(prod.parentProductId || prod.productId || "");
                      const stockInfo = stockByProductId.get(lookupId);
                      if (!stockInfo) return null;

                      const isBar = prod.categoryType === "bar";
                      const onHand = isBar ? Number(stockInfo.bar_quantity || 0) : Number(stockInfo.kitchen_quantity || 0);
                      const minStock = isBar ? Number(stockInfo.bar_minimum_stock || 1) : Number(stockInfo.kitchen_minimum_stock || 5);
                      const unitName = stockInfo.unit || (isBar ? "btl" : "pcs");
                      const isLow = onHand <= minStock;

                      return (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] border border-slate-100">
                          <span className="text-slate-500 font-medium">
                            {isBar ? "Bar Stock:" : "Kitchen Stock:"}
                          </span>
                          {isLow ? (
                            <span className="font-extrabold text-rose-600 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                              Low: {onHand} {unitName}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800">
                              {onHand} {unitName} left
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer: Unit Price & Revenue */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <div className="text-[11px] text-slate-400">
                      <span>Unit: </span>
                      <span className="font-semibold text-slate-600">
                        {formatMoney(prod.unitPrice)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Total Revenue
                      </span>
                      <span className="font-black text-emerald-700 text-sm">
                        {formatMoney(prod.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          BOTTOM SECTION: OWNER FINANCIAL TAX & NET EARNINGS BREAKDOWN
      ============================================================ */}
      <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30">
              👑 OWNER FINANCIAL STATEMENT
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-amber-300 border border-slate-700">
              {timeframe === "today" ? "📅 Today's Financials" : "👑 All-Time Journey"}
            </span>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Government Tax & Take-Home Profit Breakdown</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-400" />
            Owner Financial Tax & Net Earnings Breakdown
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Final executive statement for {timeframe === "today" ? "today" : "all-time"}: Gross sales, 15% VAT government tax, 10% staff service charge allocation, operating costs, and net owner profit.
          </p>
        </div>

        {/* 5 FINANCIAL BREAKDOWN CARDS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Gross Revenue */}
          <div className="rounded-xl bg-slate-900/90 p-3.5 border border-slate-800 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Business Revenue</p>
            <p className="text-xl font-black text-white">{formatMoney(metrics.grossRevenue)}</p>
            <p className="text-[10px] text-emerald-400 font-semibold">
              {timeframe === "today" ? "Today's POS & Digital Sales" : "All-Time POS & Digital Sales"}
            </p>
          </div>

          {/* 15% VAT Tax */}
          <div className="rounded-xl bg-slate-900/90 p-3.5 border border-red-900/40 space-y-1">
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Gov VAT Tax (15%)</p>
            <p className="text-xl font-black text-red-300">-{formatMoney(metrics.totalVatTax)}</p>
            <p className="text-[10px] text-slate-400">Government Tax Deduction</p>
          </div>

          {/* 10% Service Charge */}
          <div className="rounded-xl bg-slate-900/90 p-3.5 border border-amber-900/40 space-y-1">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Staff Service (10%)</p>
            <p className="text-xl font-black text-amber-300">-{formatMoney(metrics.totalServiceCharge)}</p>
            <p className="text-[10px] text-slate-400">Tip & Staff Allocation</p>
          </div>

          {/* Operating Costs */}
          <div className="rounded-xl bg-slate-900/90 p-3.5 border border-purple-900/40 space-y-1">
            <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Operating & Stock Costs</p>
            <p className="text-xl font-black text-purple-300">-{formatMoney(metrics.totalExpenses || 0)}</p>
            <p className="text-[10px] text-slate-400">
              {timeframe === "today" ? "Today's Expenses & Stock" : "All-Time Operating Expenses"}
            </p>
          </div>

          {/* Net Owner Take-Home Profit */}
          <div className="rounded-xl bg-emerald-950 p-3.5 border-2 border-emerald-400 space-y-1 shadow-md">
            <p className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider">👑 Owner Net Take-Home</p>
            <p className="text-xl font-black text-emerald-400">{formatMoney(metrics.netRevenue)}</p>
            <p className="text-[10px] text-emerald-300 font-bold">
              {timeframe === "today" ? "Today's Net Profit" : "All-Time Net Profit"}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          VIP PAYMENTS AUDIT MODAL
      ============================================================ */}
      {showVipPaymentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-purple-100 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/30 border border-purple-400/40 text-amber-300 shadow-xs">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    👑 VIP Credit Payments Log
                  </h3>
                  <p className="text-xs text-purple-200 font-medium">All completed transactions billed to VIP Credit accounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVipPaymentsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Summary Stats & Search */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-purple-200/80 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-extrabold uppercase text-purple-700 block">Total VIP Credit Volume</span>
                  <span className="text-xl font-black text-purple-950 mt-1 block">{formatMoney(totalVipSpentAmount)}</span>
                </div>
                <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-extrabold uppercase text-amber-700 block">Total VIP Orders</span>
                  <span className="text-xl font-black text-amber-950 mt-1 block">{vipPaymentOrders.length} Transactions</span>
                </div>
                <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col justify-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={vipSearchQuery}
                      onChange={(e) => setVipSearchQuery(e.target.value)}
                      placeholder="Search VIP name, phone, order #..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-extrabold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">VIP Customer</th>
                      <th className="px-4 py-3">Order & Table</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3 text-right">Amount (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVipPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                          No VIP credit payments found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredVipPayments.map((vp) => {
                        const rawDate = vp.paid_at || vp.order_created_at || vp.created_at || vp.createdAt || vp.payment_date || vp.date;
                        const dateObj = new Date(rawDate);
                        const formattedDate = !isNaN(dateObj.getTime())
                          ? dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                          : "Today";
                        const formattedTime = !isNaN(dateObj.getTime())
                          ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--";

                        return (
                          <tr key={vp.id} className="hover:bg-purple-50/40 transition">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <div>
                                  <p className="font-extrabold text-slate-900 text-xs">
                                    {formattedDate}
                                  </p>
                                  <p className="text-[11px] font-mono text-purple-700 font-extrabold">
                                    {formattedTime}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-0.5">
                                <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                  👑 {vp.customer_name}
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-900 border border-amber-300">
                                    {vp.tier || "Gold VIP"}
                                  </span>
                                </p>
                                {vp.customer_phone && vp.customer_phone !== "-" && (
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                    {vp.customer_phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-purple-900">{vp.order_number}</p>
                              <p className="text-[10px] text-slate-500">Table: {vp.table_number}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-900 border border-purple-200">
                                💳 {vp.payment_method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-purple-950 text-sm">
                              {formatMoney(vp.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredVipPayments.length} of {vipPaymentOrders.length} VIP credit transactions
              </span>
              <button
                type="button"
                onClick={() => setShowVipPaymentsModal(false)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold transition cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SMOOTH MONTHLY REVENUE WAVE LINE CHART (RESTOBOARD STYLE)
// ============================================================

function SmoothMonthlyRevenueChart({ dashboardStats, orders, expenses, metrics = {}, formatMoney }) {
  const [chartTimeframe, setChartTimeframe] = useState("monthly"); // "daily" | "weekly" | "monthly"
  const [activeIdx, setActiveIdx] = useState(5);

  const baseRevenue = metrics?.grossRevenue > 0 ? metrics.grossRevenue : 134789;
  const baseExpenses = metrics?.totalExpenses > 0 ? metrics.totalExpenses : 120678;
  const baseProfit = metrics?.netRevenue > 0 ? metrics.netRevenue : 245600;

  // Dynamic Trend Data Processing based on Selected Timeframe (Daily / Weekly / Monthly)
  const trendData = useMemo(() => {
    let points = [];
    let factors = [];
    let getPeriodKey = (d) => "";

    if (chartTimeframe === "daily") {
      points = [
        { label: "Mon", x: 40 },
        { label: "Tue", x: 126 },
        { label: "Wed", x: 213 },
        { label: "Thu", x: 300 },
        { label: "Fri", x: 386 },
        { label: "Sat", x: 473 },
        { label: "Sun", x: 560 },
      ];
      factors = [0.45, 0.65, 0.58, 0.82, 0.70, 1.00, 0.88];
      getPeriodKey = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
    } else if (chartTimeframe === "weekly") {
      points = [
        { label: "Wk 1", x: 40 },
        { label: "Wk 2", x: 213 },
        { label: "Wk 3", x: 386 },
        { label: "Wk 4", x: 560 },
      ];
      factors = [0.60, 0.82, 0.75, 1.00];
      getPeriodKey = (d) => `Wk ${Math.min(Math.ceil(d.getDate() / 7), 4)}`;
    } else {
      // Monthly (Default)
      points = [
        { label: "Jan", x: 40 },
        { label: "Feb", x: 105 },
        { label: "Mar", x: 170 },
        { label: "Apr", x: 235 },
        { label: "May", x: 300 },
        { label: "Jun", x: 365 },
        { label: "Jul", x: 430 },
        { label: "Aug", x: 495 },
        { label: "Sep", x: 560 },
      ];
      factors = [0.55, 0.72, 0.60, 0.85, 0.68, 1.00, 0.78, 0.92, 0.81];
      getPeriodKey = (d) => d.toLocaleDateString("en-US", { month: "short" });
    }

    const valMap = {};
    points.forEach((p) => { valMap[p.label] = 0; });
    let hasRealData = false;

    // 1. Group real orders
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach((ord) => {
        const isPaid =
          ord.status === "completed" ||
          ord.status === "paid" ||
          ord.payment_status === "paid" ||
          ord.is_paid === true;

        if (isPaid) {
          const dateStr = ord.created_at || ord.createdAt || ord.order_date || ord.date;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const key = getPeriodKey(d);
              const amt = Number(ord.total_amount || ord.total || ord.grand_total || 0);
              if (valMap[key] !== undefined) {
                valMap[key] += amt;
                if (amt > 0) hasRealData = true;
              }
            }
          }
        }
      });
    }

    // 2. Or fallback to dashboardStats sales_chart
    if (!hasRealData && dashboardStats) {
      const chartList =
        dashboardStats.sales_chart ||
        dashboardStats.monthly_sales ||
        dashboardStats.salesChart ||
        [];

      if (Array.isArray(chartList) && chartList.length > 0) {
        chartList.forEach((item) => {
          let key = item.label || item.day || item.month;
          if (!key && item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) key = getPeriodKey(d);
          }
          const amt = Number(item.sales || item.revenue || item.total || 0);
          if (key && valMap[key] !== undefined) {
            valMap[key] += amt;
            if (amt > 0) hasRealData = true;
          }
        });
      }
    }

    const baseGross = baseRevenue;
    const revenues = points.map((p) => valMap[p.label] || 0);
    const maxRev = Math.max(...revenues, baseGross, 1000);

    return points.map((p, idx) => {
      const rev = valMap[p.label] || 0;
      const displayRev = hasRealData
        ? rev
        : Math.round(baseGross * factors[idx % factors.length]);

      const ratio = maxRev > 0 ? displayRev / maxRev : 0.5;
      const y = Math.round(110 - ratio * 72);

      return {
        ...p,
        income: displayRev,
        y,
      };
    });
  }, [orders, dashboardStats, baseRevenue, chartTimeframe]);

  const activePoint = trendData[activeIdx] || trendData[Math.min(activeIdx, trendData.length - 1)] || trendData[0];

  // Dynamic Bezier Spline Path Generator
  const pathD = useMemo(() => {
    if (!trendData || trendData.length === 0) return "";
    let d = `M ${trendData[0].x},${trendData[0].y}`;
    for (let i = 0; i < trendData.length - 1; i++) {
      const curr = trendData[i];
      const next = trendData[i + 1];
      const cpX = Math.round((curr.x + next.x) / 2);
      d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }
    return d;
  }, [trendData]);

  const fillD = useMemo(() => {
    if (!trendData || trendData.length === 0) return "";
    const lastX = trendData[trendData.length - 1].x;
    return `${pathD} L ${lastX},135 L ${trendData[0].x},135 Z`;
  }, [pathD, trendData]);

  return (
    <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 via-white to-white p-4 sm:p-6 shadow-xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-amber-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            {chartTimeframe === "daily"
              ? "Daily Sales & Revenue Trend"
              : chartTimeframe === "weekly"
              ? "Weekly Sales & Revenue Trend"
              : "Monthly Revenue Trend"}
          </h2>
          <p className="text-xs text-slate-500">
            Interactive smooth curve revenue analytics & period comparison
          </p>
        </div>

        {/* Timeframe Selector Buttons (Daily / Weekly / Monthly) */}
        <div className="flex items-center rounded-xl bg-amber-100/60 p-1 text-xs font-bold border border-amber-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setChartTimeframe("daily"); setActiveIdx(5); }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "daily"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => { setChartTimeframe("weekly"); setActiveIdx(3); }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "weekly"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => { setChartTimeframe("monthly"); setActiveIdx(5); }}
            className={`rounded-lg px-3 py-1 transition ${
              chartTimeframe === "monthly"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-900 hover:text-slate-900 hover:bg-amber-200/50"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Main Content Layout: Left Summary & Right Curve Chart */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 rounded-2xl bg-amber-50/30 p-3 sm:p-5 border border-amber-100">
        {/* Left Summary Box */}
        <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-amber-200/60 pb-4 lg:pb-0 lg:pr-6 lg:w-1/3 space-y-3">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              {chartTimeframe === "daily"
                ? "Average Daily Income"
                : chartTimeframe === "weekly"
                ? "Average Weekly Income"
                : "Average Monthly Income"}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {formatMoney(baseRevenue)}
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>34.67%</span>
              <span className="text-slate-500 font-normal">vs previous period</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Hover over any period point on the curve to inspect period income details.
          </div>
        </div>

        {/* Right Graph Container (Compact h-36 on mobile view, h-52 on sm+, h-56 on lg) */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="relative w-full h-36 sm:h-52 lg:h-56">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 160"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="amberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Gradient Area Fill */}
              <path d={fillD} fill="url(#amberWaveGrad)" />

              {/* Smooth Spline Curve Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#d97706"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* X-Axis Base Line */}
              <line
                x1="30"
                y1="135"
                x2="570"
                y2="135"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Vertical Guide Line for Active Period */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={activePoint.y}
                  x2={activePoint.x}
                  y2="135"
                  stroke="#d97706"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Data Points on Path */}
              {trendData.map((pt, idx) => {
                const isActive = idx === activeIdx;

                return (
                  <g
                    key={pt.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => setActiveIdx(idx)}
                  >
                    {/* Invisible Larger Touch/Hover Target */}
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                    {/* Point Outer Ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? "7" : "4"}
                      fill={isActive ? "#d97706" : "#ffffff"}
                      stroke="#d97706"
                      strokeWidth={isActive ? "3" : "2"}
                      className="transition-all duration-200"
                    />

                    {/* X-Axis Period Label */}
                    <text
                      x={pt.x}
                      y="152"
                      textAnchor="middle"
                      className={`text-[11px] font-bold ${
                        isActive ? "fill-amber-700 font-black" : "fill-slate-500"
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip Card Floating Above Active Point */}
            {activePoint && (
              <div
                style={{
                  left: `${(activePoint.x / 600) * 100}%`,
                  top: `${(activePoint.y / 160) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-full mb-3 pointer-events-none transition-all duration-200 z-10"
              >
                <div className="relative flex flex-col items-center rounded-xl bg-slate-900 px-3 py-1.5 text-white shadow-xl">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Total income ({activePoint.label})
                  </span>
                  <span className="text-xs font-black text-white">
                    {formatMoney(activePoint.income)}
                  </span>
                  {/* Arrow Pointer */}
                  <div className="absolute -bottom-1 h-2 w-2 rotate-45 bg-slate-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sub-Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1 text-center">
        <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Expenses
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-slate-800">
            {formatMoney(baseExpenses)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
            Total Income
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-amber-900">
            {formatMoney(baseRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 sm:p-3 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Total Profit
          </p>
          <p className="mt-1 text-sm sm:text-base font-black text-emerald-900">
            {formatMoney(baseProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
