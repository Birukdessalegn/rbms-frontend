function POSReportsPage() {
  return (
    <div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          POS Reports
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Analyze sales and order performance.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              From
            </label>

            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              To
            </label>

            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Generate Report
            </button>
          </div>

        </div>

      </div>


      {/* Summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">
            Total Orders
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            0
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">
            Completed Orders
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            0
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">
            Total Sales
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            0 ETB
          </h2>
        </div>

      </div>

    </div>
  );
}

export default POSReportsPage;