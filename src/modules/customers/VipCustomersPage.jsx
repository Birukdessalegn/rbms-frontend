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
} from "lucide-react";
import api from "../../services/api";

export default function VipCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedRepayCustomer, setSelectedRepayCustomer] = useState(null);

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
    setEditingCustomer(null);
    setForm({
      name: "",
      phone: "",
      tier: "Gold VIP",
      creditLimit: "15000",
      company: "",
      notes: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setForm({
      name: cust.name || "",
      phone: cust.phone || "",
      tier: cust.tier || "Gold VIP",
      creditLimit: String(cust.credit_limit || cust.creditLimit || 15000),
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
        try {
          await api(`/vip-customers/${editingCustomer.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } catch (apiErr) {
          console.log("VIP API update notice:", apiErr?.message);
        }

        const updated = customers.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, ...payload, credit_limit: limit }
            : c
        );
        saveToStorage(updated);
        setSuccess("VIP Customer updated successfully");
      } else {
        let createdCust = null;
        try {
          const res = await api("/vip-customers", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          createdCust = res?.data || res;
        } catch (apiErr) {
          console.log("VIP API create notice:", apiErr?.message);
        }

        const newCust = createdCust?.id ? createdCust : {
          id: Date.now(),
          ...payload,
          current_debt: 0,
          created_at: new Date().toISOString().split("T")[0],
        };

        const updated = [newCust, ...customers];
        saveToStorage(updated);
        setSuccess("New VIP Customer registered successfully");
      }

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
      } catch (apiErr) {
        console.log("VIP Repay API notice:", apiErr?.message);
      }

      const newDebt = Math.max(currentDebt - repayAmt, 0);
      const updated = customers.map((c) =>
        c.id === selectedRepayCustomer.id
          ? { ...c, current_debt: newDebt }
          : c
      );

      saveToStorage(updated);
      setShowRepayModal(false);
      setSuccess(`Successfully recorded repayment of ${repayAmt.toLocaleString()} ETB for ${selectedRepayCustomer.name}`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err?.message || "Failed to record repayment");
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id) => {
    if (window.confirm("Are you sure you want to delete this VIP Customer profile?")) {
      try {
        await api(`/vip-customers/${id}`, { method: "DELETE" });
      } catch (apiErr) {
        console.log("VIP Delete API notice:", apiErr?.message);
      }
      const updated = customers.filter((c) => c.id !== id);
      saveToStorage(updated);
      setSuccess("VIP customer deleted");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTier = tierFilter === "all" || c.tier === tierFilter;
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

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-amber-600 hover:to-amber-700 active:scale-98 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Register VIP Customer
        </button>
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
          >
            <option value="all">All VIP Tiers</option>
            <option value="Gold VIP">Gold VIP</option>
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
                  const isUnlimited = (cust.tier || "").toLowerCase().includes("gold") || (cust.tier || "").toLowerCase().includes("unlimited") || limit >= 999999;
                  const available = isUnlimited ? Infinity : Math.max(limit - debt, 0);
                  const isMaxedOut = !isUnlimited && debt >= limit && limit > 0;

                  return (
                    <tr key={cust.id} className="transition hover:bg-amber-50/30">
                      {/* Name & Phone */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 font-extrabold text-[11px] text-amber-800 shadow-2xs">
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{cust.name}</p>
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                            <Sparkles className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
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
                          {debt > 0 && (
                            <button
                              type="button"
                              onClick={() => openRepayModal(cust)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-700 cursor-pointer shadow-2xs"
                              title="Record Repayment"
                            >
                              <DollarSign className="h-3 w-3" />
                              Repay
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModal(cust)}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                            title="Edit VIP Profile"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust.id)}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Delete Profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
                      const isGold = val.toLowerCase().includes("gold") || val.toLowerCase().includes("unlimited");
                      setForm({
                        ...form,
                        tier: val,
                        creditLimit: isGold ? "999999999" : (form.creditLimit === "999999999" ? "15000" : form.creditLimit),
                      });
                    }}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2.5 text-sm font-bold text-amber-950 outline-none focus:border-amber-500"
                  >
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
                    Approved Credit Limit (ETB) * {(form.tier.toLowerCase().includes("gold") || form.tier.toLowerCase().includes("unlimited")) && "(♾️ Unlimited Active)"}
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 disabled:bg-amber-100/70 disabled:text-amber-900"
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
    </div>
  );
}
