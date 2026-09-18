import React, { useState, useRef } from "react";
import { Trash2 } from "lucide-react";

/**
 * SwipeableNotificationItem
 * Supports smooth mobile horizontal swipe-to-dismiss (left swipe)
 * and click-to-navigate.
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

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Detect gesture intent on first significant movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swiping
    if (isHorizontalSwipeRef.current) {
      // Only allow swiping left (negative diffX)
      if (diffX < 0) {
        // Apply resistance as user drags further
        const dampened = Math.max(diffX, -140);
        setOffsetX(dampened);
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // If swiped past threshold (-70px), trigger dismiss animation
    if (offsetX < -70) {
      setIsDismissed(true);
      setTimeout(() => {
        if (onDismiss) {
          onDismiss(notification.id);
        }
      }, 250);
    } else {
      // Snap back smoothly
      setOffsetX(0);
    }
    isHorizontalSwipeRef.current = null;
  };

  const handleItemClick = (e) => {
    // Prevent accidental click if user was swiping
    if (Math.abs(offsetX) > 10) {
      e.preventDefault();
      e.stopPropagation();
      setOffsetX(0);
      return;
    }
    if (onClick) onClick();
  };

  const swipeProgress = Math.min(1, Math.abs(offsetX) / 80);

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isDismissed ? "max-h-0 opacity-0 -translate-x-full" : "max-h-40 opacity-100"
      }`}
    >
      {/* Background Action: Red dismiss / Trash bar */}
      <div
        className="absolute inset-0 bg-rose-600 flex items-center justify-end px-5 text-white select-none transition-opacity duration-150"
        style={{ opacity: swipeProgress }}
      >
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <span>Dismiss</span>
          <Trash2 className="h-4 w-4 shrink-0 animate-pulse" />
        </div>
      </div>

      {/* Foreground Swipeable Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleItemClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
        className="relative z-10 w-full bg-white select-none touch-pan-y"
      >
        {children}
      </div>
    </div>
  );
}
