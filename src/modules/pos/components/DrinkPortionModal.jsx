import { X } from "lucide-react";
import { formatImageUrl, getCustomShotsMap } from "../../products/ProductsPage";

function DrinkPortionModal({ product, onClose, onSelectPortion }) {
  if (!product) return null;

  const localMap = getCustomShotsMap();
  const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
  const basePrice = Number(product.unit_price || product.price || 0);
  const totalShots = Number(
    product.shots_capacity ||
    product.shotsCapacity ||
    product.bottle_shots ||
    localData?.shots ||
    30
  );
  const halfShots = Math.max(1, Math.round(totalShots / 2));

  const rawImage =
    product.image_url ||
    product.imageUrl ||
    product.image ||
    product.photo ||
    product.picture ||
    product.image_path ||
    product.product_image;
  const imageUrl = formatImageUrl(rawImage);

  const options = [
    {
      id: "single",
      title: "Single Shot",
      icon: "🥃",
      shots: 1,
      price: basePrice,
      badge: "1 Shot",
      description: "Standard 1x Shot Portion",
    },
    {
      id: "double",
      title: "Double Shot",
      icon: "🥃🥃",
      shots: 2,
      price: basePrice * 2,
      badge: "2 Shots",
      description: "Double 2x Shot Portion",
    },
    {
      id: "half_bottle",
      title: "Half Bottle",
      icon: "🍾",
      shots: halfShots,
      price: basePrice * halfShots,
      badge: `${halfShots} Shots`,
      description: `Half Bottle (${halfShots} Shots)`,
    },
    {
      id: "full_bottle",
      title: "Full Bottle",
      icon: "🍾🍾",
      shots: totalShots,
      price: basePrice * totalShots,
      badge: `${totalShots} Shots (1 Full Bottle)`,
      description: `Complete Full Bottle (${totalShots} Shots)`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-6">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 border border-purple-200 text-xl font-bold">
                🥃
              </div>
            )}

            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {product.name}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Select portion serving size • Bottle Capacity: {totalShots} Shots
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PORTION OPTIONS GRID */}
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectPortion(opt)}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left transition-all hover:border-purple-500 hover:bg-purple-50/40 hover:shadow-md active:scale-95"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{opt.icon}</span>
                <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[11px] font-black text-purple-700 border border-purple-200">
                  {opt.badge}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-700 transition">
                  {opt.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {opt.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Total</span>
                <span className="text-base font-black text-purple-700">
                  {opt.price.toLocaleString()} ETB
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DrinkPortionModal;
