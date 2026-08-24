import { createContext, useContext, useState } from "react";

const RestaurantContext = createContext();

export function RestaurantProvider({ children }) {


    const updateKitchenOrderStatus = (orderId, status) => {
        setKitchenOrders((prevOrders) =>
            prevOrders.map((order) =>
            order.id === orderId
                ? { ...order, status }
                : order
            )
  );
};
  const [kitchenOrders, setKitchenOrders] = useState([]);

  const sendToKitchen = (order) => {
    const kitchenOrder = {
      id: Date.now(),
      table: order.table,
      type: order.type,
      items: order.items,
      status: "Pending",
      time: "Just now",
    };

    setKitchenOrders((prevOrders) => [
      ...prevOrders,
      kitchenOrder,
    ]);
  };

  return (
    <RestaurantContext.Provider
        value={{
            kitchenOrders,
            sendToKitchen,
            updateKitchenOrderStatus,
        }}
    >   
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}