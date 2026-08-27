import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Search,
  Package,
  ShoppingCart,
  ArrowUp,
} from "lucide-react";

const lowStockItems = [
  {
    id: 1,
    name: "Cooking Oil",
    category: "Ingredients",
    current: 8,
    minimum: 15,
    unit: "L",
    supplier: "ABC Food Supply",
    lastRestocked: "Aug 18, 2026",
  },
  {
    id: 2,
    name: "Tomatoes",
    category: "Vegetables",
    current: 5,
    minimum: 20,
    unit: "Kg",
    supplier: "Fresh Farm",
    lastRestocked: "Aug 20, 2026",
  },
  {
    id: 3,
    name: "Chicken Breast",
    category: "Meat",
    current: 7,
    minimum: 15,
    unit: "Kg",
    supplier: "Prime Meat Supplier",
    lastRestocked: "Aug 21, 2026",
  },
  {
    id: 4,
    name: "Mineral Water",
    category: "Beverages",
    current: 12,
    minimum: 30,
    unit: "Bottle",
    supplier: "Aqua Distributor",
    lastRestocked: "Aug 19, 2026",
  },
  {
    id: 5,
    name: "Onions",
    category: "Vegetables",
    current: 14,
    minimum: 15,
    unit: "Kg",
    supplier: "Fresh Farm",
    lastRestocked: "Aug 22, 2026",
  },
];

function InventoryLowStockPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filteredItems = useMemo(() => {
    return lowStockItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const categories = [
    "All",
    ...new Set(lowStockItems.map((item) => item.category)),
  ];

  const getUrgency = (current, minimum) => {
    const percentage = (current / minimum) * 100;

    if (percentage <= 30) {
      return {
        label: "Critical",
        className: "bg-red-50 text-red-700",
      };
    }

    if (percentage <= 60) {
      return {
        label: "Urgent",
        className: "bg-orange-50 text-orange-700",
      };
    }

    return {
      label: "Low",
      className: "bg-yellow-50 text-yellow-700",
    };
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Low Stock
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor items that need to be restocked.
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-xl bg-orange-50 px-4 py-3">

          <p className="text-xs font-medium text-orange-600">
            Items Requiring Attention
          </p>

          <p className="text-xl font-bold text-orange-700">
            {filteredItems.length}
          </p>

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
              placeholder="Search low stock items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />

          </div>


          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>

        </div>

      </div>


      {/* Alert */}
      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">

        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

        <div>

          <p className="text-sm font-semibold text-orange-800">
            Inventory Alert
          </p>

          <p className="mt-1 text-xs leading-5 text-orange-700">
            These items have fallen below their minimum stock
            level. Consider creating a purchase request before
            they run out.
          </p>

        </div>

      </div>


      {/* Items */}
      <div className="grid gap-4 lg:grid-cols-2">

        {filteredItems.map((item) => {

          const urgency = getUrgency(
            item.current,
            item.minimum
          );

          const percentage = Math.min(
            (item.current / item.minimum) * 100,
            100
          );

          const requiredQuantity =
            item.minimum * 2 - item.current;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              {/* Top */}
              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>

                    <h2 className="font-bold text-slate-900">
                      {item.name}
                    </h2>

                    <p className="text-xs text-slate-500">
                      {item.category}
                    </p>

                  </div>

                </div>


                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${urgency.className}`}
                >
                  {urgency.label}
                </span>

              </div>


              {/* Stock information */}
              <div className="mt-5 grid grid-cols-3 gap-3">

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-500">
                    Current
                  </p>

                  <p className="mt-1 text-lg font-bold text-red-600">
                    {item.current}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.unit}
                  </p>

                </div>


                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-500">
                    Minimum
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {item.minimum}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.unit}
                  </p>

                </div>


                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-500">
                    Need
                  </p>

                  <p className="mt-1 text-lg font-bold text-orange-600">
                    {requiredQuantity}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.unit}
                  </p>

                </div>

              </div>


              {/* Progress */}
              <div className="mt-5">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-medium text-slate-500">
                    Stock Level
                  </span>

                  <span className="text-xs font-semibold text-slate-700">
                    {Math.round(percentage)}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />

                </div>

              </div>


              {/* Supplier */}
              <div className="mt-5 border-t border-slate-100 pt-4">

                <div className="flex justify-between">

                  <div>

                    <p className="text-xs text-slate-400">
                      Supplier
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {item.supplier}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-xs text-slate-400">
                      Last Restocked
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {item.lastRestocked}
                    </p>

                  </div>

                </div>

              </div>


              {/* Action */}
              <button
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <ShoppingCart className="h-4 w-4" />

                Create Restock Request

                <ArrowUp className="h-4 w-4" />

              </button>

            </div>
          );
        })}

      </div>


      {/* Empty state */}
      {filteredItems.length === 0 && (

        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">

          <Package className="mx-auto h-10 w-10 text-slate-300" />

          <h3 className="mt-3 font-semibold text-slate-900">
            No low stock items
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            No items match your current filters.
          </p>

        </div>

      )}

    </div>
  );
}

export default InventoryLowStockPage;
    