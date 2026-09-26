import React, { useState, useRef } from "react";
import { Trash2 } from "lucide-react";

/**
 * SwipeableNotificationItem
 * Supports smooth mobile horizontal swipe-to-dismiss (left swipe)
 * and desktop mouse-drag-to-dismiss, alongside click-to-navigate.
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
  const isHorizontalSwipeRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const pointerIdRef = useRef(null);
  const dragDistanceRef = useRef(0);

  const handlePointerDown = (e) => {
    // Only primary pointer (left mouse button or touch)
    if (e.button !== undefined && e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dragDistanceRef.current = 0;
    isHorizontalSwipeRef.current = null;
    isPointerDownRef.current = true;
    pointerIdRef.current = e.pointerId;
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    dragDistanceRef.current = Math.abs(diffX);

    // Detect gesture intent on first significant movement (> 6px)
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
        if (isHorizontalSwipeRef.current) {
          setIsSwiping(true);
          if (e.target && e.target.setPointerCapture && pointerIdRef.current !== null) {
            try {
              e.target.setPointerCapture(pointerIdRef.current);
            } catch {}
          }
        }
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Only allow swiping left (negative diffX)
      if (diffX < 0) {
        const dampened = Math.max(diffX, -160);
        setOffsetX(dampened);
      } else {
        setOffsetX(0);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsSwiping(false);

    if (e.target && e.target.releasePointerCapture && pointerIdRef.current !== null) {
      try {
        e.target.releasePointerCapture(pointerIdRef.current);
      } catch {}
    }
    pointerIdRef.current = null;

    // If swiped past threshold (-65px), trigger dismiss animation
    if (offsetX < -65) {
      setIsDismissed(true);
      setTimeout(() => {
        if (onDismiss) {
          onDismiss(notification.id);
        }
      }, 250);
    } else {
      setOffsetX(0);
    }
    isHorizontalSwipeRef.current = null;
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    setIsSwiping(false);
    setOffsetX(0);
    isHorizontalSwipeRef.current = null;
    pointerIdRef.current = null;
  };

  const handleItemClick = (e) => {
    // Prevent accidental click if user was dragging or swiping
    if (dragDistanceRef.current > 8 || Math.abs(offsetX) > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick();
  };

  const swipeProgress = Math.min(1, Math.abs(offsetX) / 70);

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isDismissed ? "max-h-0 opacity-0 -translate-x-full" : "max-h-40 opacity-100"
      }`}
    >
      {/* Background Action: Red dismiss / Trash bar */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
          setTimeout(() => {
            if (onDismiss) onDismiss(notification.id);
          }, 200);
        }}
        className="absolute inset-0 bg-rose-600 flex items-center justify-end px-5 text-white select-none transition-opacity duration-150 cursor-pointer"
        style={{ opacity: Math.max(swipeProgress, 0.25) }}
      >
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <span>Dismiss</span>
          <Trash2 className="h-4 w-4 shrink-0 animate-pulse" />
        </div>
      </div>

      {/* Foreground Swipeable Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleItemClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
          touchAction: "pan-y",
        }}
        className="relative z-10 w-full bg-white select-none cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
}
