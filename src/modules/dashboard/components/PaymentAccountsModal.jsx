import { useState, useEffect } from "react";
import {
  X,
  Landmark,
  Plus,
  Trash2,
  Check,
  Copy,
  Smartphone,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import api from "../../../services/api";

const PRESET_PROVIDERS = [
  { name: "Telebirr", type: "telebirr", icon: Smartphone, color: "text-amber-700 bg-amber-50 border-amber-200" },
  { name: "Commercial Bank of Ethiopia (CBE)", type: "bank", icon: Landmark, color: "text-purple-700 bg-purple-50 border-purple-200" },
  { name: "Dashen Bank", type: "bank", icon: Building2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { name: "Awash Bank", type: "bank", icon: Building2, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { name: "Bank of Abyssinia", type: "bank", icon: Building2, color: "text-amber-800 bg-amber-50 border-amber-200" },
  { name: "CBE Birr", type: "telebirr", icon: Smartphone, color: "text-purple-700 bg-purple-50 border-purple-200" },
  { name: "Card / POS Terminal", type: "card", icon: CreditCard, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
];

function PaymentAccountsModal({ isOpen, onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState("Telebirr");
  const [accountType, setAccountType] = useState("telebirr");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("The Oak Club");
  const [notes, setNotes] = useState("");

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/payment-accounts");
      const list = res.accounts || res.data || [];
      setAccounts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load accounts:", err);
      // Local fallback for offline/preview
      const cached = localStorage.getItem("rbms_payment_accounts");
      if (cached) {
        try {
          setAccounts(JSON.parse(cached));
        } catch {
          setAccounts([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setShowAddForm(false);
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  const handleProviderSelect = (preset) => {
    setProvider(preset.name);
    setAccountType(preset.type);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!accountNumber.trim()) {
      setError("Please enter the account or phone number.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        account_type: accountType,
        provider: provider.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        notes: notes.trim(),
        is_active: true,
      };

      const res = await api("/payment-accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newAccount = res.account || res.data || { ...payload, id: Date.now() };
      setAccounts((prev) => [newAccount, ...prev]);

      // Cache locally as immediate fallback
      const updated = [newAccount, ...accounts];
      localStorage.setItem("rbms_payment_accounts", JSON.stringify(updated));

      setAccountNumber("");
      setNotes("");
      setShowAddForm(false);
      setSuccessMsg(`✓ ${provider} account added successfully!`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message || "Failed to add account");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (acc) => {
    try {
      const nextActive = !acc.is_active;
      await api(`/payment-accounts/${acc.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });

      setAccounts((prev) =>
        prev.map((item) => (item.id === acc.id ? { ...item, is_active: nextActive } : item))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this receiving account?")) return;
    try {
      await api(`/payment-accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((item) => item.id !== id));
      setSuccessMsg("Account removed.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete account");
    }
  };

  const handleCopy = (num, id) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Payment & Transfer Accounts
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure bank accounts and Telebirr for Card & Mobile payments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {/* Notifications */}
          {successMsg && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              {error}
            </div>
          )}

          {/* Quick Info Box */}
          <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-3.5 flex items-start gap-2.5 text-xs text-indigo-950 font-medium">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              Active accounts registered here will appear inside the <strong>POS Payment Modal</strong> when staff choose <strong>Mobile</strong> or <strong>Card</strong>, so customers can easily transfer money.
            </p>
          </div>

          {/* Action to Toggle Form */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Active Accounts ({accounts.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition shadow-xs cursor-pointer ${
                showAddForm
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
              }`}
            >
              {showAddForm ? (
                <>Cancel</>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add New Account
                </>
              )}
            </button>
          </div>

          {/* Add Account Inline Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-indigo-600" /> New Account Details
              </h3>

              {/* Provider Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Select Provider / Bank:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PROVIDERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleProviderSelect(preset)}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition border cursor-pointer ${
                        provider === preset.name
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <preset.icon size={12} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Provider Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. Telebirr, CBE, Dashen Bank"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Account / Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1000123456789 or 0911223344"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. The Oak Club"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Notes / Instruction (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Card POS Machine at Counter"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl bg-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-black text-white hover:bg-indigo-700 transition shadow-sm disabled:bg-slate-300 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          )}

          {/* Accounts List */}
          {loading ? (
            <div className="py-10 text-center text-xs font-semibold text-slate-400">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
              <Landmark className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">No payment accounts added yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "+ Add New Account" to add your Telebirr, CBE, or Bank accounts.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {accounts.map((acc) => {
                const isCopied = copiedId === acc.id;
                const isTelebirr = String(acc.provider || "").toLowerCase().includes("telebirr");
                const isCard = acc.account_type === "card";

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl border p-3.5 transition flex flex-wrap items-center justify-between gap-3 ${
                      acc.is_active
                        ? "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                        : "border-slate-200/60 bg-slate-50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 font-bold border ${
                        isTelebirr
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : isCard
                          ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                          : "bg-purple-100 text-purple-900 border-purple-300"
                      }`}>
                        {isTelebirr ? (
                          <Smartphone size={18} />
                        ) : isCard ? (
                          <CreditCard size={18} />
                        ) : (
                          <Landmark size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {acc.provider}
                          </span>
                          {!acc.is_active && (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
                            {acc.account_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.account_number, acc.id)}
                            className="text-slate-400 hover:text-slate-700 transition"
                            title="Copy Account Number"
                          >
                            {isCopied ? (
                              <Check size={13} className="text-emerald-600 font-bold" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>

                        {acc.account_holder && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            Holder: {acc.account_holder}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(acc)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer ${
                          acc.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {acc.is_active ? "Active" : "Disabled"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove Account"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 sm:px-6 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>{accounts.filter((a) => a.is_active).length} active for staff payment modal</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default PaymentAccountsModal;
