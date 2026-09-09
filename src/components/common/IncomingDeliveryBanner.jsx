import { useState, useEffect, useCallback } from "react";
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  User,
  FileText,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import api from "../../services/api";

export default function IncomingDeliveryBanner({ department = "bar", onReceived }) {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [receivingNotes, setReceivingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchIncomingDeliveries = useCallback(async () => {
    try {
      const res = await api(
        `/inventory/transfers?status=dispatched&toLocation=${department.toLowerCase()}`
      );
      const list = res?.data || (Array.isArray(res) ? res : []);
      setDeliveries(list);

      // If selected delivery was completed or removed, clear selection
      if (selectedDelivery) {
        const stillExists = list.some((d) => d.id === selectedDelivery.id);
        if (!stillExists) {
          setSelectedDelivery(null);
        }
      }
    } catch {
      // Background poll failure handled silently
    }
  }, [department, selectedDelivery]);

  useEffect(() => {
    fetchIncomingDeliveries();
    const timer = setInterval(fetchIncomingDeliveries, 5000);
    return () => clearInterval(timer);
  }, [fetchIncomingDeliveries]);

  const handleConfirmReceived = async () => {
    if (!selectedDelivery) return;

    try {
      setIsSubmitting(true);
      setError("");

      const res = await api(`/inventory/transfers/${selectedDelivery.id}/receive`, {
        method: "PUT",
        body: JSON.stringify({
          receivingNotes: receivingNotes.trim() || "Physical count verified and accepted",
        }),
      });

      if (res?.success || res?.data) {
        setSuccessMsg(`Transfer #${selectedDelivery.transfer_number} received into ${department.toUpperCase()} inventory!`);
        setTimeout(() => setSuccessMsg(""), 4000);
        setSelectedDelivery(null);
        setReceivingNotes("");
        await fetchIncomingDeliveries();
        if (onReceived) onReceived();
      }
    } catch (err) {
      setError(err?.message || "Failed to confirm receipt of transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (deliveries.length === 0 && !successMsg) {
    return null;
  }

  return (
    <>
      {/* SUCCESS NOTIFICATION TOAST */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* INCOMING DELIVERY BANNER */}
      {deliveries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-orange-500/10 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left Info */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Truck className="h-6 w-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white">
                  {deliveries.length}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Incoming Stock Delivery from Central Warehouse
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                    Dispatched
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-0.5">
                  {deliveries.length === 1 ? (
                    <>
                      <span className="font-semibold text-slate-800">
                        {deliveries[0].transfer_number}
                      </span>{" "}
                      &bull; {deliveries[0].total_items || deliveries[0].items?.length || 0} items waiting for physical verification
                    </>
                  ) : (
                    `${deliveries.length} transfers currently in-transit to ${department.toUpperCase()}. Tap to inspect and accept.`
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setSelectedDelivery(deliveries[0])}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Review & Accept Items</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW & ACCEPT MODAL */}
      {selectedDelivery && (
        <div
          onClick={() => {
            setSelectedDelivery(null);
            setError("");
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Confirm Stock Receipt
                  </h2>
                  <p className="text-xs text-slate-500">
                    Transfer #{selectedDelivery.transfer_number}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDelivery(null);
                  setError("");
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Delivery Meta Card */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Dispatched By</p>
                    <p className="font-bold text-slate-800">
                      {selectedDelivery.dispatched_by_username || "Central Storekeeper"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Dispatched At</p>
                    <p className="font-bold text-slate-800">
                      {selectedDelivery.created_at
                        ? new Date(selectedDelivery.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })
                        : "Just now"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Verification List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Expected Items to Count
                  </span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {selectedDelivery.items?.length || selectedDelivery.total_items || 0} items
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {Array.isArray(selectedDelivery.items) && selectedDelivery.items.length > 0 ? (
                    selectedDelivery.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {item.product_name || `Product #${item.product_id}`}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Verify physical package & condition
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-extrabold text-slate-900">
                            +{item.quantity}
                          </span>
                          <span className="ml-1 text-xs font-medium text-slate-500">
                            {item.unit || "pcs"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No item details provided.
                    </div>
                  )}
                </div>
              </div>

              {/* Receiving Notes Input */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Receiving & Inspection Notes (Optional)
                </label>
                <input
                  type="text"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Verified 24 bottles, cartons intact and chilled"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Error Box */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedDelivery(null);
                  setError("");
                }}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition disabled:opacity-50"
              >
                Inspect Later
              </button>

              <button
                type="button"
                onClick={handleConfirmReceived}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Confirm Received & Add to Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
