import { useMemo, useState } from "react";
import {
  Wine,
  TrendingUp,
  Clock3,
  CheckCircle2,
  ClipboardList,
  Printer,
  Search,
} from "lucide-react";

const orders = [
  {
    id: "#B-1042",
    table: "Table 4",
    items: "2 Mojito, 1 Cola",
    bartender: "John",
    status: "Ready",
    total: 850,
    date: "2026-08-24",
    time: "10:32 AM",
  },
  {
    id: "#B-1041",
    table: "Table 8",
    items: "3 Beer, 2 Juice",
    bartender: "Michael",
    status: "Preparing",
    total: 1200,
    date: "2026-08-24",
    time: "10:25 AM",
  },
  {
    id: "#B-1040",
    table: "Table 2",
    items: "2 Cappuccino",
    bartender: "John",
    status: "Ready",
    total: 700,
    date: "2026-08-24",
    time: "10:18 AM",
  },
  {
    id: "#B-1039",
    table: "Table 6",
    items: "1 Cocktail, 2 Water",
    bartender: "Daniel",
    status: "New",
    total: 950,
    date: "2026-08-24",
    time: "10:10 AM",
  },
  {
    id: "#B-1038",
    table: "Table 1",
    items: "2 Juice, 1 Beer",
    bartender: "Michael",
    status: "Ready",
    total: 650,
    date: "2026-08-23",
    time: "9:45 PM",
  },
];

