function ProductCard({ product, onAdd, quantityInOrder = 0 }) {
  const isSelected = quantityInOrder > 0;

  return (
    <button
      onClick={() => onAdd && onAdd(product)}
      className={`group relative rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20"
          : "border-gray-200 bg-white hover:border-blue-400"
      }`}
    >
      {quantityInOrder > 0 && (
        <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
          {quantityInOrder}
        </span>
      )}

      <div className="flex h-28 items-center justify-center rounded-lg bg-gray-100 text-4xl">
        {product.image}
      </div>

      <div className="mt-3">
        <h3 className="font-semibold text-gray-900">
          {product.name}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {product.category}
        </p>

        <p className="mt-2 font-bold text-blue-600">
          {product.price.toLocaleString()} ETB
        </p>
      </div>
    </button>
  );
}

export default ProductCard;