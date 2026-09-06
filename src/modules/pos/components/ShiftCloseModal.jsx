import { useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle2, X, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { closeShift } from '../services/posApi';

function ShiftCloseModal({ isOpen, onClose, currentShift, onShiftClosed }) {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !currentShift) return null;

  const openingCash = parseFloat(currentShift.opening_cash || 0);
  const expectedCash = parseFloat(currentShift.expected_cash || openingCash);
  const enteredActual = parseFloat(actualCash);
  const hasEnteredActual = !isNaN(enteredActual);
  const discrepancy = hasEnteredActual ? enteredActual - expectedCash : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasEnteredActual || enteredActual < 0) {
      setError('Please enter the physical actual cash counted in drawer.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await closeShift(enteredActual, notes);
      if (onShiftClosed) {
        onShiftClosed(res.data || res.shift);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to close shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Close Cashier Shift</h2>
              <p className="text-xs text-slate-500">Reconcile drawer cash & finalize shift</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shift Breakdown Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-slate-500">Opening Cash Float</span>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {openingCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-emerald-700">Cash Sales Collected</span>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              {parseFloat(currentShift.total_cash_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <span className="text-indigo-700">VIP Debt Repayments</span>
            <p className="mt-1 text-sm font-bold text-indigo-800">
              {parseFloat(currentShift.total_repayments_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
            <span className="text-rose-700">Drawer Cash Expenses</span>
            <p className="mt-1 text-sm font-bold text-rose-800">
              -{parseFloat(currentShift.total_expenses_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </p>
          </div>
        </div>

        {/* Expected Cash in Drawer */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Calculated Drawer Cash
            </span>
            <p className="text-xl font-black text-emerald-400">
              {expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span>Orders Served: {currentShift.total_orders_count || 0}</span>
          </div>
        </div>

        {/* Open Orders Notice */}
        {Number(currentShift.open_orders_count) > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Warning:</strong> {currentShift.open_orders_count} active orders are still unpaid.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Actual Cash Counted (In Hand)
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ETB
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          {/* Live Discrepancy Indicator */}
          {hasEnteredActual && (
            <div
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold ${
                Math.abs(discrepancy) < 0.01
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : discrepancy < 0
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(discrepancy) < 0.01 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : discrepancy < 0 ? (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                )}
                <span>
                  {Math.abs(discrepancy) < 0.01
                    ? 'Cash Drawer Perfectly Balanced'
                    : discrepancy < 0
                    ? 'Cash Shortage Detected'
                    : 'Cash Overage Detected'}
                </span>
              </div>
              <span className="font-mono text-sm">
                {discrepancy > 0 ? '+' : ''}
                {discrepancy.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Shift Closing Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Add explanation for any shortage/overage or handover notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-200 hover:bg-amber-700 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? 'Closing...' : 'Close & Handover Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShiftCloseModal;
