import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Printer,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
} from "lucide-react";

const reportData = [
  {
    id: "TXN-1001",
    date: "2026-08-25",
    item: "Chicken Breast",
    category: "Meat",
    type: "Stock Out",
    quantity: 15,
    unit: "Kg",
    reference: "Kitchen Request #K-204",
  },
  {
    id: "TXN-1002",
    date: "2026-08-25",
    item: "Cooking Oil",
    category: "Ingredients",
    type: "Stock In",
    quantity: 20,
    unit: "L",
    reference: "Purchase #PO-105",
  },
  {
    id: "TXN-1003",
    date: "2026-08-24",
    item: "Tomatoes",
    category: "Vegetables",
    type: "Stock Out",
    quantity: 10,
    unit: "Kg",
    reference: "Kitchen Request #K-203",
  },
  {
    id: "TXN-1004",
    date: "2026-08-24",
    item: "Mineral Water",
    category: "Beverages",
    type: "Stock In",
    quantity: 5,
    unit: "Box",
    reference: "Purchase #PO-104",
  },
  {
    id: "TXN-1005",
    date: "2026-08-23",
    item: "Rice",
    category: "Grains",
    type: "Adjustment",
    quantity: 3,
    unit: "Kg",
    reference: "Inventory Count",
  },
  {
    id: "TXN-1006",
    date: "2026-08-23",
    item: "Soft Drinks",
    category: "Beverages",
    type: "Stock Out",
    quantity: 2,
    unit: "Box",
    reference: "Bar Request #B-118",
  },
  {
    id: "TXN-1007",
    date: "2026-08-22",
    item: "Beef",
    category: "Meat",
    type: "Stock In",
    quantity: 30,
    unit: "Kg",
    reference: "Purchase #PO-103",
  },
];

function InventoryReportsPage() {
  const [startDate, setStartDate] = useState("2026-08-22");
  const [endDate, setEndDate] = useState("2026-08-25");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    ...new Set(reportData.map((item) => item.category)),
  ];

  const filteredData = useMemo(() => {
    return reportData.filter((item) => {
      const dateMatch =
        item.date >= startDate && item.date <= endDate;

      const typeMatch =
        type === "All" || item.type === type;

      const categoryMatch =
        category === "All" || item.category === category;

      return dateMatch && typeMatch && categoryMatch;
    });
  }, [startDate, endDate, type, category]);

  const stockIn = filteredData
    .filter((item) => item.type === "Stock In")
    .reduce((total, item) => total + item.quantity, 0);

  const stockOut = filteredData
    .filter((item) => item.type === "Stock Out")
    .reduce((total, item) => total + item.quantity, 0);

  const adjustments = filteredData
    .filter((item) => item.type === "Adjustment")
    .reduce((total, item) => total + item.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const headers = [
      "Transaction ID",
      "Date",
      "Item",
      "Category",
      "Type",
      "Quantity",
      "Unit",
      "Reference",
    ];

    const rows = filteredData.map((item) => [
      item.id,
      item.date,
      item.item,
      item.category,
      item.type,
      item.quantity,
      item.unit,
      item.reference,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `inventory-report-${startDate}-to-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print:bg-white print:p-0">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Inventory Reports
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Analyze inventory movements for any period.
            </p>
          </div>

        </div>

        <div className="flex gap-2">

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>

        </div>

      </div>


      {/* Print Header */}
      <div className="hidden print:block">

        <div className="border-b border-slate-300 pb-4">

          <h1 className="text-2xl font-bold">
            RBMS Restaurant
          </h1>

          <h2 className="mt-1 text-lg font-semibold">
            Inventory Report
          </h2>

          <p className="mt-1 text-sm">
            Period: {startDate} to {endDate}
          </p>

          <p className="text-sm">
            Generated: {new Date().toLocaleString()}
          </p>

        </div>

      </div>


      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">

        <div className="mb-4 flex items-center gap-2">

          <CalendarDays className="h-5 w-5 text-blue-600" />

          <h2 className="font-bold text-slate-900">
            Report Filters
          </h2>

        </div>


        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* Start Date */}
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />

          </div>


          {/* End Date */}
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />

          </div>


          {/* Type */}
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Transaction Type
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Stock In">Stock In</option>
              <option value="Stock Out">Stock Out</option>
              <option value="Adjustment">Adjustment</option>
            </select>

          </div>


          {/* Category */}
          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Categories" : item}
                </option>
              ))}
            </select>

          </div>

        </div>

      </div>


      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownToLine className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs text-slate-500">
                Stock In
              </p>

              <p className="text-xl font-bold text-emerald-600">
                +{stockIn}
              </p>

            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <ArrowUpFromLine className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs text-slate-500">
                Stock Out
              </p>

              <p className="text-xl font-bold text-orange-600">
                -{stockOut}
              </p>

            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs text-slate-500">
                Adjustments
              </p>

              <p className="text-xl font-bold text-blue-600">
                {adjustments}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* Report Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-slate-300 print:shadow-none">

        <div className="border-b border-slate-100 px-5 py-4">

          <h2 className="font-bold text-slate-900">
            Inventory Movement Report
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {filteredData.length} transaction(s) found
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px] text-left">

            <thead className="bg-slate-50 print:bg-white">

              <tr className="border-b border-slate-200">

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  ID
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Date
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Item
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Category
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Type
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Quantity
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Reference
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {filteredData.map((item) => {

                const isIn = item.type === "Stock In";
                const isOut = item.type === "Stock Out";

                return (
                  <tr key={item.id}>

                    <td className="px-5 py-4 text-sm font-medium">
                      {item.id}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {item.date}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold">
                      {item.item}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {item.category}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {item.type}
                    </td>

                    <td
                      className={`px-5 py-4 text-sm font-bold ${
                        isIn
                          ? "text-emerald-600"
                          : isOut
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    >
                      {isIn ? "+" : isOut ? "-" : ""}
                      {item.quantity} {item.unit}
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {item.reference}
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>


      {/* Footer */}
      <div className="hidden print:block">

        <div className="mt-8 border-t border-slate-300 pt-4">

          <div className="flex justify-between text-sm">

            <div>
              <p className="font-semibold">
                Prepared By
              </p>

              <p className="mt-6">
                ______________________
              </p>

            </div>


            <div>
              <p className="font-semibold">
                Approved By
              </p>

              <p className="mt-6">
                ______________________
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default InventoryReportsPage;