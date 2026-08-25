import { useState } from "react";
import { Printer, CalendarDays } from "lucide-react";

function KitchenReportsPage() {
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const report = {
    totalOrders: 48,
    completed: 42,
    pending: 4,
    cancelled: 2,
    averagePreparation: 18,
    items: [
      { name: "Classic Burger", orders: 18 },
      { name: "Chicken Pasta", orders: 12 },
      { name: "Cheese Pizza", orders: 9 },
      { name: "French Fries", orders: 7 },
      { name: "Chicken Sandwich", orders: 5 },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* Screen Header */}
      <div className="flex items-center justify-between print:hidden">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Kitchen Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor kitchen performance and order activity.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>

      </div>

      {/* Report */}
      <div
        id="printable-report"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >

        {/* Report Header */}
        <div className="border-b border-slate-200 pb-5">

          <div className="flex items-start justify-between">

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                RBMS
              </h1>

              <p className="text-sm text-slate-500">
                Restaurant & Bar Management System
              </p>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Kitchen Daily Report
              </h2>
            </div>

            <div className="text-right">

              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />

                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm print:hidden"
                />
              </div>

              <p className="hidden text-sm text-slate-600 print:block">
                Date: {reportDate}
              </p>

            </div>

          </div>

        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">

          <ReportCard
            title="Total Orders"
            value={report.totalOrders}
          />

          <ReportCard
            title="Completed"
            value={report.completed}
          />

          <ReportCard
            title="Pending"
            value={report.pending}
          />

          <ReportCard
            title="Cancelled"
            value={report.cancelled}
          />

          <ReportCard
            title="Avg. Preparation"
            value={`${report.averagePreparation} min`}
          />

        </div>

        {/* Popular Items */}
        <div className="mt-8">

          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Kitchen Production Summary
          </h2>

          <div className="overflow-hidden rounded-lg border border-slate-200">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    #
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Item
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Orders
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">

                {report.items.map((item, index) => (
                  <tr key={item.name}>

                    <td className="px-4 py-3 text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.name}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {item.orders}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-5">

          <div className="flex justify-between text-xs text-slate-500">

            <span>
              Generated by RBMS
            </span>

            <span>
              Kitchen Department
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

function ReportCard({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

export default KitchenReportsPage;