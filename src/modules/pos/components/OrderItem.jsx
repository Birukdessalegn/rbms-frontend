function OrderItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const itemTotal = item.price * item.quantity;

  return (
    <div className="rounded-lg border border-gray-100 p-3">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-2xl">
          {item.image}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900">
            {item.name}
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {item.price.toLocaleString()} ETB each
          </p>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Remove
        </button>

      </div>

      <div className="mt-3 flex items-center justify-between">

        <div className="flex items-center rounded-lg border border-gray-200">

          <button
            onClick={() => onDecrease(item.id)}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
          >
            −
          </button>

          <span className="min-w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>

          <button
            onClick={() => onIncrease(item.id)}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
          >
            +
          </button>

        </div>

        <span className="text-sm font-semibold text-gray-900">
          {itemTotal.toLocaleString()} ETB
        </span>

      </div>
    </div>
  );
}

export default OrderItem;