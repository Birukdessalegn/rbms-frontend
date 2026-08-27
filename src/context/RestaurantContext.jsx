import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../services/api";
import audioService from "../services/audioService";

const RestaurantContext = createContext();


export function RestaurantProvider({ children }) {
const [tables, setTables] = useState([]);
const [loadingTables, setLoadingTables] = useState(false);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loadingKitchen, setLoadingKitchen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  // Keep the previous backend state separately
  const previousOrdersRef = useRef(null);

  // Prevent duplicate notifications
  const notifiedOrdersRef = useRef(new Set());

  // ============================================================
  // ADD NOTIFICATION
  // ============================================================

  const addNotification = (notification) => {
    setNotifications((prev) => [
      {
        id: Date.now() + Math.random(),
        ...notification,
        createdAt: new Date(),
        read: false,
      },
      ...prev,
    ]);
  };


  // ============================================================
  // Fetch Tables
  // ============================================================
const fetchTables = async () => {
  try {
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
    setLoadingTables(false);
  }
};

  // ============================================================
  // FETCH KITCHEN ORDERS
  // ============================================================

  const fetchKitchenOrders = async () => {
    try {
      setLoadingKitchen(true);

      const response = await api("/kitchen");

      const orders = response.orders || [];

      const previousOrders = previousOrdersRef.current;

      // ========================================================
      // FIRST LOAD
      // ========================================================

      if (previousOrders === null) {
        previousOrdersRef.current = orders;
        setKitchenOrders(orders);
        return;
      }

      // ========================================================
      // CHECK FOR CHANGES
      // ========================================================

      orders.forEach((order) => {
        const previousOrder = previousOrders.find(
          (item) => item.id === order.id
        );

        // ------------------------------------------------------
        // NEW KITCHEN ORDER
        // ------------------------------------------------------

        if (!previousOrder) {
          const notificationKey = `new-${order.id}`;

          if (!notifiedOrdersRef.current.has(notificationKey)) {
            notifiedOrdersRef.current.add(notificationKey);

            audioService.playNewOrderSound();

            addNotification({
              type: "new_order",
              title: "New Kitchen Order",
              message: `${order.order_number} received${
                order.table_number
                  ? ` for ${order.table_number}`
                  : ""
              }`,
              orderId: order.id,
            });
          }
        }

        // ------------------------------------------------------
        // ORDER BECAME READY
        // ------------------------------------------------------

        if (
          previousOrder &&
          previousOrder.status !== "ready" &&
          order.status === "ready"
        ) {
          const notificationKey = `ready-${order.id}`;

          if (!notifiedOrdersRef.current.has(notificationKey)) {
            notifiedOrdersRef.current.add(notificationKey);

            audioService.playOrderReadySound();

            addNotification({
              type: "ready",
              title: "Order Ready",
              message: `${order.order_number} is ready${
                order.table_number
                  ? ` for ${order.table_number}`
                  : ""
              }`,
              orderId: order.id,
            });
          }
        }
      });

      // Update previous backend state
      previousOrdersRef.current = orders;

      // Update UI
      setKitchenOrders(orders);
    } catch (error) {
      console.error(
        "Failed to fetch kitchen orders:",
        error
      );
    } finally {
      setLoadingKitchen(false);
    }
  };

  // ============================================================
  // INITIAL LOAD + POLLING
  // ============================================================

    useEffect(() => {
       fetchKitchenOrders();
      fetchTables();

  const interval = setInterval(() => {
    fetchKitchenOrders();
    fetchTables();
  }, 5000);

  return () => clearInterval(interval);
}, []);

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
  };

  const clearNotifications = () => {
    setNotifications([]);
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
    markNotificationAsRead,
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