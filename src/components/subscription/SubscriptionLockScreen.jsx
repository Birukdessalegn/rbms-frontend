import { useState } from "react";
import { ShieldAlert, Phone, Mail, Lock, RefreshCw, KeyRound, Building2 } from "lucide-react";
import { useSubscription } from "../../context/SubscriptionContext";
import VendorRenewalModal from "./VendorRenewalModal";

export default function SubscriptionLockScreen() {
  const { subscription, refresh } = useSubscription();
  const [modalOpen, setModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-rose-600/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg text-center space-y-6">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-300 ring-1 ring-white/15 backdrop-blur-md">
          <Building2 size={14} />
          <span>{subscription.clientName || "The Oak Club"} • RBMS</span>
        </div>

        {/* Lock Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/30 shadow-2xl">
          <ShieldAlert size={40} className="animate-pulse" />
        </div>

        {/* Heading & description */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Service Suspended
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The monthly subscription cycle for this establishment has concluded and the 3-day grace period has expired.
          </p>
        </div>

        {/* Notice Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-xs space-y-2 backdrop-blur-md">
          <div className="flex justify-between items-center text-slate-400">
            <span>Establishment:</span>
            <span className="font-bold text-white">{subscription.clientName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Billing Status:</span>
            <span className="font-bold text-rose-400 uppercase tracking-wider">Expired / Suspended</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Expired On:</span>
            <span className="font-bold text-slate-200">
              {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "N/A"}
            </span>
          </div>
        </div>

        {/* Support contact options */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-slate-400">To settle payment and reactivate service immediately:</p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-1 font-bold">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Phone size={13} className="text-emerald-400" /> +251 91 123 4567
            </span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <Mail size={13} className="text-sky-400" /> support@ambbatech.com
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> Check Status
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <KeyRound size={14} /> Vendor Unlock
          </button>
        </div>
      </div>

      <VendorRenewalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
