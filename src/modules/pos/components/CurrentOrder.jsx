import OrderItem from "./OrderItem";

function CurrentOrder({
  orderItems = [],
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onSendToKitchen,
  selectedTable,
  orderType,
})
 {
  const total = orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const vat = total * (15 / 115);
  const netSubtotal = total - vat;

    return (
      <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Current Order
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {selectedTable ? `Table ${selectedTable}` : "No Table Selected"}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {orderType}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">

          {orderItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center">
              <div>
                <p className="text-gray-500">
                  No items in the order
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Click a product to add it.
                </p>
              </div>
            </div>
          ) : (
            orderItems.map((item) => (
              <OrderItem
                key={item.id}
                item={item}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onRemove={onRemove}
              />
            ))
          )}

        </div>

        <div className="border-t border-gray-200 p-5">

          <div className="space-y-3 text-sm">

            <div className="flex justify-between text-gray-600">
              <span>Subtotal (Excl. VAT)</span>
              <span>{netSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
            </div>

            <div className="flex justify-between text-gray-600 text-xs">
              <span>VAT (15% Included)</span>
              <span>{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">
                  Total (Incl. VAT)
                </span>
                <span className="text-xl font-bold text-blue-600">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
            </div>

          </div>

          <div className="mt-5">
            <button
              onClick={onClear}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Clear Order
            </button>
          </div>

          <button
            onClick={onSendToKitchen}
            disabled={orderItems.length === 0}
            className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send to Kitchen
          </button>

        </div>
      </div>
    );
  }

  export default CurrentOrder;