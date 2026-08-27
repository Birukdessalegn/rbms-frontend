import { useEffect } from "react";
import { Flame, Wine, Clock, CheckCircle2, Volume2, X } from "lucide-react";
import audioService from "../../services/audioService";

function NewOrderAlertModal({ order, department = "kitchen", onAccept, onDismiss }) {
  useEffect(() => {
    if (order) {
      audioService.playNewOrderSound();
    }
  }, [order]);

  if (!order) return null;

  const isKitchen = department === "kitchen";
  let rawItems = order.items || order.order_items || [];
  if (typeof rawItems === "string") {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }
  const items = Array.isArray(rawItems) ? rawItems : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border-4 border-amber-400 overflow-hidden">
        {/* HEADER BAR */}
        <div
          className={`flex items-center justify-between px-6 py-5 text-white ${
            isKitchen ? "bg-amber-600" : "bg-indigo-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm animate-bounce">
              {isKitchen ? (
                <Flame className="h-7 w-7 text-amber-100" />
              ) : (
                <Wine className="h-7 w-7 text-indigo-100" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                {isKitchen ? "NEW KITCHEN ORDER RECEIVED" : "NEW DRINK ORDER RECEIVED"}
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {order.order_number || `#ORD-${order.id}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => audioService.playNewOrderSound()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
              title="Test Sound"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ORDER DETAILS BODY */}
        <div className="p-6 space-y-5">
          {/* Table & Order Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Table & Location
              </span>
              <p className="mt-1 text-xl font-black text-slate-900">
                {order.table_number || order.table_id ? `Table #${order.table_number || order.table_id}` : "Takeaway / Counter"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Order Type
              </span>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-base font-bold text-slate-800 capitalize">
                  {order.order_type || "Dine-in"}
                </p>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Items to Prepare ({items.length || "1"})
              </h4>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 p-2">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white font-extrabold text-sm shadow-sm">
                        {item.quantity || 1}x
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-base">
                          {item.product_name ||
                            item.name ||
                            item.title ||
                            item.item_name ||
                            item.description ||
                            (item.productId || item.product_id
                              ? `Product #${item.productId || item.product_id}`
                              : "Drink Item")}
                        </p>
                        {item.category && (
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                            {item.category}
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-600 font-medium text-sm">
                  {order.items_summary ||
                    order.drink_name ||
                    order.product_name ||
                    order.description ||
                    "1x Drink Order Item"}
                </div>
              )}
            </div>
          </div>

          {/* Customer / Waiter Notes */}
          {order.notes && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
              <span className="font-bold">Special Instructions: </span> {order.notes}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Dismiss Alert
          </button>

          <button
            type="button"
            onClick={() => {
              onAccept(order);
              onDismiss();
            }}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold text-white shadow-lg transition ${
              isKitchen
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept & Start Preparing
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewOrderAlertModal;
