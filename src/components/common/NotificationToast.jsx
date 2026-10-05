import { useEffect, useState, useRef, useCallback } from "react";
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

  // Gesture State
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  // Trigger smooth fling dismiss
  const triggerDismiss = useCallback((direction = "right") => {
    setIsDismissing(true);
    if (direction === "up") {
      setOffsetY(-120);
    } else if (direction === "left") {
      setOffsetX(-400);
    } else {
      setOffsetX(400);
    }

    setTimeout(() => {
      dismissToast();
      setIsDismissing(false);
      setOffsetX(0);
      setOffsetY(0);
    }, 220);
  }, [dismissToast]);

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (!activeToast || !user) return;
    const timer = setTimeout(() => {
      triggerDismiss("right");
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast, user, triggerDismiss]);

  // Never render notifications on login page or when user is not logged in
  const isLoginPage = typeof window !== "undefined" && window.location.pathname.includes("/login");
  if (!user || !activeToast || isLoginPage) return null;

  const targetRoute = getNotificationRoute(activeToast, user?.role);

  // ============================================================
  // TOUCH GESTURES (MOBILE / TABLET)
  // ============================================================
  const handleTouchStart = (e) => {
    if (isDismissing) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    currentYRef.current = touch.clientY;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || isDismissing) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    currentXRef.current = touch.clientX;
    currentYRef.current = touch.clientY;
    dragDistanceRef.current = Math.hypot(diffX, diffY);

    if (dragDistanceRef.current > 8) {
      setIsSwiping(true);
      if (e.cancelable) e.preventDefault();

      // Swipe UP: only allow upward movement (negative diffY)
      if (diffY < -10 && Math.abs(diffY) > Math.abs(diffX)) {
        setOffsetY(diffY);
        setOffsetX(0);
      } else {
        // Horizontal swipe (left or right)
        setOffsetX(diffX);
        setOffsetY(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsSwiping(false);

    // If swiped UP past threshold -> dismiss up
    if (offsetY < -45) {
      triggerDismiss("up");
      return;
    }

    // If swiped horizontally past threshold -> dismiss left or right
    if (offsetX > 60) {
      triggerDismiss("right");
      return;
    }
    if (offsetX < -60) {
      triggerDismiss("left");
      return;
    }

    // Snap back
    setOffsetX(0);
    setOffsetY(0);
  };

  // ============================================================
  // MOUSE DRAG GESTURES (DESKTOP)
  // ============================================================
  const handleMouseDown = (e) => {
    if (e.button !== 0 || isDismissing) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const diffX = moveEvent.clientX - startXRef.current;
      const diffY = moveEvent.clientY - startYRef.current;
      dragDistanceRef.current = Math.hypot(diffX, diffY);

      if (dragDistanceRef.current > 6) {
        setIsSwiping(true);
        if (diffY < -10 && Math.abs(diffY) > Math.abs(diffX)) {
          setOffsetY(diffY);
          setOffsetX(0);
        } else {
          setOffsetX(diffX);
          setOffsetY(0);
        }
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsSwiping(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      setOffsetY((prevY) => {
        if (prevY < -45) {
          triggerDismiss("up");
          return -120;
        }
        return 0;
      });

      setOffsetX((prevX) => {
        if (prevX > 60) {
          triggerDismiss("right");
          return 400;
        }
        if (prevX < -60) {
          triggerDismiss("left");
          return -400;
        }
        return 0;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleClick = (e) => {
    // If the user was swiping/dragging, cancel navigation!
    if (dragDistanceRef.current > 8 || Math.abs(offsetX) > 8 || Math.abs(offsetY) > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    if (activeToast.id) {
      markNotificationAsRead(activeToast.id);
    }
    dismissToast();
    navigate(targetRoute);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    triggerDismiss("right");
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

  // Calculate dynamic opacity during swipe
  const dragMagnitude = Math.hypot(offsetX, offsetY);
  const opacity = Math.max(0, 1 - dragMagnitude / 180);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
        opacity: isDismissing ? 0 : opacity,
        transition: isSwiping
          ? "none"
          : "transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.22s ease-out",
        touchAction: "none",
      }}
      className="fixed top-2 sm:top-4 inset-x-2.5 sm:inset-x-auto sm:right-4 z-50 max-w-sm mx-auto sm:mx-0 w-auto sm:w-88 select-none cursor-grab active:cursor-grabbing"
    >
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r ${bgTheme} p-2.5 sm:p-3 shadow-xl shadow-slate-900/25 ring-1 ring-white/30 backdrop-blur-md transition-transform hover:scale-[1.01]`}
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
            <span>Tap to open • Swipe to dismiss</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="absolute top-2 right-2 rounded-full p-1 text-white/75 hover:bg-white/20 hover:text-white transition cursor-pointer"
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
