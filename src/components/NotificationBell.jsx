import { Bell, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "../context/RestaurantContext";
import { useAuth } from "../context/AuthContext";
import { getNotificationRoute } from "../utils/notificationRouter";
import SwipeableNotificationItem from "./SwipeableNotificationItem";

function NotificationBell() {
  const {
    notifications,
    markNotificationAsRead,
    removeNotification,
    clearNotifications,
  } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const panelTouchStartY = useRef(0);

  const handlePanelTouchStart = (e) => {
    panelTouchStartY.current = e.touches[0].clientY;
  };

  const handlePanelTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diffY = endY - panelTouchStartY.current;
    if (Math.abs(diffY) > 45) {
      setOpen(false);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id);
    setOpen(false);
    const targetRoute = getNotificationRoute(notification, user?.role);
    navigate(targetRoute);
  };

  return (
    <div className="relative">

      {/* Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <div
          onTouchStart={handlePanelTouchStart}
          onTouchEnd={handlePanelTouchEnd}
          className="fixed inset-x-2 top-14 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 max-w-sm mx-auto sm:mx-0 z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-fade-in"
        >
          {/* Mobile Drag / Swipe Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing bg-gray-50 border-b border-gray-100">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
            <span className="text-[9px] text-gray-400 mt-0.5 font-medium tracking-tight">Swipe up or down to close</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                Notifications
              </h3>
              <p className="text-xs text-gray-500">
                {unreadCount} unread &bull; <span className="text-gray-400">Swipe left to dismiss</span>
              </p>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const isWarning =
                  notification.type === "warning" ||
                  notification.referenceType?.includes("stock") ||
                  notification.referenceType?.includes("shortage");
                const isReady = notification.type === "ready";
                const isError = notification.type === "error";

                return (
                  <SwipeableNotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onDismiss={(id) => removeNotification(id)}
                  >
                    <div
                      className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 cursor-pointer ${
                        !notification.read
                          ? isWarning
                            ? "bg-amber-50/60"
                            : isReady
                            ? "bg-emerald-50/50"
                            : "bg-blue-50/50"
                          : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            isReady
                              ? "bg-emerald-500"
                              : isWarning
                              ? "bg-amber-500 ring-2 ring-amber-200"
                              : isError
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                        />

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${
                              isWarning ? "text-amber-900" : isReady ? "text-emerald-950" : "text-gray-900"
                            }`}>
                              {isWarning && "⚠️ "}
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-gray-600 leading-snug">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SwipeableNotificationItem>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationBell;