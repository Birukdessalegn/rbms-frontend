import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Package,
  Edit3,
  Trash2,
  Filter,
} from "lucide-react";

const stockItems = [
  {
    id: 1,
    name: "Chicken Breast",
    category: "Meat",
    unit: "Kg",
    quantity: 42,
    minimum: 15,
    price: 320,
    status: "In Stock",
  },
  {
    id: 2,
    name: "Cooking Oil",
    category: "Ingredients",
    unit: "L",
    quantity: 8,
    minimum: 15,
    price: 280,
    status: "Low Stock",
  },
  {
    id: 3,
    name: "Tomatoes",
    category: "Vegetables",
    unit: "Kg",
    quantity: 5,
    minimum: 20,
    price: 90,
    status: "Low Stock",
  },
  {
    id: 4,
    name: "Mineral Water",
    category: "Beverages",
    unit: "Bottle",
    quantity: 120,
    minimum: 30,
    price: 25,
    status: "In Stock",
  },
  {
    id: 5,
    name: "Rice",
    category: "Grains",
    unit: "Kg",
    quantity: 75,
    minimum: 25,
    price: 110,
    status: "In Stock",
  },
  {
    id: 6,
    name: "Beef",
    category: "Meat",
    unit: "Kg",
    quantity: 0,
    minimum: 10,
    price: 650,
    status: "Out of Stock",
  },
  {
    id: 7,
    name: "Soft Drinks",
    category: "Beverages",
    unit: "Box",
    quantity: 18,
    minimum: 10,
    price: 850,
    status: "In Stock",
  },
  {
    id: 8,
    name: "Onions",
    category: "Vegetables",
    unit: "Kg",
    quantity: 14,
    minimum: 15,
    price: 75,
    status: "Low Stock",
  },
];

function InventoryStockPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || item.category === category;

      const matchesStatus =
        status === "All" || item.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [search, category, status]);

  const categories = [
    "All",
    ...new Set(stockItems.map((item) => item.category)),
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Stock Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View and manage all restaurant inventory items.
          </p>
        </div>

        <button
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>

      </div>


      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">

          {/* Search */}
          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

          </div>


          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? "All Categories"
                  : item}
              </option>
            ))}
          </select>


          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

        </div>

      </div>


      {/* Inventory Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

          <div className="flex items-center gap-2">

            <Package className="h-5 w-5 text-blue-600" />

            <div>

              <h2 className="font-bold text-slate-900">
                Inventory Items
              </h2>

              <p className="text-xs text-slate-500">
                {filteredItems.length} items found
              </p>

            </div>

          </div>

          <Filter className="h-4 w-4 text-slate-400" />

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px] text-left">

            <thead className="bg-slate-50">

              <tr className="border-b border-slate-200">

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Item
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Category
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Quantity
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Minimum
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Unit Price
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (

                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50"
                  >

                    {/* Item */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Package className="h-4 w-4" />
                        </div>

                        <div>

                          <p className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            ID: #{item.id}
                          </p>

                        </div>

                      </div>

                    </td>


                    {/* Category */}

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.category}
                    </td>


                    {/* Quantity */}

                    <td className="px-5 py-4">

                      <span className="font-semibold text-slate-900">
                        {item.quantity}
                      </span>

                      <span className="ml-1 text-xs text-slate-400">
                        {item.unit}
                      </span>

                    </td>


                    {/* Minimum */}

                    <td className="px-5 py-4 text-sm text-slate-600">

                      {item.minimum} {item.unit}

                    </td>


                    {/* Price */}

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">

                      {item.price.toLocaleString()} ETB

                    </td>


                    {/* Status */}

                    <td className="px-5 py-4">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "In Stock"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "Low Stock"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>

                    </td>


                    {/* Actions */}

                    <td className="px-5 py-4">

                      <div className="flex justify-end gap-2">

                        <button
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))
              ) : (

                <tr>

                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center"
                  >

                    <Package className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-2 text-sm font-medium text-slate-600">
                      No inventory items found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your search or filters.
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

export default InventoryStockPage;