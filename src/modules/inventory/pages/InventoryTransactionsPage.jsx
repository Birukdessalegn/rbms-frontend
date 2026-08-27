import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const transactions = [
  {
    id: "TXN-1001",
    item: "Chicken Breast",
    type: "Stock Out",
    quantity: 15,
    unit: "Kg",
    reference: "Kitchen Request #K-204",
    performedBy: "Chef",
    date: "Aug 25, 2026",
    time: "10:42 AM",
  },
  {
    id: "TXN-1002",
    item: "Cooking Oil",
    type: "Stock In",
    quantity: 20,
    unit: "L",
    reference: "Purchase #PO-105",
    performedBy: "Storekeeper",
    date: "Aug 25, 2026",
    time: "09:15 AM",
  },
  {
    id: "TXN-1003",
    item: "Tomatoes",
    type: "Stock Out",
    quantity: 10,
    unit: "Kg",
    reference: "Kitchen Request #K-203",
    performedBy: "Chef",
    date: "Aug 24, 2026",
    time: "04:20 PM",
  },
  {
    id: "TXN-1004",
    item: "Mineral Water",
    type: "Stock In",
    quantity: 5,
    unit: "Boxes",
    reference: "Purchase #PO-104",
    performedBy: "Storekeeper",
    date: "Aug 24, 2026",
    time: "01:30 PM",
  },
  {
    id: "TXN-1005",
    item: "Rice",
    type: "Adjustment",
    quantity: 3,
    unit: "Kg",
    reference: "Inventory Count",
    performedBy: "Storekeeper",
    date: "Aug 23, 2026",
    time: "05:10 PM",
  },
  {
    id: "TXN-1006",
    item: "Soft Drinks",
    type: "Stock Out",
    quantity: 2,
    unit: "Boxes",
    reference: "Bar Request #B-118",
    performedBy: "Bartender",
    date: "Aug 23, 2026",
    time: "03:45 PM",
  },
  {
    id: "TXN-1007",
    item: "Beef",
    type: "Stock In",
    quantity: 30,
    unit: "Kg",
    reference: "Purchase #PO-103",
    performedBy: "Storekeeper",
    date: "Aug 22, 2026",
    time: "11:25 AM",
  },
];

function InventoryTransactionsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        transaction.item.toLowerCase().includes(searchValue) ||
        transaction.id.toLowerCase().includes(searchValue) ||
        transaction.reference.toLowerCase().includes(searchValue) ||
        transaction.performedBy.toLowerCase().includes(searchValue);

      const matchesType =
        type === "All" || transaction.type === type;

      return matchesSearch && matchesType;
    });
  }, [search, type]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Inventory Transactions
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track all stock movements and inventory adjustments.
        </p>
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

              <p className="text-xl font-bold text-slate-900">
                55
              </p>

              <p className="text-xs text-slate-400">
                Units received
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

              <p className="text-xl font-bold text-slate-900">
                27
              </p>

              <p className="text-xs text-slate-400">
                Units issued
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
                Transactions
              </p>

              <p className="text-xl font-bold text-slate-900">
                {filteredTransactions.length}
              </p>

              <p className="text-xs text-slate-400">
                Matching records
              </p>
            </div>

          </div>

        </div>

      </div>


      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-2">

          {/* Search */}
          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transaction..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

          </div>


          {/* Type */}
          <div className="relative">

            <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">
                All Transaction Types
              </option>

              <option value="Stock In">
                Stock In
              </option>

              <option value="Stock Out">
                Stock Out
              </option>

              <option value="Adjustment">
                Adjustment
              </option>
            </select>

          </div>

        </div>

      </div>


      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-5 py-4">

          <h2 className="font-bold text-slate-900">
            Transaction History
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Complete record of inventory movements.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[1000px] text-left">

            <thead className="bg-slate-50">

              <tr className="border-b border-slate-200">

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Transaction
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Item
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

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Performed By
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Date
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => {

                  const isStockIn =
                    transaction.type === "Stock In";

                  const isStockOut =
                    transaction.type === "Stock Out";

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* Transaction ID */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-slate-900">
                          {transaction.id}
                        </p>

                        <p className="text-xs text-slate-400">
                          {transaction.time}
                        </p>

                      </td>


                      {/* Item */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-slate-900">
                          {transaction.item}
                        </p>

                      </td>


                      {/* Type */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            isStockIn
                              ? "bg-emerald-50 text-emerald-700"
                              : isStockOut
                              ? "bg-orange-50 text-orange-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >

                          {isStockIn ? (
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          ) : isStockOut ? (
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                          ) : (
                            <ClipboardList className="h-3.5 w-3.5" />
                          )}

                          {transaction.type}

                        </span>

                      </td>


                      {/* Quantity */}

                      <td className="px-5 py-4">

                        <span
                          className={`text-sm font-bold ${
                            isStockIn
                              ? "text-emerald-600"
                              : isStockOut
                              ? "text-orange-600"
                              : "text-blue-600"
                          }`}
                        >
                          {isStockIn ? "+" : isStockOut ? "-" : ""}
                          {transaction.quantity}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          {transaction.unit}
                        </span>

                      </td>


                      {/* Reference */}

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {transaction.reference}
                      </td>


                      {/* Performed By */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-slate-700">
                          {transaction.performedBy}
                        </p>

                      </td>


                      {/* Date */}

                      <td className="px-5 py-4">

                        <p className="text-sm text-slate-700">
                          {transaction.date}
                        </p>

                        <p className="text-xs text-slate-400">
                          {transaction.time}
                        </p>

                      </td>

                    </tr>
                  );
                })
              ) : (

                <tr>

                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center"
                  >

                    <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No transactions found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your search or filter.
                    </p>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default InventoryTransactionsPage;