function BarReportsPage() {
  /* =====================================================
     FILTER STATES
  ===================================================== */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* =====================================================
     FILTER ORDERS
  ===================================================== */

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        order.id.toLowerCase().includes(searchValue) ||
        order.table.toLowerCase().includes(searchValue) ||
        order.items.toLowerCase().includes(searchValue) ||
        order.bartender.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      const matchesFromDate =
        !fromDate || order.date >= fromDate;

      const matchesToDate =
        !toDate || order.date <= toDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [search, statusFilter, fromDate, toDate]);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalOrders = filteredOrders.length;

  const newOrders = filteredOrders.filter(
    (order) => order.status === "New"
  ).length;

  const readyOrders = filteredOrders.filter(
    (order) => order.status === "Ready"
  ).length;

  const preparingOrders = filteredOrders.filter(
    (order) => order.status === "Preparing"
  ).length;

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  /* =====================================================
     RESET FILTERS
  ===================================================== */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setFromDate("");
    setToDate("");
  };

  /* =====================================================
     PRINT
  ===================================================== */

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bar-report-page space-y-6">

      {/* =================================================
          NORMAL PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Wine className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bar Reports
            </h1>

            <p className="text-sm text-slate-500">
              Monitor bar orders, preparation status and sales.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Printer className="h-4 w-4" />
          Print / Export PDF
        </button>

      </div>


      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">
            Filter Report
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Filter bar orders by date, status, or search.
          </p>
        </div>


        <div className="grid gap-4 lg:grid-cols-5">

          {/* SEARCH */}

          <div className="lg:col-span-2">

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search
            </label>

            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Order, table, bartender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />

            </div>

          </div>


          {/* FROM DATE */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            />

          </div>


          {/* TO DATE */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            />

          </div>


          {/* STATUS */}

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
            </select>

          </div>

        </div>


        {/* FILTER FOOTER */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

          <div className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredOrders.length}
            </span>{" "}
            orders
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Reset Filters
          </button>

        </div>

      </div>


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <ReportCard
          title="Total Orders"
          value={totalOrders}
          description="Orders in selected period"
          icon={ClipboardList}
        />

        <ReportCard
          title="Ready Orders"
          value={readyOrders}
          description="Completed drinks"
          icon={CheckCircle2}
        />

        <ReportCard
          title="Preparing"
          value={preparingOrders}
          description="Currently preparing"
          icon={Clock3}
        />

        <ReportCard
          title="Total Sales"
          value={`${totalSales.toLocaleString()} ETB`}
          description="Total drink sales"
          icon={TrendingUp}
        />

      </div>


      {/* =================================================
          NORMAL REPORT TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-5 py-4">

          <h2 className="font-bold text-slate-900">
            Bar Order Report
          </h2>

          <p className="text-xs text-slate-500">
            Detailed drink order history
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead className="bg-slate-50">

              <tr className="border-b border-slate-200">

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Order
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Table
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Items
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Bartender
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Date
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Total
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {filteredOrders.length === 0 ? (

                <tr>

                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    No orders found for the selected filters.
                  </td>

                </tr>

              ) : (

                filteredOrders.map((order) => (

                  <tr
                    key={order.id}
                    className="hover:bg-slate-50"
                  >

                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {order.id}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.table}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.items}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {order.bartender}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="px-5 py-4">

                      <p className="text-sm text-slate-600">
                        {order.date}
                      </p>

                      <p className="text-xs text-slate-400">
                        {order.time}
                      </p>

                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {order.total.toLocaleString()} ETB
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* =================================================
          PROFESSIONAL PRINT REPORT
          ONLY VISIBLE DURING PRINTING
      ================================================= */}

      <div className="print-report">

        {/* =================================================
            REPORT HEADER
        ================================================= */}

        <div className="print-header">

          <div className="print-company">

            <h1>RBMS</h1>

            <p>
              Restaurant &amp; Bar Management System
            </p>

          </div>


          <div className="print-report-title">

            <h2>
              BAR OPERATIONS REPORT
            </h2>

            <p>
              Report Period:{" "}
              {fromDate && toDate
                ? `${fromDate} - ${toDate}`
                : fromDate
                ? `From ${fromDate}`
                : toDate
                ? `Until ${toDate}`
                : "All Dates"}
            </p>

            <p>
              Generated:{" "}
              {new Date().toLocaleDateString()}{" "}
              {new Date().toLocaleTimeString()}
            </p>

          </div>

        </div>


        {/* DIVIDER */}

        <div className="print-divider" />


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="print-summary">

          <div>
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
          </div>

          <div>
            <span>New Orders</span>
            <strong>{newOrders}</strong>
          </div>

          <div>
            <span>Preparing</span>
            <strong>{preparingOrders}</strong>
          </div>

          <div>
            <span>Ready</span>
            <strong>{readyOrders}</strong>
          </div>

          <div>
            <span>Total Sales</span>
            <strong>
              {totalSales.toLocaleString()} ETB
            </strong>
          </div>

        </div>


        {/* =================================================
            ORDER DETAILS
        ================================================= */}

        <div className="print-section">

          <div className="print-section-header">

            <h3>
              Drink Order Details
            </h3>

            <span>
              {filteredOrders.length} Orders
            </span>

          </div>


          <table className="print-table">

            <thead>

              <tr>

                <th>Order</th>

                <th>Table</th>

                <th>Items</th>

                <th>Bartender</th>

                <th>Status</th>

                <th>Date</th>

                <th>Amount</th>

              </tr>

            </thead>


            <tbody>

              {filteredOrders.map((order) => (

                <tr key={order.id}>

                  <td>
                    {order.id}
                  </td>

                  <td>
                    {order.table}
                  </td>

                  <td>
                    {order.items}
                  </td>

                  <td>
                    {order.bartender}
                  </td>

                  <td>
                    {order.status}
                  </td>

                  <td>

                    <div>
                      {order.date}
                    </div>

                    <small>
                      {order.time}
                    </small>

                  </td>

                  <td>
                    {order.total.toLocaleString()} ETB
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* =================================================
            TOTAL
        ================================================= */}

        <div className="print-total">

          <span>
            Total Sales
          </span>

          <strong>
            {totalSales.toLocaleString()} ETB
          </strong>

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="print-footer">

          <div>
            <strong>RBMS</strong>
            <span> • Bar Operations Report</span>
          </div>

          <div>
            Confidential • Internal Use Only
          </div>

        </div>

      </div>

    </div>
  );
}


/* =====================================================
   REPORT CARD
===================================================== */

function ReportCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

          <Icon className="h-5 w-5" />

        </div>

      </div>

    </div>
  );
}


/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({ status }) {

  const styles = {
    New:
      "bg-blue-50 text-blue-700 border-blue-200",

    Preparing:
      "bg-amber-50 text-amber-700 border-amber-200",

    Ready:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
        styles[status] ||
        "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}


export default BarReportsPage;