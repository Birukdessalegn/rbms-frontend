import { Bell } from "lucide-react";
import { useState } from "react";
import { useRestaurant } from "../context/RestaurantContext";

function NotificationBell() {
  const {
    notifications,
    markNotificationAsRead,
    clearNotifications,
  } = useRestaurant();

  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id);
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
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">

            <div>
              <h3 className="font-semibold text-gray-900">
                Notifications
              </h3>

              <p className="text-xs text-gray-500">
                {unreadCount} unread
              </p>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}

          </div>

          {/* Notifications */}
          <div className="max-h-96 overflow-y-auto">

            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (

                <button
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                    !notification.read
                      ? "bg-blue-50/50"
                      : ""
                  }`}
                >

                  <div className="flex gap-3">

                    <div
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.type === "ready"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                    />

                    <div>

                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {notification.message}
                      </p>

                    </div>

                  </div>

                </button>

              ))
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationBell;