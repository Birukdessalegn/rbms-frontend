import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  CreditCard,
  Clock,
  User,
  Eye,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Receipt,
  AlertCircle,
  Smartphone,
  Landmark,
  Printer,
  PlayCircle,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  Crown,
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import PaymentProofModal from "../components/PaymentProofModal";
import { printReportArea } from "../../../utils/printHelper";
import { parseItemPortion } from "../../../utils/drinkServingHelper";

function TodaySalesAuditPage() {
  const { user } = useAuth();

  const userRole = (
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || user?.role_name || user?.roleName || ""
  ).toLowerCase();
  const userRoleId = Number(
    user?.roleId || user?.role_id || user?.role?.id || 0
  );

  const isWaiter = userRole === "waiter" || userRoleId === 6;
  const isCashier = userRole === "cashier" || userRoleId === 5;
  const isAdminOrManager = ["admin", "superadmin", "manager"].includes(userRole) || userRoleId === 1 || userRoleId === 2;

  // Drawer shifts are strictly for Cashiers (and Manager/Admin oversight). Waiters do not open or close shifts.
  const canManageShift = (isCashier || isAdminOrManager) && !isWaiter;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWaiter, setSelectedWaiter] = useState("all");
  const [selectedProofOrder, setSelectedProofOrder] = useState(null);

  /* Shift Lifecycle State */
  const [currentShift, setCurrentShift] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [startingShift, setStartingShift] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [cashierNotes, setCashierNotes] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [closeError, setCloseError] = useState("");

  /* Helper to parse items safely if needed */
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

  /* Helper to compute total for an order */
  const getOrderTotal = (order) => {
    if (!order) return 0;
    const dbTotal = Number(
      order.total_amount ??
      order.total ??
      order.grand_total ??
      order.grandTotal ??
      0
    );
    if (dbTotal > 0) return dbTotal;

    const items = parseItems(order.items || order.order_items);
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.unit_price || item.price || 0);
      return sum + qty * price;
    }, 0);

    const discount = Number(order.discount ?? order.discount_amount ?? 0);
    // Registered product menu price already includes 15% VAT
    return Math.max(subtotal - discount, 0);
  };

  const extractFullName = (first, last) => {
    if (first || last) {
      return `${first || ""} ${last || ""}`.trim();
    }
    return null;
  };

  const getWaiterFromObject = (obj, empMap) => {
    if (!obj) return null;

    // 1. First Name + Last Name combinations
    const fnLn =
      extractFullName(obj.waiter_first_name, obj.waiter_last_name) ||
      extractFullName(obj.waiterFirstName, obj.waiterLastName) ||
      extractFullName(obj.created_by_first_name, obj.created_by_last_name) ||
      extractFullName(obj.user_first_name, obj.user_last_name) ||
      extractFullName(obj.waiter?.first_name || obj.waiter?.firstName, obj.waiter?.last_name || obj.waiter?.lastName) ||
      extractFullName(obj.created_by?.first_name || obj.created_by?.firstName, obj.created_by?.last_name || obj.created_by?.lastName) ||
      extractFullName(obj.user?.first_name || obj.user?.firstName, obj.user?.last_name || obj.user?.lastName);

    if (fnLn) return fnLn;

    // 2. Direct name properties
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

    // 3. Employee ID lookup in empMap
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

  const fetchDailyAuditData = async () => {
    try {
      setLoading(true);
      setError("");

      const [posRes, kitchenRes, barRes, tablesRes, empRes, shiftRes] = await Promise.all([
        api("/pos/orders").catch(() => ({ orders: [] })),
        api("/kitchen").catch(() => api("/kitchen/orders").catch(() => [])),
        api("/bar/orders").catch(() => []),
        api("/tables").catch(() => api("/pos/tables").catch(() => [])),
        api("/employees").catch(() => []),
        api("/pos/shifts/current").catch(() => ({ shift: null })),
      ]);

      const shift = shiftRes?.shift || shiftRes?.data || null;
      setCurrentShift(shift);

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

      // Build employee map (ID -> Full Name)
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

      // Build tables map for current_waiter_name lookup
      const tableWaiterMap = new Map();
      tablesList.forEach((t) => {
        const tId = String(t.id || t.table_number || "");
        const tName = getWaiterFromObject(t, empMap) || t.current_waiter_name || t.waiter_name;
        if (tId && tName) tableWaiterMap.set(tId, tName);
      });

      // Build kitchen/bar map for order waiter lookup
      const orderExtraMap = new Map();
      [...kitchenList, ...barList].forEach((k) => {
        const kId = String(k.order_id || k.id || "");
        if (!kId) return;
        const wName = getWaiterFromObject(k, empMap);

        if (wName) {
          orderExtraMap.set(kId, wName);
        }
      });

      // Enrich POS orders with waiter attribution and filter strictly for Today's date
      const todayDateStr = new Date().toISOString().split("T")[0];

      const enriched = posList
        .filter((o) => {
          const dateVal = o.created_at || o.createdAt;
          if (!dateVal) return true;
          try {
            const orderDate = new Date(dateVal).toISOString().split("T")[0];
            return orderDate === todayDateStr;
          } catch {
            return true;
          }
        })
        .map((o) => {
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
      console.error("Failed to load daily sales audit data:", err);
      setError("Failed to fetch today's sales and payment audit records.");
    } finally {
      setLoading(false);
    }
  };

  /* Start Shift Handler */
  const handleStartShift = async (e) => {
    e.preventDefault();
    try {
      setStartingShift(true);
      const res = await api("/pos/shifts/start", {
        method: "POST",
        body: JSON.stringify({
          opening_cash: Number(openingFloat) || 0,
          terminal_id: 1,
        }),
      });
      const shift = res?.shift || res?.data || null;
      if (shift) {
        setCurrentShift(shift);
      }
      setShowStartModal(false);
      await fetchDailyAuditData();
    } catch (err) {
      alert(err.message || "Failed to start shift");
    } finally {
      setStartingShift(false);
    }
  };

  /* Close Daily Audit Handler */
  const handleCloseShift = async (e) => {
    e.preventDefault();
    setCloseError("");
    if (countedCash === "" || isNaN(Number(countedCash))) {
      setCloseError("Please enter a valid actual counted cash amount.");
      return;
    }
    try {
      setClosingShift(true);
      const res = await api("/pos/shifts/close", {
        method: "POST",
        body: JSON.stringify({
          actual_cash: Number(countedCash),
          closing_notes: cashierNotes,
        }),
      });
      if (res?.shift) {
        setCurrentShift(res.shift);
      }
      setShowCloseModal(false);
      setCountedCash("");
      setCashierNotes("");
      await fetchDailyAuditData();
      alert("Daily sales audit closed successfully! Submitted for Finance approval.");
    } catch (err) {
      setCloseError(err.message || "Failed to close daily audit.");
    } finally {
      setClosingShift(false);
    }
  };

  useEffect(() => {
    fetchDailyAuditData();
  }, []);

  /* Extract unique waiters */
  const uniqueWaiters = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      const name = o.waiter_name || o.waiterName || o.user_name;
      if (name && name !== "Staff Waiter") set.add(name);
    });
    return Array.from(set);
  }, [orders]);

  /* Helper to check if an order belongs to VIP Credit / VIP Customer */
  const isVipCreditOrder = (o) => {
    if (!o) return false;
    if (o.status === "cancelled") return false;

    // Check direct VIP customer fields
    if (o.vip_customer_id || o.vip_customer_name || o.vipCustomerName || o.vip_customer?.name) {
      return true;
    }

    // Check payment method or status on order
    const pMethod = (o.payment_method || "").toLowerCase();
    const pStatus = (o.payment_status || "").toLowerCase();
    if (
      pMethod === "credit" ||
      pMethod === "credit_pending" ||
      pStatus === "credit_pending" ||
      pStatus === "credit"
    ) {
      return true;
    }

    // Check notes for VIP tag
    if (
      o.notes &&
      (String(o.notes).includes("VIP:") ||
        String(o.notes).toLowerCase().includes("vip"))
    ) {
      return true;
    }

    // Check payment records on order
    const pmts = o.payments || [];
    if (Array.isArray(pmts) && pmts.length > 0) {
      return pmts.some((p) => {
        const m = (p.payment_method || p.method || "").toLowerCase();
        if (m === "credit" || m === "credit_pending") return true;
        if (p.vip_customer_id || p.vip_customer_name) return true;
        const ref = String(p.reference || "");
        if (
          ref.toUpperCase().includes("VIP_CREDIT:") ||
          ref.toUpperCase().startsWith("VIP:") ||
          ref.toLowerCase().includes("vip")
        ) {
          return true;
        }
        return false;
      });
    }

    return false;
  };

  /* Financial Metrics Math */
  const paidOrders = orders.filter(
    (o) => o.payment_status === "paid" || o.status === "completed"
  );
  const unpaidOrders = orders.filter(
    (o) => o.payment_status !== "paid" && o.status !== "completed" && o.status !== "cancelled"
  );
  const creditOrders = orders.filter((o) => isVipCreditOrder(o));

  const totalRevenue = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const totalPaidRevenue = totalRevenue;
  const pendingCreditTotal = orders
    .filter(
      (o) =>
        o.status !== "cancelled" &&
        (o.payment_status === "credit_pending" ||
          (isVipCreditOrder(o) && o.payment_status !== "paid" && o.status !== "completed") ||
          (o.payment_status !== "paid" && o.status !== "completed"))
    )
    .reduce(
      (sum, o) => sum + Math.max(getOrderTotal(o) - Number(o.paid_amount || 0), 0),
      0
    );

  /* Breakdown by payment method */
  let cashTotal = 0;
  let digitalTotal = 0;

  orders.forEach((o) => {
    const isPaid = o.payment_status === "paid" || o.status === "completed";
    if (!isPaid) return;

    const pmts = o.payments || [];
    if (pmts.length > 0) {
      pmts.forEach((p) => {
        const amt = Number(p.amount || 0);
        const method = (p.payment_method || "").toLowerCase();
        if (method === "cash") {
          cashTotal += amt;
        } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
          digitalTotal += amt;
        } else if (method === "credit" || method === "credit_pending") {
          // VIP Credit
        } else {
          cashTotal += amt;
        }
      });
    } else {
      const amt = getOrderTotal(o);
      const method = (o.payment_method || "cash").toLowerCase();
      if (method === "cash") {
        cashTotal += amt;
      } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
        digitalTotal += amt;
      } else if (method === "credit" || method === "credit_pending") {
        // VIP Credit
      } else {
        cashTotal += amt;
      }
    }
  });

  /* Search & Filter logic */
  const filteredOrders = orders.filter((order) => {
    const orderNum = (order.order_number || String(order.id || "")).toLowerCase();
    const tableNum = String(order.table_number || order.table_id || "").toLowerCase();
    const waiter = (order.waiter_name || order.waiterName || order.user_name || "").toLowerCase();
    const vipName = (
      order.vip_customer_name ||
      order.vipCustomerName ||
      order.vip_customer?.name ||
      (Array.isArray(order.payments) ? order.payments.find((p) => p.vip_customer_name)?.vip_customer_name : "") ||
      ""
    ).toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      orderNum.includes(search) ||
      tableNum.includes(search) ||
      waiter.includes(search) ||
      vipName.includes(search);

    const pStatus = (order.payment_status || "unpaid").toLowerCase();
    const isPaid = pStatus === "paid" || order.status === "completed";

    let matchesStatus = true;
    if (statusFilter === "paid") {
      matchesStatus = isPaid;
    } else if (statusFilter === "unpaid") {
      matchesStatus = !isPaid && order.status !== "cancelled";
    } else if (statusFilter === "credit") {
      matchesStatus = isVipCreditOrder(order);
    }

    const waiterName = order.waiter_name || order.waiterName || order.user_name || "";
    const matchesWaiter = selectedWaiter === "all" || waiterName === selectedWaiter;

    return matchesSearch && matchesStatus && matchesWaiter;
  });

  const filteredPaidRevenue = filteredOrders
    .filter((o) => o.payment_status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + getOrderTotal(o), 0);

  const activeReportRevenue =
    statusFilter !== "all" || selectedWaiter !== "all" || searchTerm.trim()
      ? (statusFilter === "credit"
          ? filteredOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)
          : filteredPaidRevenue)
      : totalPaidRevenue;

  const netSalesSubtotal = activeReportRevenue > 0
    ? Number((activeReportRevenue / 1.15).toFixed(2))
    : 0;

  const vatTotal = Number((activeReportRevenue - netSalesSubtotal).toFixed(2));

  const totalItemsServedCount = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      const items = parseItems(order.items || order.order_items);
      return sum + items.reduce((s, i) => s + Number(i.quantity || 1), 0);
    }, 0);
  }, [filteredOrders]);

  const { filteredCashTotal, filteredDigitalTotal } = useMemo(() => {
    let fCash = 0;
    let fDigital = 0;
    filteredOrders.forEach((o) => {
      const isPaid = o.payment_status === "paid" || o.status === "completed";
      if (!isPaid) return;

      const pmts = o.payments || [];
      if (pmts.length > 0) {
        pmts.forEach((p) => {
          const amt = Number(p.amount || 0);
          const method = (p.payment_method || "").toLowerCase();
          if (method === "cash") {
            fCash += amt;
          } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
            fDigital += amt;
          } else if (method === "credit" || method === "credit_pending") {
            // VIP Credit
          } else {
            fCash += amt;
          }
        });
      } else {
        const amt = getOrderTotal(o);
        const method = (o.payment_method || "cash").toLowerCase();
        if (method === "cash") {
          fCash += amt;
        } else if (["telebirr", "cbe_birr", "cbe", "card"].includes(method)) {
          fDigital += amt;
        } else if (method === "credit" || method === "credit_pending") {
          // VIP Credit
        } else {
          fCash += amt;
        }
      }
    });
    return { filteredCashTotal: fCash, filteredDigitalTotal: fDigital };
  }, [filteredOrders]);

  const getMethodBadge = (method) => {
    const m = (method || "").toLowerCase();
    if (m === "cash") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
          💵 Cash
        </span>
      );
    }
    if (m === "telebirr") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
          <Smartphone size={12} /> Telebirr
        </span>
      );
    }
    if (m === "cbe_birr" || m === "cbe") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
          <Landmark size={12} /> CBE Birr
        </span>
      );
    }
    if (m === "card") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-200">
          <CreditCard size={12} /> Card
        </span>
      );
    }
    if (m === "credit" || m === "credit_pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
          📋 VIP Credit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
        {method || "Direct"}
      </span>
    );
  };

  const handlePrint = () => {
    printReportArea("sales-audit-report-printable", "Today's Sales & Payment Audit");
  };

  const openingCashAmount = Number(currentShift?.opening_cash || 0);
  const expectedPhysicalCash = Number(
    currentShift?.expected_cash ?? (openingCashAmount + cashTotal)
  );
  const actualCountedAmount = countedCash !== "" ? Number(countedCash) : null;
  const liveVariance = actualCountedAmount !== null ? actualCountedAmount - expectedPhysicalCash : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Action Buttons Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-hide">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Today's Sales & Payment Audit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <ShieldCheck size={14} /> Cashier Audit
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time daily transaction history, server waiter attribution, and payment audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchDailyAuditData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* Shift Controls (Start / Close Shift) - Strictly for Cashiers & Admins/Managers, NOT Waiters */}
          {canManageShift && (
            <>
              {/* Start Shift Button if no active shift */}
              {(!currentShift || currentShift.status !== "open") && currentShift?.status !== "closed_pending_approval" && (
                <button
                  type="button"
                  onClick={() => {
                    setOpeningFloat("0");
                    setShowStartModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700"
                >
                  <PlayCircle size={15} />
                  <span>Start Shift</span>
                </button>
              )}

              {/* Close Shift Button + Total Money Collected Card if shift is open */}
              {currentShift?.status === "open" && (
                <div className="flex items-center gap-2.5">
                  {/* Little Card: Total Money Collected */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3.5 py-1.5 shadow-2xs">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shrink-0">
                      <DollarSign size={15} />
                    </div>
                    <div className="leading-tight">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Total Collected</span>
                      <span className="text-xs font-black text-emerald-950">{totalRevenue.toLocaleString()} ETB</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCountedCash("");
                      setCashierNotes("");
                      setCloseError("");
                      setShowCloseModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-rose-700 active:scale-95"
                  >
                    <Lock size={14} />
                    <span>Close Shift</span>
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-slate-800"
          >
            <Printer size={14} />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* SHIFT STATUS & RECONCILIATION LIFECYCLE BANNER - Strictly for Cashiers & Admins/Managers, NOT Waiters */}
      {canManageShift && (
        <div className="print-hide">
        {(!currentShift || currentShift.status !== "open") && currentShift?.status !== "closed_pending_approval" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shrink-0">
                <PlayCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">No Active Cashier Shift</h3>
                <p className="text-xs text-blue-700">
                  Start your shift to record opening drawer float and activate official daily audit closing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpeningFloat("0");
                setShowStartModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700 transition shrink-0"
            >
              <PlayCircle size={14} />
              <span>Start Cashier Shift</span>
            </button>
          </div>
        )}

        {currentShift?.status === "open" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-950">Active Cashier Shift #{currentShift.id}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 animate-pulse">
                    ● LIVE RECORDING
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Started: {currentShift.start_time ? new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"} • Opening Float: {Number(currentShift.opening_cash || 0).toLocaleString()} ETB • Expected Cash in Till: <strong className="text-emerald-950 font-black">{expectedPhysicalCash.toLocaleString()} ETB</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCountedCash("");
                setCashierNotes("");
                setCloseError("");
                setShowCloseModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700 transition shrink-0"
            >
              <Lock size={14} />
              <span>Close Shift &amp; Handover</span>
            </button>
          </div>
        )}

        {currentShift?.status === "closed_pending_approval" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">Daily Sales Audit Closed (Shift #{currentShift.id})</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                    ⏳ Awaiting Finance Approval
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Counted Cash: <strong>{Number(currentShift.actual_cash || 0).toLocaleString()} ETB</strong> • Expected Cash: {Number(currentShift.expected_cash || 0).toLocaleString()} ETB • Variance: <strong className={Number(currentShift.shortage_overage || 0) < 0 ? "text-rose-700" : "text-emerald-800"}>{Number(currentShift.shortage_overage || 0) > 0 ? `+${currentShift.shortage_overage}` : currentShift.shortage_overage} ETB</strong>
                </p>
                {currentShift.cashier_notes && (
                  <p className="text-[11px] text-amber-900 mt-1 italic">
                    Cashier Note: "{currentShift.cashier_notes}"
                  </p>
                )}
              </div>
            </div>
            <span className="rounded-xl border border-amber-300 bg-amber-100 px-3.5 py-2 text-xs font-extrabold text-amber-900 shrink-0">
              Submitted to Finance
            </span>
          </div>
        )}

        {currentShift?.status === "verified" && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-950">Daily Sales Audit Approved & Reconciled</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                    ✓ Verified by {currentShift.verified_by_name || "Finance Manager"}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Reconciled at: {currentShift.verified_at ? new Date(currentShift.verified_at).toLocaleString() : "Today"} • Approved Cash Handover: <strong>{Number(currentShift.actual_cash || 0).toLocaleString()} ETB</strong>
                </p>
                {currentShift.verification_notes && (
                  <p className="text-[11px] text-emerald-900 mt-1 italic">
                    Finance Audit Comments: "{currentShift.verification_notes}"
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpeningFloat("0");
                setShowStartModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 transition shrink-0"
            >
              <PlayCircle size={14} />
              <span>Start New Shift</span>
            </button>
          </div>
        )}

        {currentShift?.status === "discrepancy" && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white font-bold shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-950">Daily Sales Audit Flagged (Discrepancy)</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-200 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-900">
                    Flagged by {currentShift.verified_by_name || "Finance Manager"}
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-0.5">
                  Counted Cash: {Number(currentShift.actual_cash || 0).toLocaleString()} ETB • Discrepancy Variance: <strong className="text-rose-700 font-bold">{Number(currentShift.shortage_overage || 0).toLocaleString()} ETB</strong>
                </p>
                {currentShift.verification_notes && (
                  <p className="text-[11px] text-rose-900 mt-1 font-semibold">
                    Finance Audit Reason: "{currentShift.verification_notes}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* PRINTABLE AREA CONTAINER */}
      <div id="sales-audit-report-printable" className="space-y-6">
        {/* OFFICIAL EXECUTIVE PRINT HEADER */}
        <div className="mb-4 border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="header-title text-xl font-black uppercase text-slate-900 tracking-tight">
                THE OAK CLUB & LOUNGE
              </h1>
              <p className="header-subtitle text-xs font-bold uppercase text-slate-600">
                DAILY SALES & SHIFT REVENUE AUDIT REPORT
              </p>
              <p className="meta-text text-[10px] text-slate-500 mt-0.5">
                Audit Date: {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right text-xs">
              <h2 className="font-bold text-slate-900">
                Shift: {currentShift?.id ? `Shift #${currentShift.id}` : "Daily Audit"}
              </h2>
              <p className="meta-text text-[10px] text-slate-500">
                Cashier: <strong className="text-slate-900">{currentShift?.cashier_name || user?.username || user?.name || "Staff Cashier"}</strong>
              </p>
              <p className="meta-text text-[10px] text-slate-500">
                Printed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards - Hidden on A4 print, shown on screen */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 grid-4 print-hide">
          {/* Total Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Revenue Today
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 print-hide">
                <TrendingUp size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {totalRevenue.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">
              {paidOrders.length} Paid Order Tickets
            </p>
          </div>

          {/* Cash Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Cash Collected
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 print-hide">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {cashTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              In-Drawer Cash Received
            </p>
          </div>

          {/* Digital Revenue */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Digital Payments
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 print-hide">
                <Smartphone size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {digitalTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-purple-600">
              Telebirr / CBE Birr / Card
            </p>
          </div>

          {/* Open Unpaid & Credit */}
          <div className="card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold uppercase tracking-wider text-slate-500">
                Open / Credit Pending
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 print-hide">
                <Clock size={20} />
              </div>
            </div>
            <p className="card-value mt-3 text-2xl font-black text-slate-900">
              {pendingCreditTotal.toFixed(2)}{" "}
              <span className="text-sm font-extrabold text-slate-500">ETB</span>
            </p>
            <p className="mt-1 text-xs font-medium text-amber-700">
              {unpaidOrders.length} Unpaid Tables Open
            </p>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between print-hide">
          {/* Category Pills & Waiter Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Today's ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Paid ({paidOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unpaid")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Unpaid ({unpaidOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("credit")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                statusFilter === "credit"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              VIP Credit ({creditOrders.length})
            </button>

            {/* Waiter Filter Selector */}
            {uniqueWaiters.length > 0 && (
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700 outline-hidden focus:border-blue-500"
              >
                <option value="all">👤 All Waiters</option>
                {uniqueWaiters.map((w) => (
                  <option key={w} value={w}>👤 {w}</option>
                ))}
              </select>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order #, Table, Waiter..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 left-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Main Table View */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading sales audit records...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm font-semibold text-rose-600">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
              {error}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-extrabold text-slate-700">No orders found matching filters.</p>
              <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search criteria or filter tabs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">Table & Ticket</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">Server / Waiter</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 min-w-[200px]">Items & Portions Served (In Detail)</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">Total Amount</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">Status</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 min-w-[150px]">Payment Method & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((order) => {
                    const orderTotal = getOrderTotal(order);
                    const payments = order.payments || [];
                    const isCancelled = order.status === "cancelled";
                    const isPaid = !isCancelled && (order.payment_status === "paid" || order.status === "completed");
                    const waiterName = order.waiter_name || order.waiterName || order.user_name || "Staff Waiter";
                    const orderItems = parseItems(order.items || order.order_items);

                    const vipCustomerName =
                      order.vip_customer_name ||
                      order.vipCustomerName ||
                      order.vip_customer?.name ||
                      (Array.isArray(payments)
                        ? payments.find((p) => p.vip_customer_name)?.vip_customer_name
                        : null) ||
                      (order.notes && order.notes.includes("VIP:")
                        ? order.notes.split("VIP:")[1]?.split(/[\n,]/)[0]?.trim()
                        : null) ||
                      (Array.isArray(payments)
                        ? (() => {
                            const pVip = payments.find(
                              (p) => p.reference && String(p.reference).startsWith("VIP_CREDIT:")
                            );
                            return pVip ? String(pVip.reference).replace("VIP_CREDIT:", "").trim() : null;
                          })()
                        : null);

                    return (
                      <tr key={order.id || order.order_number} className="hover:bg-slate-50/80 transition">
                        {/* Table & Ticket */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top">
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              {order.table_number || order.table_id
                                ? `Table #${order.table_number || order.table_id}`
                                : "Takeaway"}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              #{order.order_number || order.id}
                            </span>
                            <span className="mt-0.5 text-[10px] text-slate-400">
                              {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
                            </span>

                            {vipCustomerName && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-amber-950 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs w-fit">
                                <Crown size={11} className="text-amber-700 shrink-0" />
                                <span>VIP: {vipCustomerName}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Server / Waiter */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-900 border border-indigo-100 shadow-2xs">
                            <User size={12} className="text-indigo-600 print-hide" />
                            <span>{waiterName}</span>
                          </div>
                        </td>

                        {/* Items & Portions Served (In Detail) */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top">
                          {orderItems.length > 0 ? (
                            <div className="space-y-1">
                              {orderItems.map((it, idx) => {
                                const portion = parseItemPortion(it);
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs gap-3 py-0.5">
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
                                <span>Order Items Total:</span>
                                <span className="text-slate-800 font-extrabold">
                                  {orderItems.reduce((s, i) => s + Number(i.quantity || 1), 0)} items
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">No items detailed</span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              {orderTotal.toFixed(2)} ETB
                            </span>
                            {order.paid_amount > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">
                                Paid: {Number(order.paid_amount).toFixed(2)} ETB
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kitchen / Table Status */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top">
                          <span
                            className={`badge ${
                              order.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : order.status === "completed"
                                ? "badge-paid"
                                : order.status === "ready"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : order.status === "preparing"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "badge-pending"
                            }`}
                          >
                            {order.status || "pending"}
                          </span>
                        </td>

                        {/* Payment Method & Audit Details */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 align-top">
                          <div className="space-y-1.5">
                            {payments.length > 0 ? (
                              payments.map((p, pIdx) => {
                                const pVipName =
                                  p.vip_customer_name ||
                                  (p.reference && String(p.reference).startsWith("VIP_CREDIT:")
                                    ? String(p.reference).replace("VIP_CREDIT:", "").trim()
                                    : null);

                                return (
                                  <div key={pIdx} className="flex flex-wrap items-center gap-2">
                                    {getMethodBadge(p.payment_method)}
                                    {pVipName && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900">
                                        <Crown size={10} className="text-amber-700" />
                                        VIP: {pVipName}
                                      </span>
                                    )}
                                    {p.reference && !String(p.reference).startsWith("VIP_CREDIT:") && (
                                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                        Ref: {p.reference}
                                      </span>
                                    )}
                                    {(p.receipt_image || p.receiptImage) && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedProofOrder(order)}
                                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 hover:bg-blue-100 border border-blue-200 print-hide"
                                      >
                                        <Eye size={10} />
                                        <span>View Proof</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-2">
                                {isCancelled ? (
                                  <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    Cancelled / Voided
                                  </span>
                                ) : (
                                  <>
                                    {getMethodBadge(order.payment_method || (isPaid ? "cash" : "unpaid"))}
                                    {!isPaid && (
                                      <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Unpaid / Pending
                                      </span>
                                    )}
                                  </>
                                )}
                                {(order.receipt_image || order.receiptImage) && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProofOrder(order)}
                                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 hover:bg-blue-100 border border-blue-200 print-hide"
                                  >
                                    <Eye size={10} />
                                    <span>View Proof</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredOrders.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-400 bg-slate-100 font-black text-slate-900">
                      <td colSpan="2" className="px-3 py-2.5 text-right text-xs uppercase tracking-wider">
                        Total Items Served:
                      </td>
                      <td className="px-3 py-2.5 font-black text-xs text-blue-900">
                        {totalItemsServedCount} items across {filteredOrders.length} orders
                      </td>
                      <td colSpan="3" className="px-3 py-2.5 text-right font-black text-xs text-emerald-800 whitespace-nowrap">
                        Verified Sales: {activeReportRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* OFFICIAL FINANCIAL & REVENUE AUDIT SUMMARY (THE LAST PART) */}
        <div className="print-summary-box rounded-2xl border-2 border-slate-900 bg-slate-50/70 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300 pb-3 mb-4 gap-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Official Shift Financial Audit & Tax Reconciliation
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verified audit totals for today's active shift
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-lg bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 uppercase tracking-wider">
                A4 Official Verification
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Box 1: Order Volume & Items Served */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Volume & Items
              </span>
              <p className="mt-1 text-base font-black text-slate-900">
                {filteredOrders.length} Orders
              </p>
              <p className="mt-0.5 text-[11px] font-extrabold text-blue-700">
                {totalItemsServedCount} Total Items Served
              </p>
            </div>

            {/* Box 2: Sales & 15% VAT Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Sales & Tax (15% VAT)
              </span>
              <p className="mt-1 text-[11px] text-slate-600 flex justify-between">
                <span>Net Subtotal:</span>
                <strong className="text-slate-900">{netSalesSubtotal.toFixed(2)} ETB</strong>
              </p>
              <p className="text-[11px] text-slate-600 flex justify-between mt-0.5">
                <span>VAT (15%):</span>
                <strong className="text-amber-800">{vatTotal.toFixed(2)} ETB</strong>
              </p>
              <p className="mt-1 border-t border-slate-100 pt-1 text-xs font-black text-slate-900 flex justify-between">
                <span>Gross Revenue:</span>
                <span>{activeReportRevenue.toFixed(2)} ETB</span>
              </p>
            </div>

            {/* Box 3: Total Cash Received In Till */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Cash In Till / Drawer
              </span>
              <p className="mt-1 text-base font-black text-emerald-800">
                {filteredCashTotal.toFixed(2)} ETB
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Total Physical Cash Received
              </p>
              {currentShift && (
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Opening Drawer Float: {openingCashAmount.toFixed(2)} ETB
                </p>
              )}
            </div>

            {/* Box 4: Digital Payments & Open Credit */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Digital & Open Credit
              </span>
              <p className="mt-1 text-[11px] text-slate-600 flex justify-between">
                <span>Digital (Telebirr/CBE):</span>
                <strong className="text-purple-700">{filteredDigitalTotal.toFixed(2)} ETB</strong>
              </p>
              <p className="text-[11px] text-slate-600 flex justify-between mt-0.5">
                <span>Open / VIP Credit:</span>
                <strong className="text-rose-700">{pendingCreditTotal.toFixed(2)} ETB</strong>
              </p>
            </div>
          </div>

          {/* Grand Total Revenue Row */}
          <div className="mt-3 pt-3 border-t-2 border-slate-900 flex justify-between items-center text-xs font-black text-slate-900">
            <span className="uppercase tracking-wider">GRAND TOTAL VERIFIED SALES REVENUE (VAT INCLUSIVE):</span>
            <span className="text-base text-emerald-800 font-black">
              {activeReportRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </span>
          </div>

          {currentShift?.shortage_overage !== undefined && currentShift?.shortage_overage !== null && (
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-600">Shift Drawer Cash Variance (Counted vs Expected):</span>
              <span className={Number(currentShift.shortage_overage) < 0 ? "text-rose-700 font-black" : "text-emerald-700 font-black"}>
                {Number(currentShift.shortage_overage) > 0 ? `+${currentShift.shortage_overage}` : currentShift.shortage_overage} ETB
              </span>
            </div>
          )}
        </div>

        {/* OFFICIAL EXECUTIVE PRINT FOOTER */}
        <div className="print-footer-box mt-8 pt-4 border-t-2 border-slate-900">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <div>
              <p className="font-extrabold uppercase">THE OAK CLUB & LOUNGE — DAILY SALES AUDIT REPORT</p>
              <p className="text-[10px] text-slate-500 font-normal">Confidential • For Internal Financial Audit Use Only</p>
            </div>
            <div className="text-right space-y-2">
              <p>
                Cashier Signature: {currentShift?.cashier_name ? `${currentShift.cashier_name} (Signed)` : "______________________"}
              </p>
              <p>
                Manager Approval: {currentShift?.verified_by_name ? `${currentShift.verified_by_name} (Verified: ${new Date(currentShift.verified_at).toLocaleDateString()})` : "_______________________"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Proof Modal */}
      {selectedProofOrder && (
        <PaymentProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
        />
      )}

      {/* START SHIFT MODAL */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print-hide">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <PlayCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Start Cashier Shift</h3>
                  <p className="text-xs text-slate-500">Open register till for today's sales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cashier Name
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800">
                  {user?.fullName || user?.name || user?.username || "Active Cashier"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Opening Cash Float (ETB)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ETB
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Physical cash currently in the drawer at the start of your shift.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingShift}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {startingShift ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle size={14} />
                      <span>Start Shift</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE DAILY AUDIT & HANDOVER MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print-hide">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Close Daily Sales Audit</h3>
                  <p className="text-xs text-slate-500">Submit drawer handover to Finance for verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-6 space-y-4">
              {closeError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{closeError}</span>
                </div>
              )}

              {/* Breakdown Cards */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Sales Channels Breakdown
                </h4>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Opening Cash Float:</span>
                  <span className="font-semibold text-slate-900">{openingCashAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total Cash Sales Collected:</span>
                  <span className="font-semibold text-slate-900">{cashTotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>Total Expected Physical Cash:</span>
                  <span className="text-sm font-black text-emerald-800">{expectedPhysicalCash.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2 text-slate-500">
                  <span>Digital Channels (Telebirr, CBE, Card):</span>
                  <span className="font-semibold text-slate-700">{digitalTotal.toLocaleString()} ETB</span>
                </div>
              </div>

              {/* Physical Cash Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Actual Counted Cash in Drawer *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ETB
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Enter counted physical cash..."
                    className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-3 text-base font-black text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Live Variance Calculation */}
              {countedCash !== "" && (
                <div
                  className={`rounded-xl border p-3.5 flex items-center justify-between text-xs font-bold ${
                    liveVariance === 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : liveVariance < 0
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <span>Drawer Variance:</span>
                  <span className="text-sm font-black">
                    {liveVariance === 0
                      ? "0.00 ETB (Exact Match ✓)"
                      : liveVariance < 0
                      ? `${liveVariance.toLocaleString()} ETB (Shortage ⚠️)`
                      : `+${liveVariance.toLocaleString()} ETB (Overage)`}
                  </span>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cashier Closing Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={cashierNotes}
                  onChange={(e) => setCashierNotes(e.target.value)}
                  placeholder="Explain any shortages, till handover comments, or shift notes..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Important:</strong> Closing the daily audit locks today's transactions and submits this record to Finance for cash verification and final approval.
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingShift || countedCash === ""}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {closingShift ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Closing Audit...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Close & Submit to Finance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodaySalesAuditPage;
