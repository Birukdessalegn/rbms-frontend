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
    <div className="fixed top-2 sm:top-4 inset-x-2.5 sm:inset-x-auto sm:right-4 z-50 max-w-sm mx-auto sm:mx-0 w-auto sm:w-88 animate-slide-in-right">
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className={`group relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r ${bgTheme} p-2.5 sm:p-3 shadow-lg shadow-slate-900/20 ring-1 ring-white/30 backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.98]`}
      >
        {/* Leading Icon */}
        <div
          className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} shadow-inner`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pr-5">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${badgeTheme}`}
            >
              Alert
            </span>
            <h4 className="text-xs sm:text-sm font-black leading-tight truncate">
              {activeToast.title}
            </h4>
          </div>

          <p className="text-[11px] sm:text-xs opacity-90 line-clamp-1 leading-snug mt-0.5">
            {activeToast.message}
          </p>

          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold underline decoration-white/40 underline-offset-2 group-hover:decoration-white">
            <span>Tap to open</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="absolute top-2 right-2 rounded-full p-1 text-white/75 hover:bg-white/20 hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Progress timer bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white/80 animate-toast-timer" />
        </div>
      </div>
    </div>
  );
}
