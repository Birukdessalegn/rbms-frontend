function ProductCard({ product, onAdd, quantityInOrder = 0 }) {
  const isSelected = quantityInOrder > 0;

  const currentStock = product.currentStock !== undefined 
    ? Number(product.currentStock) 
    : (product.current_stock !== undefined ? Number(product.current_stock) : null);

  const minStock = product.minStock !== undefined
    ? Number(product.minStock)
    : (product.minimum_stock !== undefined ? Number(product.minimum_stock) : 5);

  const isTracked = currentStock !== null && !isNaN(currentStock);
  const isOutOfStock = isTracked && currentStock <= 0;
  const isLowStock = isTracked && currentStock > 0 && currentStock <= minStock;

  const rawImage = product.image_url || product.imageUrl || product.image;
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
    <button
      onClick={() => onAdd && onAdd(product)}
      className={`group relative rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
        isOutOfStock
          ? "border-red-200 bg-red-50/20 hover:border-red-400"
          : isSelected
          ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20"
          : "border-gray-200 bg-white hover:border-blue-400"
      }`}
    >
      {/* Top Left Stock Status Badges */}
      {isOutOfStock ? (
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
          Out of Stock
        </span>
      ) : isLowStock ? (
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
          ⚠️ {currentStock} left
        </span>
      ) : null}

      {quantityInOrder > 0 && (
        <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
          {quantityInOrder}
        </span>
      )}

      <div className={`flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-4xl ${
        isOutOfStock ? "opacity-60" : ""
      }`}>
        {isImageSrc ? (
          <img
            src={getFullSrc(rawImage)}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          product.image || "🍽️"
        )}
      </div>

      <div className="mt-3">
        <h3 className={`font-semibold truncate ${isOutOfStock ? "text-slate-600 line-through decoration-red-400 decoration-1" : "text-gray-900"}`}>
          {product.name}
        </h3>

        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-gray-500 truncate max-w-[65%]">
            {product.category}
          </span>
          {isTracked && (
            <span className={`text-[10px] font-semibold ${
              isOutOfStock
                ? "text-red-600 font-bold"
                : isLowStock
                ? "text-amber-700 font-bold"
                : "text-slate-400"
            }`}>
              {isOutOfStock ? "0 left" : `${currentStock} ${product.unit || ""}`}
            </span>
          )}
        </div>

        <p className="mt-2 font-bold text-blue-600">
          {product.price.toLocaleString()} ETB
        </p>
      </div>
    </button>
  );
}

export default ProductCard;