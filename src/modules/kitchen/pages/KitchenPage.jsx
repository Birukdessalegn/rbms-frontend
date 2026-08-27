import { useEffect, useState } from "react";
import api from "../../../services/api";

function KitchenPage() {
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchKitchenOrders = async () => {
    try {
      setError("");

      const response = await api("/kitchen");

      setKitchenOrders(response.orders || []);
    } catch (error) {
      console.error("Failed to fetch kitchen orders:", error);
      setError(error.message || "Failed to load kitchen orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
  }, []);

  const handleAction = async (order) => {
    let nextStatus;

    if (order.status === "pending") {
      nextStatus = "preparing";
    } else if (order.status === "preparing") {
      nextStatus = "ready";
    } else {
      return;
    }

    try {
      setError("");

      await api(`/kitchen/${order.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      await fetchKitchenOrders();
    } catch (error) {
      console.error("Failed to update kitchen order:", error);

      setError(
        error.message || "Failed to update kitchen order"
      );
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700";

      case "preparing":
        return "bg-blue-50 text-blue-700";

      case "ready":
        return "bg-green-50 text-green-700";

      case "completed":
        return "bg-gray-100 text-gray-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "completed":
        return "Completed";

      default:
        return status;
    }
  };

  const getActionText = (status) => {
    switch (status) {
      case "pending":
        return "Start Preparing";

      case "preparing":
        return "Mark Ready";

      default:
        return "Completed";
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        Loading kitchen orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Kitchen
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage kitchen orders and food preparation.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            New Orders
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "pending"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Preparing
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "preparing"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Ready
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "ready"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Total Orders
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {kitchenOrders.length}
          </p>
        </div>

      </div>

      {/* Orders */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Kitchen Orders
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Orders sent from the POS system.
          </p>
        </div>

        {kitchenOrders.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-gray-400">
            No kitchen orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Table</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {[...kitchenOrders]
                  .sort((a, b) => {
                    if (
                      a.status === "pending" &&
                      b.status !== "pending"
                    ) {
                      return -1;
                    }

                    if (
                      a.status !== "pending" &&
                      b.status === "pending"
                    ) {
                      return 1;
                    }

                    return b.id - a.id;
                  })
                  .map((order) => (

                    <tr
                      key={order.id}
                      className="hover:bg-gray-50"
                    >

                      {/* Order */}
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        #{order.order_number}
                      </td>

                      {/* Table */}
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {order.table_number || "-"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-gray-600">
                        {order.order_type || "-"}
                      </td>

                      {/* Items */}
                      <td className="min-w-[250px] px-5 py-4">

                        <div className="space-y-1">

                          {(order.items || []).map((item) => (
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
                          ))}

                        </div>

                      </td>

                      {/* Time */}
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">

                        {order.status === "ready" ||
                        order.status === "completed" ? (
                          <span className="text-xs font-medium text-gray-400">
                            {getStatusLabel(order.status)}
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleAction(order)
                            }
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            {getActionText(order.status)}
                          </button>
                        )}

                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default KitchenPage;