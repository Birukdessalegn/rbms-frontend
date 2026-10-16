import { useState } from "react";
import { ShieldCheck, Calendar, Check, X, Clock, AlertTriangle, KeyRound } from "lucide-react";
import { useSubscription } from "../../context/SubscriptionContext";

export default function VendorRenewalModal({ isOpen, onClose }) {
  const { subscription, renew } = useSubscription();
  const [pin, setPin] = useState("");
  const [days, setDays] = useState(30);
  const [customDate, setCustomDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleRenew = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!pin.trim()) {
      setError("Please enter the Master Vendor PIN.");
      return;
    }

    setSubmitting(true);
    const result = await renew({
      days: customDate ? undefined : Number(days),
      newExpiryDate: customDate || undefined,
      masterPin: pin.trim(),
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);
    if (result.success) {
      setSuccess(result.message || "Subscription successfully renewed!");
      setPin("");
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1500);
    } else {
      setError(result.message || "Invalid Vendor PIN or renewal error.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Vendor License & Renewal</h3>
            <p className="text-xs font-semibold text-slate-500">{subscription.clientName} • Monthly Purchase</p>
          </div>
        </div>

        {/* Current status overview */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Current Status:</span>
            <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] ${
              subscription.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
              subscription.status === 'warning' ? 'bg-amber-50 text-amber-700' :
              subscription.status === 'grace' ? 'bg-rose-50 text-rose-700 animate-pulse' :
              'bg-red-100 text-red-800'
            }`}>
              {subscription.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Expires On:</span>
            <span className="font-bold text-slate-900">
              {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Days Remaining:</span>
            <span className="font-black text-blue-700">{subscription.daysRemaining} Days</span>
          </div>
        </div>

        <form onSubmit={handleRenew} className="mt-4 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200">
              <Check size={15} />
              <span>{success}</span>
            </div>
          )}

          {/* Quick extension presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Extend Duration:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "+1 Month", val: 30 },
                { label: "+3 Months", val: 90 },
                { label: "+1 Year", val: 365 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setDays(opt.val);
                    setCustomDate("");
                  }}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    days === opt.val && !customDate
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Or custom date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Or Specific Expiration Date:</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payment Reference / Notes:</label>
            <input
              type="text"
              placeholder="e.g. Paid via CBE Ref: 98124"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Master PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <KeyRound size={13} className="text-amber-500" /> Vendor Master PIN:
            </label>
            <input
              type="password"
              placeholder="Enter Master PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {submitting ? "Activating..." : "Save & Activate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
