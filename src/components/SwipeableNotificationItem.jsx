import React, { useState, useRef, useCallback } from "react";
import { Trash2, X } from "lucide-react";

/**
 * SwipeableNotificationItem
 * Supports smooth mobile touch swipe-to-dismiss (left swipe),
 * desktop mouse drag-to-dismiss, and instant 1-click dismiss button.
 */
export default function SwipeableNotificationItem({
  notification,
  onClick,
  onDismiss,
  children,
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const cardRef = useRef(null);

  // Trigger smooth dismiss animation and notify parent
  const triggerDismiss = useCallback(() => {
    setIsDismissed(true);
    setOffsetX(-350);
    setTimeout(() => {
      if (onDismiss) {
        onDismiss(notification.id);
      }
    }, 280);
  }, [notification.id, onDismiss]);

  // ============================================================
  // TOUCH EVENTS (MOBILE PHONES / TABLETS)
  // ============================================================
  const handleTouchStart = (e) => {
    if (isDismissed) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isHorizontalRef.current = null;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || isDismissed) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    currentXRef.current = touch.clientX;
    dragDistanceRef.current = Math.abs(diffX);

    // Determine direction on first significant movement (> 8px)
    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalRef.current) {
      // Swiping horizontally: prevent page scroll & stop parent from closing
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      setIsSwiping(true);

      // Only allow swiping left (negative diffX)
      if (diffX < 0) {
        const dampened = Math.max(diffX, -180);
        setOffsetX(dampened);
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsSwiping(false);

    if (isHorizontalRef.current) {
      e.stopPropagation();
      // Past -60px threshold -> dismiss
      if (offsetX < -60) {
        triggerDismiss();
      } else {
        setOffsetX(0);
      }
    } else {
      setOffsetX(0);
    }
    isHorizontalRef.current = null;
  };

  // ============================================================
  // MOUSE DRAG EVENTS (DESKTOP)
  // ============================================================
  const handleMouseDown = (e) => {
    if (e.button !== 0 || isDismissed) return; // Left click only
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    setIsSwiping(true);

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const diffX = moveEvent.clientX - startXRef.current;
      dragDistanceRef.current = Math.abs(diffX);

      if (diffX < 0) {
        const dampened = Math.max(diffX, -180);
        setOffsetX(dampened);
      } else {
        setOffsetX(0);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsSwiping(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      setOffsetX((prev) => {
        if (prev < -60) {
          triggerDismiss();
          return -350;
        }
        return 0;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // ============================================================
  // CLICK HANDLER
  // ============================================================
  const handleClick = (e) => {
    // If user dragged more than 8px, cancel the click navigation
    if (dragDistanceRef.current > 8 || Math.abs(offsetX) > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick();
  };

  const swipeProgress = Math.min(1, Math.abs(offsetX) / 75);

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isDismissed ? "max-h-0 opacity-0 -translate-x-full" : "max-h-40 opacity-100"
      }`}
    >
      {/* Background Action: Red dismiss bar */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          triggerDismiss();
        }}
        className="absolute inset-0 bg-rose-600 flex items-center justify-end px-5 text-white select-none transition-opacity duration-150 cursor-pointer"
        style={{ opacity: Math.max(swipeProgress, 0.4) }}
      >
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <span>Dismiss</span>
          <Trash2 className="h-4 w-4 shrink-0 animate-pulse" />
        </div>
      </div>

      {/* Foreground Swipeable Card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
          touchAction: "pan-y",
        }}
        className="relative z-10 w-full bg-white select-none cursor-pointer group"
      >
        {children}

        {/* Quick 1-click dismiss button on hover (desktop) or touch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerDismiss();
          }}
          className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
          title="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
