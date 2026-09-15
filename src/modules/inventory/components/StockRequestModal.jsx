import { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Wine,
  UtensilsCrossed,
  Package,
  Clock,
  Plus,
  Minus,
  Building2
} from 'lucide-react';
import api from '../../../services/api';

export default function StockRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialProduct = null,
  initialDepartment = 'bar'
}) {
  const [department, setDepartment] = useState(initialDepartment);
  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('Urgent Restock');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessMsg('');
    setQuantity(1);
    setNotes('');
    setPriority('Urgent Restock');
    setDepartment(initialDepartment || 'bar');

    const fetchCentralProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api('/inventory/multi-location');
        const items = res.inventory || res.data || [];
        setProductList(items);

        if (initialProduct) {
          const pid = String(initialProduct.product_id || initialProduct.id);
          setSelectedProductId(pid);
        } else if (items.length > 0) {
          setSelectedProductId(String(items[0].product_id));
        }
      } catch (err) {
        console.error('Failed to load products for restock request:', err);
        setError('Failed to load product catalog.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCentralProducts();
  }, [isOpen, initialProduct, initialDepartment]);

  if (!isOpen) return null;

  // Selected product details
  const matchedFromList = productList.find(
    (p) => String(p.product_id) === String(selectedProductId)
  );

  const productName =
    matchedFromList?.product_name ||
    initialProduct?.product_name ||
    initialProduct?.name ||
    'Selected Item';

  const unit = matchedFromList?.unit || initialProduct?.unit || 'bottle';
  const outletStock =
    department === 'bar'
      ? Number(matchedFromList?.bar_quantity ?? initialProduct?.bar_quantity ?? initialProduct?.stock ?? initialProduct?.units_left ?? 0)
      : Number(matchedFromList?.kitchen_quantity ?? initialProduct?.kitchen_quantity ?? initialProduct?.stock ?? 0);

  const warehouseStock = Number(matchedFromList?.main_quantity ?? initialProduct?.main_quantity ?? 0);

  const handleAdjustQuantity = (delta) => {
    setQuantity((prev) => Math.max(1, Number(prev || 0) + delta));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const reqQty = Number(quantity);
    const prodId = Number(selectedProductId || initialProduct?.product_id || initialProduct?.id);

    if (!prodId) {
      setError('Please select a product to request.');
      return;
    }

    if (isNaN(reqQty) || reqQty <= 0) {
      setError('Please enter a valid requested quantity (minimum 1).');
      return;
    }

    try {
      setSubmitting(true);

      const combinedNotes = [priority, notes].filter(Boolean).join(' - ');

      const payload = {
        toLocation: department.toLowerCase(), // 'bar' or 'kitchen'
        items: [
          {
            productId: prodId,
            quantity: reqQty,
            notes: combinedNotes || `Restock request for ${productName}`
          }
        ],
        notes: combinedNotes || `Stock requisition for ${productName} (${department.toUpperCase()})`
      };

      const res = await api('/inventory/transfers/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(
        `Stock request for ${reqQty} ${unit}(s) of ${productName} submitted! Store Manager & F&B Controller notified.`
      );

      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Submit restock request error:', err);
      setError(err.message || 'Failed to submit stock request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Request Stock Restock
              </h2>
              <p className="text-xs font-semibold text-amber-700">
                Send Requisition to Central Warehouse & F&B Manager
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* CONFIRMATION WARNING BANNER */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-black text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Are you sure you want to ask for stock restock?</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed pl-6">
              This will officially register a restock requisition for the Store Manager and F&B Controller to approve and prepare dispatch.
            </p>
          </div>

          {/* ERROR / SUCCESS ALERTS */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TARGET DEPARTMENT SELECTION */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Requesting Department
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepartment('bar')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-black transition ${
                  department === 'bar'
                    ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wine className="h-4 w-4 text-purple-600" />
                <span>Bar Sub-Store</span>
              </button>

              <button
                type="button"
                onClick={() => setDepartment('kitchen')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-black transition ${
                  department === 'kitchen'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                <span>Kitchen Sub-Store</span>
              </button>
            </div>
          </div>

          {/* PRODUCT SELECTION / DISPLAY */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Item to Restock
            </label>
            {initialProduct ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                      <Package className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{productName}</h4>
                      <p className="text-[11px] font-semibold text-slate-500 capitalize">
                        Unit: {unit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={loadingProducts}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white"
              >
                {productList.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.unit || 'unit'})
                  </option>
                ))}
              </select>
            )}

            {/* LIVE STOCK SNAPSHOT */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100/70 p-2.5 text-xs border border-slate-200/60">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Current {department.toUpperCase()} Stock:
                </span>
                <span className={`text-xs font-black ${outletStock <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {outletStock} {unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Central Warehouse:
                </span>
                <span className="text-xs font-black text-slate-700">
                  {warehouseStock} {unit}
                </span>
              </div>
            </div>
          </div>

          {/* QUANTITY INPUT */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Requested Quantity ({unit.toUpperCase()})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustQuantity(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity needed"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-black text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                required
              />

              <button
                type="button"
                onClick={() => handleAdjustQuantity(1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* QUICK PRESET BUTTONS */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Quick add:</span>
              {[1, 2, 5, 10, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black border transition ${
                    Number(quantity) === preset
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* REASON / PRIORITY PRESET */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Request Urgency / Reason
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Urgent Restock', 'Out of Stock', 'Weekend Buffer', 'Regular Restock'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPriority(opt)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                    priority === opt
                      ? 'border-amber-600 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or instructions for storekeeper..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              No, Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !!successMsg}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Submitting...' : 'Yes, Send Restock Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
