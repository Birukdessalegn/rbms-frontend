import { DollarSign, Clock, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

function CashierShiftBanner({ currentShift, loadingShift, onStartShiftClick, onCloseShiftClick }) {
  if (loadingShift) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs animate-pulse">
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">Cash Drawer Shift Closed</h4>
            <p className="text-xs text-amber-800">
              Please open a cashier shift with starting cash float before accepting cash payments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartShiftClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-[0.99] transition"
        >
          <DollarSign className="h-4 w-4" />
          Start Shift
        </button>
      </div>
    );
  }

  const expectedCash = parseFloat(currentShift.expected_cash || currentShift.opening_cash || 0);
  const openingCash = parseFloat(currentShift.opening_cash || 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-teal-50/40 to-white px-5 py-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <h4 className="text-sm font-bold text-emerald-950">
              Active Shift: {currentShift.cashier_name || 'Cashier'}
            </h4>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 text-xs text-slate-600">
            <span>Float: <strong>{openingCash.toLocaleString()} ETB</strong></span>
            <span>Drawer Cash: <strong className="text-emerald-700">{expectedCash.toLocaleString()} ETB</strong></span>
            <span>Orders: <strong>{currentShift.total_orders_count || 0}</strong></span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCloseShiftClick}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-50 active:scale-[0.99] transition"
      >
        <Clock className="h-4 w-4 text-amber-600" />
        End Shift & Handover
      </button>
    </div>
  );
}

export default CashierShiftBanner;
