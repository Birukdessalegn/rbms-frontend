import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Bell,
  X,
  ArrowRight,
  Package,
} from "lucide-react";
import { useRestaurant } from "../../context/RestaurantContext";
import { useAuth } from "../../context/AuthContext";
import { getNotificationRoute } from "../../utils/notificationRouter";

export default function NotificationToast() {
  const { activeToast, dismissToast, markNotificationAsRead } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const targetRoute = getNotificationRoute(activeToast, user?.role);

  const handleClick = (e) => {
    e.preventDefault();
    if (activeToast.id) {
      markNotificationAsRead(activeToast.id);
    }
    dismissToast();
    navigate(targetRoute);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    dismissToast();
  };

  // Determine icon & color theme
  const refType = String(
    activeToast.referenceType || activeToast.reference_type || ""
  ).toLowerCase();
  const title = String(activeToast.title || "").toLowerCase();
  const type = String(activeToast.type || "").toLowerCase();

  let Icon = Bell;
  let bgTheme = "from-blue-600 to-indigo-700 text-white";
  let badgeTheme = "bg-white/20 text-white";
  let iconBg = "bg-white/20 text-white";

  if (
    refType === "transfer" ||
    title.includes("transfer") ||
    title.includes("delivery") ||
    title.includes("restock")
  ) {
    Icon = Truck;
    bgTheme = "from-amber-500 to-orange-600 text-white";
    badgeTheme = "bg-white/25 text-white";
    iconBg = "bg-white/25 text-white";
  } else if (
    refType.includes("stock") ||
    title.includes("low stock") ||
    type === "warning"
  ) {
    Icon = AlertTriangle;
    bgTheme = "from-rose-500 to-amber-600 text-white";
    badgeTheme = "bg-white/25 text-white";
    iconBg = "bg-white/25 text-white";
  } else if (type === "ready" || title.includes("ready")) {
    Icon = CheckCircle2;
    bgTheme = "from-emerald-500 to-teal-700 text-white";
    badgeTheme = "bg-white/25 text-white";
    iconBg = "bg-white/25 text-white";
  } else if (type === "new_order" || title.includes("kitchen")) {
    Icon = Flame;
    bgTheme = "from-orange-500 to-red-600 text-white";
    badgeTheme = "bg-white/25 text-white";
    iconBg = "bg-white/25 text-white";
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-slide-in-right">
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-2xl bg-gradient-to-r ${bgTheme} p-4 shadow-xl shadow-slate-900/20 ring-1 ring-white/30 backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98]`}
      >
        {/* Leading Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-inner`}
        >
          <Icon className="h-5 w-5 animate-pulse" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeTheme}`}
            >
              New Alert
            </span>
            <span className="text-[10px] opacity-80">Just now</span>
          </div>

          <h4 className="mt-1 text-sm font-black leading-tight tracking-tight">
            {activeToast.title}
          </h4>

          <p className="mt-1 text-xs opacity-90 line-clamp-2 leading-relaxed">
            {activeToast.message}
          </p>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold underline decoration-white/50 underline-offset-2 group-hover:decoration-white">
            <span>Tap to open & accept</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="absolute top-3 right-3 rounded-full p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress timer bar */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white/80 animate-toast-timer" />
        </div>
      </div>
    </div>
  );
}
