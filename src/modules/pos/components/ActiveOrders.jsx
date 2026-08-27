import { useEffect, useState } from "react";
import { useRestaurant } from "../../../context/RestaurantContext";
import PaymentModal from "./PaymentModal";
import api from "../../../services/api";

function ActiveOrders() {
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [barOrders, setBarOrders] = useState([]);
  const [loadingBarOrders, setLoadingBarOrders] = useState(false);

  const {
    kitchenOrders,
    updateKitchenOrderStatus,
  } = useRestaurant();

  console.log("KITCHEN ORDERS:", kitchenOrders);
  console.log("BAR ORDERS:", barOrders);

  // ============================================================
  // FETCH BAR ORDERS
  // ============================================================

  const fetchBarOrders = async () => {
    try {
      setLoadingBarOrders(true);

      const response = await api("/bar/orders");

      console.log("BAR ORDERS RESPONSE:", response);

      setBarOrders(response.orders || []);
    } catch (error) {
      console.error("Failed to fetch bar orders:", error);
    } finally {
      setLoadingBarOrders(false);
    }
  };

  useEffect(() => {
    fetchBarOrders();

    // Refresh so waiter can see newly prepared drinks
    const interval = setInterval(() => {
      fetchBarOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // ACTIVE KITCHEN ORDERS
  // ============================================================

  const activeOrders = kitchenOrders.filter(
    (order) =>
      order.status !== "completed" &&
      order.status !== "cancelled" &&
      order.payment_status !== "paid"
  );

  // ============================================================
  // FIND BAR ORDER FOR RESTAURANT ORDER
  // ============================================================

  const getBarOrder = (order) => {
    return barOrders.find(
      (barOrder) =>
        Number(barOrder.order_id) === Number(order.order_id || order.id)
    );
  };

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700";

      case "confirmed":
        return "bg-indigo-50 text-indigo-700";

      case "preparing":
        return "bg-blue-50 text-blue-700";

      case "ready":
        return "bg-green-50 text-green-700";

      case "served":
        return "bg-purple-50 text-purple-700";

      case "completed":
        return "bg-gray-100 text-gray-600";

      case "cancelled":
        return "bg-red-50 text-red-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // ============================================================
  // STATUS LABEL
  // ============================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Confirmed";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "served":
        return "Served";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      default:
        return status;
    }
  };

  // ============================================================
  // SERVE FOOD
  // ============================================================

  const handleServeFood = async (order) => {
    try {
      await updateKitchenOrderStatus(order.id, "served");
    } catch (error) {
      console.error(
        "Failed to mark food as served:",
        error
      );
    }
  };

  // ============================================================
  // SERVE DRINKS
  // ============================================================

  const handleServeDrinks = async (barOrder) => {
    try {
      console.log(
        "Serving bar order:",
        barOrder.id
      );

      const response = await api(
        `/bar/orders/${barOrder.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: "served",
          }),
        }
      );

      console.log(
        "Bar order served:",
        response
      );

      // Update immediately in UI
      setBarOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === barOrder.id
            ? {
                ...order,
                status: "served",
              }
            : order
        )
      );
    } catch (error) {
      console.error(
        "Failed to mark drinks as served:",
        error
      );

      alert(
        error.message ||
          "Failed to mark drinks as served"
      );
    }
  };

  // ============================================================
  // PAYMENT SUCCESS
  // ============================================================

  const handlePaymentSuccess = (
    response,
    order
  ) => {
    console.log(
      "Payment completed:",
      response
    );

    setPaymentOrder(null);
  };

  // ============================================================
  // CHECK WHETHER EVERYTHING IS SERVED
  // ============================================================

  const isOrderFullyServed = (order) => {
    const barOrder = getBarOrder(order);

    const kitchenServed =
      order.status === "served" ||
      order.status === "completed";

    // If there is no bar order, only kitchen matters
    if (!barOrder) {
      return kitchenServed;
    }

    const drinksServed =
      barOrder.status === "served" ||
      barOrder.status === "completed";

    return kitchenServed && drinksServed;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="border-b border-gray-200 px-5 py-4">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-gray-900">
                Active Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Monitor kitchen and bar orders and serve customers.
              </p>
            </div>

            {activeOrders.some(
              (order) => {
                const barOrder = getBarOrder(order);

                return (
                  order.status === "ready" ||
                  barOrder?.status === "ready"
                );
              }
            ) && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Items Ready
              </span>
            )}

          </div>

        </div>

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {activeOrders.length === 0 ? (

          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No active orders.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">

                <tr>

                  <th className="px-5 py-4">
                    Order
                  </th>

                  <th className="px-5 py-4">
                    Table
                  </th>

                  <th className="px-5 py-4">
                    Items
                  </th>

                  <th className="px-5 py-4">
                    Kitchen
                  </th>

                  <th className="px-5 py-4">
                    Bar
                  </th>

                  <th className="px-5 py-4 text-right">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {activeOrders.map((order) => {

                  const barOrder =
                    getBarOrder(order);

                  const fullyServed =
                    isOrderFullyServed(order);

                  return (

                    <tr
                      key={order.id}
                      className="hover:bg-gray-50"
                    >

                      {/* =================================================
                          ORDER
                      ================================================= */}

                      <td className="px-5 py-4 font-semibold text-gray-900">

                        #{order.order_number}

                      </td>

                      {/* =================================================
                          TABLE
                      ================================================= */}

                      <td className="px-5 py-4 font-medium text-gray-900">

                        {order.table_number || "-"}

                      </td>

                      {/* =================================================
                          ITEMS
                      ================================================= */}

                      <td className="min-w-[220px] px-5 py-4">

                        <div className="space-y-1">

                          {(order.items || []).map(
                            (item) => (

                              <div
                                key={item.id}
                                className="flex justify-between gap-4"
                              >

                                <span className="text-gray-700">
                                  {item.product_name}
                                </span>

                                <span className="font-medium text-gray-900">
                                  × {item.quantity}
                                </span>

                              </div>

                            )
                          )}

                        </div>

                      </td>

                      {/* =================================================
                          KITCHEN STATUS
                      ================================================= */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(
                            order.status
                          )}
                        </span>

                      </td>

                      {/* =================================================
                          BAR STATUS
                      ================================================= */}

                      <td className="px-5 py-4">

                        {barOrder ? (

                          <div className="flex flex-col gap-2">

                            <span
                              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                                barOrder.status
                              )}`}
                            >
                              {getStatusLabel(
                                barOrder.status
                              )}
                            </span>

                            {barOrder.status ===
                              "ready" && (

                              <button
                                onClick={() =>
                                  handleServeDrinks(
                                    barOrder
                                  )
                                }
                                className="w-fit rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700"
                              >
                                Serve Drinks
                              </button>

                            )}

                          </div>

                        ) : (

                          <span className="text-xs text-gray-400">
                            No drinks
                          </span>

                        )}

                      </td>

                      {/* =================================================
                          ACTION
                      ================================================= */}

                      <td className="px-5 py-4 text-right">

                        {/* FOOD READY */}

                        {order.status ===
                          "ready" && (

                          <button
                            onClick={() =>
                              handleServeFood(
                                order
                              )
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Serve Food
                          </button>

                        )}

                        {/* FOOD STILL PREPARING */}

                        {order.status !==
                          "ready" &&
                          order.status !==
                            "served" &&
                          !fullyServed && (

                          <span className="text-xs text-gray-400">
                            Waiting...
                          </span>

                        )}

                        {/* EVERYTHING SERVED */}

                        {fullyServed && (

                          <button
                            onClick={() =>
                              setPaymentOrder({
                                ...order,
                                id:
                                  order.order_id ||
                                  order.id,
                              })
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Pay
                          </button>

                        )}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ============================================================
          PAYMENT MODAL
      ============================================================ */}

      {paymentOrder && (

        <PaymentModal
          order={paymentOrder}
          onClose={() =>
            setPaymentOrder(null)
          }
          onPaymentSuccess={(
            response
          ) =>
            handlePaymentSuccess(
              response,
              paymentOrder
            )
          }
        />

      )}

    </>
  );
}

export default ActiveOrders;