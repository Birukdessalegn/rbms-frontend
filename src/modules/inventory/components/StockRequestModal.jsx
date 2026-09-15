import { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Wine,
  UtensilsCrossed
} from 'lucide-react';
import api from '../../../services/api';

export default function StockRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialProduct = null,
  initialDepartment = 'bar'
}) {
  const department = initialDepartment || 'bar'; // Strictly locked to calling department
  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessMsg('');
    setQuantity(1);

    const fetchDepartmentProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api('/inventory/multi-location');
        const items = res.inventory || res.data || [];

        // Filter products relevant to this department
        const filtered = items.filter((item) => {
          if (department === 'bar') {
            return (
              item.department === 'bar' ||
              ['bar', 'drink', 'beverage', 'liquor', 'wine', 'beer', 'cocktail', 'shots'].some(
                (k) => (item.category || '').toLowerCase().includes(k)
              ) ||
              item.bar_quantity !== undefined
            );
          }
          return (
            item.department === 'kitchen' ||
            ['kitchen', 'food', 'meat', 'dish', 'plate', 'snack', 'vegetable'].some(
              (k) => (item.category || '').toLowerCase().includes(k)
            ) ||
            item.kitchen_quantity !== undefined
          );
        });

        const listToUse = filtered.length > 0 ? filtered : items;
        setProductList(listToUse);

        if (initialProduct) {
          const pid = String(initialProduct.product_id || initialProduct.id);
          setSelectedProductId(pid);
        } else if (listToUse.length > 0) {
          setSelectedProductId(String(listToUse[0].product_id));
        }
      } catch (err) {
        console.error('Failed to load products for stock request:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchDepartmentProducts();
  }, [isOpen, initialProduct, department]);

  if (!isOpen) return null;

  const matchedProduct = productList.find(
    (p) => String(p.product_id) === String(selectedProductId)
  );

  const productName =
    matchedProduct?.product_name ||
    initialProduct?.product_name ||
    initialProduct?.name ||
    'Selected Item';

  const unit = matchedProduct?.unit || initialProduct?.unit || (department === 'bar' ? 'bottle' : 'unit');

  const handleAdjust = (delta) => {
    setQuantity((prev) => Math.max(1, Number(prev || 0) + delta));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const reqQty = Number(quantity);
    const prodId = Number(selectedProductId || initialProduct?.product_id || initialProduct?.id);

    if (!prodId) {
      setError('Please select an item to request.');
      return;
    }

    if (isNaN(reqQty) || reqQty <= 0) {
      setError('Please enter a valid quantity (minimum 1).');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        toLocation: department.toLowerCase(), // strictly 'bar' or 'kitchen'
        items: [
          {
            productId: prodId,
            quantity: reqQty,
            notes: `Restock request from ${department.toUpperCase()}`
          }
        ],
        notes: `Restock request for ${productName} (${department.toUpperCase()})`
      };

      const res = await api('/inventory/transfers/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(`Requested ${reqQty} ${unit}(s) of ${productName}!`);

      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Stock request failed:', err);
      setError(err.message || 'Failed to submit stock request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isBar = department === 'bar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs ${
                isBar ? 'bg-purple-600' : 'bg-amber-600'
              }`}
            >
              {isBar ? <Wine className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                {isBar ? 'Bar Stock Request' : 'Kitchen Stock Request'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Send request to Central Warehouse
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* CONFIRMATION PROMPT */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Are you sure you want to ask for stock restock?</span>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ITEM NAME */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Item Name
            </label>
            {initialProduct ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                  <Package className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-900 truncate">{productName}</h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    Unit: {unit}
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={loadingProducts}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white"
              >
                {productList.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.unit || 'unit'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* QUANTITY INPUT */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Quantity to Request ({unit})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-base font-black text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                required
              />

              <button
                type="button"
                onClick={() => handleAdjust(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* QUICK PRESETS */}
            <div className="mt-2 flex items-center justify-center gap-1.5">
              {[1, 2, 5, 10, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black border transition ${
                    Number(quantity) === preset
                      ? isBar
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-amber-600 bg-amber-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !!successMsg}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50 ${
                isBar
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Sending...' : 'Confirm Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
