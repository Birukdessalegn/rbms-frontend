import { useState } from 'react';
import { DollarSign, Clock, ShieldCheck, X } from 'lucide-react';
import { startShift } from '../services/posApi';

function ShiftStartModal({ isOpen, onClose, onShiftStarted, cashierName }) {
  const [openingCash, setOpeningCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cashVal = parseFloat(openingCash);
    if (isNaN(cashVal) || cashVal < 0) {
      setError('Please enter a valid non-negative opening cash float.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await startShift(cashVal);
      if (onShiftStarted) {
        onShiftStarted(res.data || res.shift);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Start Cashier Shift</h2>
              <p className="text-xs text-slate-500">Open drawer & register starting cash float</p>
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

        {/* Info */}
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Cashier:</span>
            <span className="font-bold text-slate-800">{cashierName || 'Current User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Time:</span>
            <span className="font-semibold text-slate-700">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Opening Cash Float (ETB)
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
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Physical cash placed in the cash drawer at the start of shift.
            </p>
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
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShiftStartModal;
