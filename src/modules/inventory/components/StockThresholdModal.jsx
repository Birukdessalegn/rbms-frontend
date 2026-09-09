import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Store, Wine, UtensilsCrossed } from 'lucide-react';
import api from '../../../services/api';

export default function StockThresholdModal({
  isOpen,
  onClose,
  onSuccess,
  product = null,
  initialDepartment = 'all',
}) {
  const [department, setDepartment] = useState(initialDepartment);
  const [minimumStock, setMinimumStock] = useState('5');
  const [outOfStockThreshold, setOutOfStockThreshold] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !product) return;

    setError('');
    setSuccessMsg('');
    setDepartment(initialDepartment);

    let initialMin = 5;
    let initialOut = 0;

    if (initialDepartment === 'bar') {
      initialMin = product.bar_minimum_stock ?? product.low_stock_threshold ?? 5;
      initialOut = product.bar_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else if (initialDepartment === 'kitchen') {
      initialMin = product.kitchen_minimum_stock ?? product.low_stock_threshold ?? 5;
      initialOut = product.kitchen_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else if (initialDepartment === 'main') {
      initialMin = product.main_minimum_stock ?? product.low_stock_threshold ?? 10;
      initialOut = product.main_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else {
      initialMin = product.low_stock_threshold ?? 5;
      initialOut = product.out_of_stock_threshold ?? 0;
    }

    setMinimumStock(String(initialMin));
    setOutOfStockThreshold(String(initialOut));
  }, [isOpen, product, initialDepartment]);

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    if (!product) return;

    let min = 5;
    let out = 0;
    if (newDept === 'bar') {
      min = product.bar_minimum_stock ?? product.low_stock_threshold ?? 5;
      out = product.bar_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else if (newDept === 'kitchen') {
      min = product.kitchen_minimum_stock ?? product.low_stock_threshold ?? 5;
      out = product.kitchen_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else if (newDept === 'main') {
      min = product.main_minimum_stock ?? product.low_stock_threshold ?? 10;
      out = product.main_out_of_stock_threshold ?? product.out_of_stock_threshold ?? 0;
    } else {
      min = product.low_stock_threshold ?? 5;
      out = product.out_of_stock_threshold ?? 0;
    }

    setMinimumStock(String(min));
    setOutOfStockThreshold(String(out));
  };

  if (!isOpen || !product) return null;

  const unit = product.unit || 'pcs';
  const productId = product.product_id || product.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const minVal = Number(minimumStock);
    const outVal = Number(outOfStockThreshold);

    if (isNaN(minVal) || minVal < 0) {
      setError('Please enter a valid positive number for Low Stock.');
      return;
    }
    if (isNaN(outVal) || outVal < 0) {
      setError('Please enter a valid positive number for Out of Stock.');
      return;
    }
    if (outVal > minVal) {
      setError('Out of Stock threshold cannot exceed Low Stock limit.');
      return;
    }

    try {
      setSubmitting(true);
      await api(`/inventory/departments/${department}/product/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          minimumStock: minVal,
          outOfStockThreshold: outVal,
        }),
      });

      setSuccessMsg(`Saved!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update stock alert settings:', err);
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Stock Alert Limits</h2>
              <p className="text-[11px] text-slate-500">Set Low & Out of stock triggers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Compact Product Snapshot */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-2.5 flex items-center justify-between text-xs">
            <div className="truncate mr-2">
              <p className="font-bold text-slate-900 truncate">{product.product_name || product.name}</p>
              <span className="text-[10px] text-slate-500 font-medium">
                {product.category_name || 'General'}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-slate-700">
                Bar: <span className="text-amber-700">{product.bar_quantity || 0}</span> | 
                Kit: <span className="text-emerald-700">{product.kitchen_quantity || 0}</span> | 
                Wh: <span className="text-slate-900">{product.main_quantity || 0}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - Fully scrollable on small smartphone screens */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pt-2 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Department Scope Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Apply Thresholds To
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'all', label: 'All', icon: Sparkles },
                { id: 'bar', label: 'Bar', icon: Wine },
                { id: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
                { id: 'main', label: 'Store', icon: Store },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = department === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleDepartmentChange(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 px-1 text-[11px] font-bold transition border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Low Stock Alert Limit ({unit})
              </label>
              <span className="text-[10px] text-slate-400">Bell chime trigger</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                placeholder="e.g., 5"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {unit}
              </span>
            </div>
            
            {/* Quick preset chips */}
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Presets:</span>
              {[3, 5, 10, 24, 48].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMinimumStock(String(num))}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition border ${
                    minimumStock === String(num)
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Out of Stock Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                Out of Stock Threshold ({unit})
              </label>
              <span className="text-[10px] text-slate-400">Default: 0</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={outOfStockThreshold}
                onChange={(e) => setOutOfStockThreshold(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 px-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {unit}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              When balance is &le; this value, item is marked Out of Stock on POS.
            </p>
          </div>

          {/* Compact Sticky-like Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition disabled:opacity-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {submitting ? 'Saving...' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
