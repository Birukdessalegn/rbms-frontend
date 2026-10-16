import { useState } from "react";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { useSubscription } from "../../context/SubscriptionContext";
import { useAuth } from "../../context/AuthContext";
import VendorRenewalModal from "./VendorRenewalModal";

export default function SubscriptionBadge() {
  const { subscription } = useSubscription();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Only show badge to Admins, Owners, or Managers
  const role = String(user?.role || "").toLowerCase();
  const isManagerOrAdmin = ["admin", "superadmin", "owner", "manager"].includes(role);
  if (!isManagerOrAdmin) return null;

  const { status, daysRemaining, isGracePeriod, graceDaysRemaining } = subscription;

  let badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
  let dotColor = "bg-emerald-500";
  let label = `${daysRemaining}d Active`;

  if (status === "warning") {
    badgeClasses = "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
    dotColor = "bg-amber-500";
    label = `${daysRemaining}d Left • Due Soon`;
  } else if (status === "grace" || isGracePeriod) {
    badgeClasses = "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 animate-pulse";
    dotColor = "bg-rose-600";
    label = `Grace: ${graceDaysRemaining}d Left`;
  } else if (status === "expired") {
    badgeClasses = "bg-red-100 text-red-800 border-red-300";
    dotColor = "bg-red-600";
    label = "Subscription Expired";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs transition cursor-pointer select-none ${badgeClasses}`}
        title="Monthly Subscription Status - Click to manage or renew"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span>{label}</span>
      </button>

      <VendorRenewalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
