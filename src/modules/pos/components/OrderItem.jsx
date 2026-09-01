function OrderItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const itemTotal = item.price * item.quantity;

  const rawImage =
    item.image_url ||
    item.imageUrl ||
    item.image ||
    item.photo ||
    item.picture ||
    item.image_path ||
    item.product_image;

  const isImageSrc =
    typeof rawImage === "string" &&
    (rawImage.startsWith("/") ||
      rawImage.startsWith("http://") ||
      rawImage.startsWith("https://") ||
      rawImage.startsWith("data:") ||
      rawImage.startsWith("blob:"));

  const getFullSrc = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      return url;
    const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="rounded-lg border border-gray-100 p-3">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xl border border-gray-200">
          {isImageSrc ? (
            <img
              src={getFullSrc(rawImage)}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
          ) : (
            <span>{typeof item.image === "string" && !isImageSrc ? item.image : "🍽️"}</span>
          )}
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