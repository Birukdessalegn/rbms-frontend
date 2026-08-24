import { useRestaurant } from "../../../context/RestaurantContext";

function KitchenPage() {
  const { kitchenOrders, updateKitchenOrderStatus } = useRestaurant();

  const handleAction = (order) => {
    if (order.status === "Pending") {
      updateKitchenOrderStatus(order.id, "Preparing");
    } else if (order.status === "Preparing") {
      updateKitchenOrderStatus(order.id, "Ready");
    } else if (order.status === "Ready") {
      updateKitchenOrderStatus(order.id, "Completed");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-50 text-yellow-700";

      case "Preparing":
        return "bg-blue-50 text-blue-700";

      case "Ready":
        return "bg-green-50 text-green-700";

      case "Completed":
        return "bg-gray-100 text-gray-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getActionText = (status) => {
    switch (status) {
      case "Pending":
        return "Start Preparing";

      case "Preparing":
        return "Mark Ready";

      case "Ready":
        return "Complete";

      default:
        return "Completed";
    }
  };

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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            New Orders
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {
              kitchenOrders.filter(
                (order) => order.status === "Pending"
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
                (order) => order.status === "Preparing"
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
                (order) => order.status === "Ready"
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
                  <th className="px-5 py-4">
                    Order
                  </th>

                  <th className="px-5 py-4">
                    Table
                  </th>

                  <th className="px-5 py-4">
                    Type
                  </th>

                  <th className="px-5 py-4">
                    Items
                  </th>

                  <th className="px-5 py-4">
                    Time
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {[...kitchenOrders]
                    .sort((a, b) => {
                        if (a.status === "Pending" && b.status !== "Pending") return -1;
                        if (a.status !== "Pending" && b.status === "Pending") return 1;
                        return b.id - a.id;
                    })
  .map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50"
                  >

                    {/* Order */}
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      #{order.id}
                    </td>

                    {/* Table */}
                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-900">
                        {order.table}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4 text-gray-600">
                      {order.type}
                    </td>

                    {/* Items */}
                    <td className="min-w-[250px] px-5 py-4">

                      <div className="space-y-1">

                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between gap-4"
                          >
                            <span className="text-gray-700">
                              {item.name}
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
                      {order.time}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>

                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">

                      {order.status === "Completed" ? (
                        <span className="text-xs font-medium text-gray-400">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAction(order)}
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