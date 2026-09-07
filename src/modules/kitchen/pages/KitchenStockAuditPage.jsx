import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Package,
  Layers,
  Flame,
  Wine,
  UtensilsCrossed,
  ShieldCheck,
  Check,
  Boxes,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  Printer,
  FileText,
} from "lucide-react";
import api from "../../../services/api";
import { printReportArea } from "../../../utils/printHelper";

// Robust image resolution helper for uploaded or absolute image URLs
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const cleanUrl = url.trim().replace(/\\/g, "/");
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
};



export default function KitchenStockAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOutlet = searchParams.get("outlet") || "all";
  const initialTab = searchParams.get("tab") || "audit";

  const [activeTab, setActiveTab] = useState(initialTab); // "audit" | "requisitions" | "history" | "reports"
  const [outletFilter, setOutletFilter] = useState(initialOutlet); // "all" | "kitchen" | "bar"

  // Data states
  const [products, setProducts] = useState([]);
  const [kitchenStock, setKitchenStock] = useState([]);
  const [barStock, setBarStock] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [barOrders, setBarOrders] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [audits, setAudits] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "depleted" | "low" | "healthy"
  const [reqFilter, setReqFilter] = useState("pending"); // "pending" | "completed" | "cancelled" | "all"

  // Modals state
  const [depletionModalItem, setDepletionModalItem] = useState(null);
  const [stockFoundModalItem, setStockFoundModalItem] = useState(null);
  const [rejectReqItem, setRejectReqItem] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form states for modals
  const [auditNotes, setAuditNotes] = useState("");
  const [stockFoundCount, setStockFoundCount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // ============================================================
  // LOAD ALL DATA (KITCHEN & BAR)
  // ============================================================

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError("");

      const [
        prodRes,
        kStockRes,
        bStockRes,
        kOrdersRes,
        bOrdersRes,
        transfersRes,
        auditsRes,
      ] = await Promise.all([
        api("/products").catch(() => []),
        api("/inventory/departments/kitchen").catch(() => api("/inventory").catch(() => [])),
        api("/inventory/departments/bar").catch(() => api("/inventory").catch(() => [])),
        api("/kitchen").catch(() => []),
        api("/bar").catch(() => []),
        api("/inventory/transfers").catch(() => []),
        api("/kitchen/audits").catch(() => []),
      ]);

      setProducts(
        prodRes?.products || prodRes?.data?.products || (Array.isArray(prodRes) ? prodRes : [])
      );

      setKitchenStock(
        kStockRes?.inventory ||
          kStockRes?.data?.inventory ||
          kStockRes?.data ||
          (Array.isArray(kStockRes) ? kStockRes : [])
      );

      setBarStock(
        bStockRes?.inventory ||
          bStockRes?.data?.inventory ||
          bStockRes?.data ||
          (Array.isArray(bStockRes) ? bStockRes : [])
      );

      setKitchenOrders(
        kOrdersRes?.orders ||
          kOrdersRes?.data?.orders ||
          kOrdersRes?.data ||
          (Array.isArray(kOrdersRes) ? kOrdersRes : [])
      );

      setBarOrders(
        bOrdersRes?.orders ||
          bOrdersRes?.data?.orders ||
          bOrdersRes?.data ||
          (Array.isArray(bOrdersRes) ? bOrdersRes : [])
      );

      setTransfers(
        transfersRes?.transfers ||
          transfersRes?.data?.transfers ||
          (Array.isArray(transfersRes) ? transfersRes : [])
      );

      setAudits(
        auditsRes?.audits ||
          auditsRes?.data?.audits ||
          (Array.isArray(auditsRes) ? auditsRes : [])
      );
    } catch (err) {
      console.error("Failed to load audit data:", err);
      setError(err.message || "Failed to load audit data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  // ============================================================
  // COMPUTED STOCK MAPS
  // ============================================================

  const kitchenStockMap = useMemo(() => {
    const map = new Map();
    (kitchenStock || []).forEach((it) => {
      const pid = it.product_id || it.productId || it.id;
      const qty = Number(it.quantity ?? it.stock ?? it.stock_quantity ?? 0);
      const minStock = Number(it.minimum_stock ?? it.min_stock ?? 5);
      if (pid) map.set(Number(pid), { quantity: qty, minStock, unit: it.unit });

      const pName = (it.product_name || it.name || "").toLowerCase().trim();
      if (pName) map.set(pName, { quantity: qty, minStock, unit: it.unit });
    });
    return map;
  }, [kitchenStock]);

  const barStockMap = useMemo(() => {
    const map = new Map();
    (barStock || []).forEach((it) => {
      const pid = it.product_id || it.productId || it.id;
      const qty = Number(it.quantity ?? it.stock ?? it.stock_quantity ?? 0);
      const minStock = Number(it.minimum_stock ?? it.min_stock ?? 5);
      if (pid) map.set(Number(pid), { quantity: qty, minStock, unit: it.unit });

      const pName = (it.product_name || it.name || "").toLowerCase().trim();
      if (pName) map.set(pName, { quantity: qty, minStock, unit: it.unit });
    });
    return map;
  }, [barStock]);

  // Orders in prep map
  const ordersInPrepMap = useMemo(() => {
    const map = new Map();
    const allActiveOrders = [...(kitchenOrders || []), ...(barOrders || [])];

    allActiveOrders.forEach((ord) => {
      const st = (ord.status || "").toLowerCase();
      if (st === "pending" || st === "new" || st === "confirmed" || st === "preparing") {
        const rawItems = ord.items || ord.order_items || ord.orderItems || ord.products || [];
        const items = Array.isArray(rawItems) ? rawItems : [];
        items.forEach((item) => {
          const pid = Number(item.product_id || item.productId || item.id);
          const pName = (item.product_name || item.name || "").toLowerCase().trim();
          const q = Number(item.quantity || 1);
          if (pid) map.set(pid, (map.get(pid) || 0) + q);
          if (pName) map.set(pName, (map.get(pName) || 0) + q);
        });
      }
    });
    return map;
  }, [kitchenOrders, barOrders]);

  // ============================================================
  // PRODUCT CLASSIFICATION (KITCHEN VS. BAR)
  // ============================================================

  const allClassifiedItems = useMemo(() => {
    return (products || []).map((p) => {
      const pid = Number(p.id);
      const pName = (p.name || p.product_name || "").toLowerCase().trim();
      const catType = (p.category_type || p.categoryType || "").toLowerCase().trim();
      const dept = (p.department || "").toLowerCase().trim();

      // Check real stock records from department_inventory table in database
      const kStockData = kitchenStockMap.get(pid) || kitchenStockMap.get(pName);
      const bStockData = barStockMap.get(pid) || barStockMap.get(pName);

      // Determine outlet directly from database fields (no hardcoded frontend keyword lists)
      let outlet = "kitchen";

      if (dept === "bar" || dept === "beverage") {
        outlet = "bar";
      } else if (dept === "kitchen" || dept === "food") {
        outlet = "kitchen";
      } else if (p.is_bar_item === true || p.isBarItem === true) {
        outlet = "bar";
      } else if (catType === "beverage" || catType === "bar" || catType === "drink") {
        outlet = "bar";
      } else if (catType === "food" || catType === "kitchen") {
        outlet = "kitchen";
      } else if (bStockData && !kStockData) {
        // Exists in Bar department_inventory
        outlet = "bar";
      } else if (kStockData && !bStockData) {
        // Exists in Kitchen department_inventory
        outlet = "kitchen";
      } else if (bStockData && kStockData) {
        // Registered in both: assign to where quantity points
        outlet = Number(bStockData.quantity) > Number(kStockData.quantity) ? "bar" : "kitchen";
      } else if (p.is_shot_item === true || p.parent_product_id) {
        outlet = "bar";
      }

      // Select proper stock data directly from database
      const stockData = outlet === "bar" ? bStockData : kStockData;

      const currentStock =
        stockData !== undefined
          ? Number(stockData.quantity)
          : Number(p.stock_quantity ?? p.stock ?? p.quantity ?? 0);

      const minStock = stockData?.minStock ?? Number(p.minimum_stock ?? 5);
      const activePrepCount = ordersInPrepMap.get(pid) || ordersInPrepMap.get(pName) || 0;

      const isAvailable = p.is_available !== false && p.isAvailable !== false;
      const isDepleted = currentStock <= 0 || !isAvailable;
      const isLow = !isDepleted && currentStock <= minStock;

      // Real backend image resolution only (no static/external mock images)
      const rawImg = p.image_url || p.imageUrl || p.image;
      const imageUrl = resolveImageUrl(rawImg);

      return {
        ...p,
        displayName: p.name || p.product_name || "Item",
        unit: p.unit || (outlet === "bar" ? "bottle" : "portion"),
        outlet, // "kitchen" or "bar" directly from DB
        imageUrl,
        currentStock,
        minStock,
        activePrepCount,
        isAvailable,
        isDepleted,
        isLow,
      };
    });
  }, [products, kitchenStockMap, barStockMap, ordersInPrepMap]);

  // Filtered by Outlet, Stock Status, and Search Query
  const filteredInspectionItems = useMemo(() => {
    return allClassifiedItems.filter((item) => {
      // 1. Outlet separation filter
      if (outletFilter === "kitchen" && item.outlet !== "kitchen") return false;
      if (outletFilter === "bar" && item.outlet !== "bar") return false;

      // 2. Stock status filter
      if (stockFilter === "depleted" && !item.isDepleted) return false;
      if (stockFilter === "low" && !item.isLow) return false;
      if (stockFilter === "healthy" && (item.isDepleted || item.isLow)) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.displayName.toLowerCase().includes(q);
        const matchCode = (item.product_code || item.productCode || "").toLowerCase().includes(q);
        const matchCat = (item.category_name || item.category || "").toLowerCase().includes(q);
        return matchName || matchCode || matchCat;
      }
      return true;
    });
  }, [allClassifiedItems, outletFilter, stockFilter, searchQuery]);

  // Requisitions filter
  const filteredTransfers = useMemo(() => {
    return (transfers || []).filter((t) => {
      const toLoc = (t.to_location || "").toLowerCase();
      const st = (t.status || "").toLowerCase();

      // Outlet filter on transfers
      if (outletFilter === "kitchen" && toLoc !== "kitchen") return false;
      if (outletFilter === "bar" && toLoc !== "bar") return false;

      // Status filter
      if (reqFilter === "all") return true;
      return st === reqFilter;
    });
  }, [transfers, outletFilter, reqFilter]);

  // Audits filter
  const filteredAudits = useMemo(() => {
    return (audits || []).filter((a) => {
      const dept = (a.department || "").toLowerCase();
      if (outletFilter === "kitchen" && dept !== "kitchen") return false;
      if (outletFilter === "bar" && dept !== "bar") return false;
      return true;
    });
  }, [audits, outletFilter]);

  // Metrics (scoped to current outletFilter or global)
  const scopedItems = useMemo(() => {
    if (outletFilter === "kitchen") return allClassifiedItems.filter((i) => i.outlet === "kitchen");
    if (outletFilter === "bar") return allClassifiedItems.filter((i) => i.outlet === "bar");
    return allClassifiedItems;
  }, [allClassifiedItems, outletFilter]);

  const kitchenDepletedCount = allClassifiedItems.filter((i) => i.outlet === "kitchen" && i.isDepleted).length;
  const barDepletedCount = allClassifiedItems.filter((i) => i.outlet === "bar" && i.isDepleted).length;

  const depletedCount = scopedItems.filter((i) => i.isDepleted).length;
  const lowStockCount = scopedItems.filter((i) => i.isLow).length;
  const pendingRequisitionsCount = filteredTransfers.filter(
    (t) => (t.status || "").toLowerCase() === "pending"
  ).length;

  const todayAuditsCount = filteredAudits.filter((a) => {
    if (!a.created_at) return false;
    return new Date(a.created_at).toDateString() === new Date().toDateString();
  }).length;

  // ============================================================
  // AUDIT ACTION HANDLERS
  // ============================================================

  // 1. Submit Depletion Approval
  const handleConfirmDepleted = async () => {
    if (!depletionModalItem) return;
    try {
      setSubmittingAction(true);
      await api("/kitchen/audit", {
        method: "POST",
        body: JSON.stringify({
          productId: depletionModalItem.id,
          department: depletionModalItem.outlet, // "kitchen" or "bar"
          action: "approved_depleted",
          physicalCountFound: 0,
          notes:
            auditNotes ||
            `F&B Controller physically inspected ${
              depletionModalItem.outlet === "bar" ? "Bar" : "Kitchen"
            } and confirmed zero stock.`,
        }),
      });

      triggerToast(
        `Depletion verified for "${depletionModalItem.displayName}" in ${
          depletionModalItem.outlet === "bar" ? "Bar" : "Kitchen"
        }.`
      );
      setDepletionModalItem(null);
      setAuditNotes("");
      await loadData(true);
    } catch (err) {
      alert(err.message || "Failed to submit audit.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // 2. Submit Stock Found (Reject depletion & restore inventory)
  const handleRestoreStockFound = async () => {
    if (!stockFoundModalItem) return;
    const count = Number(stockFoundCount);
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid count of items found (at least 1).");
      return;
    }

    try {
      setSubmittingAction(true);
      await api("/kitchen/audit", {
        method: "POST",
        body: JSON.stringify({
          productId: stockFoundModalItem.id,
          department: stockFoundModalItem.outlet, // "kitchen" or "bar"
          action: "rejected_stock_found",
          physicalCountFound: count,
          notes:
            auditNotes ||
            `F&B Controller found ${count} ${stockFoundModalItem.unit} in ${
              stockFoundModalItem.outlet === "bar" ? "Bar" : "Kitchen"
            } storage. Restored availability.`,
        }),
      });

      triggerToast(
        `Stock restored! "${stockFoundModalItem.displayName}" now has ${count} ${
          stockFoundModalItem.unit
        } in ${stockFoundModalItem.outlet === "bar" ? "Bar" : "Kitchen"} inventory.`
      );
      setStockFoundModalItem(null);
      setStockFoundCount("");
      setAuditNotes("");
      await loadData(true);
    } catch (err) {
      alert(err.message || "Failed to restore stock.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Approve Store Requisition
  const handleApproveRequisition = async (transferId, destLocation) => {
    if (
      !window.confirm(
        `Approve this restock requisition and release inventory from Central Store to ${destLocation.toUpperCase()}?`
      )
    ) {
      return;
    }
    try {
      setSubmittingAction(true);
      await api(`/inventory/transfers/${transferId}/approve`, {
        method: "PUT",
        body: JSON.stringify({
          notes: `Approved by F&B Controller for ${destLocation.toUpperCase()}`,
        }),
      });

      triggerToast(`Requisition approved! Inventory released to ${destLocation.toUpperCase()} sub-store.`);
      await loadData(true);
    } catch (err) {
      alert(err.message || "Failed to approve requisition.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Reject Store Requisition
  const handleRejectRequisition = async () => {
    if (!rejectReqItem) return;
    try {
      setSubmittingAction(true);
      await api(`/inventory/transfers/${rejectReqItem.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({
          reason:
            rejectionReason ||
            `Requisition rejected by F&B Controller after ${rejectReqItem.to_location} physical audit.`,
        }),
      });

      triggerToast(`Requisition #${rejectReqItem.transfer_number} was rejected.`);
      setRejectReqItem(null);
      setRejectionReason("");
      await loadData(true);
    } catch (err) {
      alert(err.message || "Failed to reject requisition.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 text-slate-900 font-sans">
      <div className="space-y-4 sm:space-y-6">

        {/* ========================================================
            HEADER BANNER
        ======================================================== */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                  <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      F&B Audit Board
                    </h1>
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Kitchen & Bar Gatekeeper
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                    Physical on-line inspection to verify depleted stock, restore falsely depleted items, and approve store requisitions.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Sync */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full md:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <Link
                to="/fb/reports"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm text-center"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Reports</span>
                <ArrowUpRight className="h-3 w-3 opacity-60 hidden xs:inline" />
              </Link>

              <Link
                to="/kitchen/assets"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition shadow-sm text-center"
              >
                <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>Assets</span>
                <ArrowUpRight className="h-3 w-3 opacity-60 hidden xs:inline" />
              </Link>

              <button
                onClick={() => loadData(true)}
                disabled={refreshing || loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50 text-center"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Syncing" : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {successMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in shadow-sm">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ========================================================
            PRIMARY OUTLET FILTER: KITCHEN VS. BAR SEPARATION
        ======================================================== */}
        <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
            {/* Kitchen Button */}
            <button
              onClick={() => {
                setOutletFilter("kitchen");
                setSearchParams({ outlet: "kitchen" });
              }}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-center ${
                outletFilter === "kitchen"
                  ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-400/50"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Kitchen</span>
              {kitchenDepletedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-black rounded-full shrink-0 ${
                    outletFilter === "kitchen" ? "bg-white text-orange-600" : "bg-rose-500 text-white"
                  }`}
                >
                  {kitchenDepletedCount}
                </span>
              )}
            </button>

            {/* Bar Button */}
            <button
              onClick={() => {
                setOutletFilter("bar");
                setSearchParams({ outlet: "bar" });
              }}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm text-center ${
                outletFilter === "bar"
                  ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/50"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Wine className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Bar</span>
              {barDepletedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-black rounded-full shrink-0 ${
                    outletFilter === "bar" ? "bg-white text-purple-600" : "bg-rose-500 text-white"
                  }`}
                >
                  {barDepletedCount}
                </span>
              )}
            </button>

            {/* All Outlets Button */}
            <button
              onClick={() => {
                setOutletFilter("all");
                setSearchParams({});
              }}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition text-center ${
                outletFilter === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span className="truncate">All Outlets</span>
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-right px-1">
            Showing:{" "}
            <strong className="text-slate-900 capitalize">
              {outletFilter === "all" ? "Combined Kitchen & Bar" : `${outletFilter} Department`}
            </strong>{" "}
            ({scopedItems.length} items)
          </div>
        </div>

        {/* ========================================================
            METRIC KPI CARDS
        ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center justify-between hover:shadow transition">
            <div className="min-w-0 flex-1 mr-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 truncate">
                Depleted Stock
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{depletedCount}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Verification needed</p>
            </div>
            <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center justify-between hover:shadow transition">
            <div className="min-w-0 flex-1 mr-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 truncate">
                Low Stock Alert
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{lowStockCount}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">&le; Min threshold</p>
            </div>
            <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center justify-between hover:shadow transition">
            <div className="min-w-0 flex-1 mr-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 truncate">
                Requisitions
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{pendingRequisitionsCount}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Pending F&B release</p>
            </div>
            <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Boxes className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center justify-between hover:shadow transition">
            <div className="min-w-0 flex-1 mr-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 truncate">
                Today Audits
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{todayAuditsCount}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Verified & logged</p>
            </div>
            <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS (INSPECTION, REQUISITIONS, LOG)
        ======================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 pb-2 -mx-1 px-1">
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shrink-0 whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span>Line Inspection ({scopedItems.length})</span>
            {depletedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] sm:text-xs font-bold rounded-full bg-rose-500 text-white">
                {depletedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("requisitions")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shrink-0 whitespace-nowrap ${
              activeTab === "requisitions"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Boxes className="h-4 w-4 shrink-0" />
            <span>Restock Requisitions</span>
            {pendingRequisitionsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] sm:text-xs font-bold rounded-full bg-indigo-600 text-white">
                {pendingRequisitionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              setSearchParams((prev) => {
                const n = new URLSearchParams(prev);
                n.set("tab", "history");
                return n;
              });
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shrink-0 whitespace-nowrap ${
              activeTab === "history"
                ? "bg-slate-100 text-slate-900 border border-slate-300 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Audit History Log</span>
            <span className="text-[11px] sm:text-xs text-slate-500">({filteredAudits.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("reports");
              setSearchParams((prev) => {
                const n = new URLSearchParams(prev);
                n.set("tab", "reports");
                return n;
              });
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition shrink-0 whitespace-nowrap ${
              activeTab === "reports"
                ? "bg-purple-50 text-purple-800 border border-purple-200 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="h-4 w-4 text-purple-600 shrink-0" />
            <span>F&B Analysis & Reports</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: PHYSICAL LINE INSPECTION
        ======================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${outletFilter === "all" ? "items" : outletFilter} by name, SKU...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setStockFilter("all")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    stockFilter === "all"
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({scopedItems.length})
                </button>
                <button
                  onClick={() => setStockFilter("depleted")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    stockFilter === "depleted"
                      ? "bg-rose-100 text-rose-800 border border-rose-300 font-semibold"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Depleted ({depletedCount})</span>
                </button>
                <button
                  onClick={() => setStockFilter("low")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    stockFilter === "low"
                      ? "bg-amber-100 text-amber-800 border border-amber-300 font-semibold"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  <span>Low Stock ({lowStockCount})</span>
                </button>
                <button
                  onClick={() => setStockFilter("healthy")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    stockFilter === "healthy"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Healthy ({scopedItems.length - depletedCount - lowStockCount})
                </button>
              </div>
            </div>

            {/* Items Grid */}
            {loading ? (
              <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                <p>Loading inventory matrix...</p>
              </div>
            ) : filteredInspectionItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-base font-medium text-slate-900">No items match your filter.</p>
                <p className="text-xs text-slate-500 mt-1">
                  All {outletFilter === "all" ? "items" : outletFilter} are well-stocked or no match was found.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInspectionItems.map((item) => {
                  const isBar = item.outlet === "bar";

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-2xl bg-white border transition p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                        item.isDepleted
                          ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-300/40"
                          : item.isLow
                          ? "border-amber-300 bg-amber-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Top row: Image + Info */}
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.displayName}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback-icon");
                                if (fallback) fallback.style.display = "flex";
                              }}
                              className="h-full w-full object-cover transition hover:scale-105 duration-200"
                              loading="lazy"
                            />
                          ) : null}
                          <div
                            className={`img-fallback-icon h-full w-full items-center justify-center ${
                              item.imageUrl ? "hidden" : "flex"
                            } ${isBar ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-600"}`}
                          >
                            {isBar ? (
                              <Wine className="h-7 w-7 stroke-[1.75]" />
                            ) : (
                              <UtensilsCrossed className="h-7 w-7 stroke-[1.75]" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-semibold text-slate-900 truncate" title={item.displayName}>
                              {item.displayName}
                            </h4>
                            {item.isDepleted ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                0 STOCK
                              </span>
                            ) : item.isLow ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                LOW
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                OK
                              </span>
                            )}
                          </div>

                          {/* Outlet Tag & Category */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm uppercase tracking-wider ${
                                isBar
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                              }`}
                            >
                              {isBar ? "🍸 Bar" : "🍳 Kitchen"}
                            </span>
                            <span className="text-xs text-slate-500 truncate">
                              {item.category_name || item.category || "General"} &bull; SKU:{" "}
                              {item.product_code || `#${item.id}`}
                            </span>
                          </div>

                          {/* Quantities & In-Prep */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                              <span className="text-slate-500">
                                {isBar ? "Bar Stock: " : "Kitchen Stock: "}
                              </span>
                              <span
                                className={`font-bold ${
                                  item.isDepleted
                                    ? "text-rose-600"
                                    : item.isLow
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {item.currentStock} {item.unit}
                              </span>
                            </div>

                            {item.activePrepCount > 0 && (
                              <div className="bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg text-orange-700 font-medium">
                                <span className="font-bold">{item.activePrepCount}</span> in prep
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Inspection Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setDepletionModalItem(item);
                            setAuditNotes("");
                          }}
                          className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition shadow-sm text-center truncate"
                          title={`Confirm zero stock in ${isBar ? "bar counter" : "kitchen"}`}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Approve Depleted</span>
                        </button>

                        <button
                          onClick={() => {
                            setStockFoundModalItem(item);
                            setStockFoundCount("");
                            setAuditNotes("");
                          }}
                          className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition shadow-sm text-center truncate"
                          title={`Physically found stock in ${isBar ? "bar counter" : "kitchen"}? Restore it immediately`}
                        >
                          <Search className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">Stock Found</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: RESTOCK REQUISITIONS (KITCHEN & BAR)
        ======================================================== */}
        {activeTab === "requisitions" && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setReqFilter("pending")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    reqFilter === "pending"
                      ? "bg-amber-100 text-amber-800 border border-amber-300 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Pending ({pendingRequisitionsCount})
                </button>
                <button
                  onClick={() => setReqFilter("completed")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    reqFilter === "completed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setReqFilter("cancelled")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    reqFilter === "cancelled"
                      ? "bg-rose-100 text-rose-800 border border-rose-300 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => setReqFilter("all")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                    reqFilter === "all"
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All History
                </button>
              </div>

              <span className="text-[11px] sm:text-xs text-slate-500">
                Filtered for: <strong className="text-slate-900 capitalize">{outletFilter}</strong> requisitions
              </span>
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Boxes className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
                <p className="text-base font-medium text-slate-900">No requisitions in this state.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Staff restock requests from Central Store will appear here for F&B approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransfers.map((req) => {
                  const isPending = (req.status || "").toLowerCase() === "pending";
                  const isCompleted = (req.status || "").toLowerCase() === "completed";
                  const isBar = (req.to_location || "").toLowerCase() === "bar";

                  const reqItems = Array.isArray(req.items) ? req.items : [];

                  return (
                    <div
                      key={req.id}
                      className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 tracking-wide">
                              {req.transfer_number}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                                isBar
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                              }`}
                            >
                              {isBar ? "🍸 Bar Restock" : "🍳 Kitchen Restock"}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
                                isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Requested by:{" "}
                            <span className="text-slate-800 font-medium">
                              {req.requested_by_username || (isBar ? "Bartender" : "Kitchen Chef")}
                            </span>{" "}
                            &bull; {req.created_at ? new Date(req.created_at).toLocaleString() : "Recently"}
                          </p>
                        </div>

                        {/* Action buttons if pending */}
                        {isPending && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => handleApproveRequisition(req.id, req.to_location)}
                              disabled={submittingAction}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Approve & Release to {isBar ? "Bar" : "Kitchen"}</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectReqItem(req);
                                setRejectionReason("");
                              }}
                              disabled={submittingAction}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Items requested */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          Items Requested ({reqItems.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {reqItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                            >
                              <span className="font-medium text-slate-800">
                                {item.product_name || `Product #${item.product_id}`}
                              </span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.quantity} {item.unit || "unit"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                          Notes: {req.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: AUDIT HISTORY LOG (KITCHEN & BAR)
        ======================================================== */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Physical Verification Records</h3>
                <p className="text-xs text-slate-500">
                  History of stock inspections conducted by the F&B Controller across Kitchen and Bar.
                </p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{filteredAudits.length} recorded audits</span>
            </div>

            {filteredAudits.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">No audit records for {outletFilter} yet.</p>
                <p className="text-xs text-slate-500">Perform an inspection to log records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Outlet</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Action / Outcome</th>
                      <th className="py-3 px-4">Count Found</th>
                      <th className="py-3 px-4">Audited By</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAudits.map((a) => {
                      const isDepletedApproved = a.action === "approved_depleted";
                      const isStockFound = a.action === "rejected_stock_found";
                      const isBar = (a.department || "").toLowerCase() === "bar";

                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                isBar
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                              }`}
                            >
                              {isBar ? "🍸 Bar" : "🍳 Kitchen"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {a.product_name}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {a.product_code || ""}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isDepletedApproved ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Verified Depleted
                              </span>
                            ) : isStockFound ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Stock Restored
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {a.action}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {a.physical_count_found ?? 0} {a.unit || ""}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-medium">
                            {a.verifier_name || "F&B Controller"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={a.notes}>
                            {a.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: LIVE F&B ANALYSIS & REPORTS
        ======================================================== */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Live F&B Intelligence & Operational Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated from live database inventory, POS order tickets, and verified physical audits.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  to="/fb/reports"
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition"
                >
                  <span>Open Full Page Report</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>

                <button
                  onClick={() =>
                    printReportArea(
                      "fb-audit-reports-tab-area",
                      "F&B Operational Intelligence Report"
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Analysis</span>
                </button>
              </div>
            </div>

            <div id="fb-audit-reports-tab-area" className="space-y-6">
              {/* Executive Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                      Inventory Units
                    </p>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2">
                    {allClassifiedItems.reduce((sum, it) => sum + it.currentStock, 0).toLocaleString()}{" "}
                    <span className="text-xs sm:text-sm font-semibold text-slate-500">units</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                    Kitchen & Bar line stock
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                      Health Index
                    </p>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2">
                    {allClassifiedItems.length > 0
                      ? Math.round(
                          (allClassifiedItems.filter((i) => !i.isDepleted && !i.isLow).length /
                            allClassifiedItems.length) *
                            100
                        )
                      : 100}
                    %
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                    {allClassifiedItems.filter((i) => !i.isDepleted && !i.isLow).length} healthy items
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                      Depleted Lines
                    </p>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-1 sm:mt-2">
                    {allClassifiedItems.filter((i) => i.isDepleted).length}{" "}
                    <span className="text-xs sm:text-sm font-normal text-slate-500">items</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                    Needs requisition or prep
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                      Orders In-Prep
                    </p>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2">
                    {kitchenOrders.length + barOrders.length}{" "}
                    <span className="text-xs sm:text-sm font-normal text-slate-500">tickets</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                    Kitchen: {kitchenOrders.length} &bull; Bar: {barOrders.length}
                  </p>
                </div>
              </div>

              {/* Department Comparative Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                        <UtensilsCrossed className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Kitchen Line Inventory</h4>
                        <p className="text-xs text-slate-500">Food, starters, steaks, dishes</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      {allClassifiedItems.filter((i) => i.outlet === "kitchen").length} items
                    </span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Depleted Items:</span>
                      <strong className="text-rose-600 font-bold">
                        {allClassifiedItems.filter((i) => i.outlet === "kitchen" && i.isDepleted).length} dishes
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Low Stock Warnings:</span>
                      <strong className="text-amber-600 font-bold">
                        {allClassifiedItems.filter((i) => i.outlet === "kitchen" && i.isLow).length} dishes
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Active Cooking Load:</span>
                      <strong className="text-emerald-600 font-bold">
                        {kitchenOrders.length} active orders
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                        <Wine className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Bar Counter Inventory</h4>
                        <p className="text-xs text-slate-500">Liquor, wines, beers, cocktails, softs</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {allClassifiedItems.filter((i) => i.outlet === "bar").length} items
                    </span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Depleted Items:</span>
                      <strong className="text-rose-600 font-bold">
                        {allClassifiedItems.filter((i) => i.outlet === "bar" && i.isDepleted).length} lines
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Low Stock Warnings:</span>
                      <strong className="text-amber-600 font-bold">
                        {allClassifiedItems.filter((i) => i.outlet === "bar" && i.isLow).length} lines
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Active Drink Orders:</span>
                      <strong className="text-purple-600 font-bold">
                        {barOrders.length} active tickets
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Report Link Callout */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Comprehensive F&B Stock & Audit Report</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Inspect all kitchen and bar items with live stock counts, valuations, POS consumption, and audit history.
                    </p>
                  </div>
                </div>
                <Link
                  to="/fb/reports"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shrink-0 shadow-sm"
                >
                  <span>Open Full F&B Reports</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          MODAL 1: CONFIRM DEPLETION APPROVAL
      ======================================================== */}
      {depletionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">Approve Depleted Stock</h3>
                <p className="text-xs text-slate-500 truncate">
                  Confirm physical check in {depletionModalItem.outlet === "bar" ? "Bar Counter" : "Kitchen"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-700">
                <span className="text-slate-500">Item:</span>{" "}
                <strong className="text-slate-900">{depletionModalItem.displayName}</strong>
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Department:</span>{" "}
                <strong className="text-emerald-700 uppercase">
                  {depletionModalItem.outlet === "bar" ? "🍸 Bar Counter" : "🍳 Kitchen Storage"}
                </strong>
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Recorded Stock:</span>{" "}
                <strong className="text-rose-600">
                  {depletionModalItem.currentStock} {depletionModalItem.unit}
                </strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Physical Inspection Notes</label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder={`e.g. Checked ${
                  depletionModalItem.outlet === "bar" ? "bar coolers and back shelves" : "prep lines and walk-ins"
                }. Confirmed zero remaining.`}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              💡 Confirms this item is genuinely finished, legitimizing restock requests from Central Store.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDepletionModalItem(null)}
                disabled={submittingAction}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDepleted}
                disabled={submittingAction}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{submittingAction ? "Submitting..." : "Confirm Depletion Approval"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: STOCK FOUND IN OUTLET (REJECT DEPLETION)
      ======================================================== */}
      {stockFoundModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-amber-300 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Stock Found in {stockFoundModalItem.outlet === "bar" ? "Bar" : "Kitchen"}
                </h3>
                <p className="text-xs text-amber-700 truncate">Restore item & make available for orders</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-700">
                <span className="text-slate-500">Item:</span>{" "}
                <strong className="text-slate-900">{stockFoundModalItem.displayName}</strong>
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Outlet Sub-Store:</span>{" "}
                <strong className="text-amber-700 uppercase">
                  {stockFoundModalItem.outlet === "bar" ? "🍸 Bar Counter" : "🍳 Kitchen Storage"}
                </strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                Item was reported zero or unavailable, but physical inspection found usable inventory.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Actual Physical Count Found ({stockFoundModalItem.unit}) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={stockFoundCount}
                onChange={(e) => setStockFoundCount(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Location / Inspection Reason</label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder={`e.g. Found in ${
                  stockFoundModalItem.outlet === "bar" ? "back bar cooler 2" : "prep chiller"
                }.`}
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setStockFoundModalItem(null)}
                disabled={submittingAction}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreStockFound}
                disabled={submittingAction}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submittingAction ? "Restoring..." : "Restore Sub-Store Stock"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: REJECT REQUISITION MODAL
      ======================================================== */}
      {rejectReqItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-rose-300 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Reject {rejectReqItem.to_location === "bar" ? "Bar" : "Kitchen"} Requisition #{rejectReqItem.transfer_number}
                </h3>
                <p className="text-xs text-rose-600 truncate">Decline restock request</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Existing stock was physically verified and found to be sufficient. No transfer needed."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectReqItem(null)}
                disabled={submittingAction}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequisition}
                disabled={submittingAction}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{submittingAction ? "Rejecting..." : "Confirm Rejection"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
