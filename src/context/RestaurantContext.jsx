import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../services/api";
import audioService from "../services/audioService";
import { useAuth } from "./AuthContext";

const RestaurantContext = createContext();


export function RestaurantProvider({ children }) {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loadingKitchen, setLoadingKitchen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  // Keep the previous backend state separately
  const previousOrdersRef = useRef(null);

  // Prevent duplicate notifications
  const notifiedOrdersRef = useRef(new Set());

  const dismissToast = () => {
    setActiveToast(null);
  };

  // ============================================================
  // ADD NOTIFICATION
  // ============================================================

  const addNotification = (notification) => {
    if (!user) return;
    const item = {
      id: Date.now() + Math.random(),
      ...notification,
      createdAt: new Date(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev]);
    setActiveToast(item);
  };


  // ============================================================
  // Fetch Tables
  // ============================================================
const fetchTables = async (silent = false) => {
  if (!user) return;
  try {
    if (!silent) setLoadingTables(true);
    const response = await api("/tables");
    const loadedTables =
      response.tables ||
      response.data?.tables ||
      response.data ||
      (Array.isArray(response) ? response : []);

    setTables(loadedTables);
  } catch (error) {
    console.error("Failed to fetch tables:", error);
  } finally {
    if (!silent) setLoadingTables(false);
  }
};

  // ============================================================
  // FETCH KITCHEN ORDERS
  // ============================================================

  const fetchKitchenOrders = async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoadingKitchen(true);

      const response = await api("/kitchen/orders");
      const loadedOrders =
        response.orders ||
        response.data?.orders ||
        response.data ||
        (Array.isArray(response) ? response : []);

      if (previousOrdersRef.current !== null) {
        const newOrders = loadedOrders.filter(
          (order) =>
            order.status === "pending" &&
            !previousOrdersRef.current.some(
              (prevOrder) => prevOrder.id === order.id
            )
        );

        newOrders.forEach((order) => {
          const key = `kitchen-sound-${order.id}`;

          if (!notifiedOrdersRef.current.has(key)) {
            notifiedOrdersRef.current.add(key);
            audioService.playNewOrderSound();

            addNotification({
              type: "new_order",
              title: "New Kitchen Order",
              message: `Order #${order.order_number || order.id} has arrived.`,
              orderId: order.id,
              orderNumber: order.order_number,
              tableNumber: order.table_number,
            });
          }
        });

        const readyOrders = loadedOrders.filter(
          (order) =>
            order.status === "ready" &&
            previousOrdersRef.current.some(
              (prevOrder) =>
                prevOrder.id === order.id &&
                prevOrder.status !== "ready"
            )
        );

        readyOrders.forEach((order) => {
          const key = `ready-sound-${order.id}`;

          if (!notifiedOrdersRef.current.has(key)) {
            notifiedOrdersRef.current.add(key);
            audioService.playReadyOrderSound();

            addNotification({
              type: "ready",
              title: "Order Ready",
              message: `Order #${order.order_number || order.id} is ready for pickup.`,
              orderId: order.id,
              orderNumber: order.order_number,
              tableNumber: order.table_number,
            });
          }
        });
      }

      previousOrdersRef.current = loadedOrders;
      setKitchenOrders(loadedOrders);
    } catch (error) {
      console.error(
        "Failed to fetch kitchen orders:",
        error
      );
    } finally {
      if (!silent) setLoadingKitchen(false);
    }
  };

  // ============================================================
  // FETCH BACKEND NOTIFICATIONS (LOW STOCK, TRANSFERS, ETC.)
  // ============================================================

  const fetchBackendNotifications = async () => {
    if (!user) return;
    try {
      const response = await api("/notifications?limit=25");
      const list = response?.notifications || response?.data || (Array.isArray(response) ? response : []);
      if (Array.isArray(list)) {
        const newlyReceivedUnread = [];

        list.forEach((n) => {
          const key = `backend-toast-${n.id}`;
          if (!n.is_read && !notifiedOrdersRef.current.has(key)) {
            notifiedOrdersRef.current.add(key);
            newlyReceivedUnread.push(n);

            if (n.type === "warning" || n.reference_type?.includes("stock")) {
              audioService.playWarningSound();
            }
          }
        });

        // Trigger floating toast for the latest unread alert only when logged in
        if (newlyReceivedUnread.length > 0) {
          const latest = newlyReceivedUnread[0];
          setActiveToast({
            id: `backend-${latest.id}`,
            backendId: latest.id,
            type: latest.type || "info",
            title: latest.title,
            message: latest.message,
            referenceType: latest.reference_type,
            referenceId: latest.reference_id,
            createdAt: new Date(latest.created_at || Date.now()),
          });
        }

        setNotifications((prev) => {
          // Retain local transient kitchen order chimes
          const localOnly = prev.filter((p) => !String(p.id).startsWith("backend-"));
          const backendMapped = list.map((n) => ({
            id: `backend-${n.id}`,
            backendId: n.id,
            type: n.type || "info",
            title: n.title,
            message: n.message,
            read: Boolean(n.is_read),
            referenceType: n.reference_type,
            referenceId: n.reference_id,
            createdAt: new Date(n.created_at || Date.now()),
          }));
          return [...localOnly, ...backendMapped];
        });
      }
    } catch (err) {
      // Quiet fail if not logged in or endpoint unavailable
    }
  };

  // ============================================================
  // INITIAL LOAD + POLLING (AUTHENTICATED USERS ONLY)
  // ============================================================

  useEffect(() => {
    // If not logged in, reset states and do not poll
    if (!user) {
      setNotifications([]);
      setActiveToast(null);
      setKitchenOrders([]);
      setTables([]);
      return;
    }

    fetchKitchenOrders();
    fetchTables();
    fetchBackendNotifications();

    const interval = setInterval(() => {
      fetchKitchenOrders();
      fetchTables();
      fetchBackendNotifications();
    }, 8000);

    return () => clearInterval(interval);
  }, [user]);

  // ============================================================
  // SEND ORDER TO KITCHEN
  // ============================================================

  const sendToKitchen = async () => {
    try {
      await fetchKitchenOrders();
    } catch (error) {
      console.error(
        "Failed to send order to kitchen:",
        error
      );

      throw error;
    }
  };

  // ============================================================
  // UPDATE KITCHEN ORDER STATUS
  // ============================================================

  const updateKitchenOrderStatus = async (
    orderId,
    status
  ) => {
    try {
      const response = await api(
        `/kitchen/${orderId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
          }),
        }
      );

      // Update local kitchen order
      setKitchenOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                ...response.order,
              }
            : order
        )
      );

      /*
       * IMPORTANT:
       *
       * We do NOT update previousOrdersRef here.
       *
       * The next polling request must compare the
       * previous backend state with the new backend state.
       */

      return response;
    } catch (error) {
      console.error(
        "Failed to update kitchen order status:",
        error
      );

      throw error;
    }
  };

  // ============================================================
  // NOTIFICATION FUNCTIONS
  // ============================================================

  const markNotificationAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification
      )
    );

    setActiveToast((current) => (current?.id === id ? null : current));

    if (String(id).startsWith("backend-")) {
      const realId = id.replace("backend-", "");
      api(`/notifications/${realId}/read`, { method: "PATCH" }).catch(() => {});
    }
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setActiveToast((current) => (current?.id === id ? null : current));
    if (String(id).startsWith("backend-")) {
      const realId = id.replace("backend-", "");
      api(`/notifications/${realId}/read`, { method: "PATCH" }).catch(() => {});
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setActiveToast(null);
    api("/notifications/read-all", { method: "PATCH" }).catch(() => {});
  };

  // ============================================================
  // PROVIDER
  // ============================================================

  return (
    <RestaurantContext.Provider
  value={{
    kitchenOrders,
    loadingKitchen,
    fetchKitchenOrders,

    tables,
    loadingTables,
    fetchTables,

    sendToKitchen,
    updateKitchenOrderStatus,

    notifications,
    activeToast,
    dismissToast,
    markNotificationAsRead,
    removeNotification,
    clearNotifications,
  }}
>
      {children}
    </RestaurantContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useRestaurant() {
  return useContext(RestaurantContext);
}