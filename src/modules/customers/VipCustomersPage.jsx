import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Plus,
  Search,
  DollarSign,
  CreditCard,
  Phone,
  CheckCircle2,
  Sparkles,
  Edit,
  Trash2,
  Building,
  ShieldAlert,
  X,
  Filter,
  Receipt,
  Crown,
  Calendar,
  MessageCircle,
  Send,
  Copy,
  Check,
  ArrowLeft,
  Clock,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  formatVipReceiptText,
  getWhatsAppReceiptUrl,
  getTelegramReceiptUrl,
  copyReceiptToClipboard,
} from "../pos/utils/vipReceiptFormatter";

export default function VipCustomersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedRepayCustomer, setSelectedRepayCustomer] = useState(null);

  // VIP Customer Credit Orders & History State
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedOrderCustomer, setSelectedOrderCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Share Receipt Modal State (For specific order clicked)
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    tier: "Gold VIP",
    creditLimit: "15000",
    company: "",
    notes: "",
  });

  // Repayment State
  const [repayForm, setRepayForm] = useState({
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const openOrderHistory = async (cust) => {
    setSelectedOrderCustomer(cust);
    setShowOrdersModal(true);
    setSelectedReceiptOrder(null);
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const res = await api(`/vip-customers/${cust.id}/payments`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setCustomerOrders(list);
    } catch (err) {
      console.error("Failed to load customer orders:", err);
      setOrdersError(err?.message || "Failed to load customer credit orders");
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const reloadCustomerOrders = async () => {
    if (!selectedOrderCustomer) return;
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const res = await api(`/vip-customers/${selectedOrderCustomer.id}/payments`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setCustomerOrders(list);
    } catch (err) {
      setOrdersError(err?.message || "Failed to load customer credit orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrderForReceipt = (order) => {
    setSelectedReceiptOrder(order);
    setCopiedReceipt(false);
  };

  const getReceiptFormattedData = () => {
    if (!selectedOrderCustomer || !selectedReceiptOrder) return null;

    const tierLower = (selectedOrderCustomer?.tier || "").toLowerCase();
    const limit = Number(selectedOrderCustomer?.credit_limit || 0);
    const debt = Number(selectedOrderCustomer?.current_debt || 0);
    const isUnlimited =
      tierLower.includes("gold") ||
      tierLower.includes("unlimited") ||
      limit >= 999999;
    const remainingLimit = isUnlimited ? 999999999 : Math.max(0, limit - debt);

    const chargedAmount = Number(
      selectedReceiptOrder.payment_amount || selectedReceiptOrder.order_total || 0
    );

    const items = (selectedReceiptOrder.items || []).map((i) => ({
      name: i.product_name,
      product_name: i.product_name,
      quantity: i.quantity,
      price: i.unit_price,
      total: i.total,
    }));

    const date = selectedReceiptOrder.paid_at
      ? new Date(selectedReceiptOrder.paid_at)
      : new Date(selectedReceiptOrder.order_created_at || Date.now());

    const receiptText = formatVipReceiptText({
      restaurantName: "RESTAURANT & BAR",
      customerName: selectedOrderCustomer.name,
      customerPhone: selectedOrderCustomer.phone,
      tier: selectedOrderCustomer.tier,
      orderNumber: selectedReceiptOrder.order_number || selectedReceiptOrder.order_id || "N/A",
      tableNumber: selectedReceiptOrder.table_number,
      items,
      chargedAmount,
      creditLimit: limit,
      currentDebt: debt,
      remainingLimit,
      isUnlimited,
      date,
    });

    return {
      receiptText,
      chargedAmount,
      limit,
      debt,
      remainingLimit,
      isUnlimited,
      date,
      items,
    };
  };

  const handleShareWhatsApp = (receiptData) => {
    if (!receiptData) return;
    const url = getWhatsAppReceiptUrl(selectedOrderCustomer?.phone, receiptData.receiptText);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = (receiptData) => {
    if (!receiptData) return;
    const url = getTelegramReceiptUrl(receiptData.receiptText);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyReceipt = async (receiptData) => {
    if (!receiptData) return;
    await copyReceiptToClipboard(receiptData.receiptText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 3000);
  };

  // Load Customers
  useEffect(() => {
    localStorage.removeItem("rbms_vip_customers");
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api("/vip-customers");
      const list = Array.isArray(res) ? res : res?.data || [];
      setCustomers(list);
    } catch (err) {
      console.log("Fetch VIP Customers notice:", err?.message);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = (newList) => {
    setCustomers(newList);
  };

  // Open Create / Edit Modal
  const openCreateModal = () => {
    if (!isAdmin) {
      setError("Permission denied: Only System Administrators are authorized to register VIP customers.");
      return;
    }
    setEditingCustomer(null);
    setForm({
      name: "",
      phone: "",
      tier: "Promoter",
      creditLimit: "15000",
      company: "",
      notes: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (cust) => {
    if (!isAdmin) {
      setError("Permission denied: Only System Administrators are authorized to edit VIP profiles.");
      return;
    }
    setEditingCustomer(cust);
    const tier = cust.tier || "Promoter";
    const tierLower = tier.toLowerCase();
    const isUnl = tierLower.includes("gold") || tierLower.includes("unlimited");
    setForm({
      name: cust.name || "",
      phone: cust.phone || "",
      tier: tier,
      creditLimit: isUnl ? "999999999" : String(cust.credit_limit || cust.creditLimit || 15000),
      company: cust.company || "",
      notes: cust.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  // Open Repayment Modal
  const openRepayModal = (cust) => {
    setSelectedRepayCustomer(cust);
    setRepayForm({
      amount: String(cust.current_debt || cust.currentDebt || 0),
      method: "cash",
      reference: "",
      notes: "Debt Repayment",
    });
    setError("");
    setShowRepayModal(true);
  };

  // Handle Form Submit (Create / Edit)
  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    setError("");
    if (!isAdmin) {
      setError("Permission denied: Only System Administrators are authorized to register or edit VIP customers.");
      return;
    }
    if (!form.name.trim()) return setError("Customer name is required");
    if (!form.phone.trim()) return setError("Phone number is required");

    setSaving(true);
    const limit = Number(form.creditLimit || 0);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      tier: form.tier,
      creditLimit: limit,
      credit_limit: limit,
      company: form.company.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (editingCustomer) {
        await api(`/vip-customers/${editingCustomer.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("VIP Customer updated successfully");
      } else {
        await api("/vip-customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("New VIP Customer registered successfully");
      }

      await loadCustomers();
      setShowModal(false);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  // Handle Repayment Submit
  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRepayCustomer) return;

    const repayAmt = Number(repayForm.amount || 0);
    const currentDebt = Number(selectedRepayCustomer.current_debt || 0);

    if (repayAmt <= 0) return setError("Please enter a valid repayment amount");
    if (repayAmt > currentDebt) return setError("Repayment amount cannot exceed current debt");

    try {
      await api(`/vip-customers/${selectedRepayCustomer.id}/repay`, {
        method: "POST",
        body: JSON.stringify({
          amount: repayAmt,
          method: repayForm.method,
          reference: repayForm.reference,
          notes: repayForm.notes,
        }),
      });

      await loadCustomers();
      setShowRepayModal(false);
      setSuccess(`Successfully recorded repayment of ${repayAmt.toLocaleString()} ETB for ${selectedRepayCustomer.name}`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err?.message || "Failed to record repayment");
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id) => {
    if (!isAdmin) {
      setError("Permission denied: Only System Administrators are authorized to delete VIP customer profiles.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this VIP Customer profile?")) {
      try {
        await api(`/vip-customers/${id}`, { method: "DELETE" });
        await loadCustomers();
        setSuccess("VIP customer deleted");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError(err?.message || "Failed to delete VIP customer");
      }
    }
  };

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTier =
      tierFilter === "all" ||
      c.tier === tierFilter ||
      (tierFilter === "Promoter" && (c.tier || "").toLowerCase().includes("promoter")) ||
      (tierFilter === "Gold VIP" && (c.tier || "").toLowerCase().includes("gold"));
    return matchesSearch && matchesTier;
  });

  // Calculate Metrics
  const totalDebt = customers.reduce((sum, c) => sum + Number(c.current_debt || 0), 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  const activeVips = customers.length;
  const customersWithDebt = customers.filter((c) => Number(c.current_debt || 0) > 0).length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              VIP & Credit Customers
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300 shadow-2xs">
              <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" />
              Customer Ledger
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage authorized credit limits, VIP guest profiles, and record tab repayments.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-amber-600 hover:to-amber-700 active:scale-98 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register VIP Customer
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              Total Outstanding Debt
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {totalDebt.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">ETB</span>
          </p>
          <p className="mt-0.5 text-[10px] text-red-700 font-medium">
            Across {customersWithDebt} active credit accounts
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Active VIP Accounts
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {activeVips} <span className="text-[10px] font-semibold text-slate-500">Guests</span>
          </p>
          <p className="mt-0.5 text-[10px] text-amber-800 font-medium">
            Pre-approved for credit tab
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Total Credit Limit
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {totalCreditLimit.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">ETB</span>
          </p>
          <p className="mt-0.5 text-[10px] text-blue-700 font-medium">
            Authorized maximum debt ceiling
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Credit Utilization
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {totalCreditLimit > 0 ? ((totalDebt / totalCreditLimit) * 100).toFixed(1) : "0"}%
          </p>
          <p className="mt-0.5 text-[10px] text-purple-700 font-medium">
            Debt vs Approved Limit
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-7 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
          />
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}

          {/* Floating Dropdown for VIP Customers */}
          {searchTerm.trim() && (
            <div className="absolute left-0 top-full mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No matching VIP customers found</div>
              ) : (
                filteredCustomers.slice(0, 15).map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setSearchTerm(cust.name || cust.full_name)}
                    className="w-full flex items-center justify-between p-2.5 text-left hover:bg-amber-50 rounded-lg transition group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700 truncate transition">
                        {cust.name || cust.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cust.phone || "No phone"} {cust.company ? `• ${cust.company}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                      {cust.tier || "VIP"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
          >
            <option value="all">All VIP Tiers</option>
            <option value="Promoter">🎟️ Promoter</option>
            <option value="Gold VIP">👑 Gold VIP (Unlimited)</option>
            <option value="Executive">Executive</option>
            <option value="Regular VIP">Regular VIP</option>
            <option value="Corporate Account">Corporate Account</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">VIP Customer</th>
                <th className="px-3.5 py-2.5">Tier & Company</th>
                <th className="px-3.5 py-2.5">Approved Credit Limit</th>
                <th className="px-3.5 py-2.5">Current Debt</th>
                <th className="px-3.5 py-2.5">Available Credit</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Users className="mx-auto mb-1.5 h-8 w-8 text-slate-300" />
                    <p className="font-semibold text-xs">No VIP Customers found</p>
                    <p className="text-[11px]">Adjust search filters or add a new VIP customer.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const debt = Number(cust.current_debt || 0);
                  const limit = Number(cust.credit_limit || 0);
                  const custTier = (cust.tier || "").toLowerCase();
                  const isPromoter = custTier.includes("promoter");
                  const isUnlimited = custTier.includes("gold") || custTier.includes("unlimited") || (!isPromoter && limit >= 999999);
                  const available = isUnlimited ? Infinity : Math.max(limit - debt, 0);
                  const isMaxedOut = !isUnlimited && debt >= limit && limit > 0;

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => openOrderHistory(cust)}
                      className="transition hover:bg-amber-50/40 cursor-pointer group"
                      title="Click to view all credit orders & share statements"
                    >
                      {/* Name & Phone */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg font-extrabold text-[11px] shadow-2xs transition group-hover:scale-105 ${
                            isPromoter ? "bg-purple-100 text-purple-900 border border-purple-200" : "bg-amber-100 text-amber-800"
                          }`}>
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs flex items-center gap-1 group-hover:text-amber-700 transition">
                              {cust.name}
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-amber-600 transition" />
                            </p>
                            <p className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Phone className="h-2.5 w-2.5" />
                              {cust.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tier & Company */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isPromoter
                              ? "bg-purple-100 text-purple-900 border-purple-300 font-extrabold"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}>
                            {isPromoter ? (
                              <span className="text-[11px]">🎟️</span>
                            ) : (
                              <Sparkles className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            )}
                            {cust.tier}
                          </span>
                          {cust.company && (
                            <p className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Building className="h-2.5 w-2.5" />
                              {cust.company}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Credit Limit */}
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 text-xs">
                        {isUnlimited ? "♾️ Unlimited" : `${limit.toLocaleString()} ETB`}
                      </td>

                      {/* Current Debt */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 font-extrabold text-xs ${
                              debt > 0 ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {debt.toLocaleString()} ETB
                          </span>
                          {isMaxedOut && (
                            <span className="block text-[9px] font-bold text-red-500 uppercase">
                              Limit Reached
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Available Credit */}
                      <td className="px-3.5 py-2.5 font-bold text-emerald-700 text-xs">
                        {isUnlimited ? "♾️ Unlimited" : `${available.toLocaleString()} ETB`}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Credit Orders & Statements */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderHistory(cust);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-2 py-1 text-[11px] font-bold text-amber-900 transition cursor-pointer shadow-2xs"
                            title="View All Credit Orders & Share Receipts"
                          >
                            <Receipt className="h-3 w-3 text-amber-700" />
                            Orders
                          </button>

                          {debt > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRepayModal(cust);
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-700 cursor-pointer shadow-2xs"
                              title="Record Repayment"
                            >
                              <DollarSign className="h-3 w-3" />
                              Repay
                            </button>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(cust);
                                }}
                                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                title="Edit VIP Profile"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomer(cust.id);
                                }}
                                className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                title="Delete Profile"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT VIP CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCustomer ? "Edit VIP Customer Profile" : "Register New VIP Customer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text" 
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter customer full name..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+251 9XX XXX XXX"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    VIP Tier Badge
                  </label>
                  <select
                    value={form.tier}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isUnl =
                        val.toLowerCase().includes("gold") ||
                        val.toLowerCase().includes("unlimited");
                      setForm({
                        ...form,
                        tier: val,
                        creditLimit: isUnl ? "999999999" : (form.creditLimit === "999999999" ? "15000" : form.creditLimit),
                      });
                    }}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2.5 text-sm font-bold text-amber-950 outline-none focus:border-amber-500"
                  >
                    <option value="Promoter">🎟️ Promoter</option>
                    <option value="Gold VIP">👑 Gold VIP (Unlimited Credit)</option>
                    <option value="Executive">Executive</option>
                    <option value="Regular VIP">Regular VIP</option>
                    <option value="Corporate Account">Corporate Account</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Approved Credit Limit (ETB) * {(form.tier.toLowerCase().includes("gold") || form.tier.toLowerCase().includes("unlimited")) && "(♾️ Unlimited Money Active)"}
                  </label>
                  <input
                    type="number"
                    required
                    disabled={form.tier.toLowerCase().includes("gold") || form.tier.toLowerCase().includes("unlimited")}
                    min="0"
                    step="1000"
                    value={(form.tier.toLowerCase().includes("gold") || form.tier.toLowerCase().includes("unlimited")) ? "999999999" : form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                    placeholder="15000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 disabled:bg-purple-100/70 disabled:text-purple-950 disabled:border-purple-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Enter company name..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes & Approval Authorization
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Enter approval authorization notes..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:from-amber-600 hover:to-amber-700 cursor-pointer shadow-md"
                >
                  {saving ? "Saving..." : editingCustomer ? "Save Changes" : "Register VIP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD REPAYMENT MODAL */}
      {showRepayModal && selectedRepayCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Record Debt Repayment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRepayModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900">
              <p className="font-bold text-sm">{selectedRepayCustomer.name}</p>
              <p>Current Debt: <span className="font-extrabold text-red-600">{Number(selectedRepayCustomer.current_debt).toLocaleString()} ETB</span></p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleRepaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Repayment Amount (ETB) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedRepayCustomer.current_debt}
                  value={repayForm.amount}
                  onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base font-extrabold text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={repayForm.method}
                  onChange={(e) => setRepayForm({ ...repayForm, method: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="telebirr">Telebirr Transfer</option>
                  <option value="cbe">CBE Birr / Bank Transfer</option>
                  <option value="card">POS Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reference / Receipt No.
                </label>
                <input
                  type="text"
                  value={repayForm.reference}
                  onChange={(e) => setRepayForm({ ...repayForm, reference: e.target.value })}
                  placeholder="e.g. TXN-998823 / Cash Receipt"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-md"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIP CUSTOMER CREDIT ORDERS & STATEMENT MODAL */}
      {showOrdersModal && selectedOrderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative flex flex-col w-full max-w-3xl max-h-[94vh] sm:max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl font-extrabold text-xs sm:text-sm shadow-xs ${
                  (selectedOrderCustomer.tier || "").toLowerCase().includes("promoter")
                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}>
                  {selectedOrderCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {selectedOrderCustomer.name}
                    </h3>
                    <span className="rounded-full bg-amber-100 border border-amber-300/80 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-amber-900">
                      {selectedOrderCustomer.tier || "VIP"}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    <span>📞 {selectedOrderCustomer.phone || "No phone"}</span>
                    {selectedOrderCustomer.company && (
                      <span>&bull; 🏢 {selectedOrderCustomer.company}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={reloadCustomerOrders}
                  disabled={loadingOrders}
                  className="rounded-xl border border-slate-200 bg-white p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                  title="Refresh Orders"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin text-amber-600" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrdersModal(false);
                    setSelectedReceiptOrder(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Customer Credit Overview Bar */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 border-b border-slate-100 bg-white px-3 sm:px-5 py-2.5 sm:py-3 text-center">
              <div className="rounded-xl bg-red-50/70 border border-red-100 p-2 sm:p-2.5">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-600">Current Debt</p>
                <p className="text-xs sm:text-sm font-black text-red-700 mt-0.5">
                  {Number(selectedOrderCustomer.current_debt || 0).toLocaleString()} <span className="text-[9px] sm:text-[10px]">ETB</span>
                </p>
              </div>
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2 sm:p-2.5">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-600">Credit Limit</p>
                <p className="text-xs sm:text-sm font-black text-blue-700 mt-0.5">
                  {(selectedOrderCustomer.tier || "").toLowerCase().includes("gold") ||
                  Number(selectedOrderCustomer.credit_limit || 0) >= 999999
                    ? "♾️ Unlimited"
                    : `${Number(selectedOrderCustomer.credit_limit || 0).toLocaleString()} ETB`}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2 sm:p-2.5">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available Credit</p>
                <p className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5">
                  {(selectedOrderCustomer.tier || "").toLowerCase().includes("gold") ||
                  Number(selectedOrderCustomer.credit_limit || 0) >= 999999
                    ? "♾️ Unlimited"
                    : `${Math.max(
                        Number(selectedOrderCustomer.credit_limit || 0) -
                          Number(selectedOrderCustomer.current_debt || 0),
                        0
                      ).toLocaleString()} ETB`}
                </p>
              </div>
            </div>

            {/* Modal Body: Credit Orders List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                  All Orders Settled On Credit ({customerOrders.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Click any order to share receipt
                </span>
              </div>

              {loadingOrders ? (
                <div className="py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent mb-2" />
                  <p className="text-xs font-bold text-slate-600">Loading customer credit orders...</p>
                </div>
              ) : ordersError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-xs font-bold text-red-700">{ordersError}</p>
                  <button
                    type="button"
                    onClick={reloadCustomerOrders}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <ShoppingBag className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No Credit Orders Found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    This customer has not charged any POS orders to credit yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerOrders.map((ord) => {
                    const orderDate = ord.paid_at
                      ? new Date(ord.paid_at)
                      : new Date(ord.order_created_at || Date.now());
                    const billedAmount = Number(ord.payment_amount || ord.order_total || 0);
                    const itemsCount = (ord.items || []).reduce(
                      (sum, itm) => sum + Number(itm.quantity || 1),
                      0
                    );

                    return (
                      <div
                        key={ord.payment_id || ord.order_id}
                        onClick={() => handleSelectOrderForReceipt(ord)}
                        className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-amber-400 hover:shadow-md transition cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200 text-xs">
                              #{ord.order_number || ord.order_id}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                                  Order #{ord.order_number || ord.order_id}
                                </span>
                                {ord.table_number && (
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                    Table {ord.table_number}
                                  </span>
                                )}
                              </div>
                              <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <Calendar className="h-3 w-3" />
                                {orderDate.toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {ord.waiter_name && ` • Served by ${ord.waiter_name}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right">
                              <span className="block text-sm font-black text-slate-900">
                                {billedAmount.toLocaleString()} ETB
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold uppercase">
                                Charged to Credit
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrderForReceipt(ord);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                              title="Share Receipt Statement"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Share Receipt
                            </button>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        {ord.items && ord.items.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                              Items ({itemsCount}):
                            </span>
                            {ord.items.map((itm, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                <span className="font-bold text-amber-700">{itm.quantity}x</span>
                                {itm.product_name}
                                <span className="text-[10px] text-slate-400">
                                  ({Number(itm.total || 0).toLocaleString()} ETB)
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <span className="text-xs text-slate-500 font-medium">
                Admin & Manager credit audit portal
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowOrdersModal(false);
                  setSelectedReceiptOrder(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE RECEIPT STATEMENT POPUP (Triggered when clicking a specific order) */}
      {selectedReceiptOrder && selectedOrderCustomer && (() => {
        const receiptData = getReceiptFormattedData();
        if (!receiptData) return null;

        return (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
              <div className="relative flex flex-col w-full max-w-sm sm:max-w-md max-h-[90vh] rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
                
                {/* PINNED TOP HEADER - ALWAYS VISIBLE WITH CLEAR CLOSE BUTTON */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 border border-amber-200 text-amber-600 shadow-xs">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-[9px] font-extrabold text-amber-900 uppercase tracking-wider">
                        VIP Credit Receipt
                      </div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {selectedOrderCustomer.name}
                      </h3>
                    </div>
                  </div>

                  {/* HIGHLY VISIBLE PROMINENT CLOSE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptOrder(null)}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer border border-slate-200 shadow-xs"
                    title="Close receipt"
                  >
                    <X className="h-4 w-4 text-slate-600" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>

                {/* SCROLLABLE MODAL BODY */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 scrollbar-thin">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-semibold">
                      {selectedOrderCustomer.tier} &bull; {selectedOrderCustomer.phone || "No Phone Recorded"}
                    </p>
                  </div>

                  {/* Statement Card */}
                  <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-2 sm:space-y-2.5 text-xs text-left">
                    <div className="flex justify-between items-center text-slate-900 pb-2 border-b border-slate-200/80">
                      <span className="font-bold text-slate-600">Billed This Visit:</span>
                      <span className="text-sm sm:text-base font-black text-blue-700">
                        {receiptData.chargedAmount.toFixed(2)} ETB
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium pt-0.5">
                      <span>Order Reference:</span>
                      <span className="font-bold text-slate-800">
                        #{selectedReceiptOrder.order_number || selectedReceiptOrder.order_id}
                      </span>
                    </div>

                    {selectedReceiptOrder.table_number && (
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Table:</span>
                        <span className="font-bold text-slate-800">
                          Table {selectedReceiptOrder.table_number}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Date & Time:</span>
                      <span className="font-bold text-slate-800">
                        {receiptData.date.toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Credit Ceiling / Limit:</span>
                      <span className="font-bold text-slate-800">
                        {receiptData.isUnlimited ? "Unlimited" : `${receiptData.limit.toLocaleString()} ETB`}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Accumulated Debt:</span>
                      <span className="font-bold text-amber-700">
                        {receiptData.debt.toLocaleString()} ETB
                      </span>
                    </div>

                    {/* Items preview */}
                    {receiptData.items && receiptData.items.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Ordered Items:
                        </span>
                        <div className="max-h-20 sm:max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                          {receiptData.items.map((itm, i) => (
                            <div key={i} className="flex justify-between text-[11px] text-slate-700">
                              <span className="truncate max-w-[170px] sm:max-w-[210px]">{itm.quantity}x {itm.product_name}</span>
                              <span className="font-semibold shrink-0">{Number(itm.total || 0).toFixed(2)} ETB</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-emerald-950 font-extrabold text-xs sm:text-sm border-t border-slate-200/80 pt-2 mt-1 bg-emerald-50/60 -mx-3 sm:-mx-4 -mb-3 sm:-mb-4 p-2.5 sm:p-3 rounded-b-xl sm:rounded-b-2xl border-emerald-100">
                      <span className="text-emerald-900 font-bold">Remaining Available Limit:</span>
                      <span className="text-emerald-700 font-black text-sm sm:text-base">
                        {receiptData.isUnlimited
                          ? "Unlimited"
                          : `${receiptData.remainingLimit.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ETB`}
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* WhatsApp 1-Click Button */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(receiptData)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] transition cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      Send WhatsApp Receipt
                    </button>

                    {/* Telegram 1-Click Button */}
                    <button
                      type="button"
                      onClick={() => handleShareTelegram(receiptData)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-sky-500 hover:bg-sky-600 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-black text-white shadow-md shadow-sky-500/20 active:scale-[0.98] transition cursor-pointer"
                    >
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      Send Telegram Receipt
                    </button>

                    {/* Copy Receipt Text Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyReceipt(receiptData)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 py-2 sm:py-2.5 px-3 sm:px-4 text-xs font-bold text-slate-700 active:scale-[0.98] transition cursor-pointer"
                    >
                      {copiedReceipt ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700">Receipt Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-slate-500" />
                          <span>Copy Receipt Statement</span>
                        </>
                      )}
                    </button>

                    {/* Return / Close back to orders list */}
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptOrder(null)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Close & Back to Orders
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
