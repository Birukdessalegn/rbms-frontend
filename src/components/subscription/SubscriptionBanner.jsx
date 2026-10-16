import { useState } from "react";
import { AlertTriangle, Clock, X, ShieldAlert } from "lucide-react";
import { useSubscription } from "../../context/SubscriptionContext";
import { useAuth } from "../../context/AuthContext";
import VendorRenewalModal from "./VendorRenewalModal";

export default function SubscriptionBanner() {
  const { subscription } = useSubscription();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const role = String(user?.role || "").toLowerCase();
  const isManagerOrAdmin = ["admin", "superadmin", "owner", "manager"].includes(role);
  if (!isManagerOrAdmin || dismissed) return null;

  const { status, daysRemaining, isGracePeriod, graceDaysRemaining, expiresAt } = subscription;

  if (status !== "warning" && status !== "grace" && !isGracePeriod) {
    return null;
  }

  const isGrace = status === "grace" || isGracePeriod;

  return (
    <>
      <div
        className={`print-hide w-full px-4 py-2 text-xs font-bold flex items-center justify-between border-b select-none ${
          isGrace
            ? "bg-rose-600 text-white border-rose-700"
            : "bg-amber-500 text-slate-950 border-amber-600"
        }`}
      >
        <div className="flex items-center gap-2">
          {isGrace ? <ShieldAlert size={16} className="animate-bounce" /> : <AlertTriangle size={16} />}
          <span>
            {isGrace ? (
              <>
                <b>Subscription Expired!</b> A 3-day grace period is active ({graceDaysRemaining} day{graceDaysRemaining === 1 ? "" : "s"} left). Please arrange monthly renewal immediately to avoid service interruption.
              </>
            ) : (
              <>
                <b>Monthly Subscription Due Soon:</b> {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining in this billing cycle (Renews {new Date(expiresAt).toLocaleDateString()}).
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition shadow-2xs ${
              isGrace ? "bg-white text-rose-700 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            Renew Now
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 hover:opacity-75 transition"
            title="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <VendorRenewalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
