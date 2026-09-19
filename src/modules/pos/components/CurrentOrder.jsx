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
      <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-200">

        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Current Order
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                {selectedTable ? `Table ${selectedTable}` : "No Table Selected"}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              {orderType}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 overflow-y-auto max-h-[46vh] p-4 transition-all duration-200">

          {orderItems.length === 0 ? (
            <div className="py-5 text-center">
              <p className="text-xs font-semibold text-gray-500">
                No items in the order
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                Click a product to add it.
              </p>
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

        <div className="border-t border-gray-200 bg-gray-50/50 p-4 sm:p-5">

          <div className="space-y-2 text-xs sm:text-sm">

            <div className="flex justify-between text-gray-600">
              <span>Subtotal (Excl. VAT)</span>
              <span className="font-medium">{netSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
            </div>

            <div className="flex justify-between text-gray-500 text-xs">
              <span>VAT (15% Included)</span>
              <span className="font-medium">{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
            </div>

            <div className="border-t border-gray-200 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">
                  Total (Incl. VAT)
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-600">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={onClear}
              disabled={orderItems.length === 0}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
            >
              Clear
            </button>

            <button
              onClick={onSendToKitchen}
              disabled={orderItems.length === 0}
              className="w-full rounded-xl bg-gray-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition shadow-md"
            >
              Send Order
            </button>
          </div>

        </div>
      </div>
    );
  }

  export default CurrentOrder;