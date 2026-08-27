import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

const stats = [
  {
    title: "Total Items",
    value: "248",
    description: "Items in inventory",
    icon: Package,
  },
  {
    title: "Stock Value",
    value: "485,600 ETB",
    description: "Current inventory value",
    icon: Boxes,
  },
  {
    title: "Low Stock",
    value: "18",
    description: "Items need attention",
    icon: AlertTriangle,
  },
  {
    title: "Out of Stock",
    value: "5",
    description: "Items unavailable",
    icon: TrendingDown,
  },
];

const recentMovements = [
  {
    item: "Cooking Oil",
    type: "Stock In",
    quantity: "20 L",
    date: "Aug 25, 2026",
    user: "Storekeeper",
  },
  {
    item: "Chicken Breast",
    type: "Stock Out",
    quantity: "15 Kg",
    date: "Aug 25, 2026",
    user: "Kitchen",
  },
  {
    item: "Soft Drinks",
    type: "Stock In",
    quantity: "5 Boxes",
    date: "Aug 24, 2026",
    user: "Storekeeper",
  },
  {
    item: "Tomatoes",
    type: "Stock Out",
    quantity: "10 Kg",
    date: "Aug 24, 2026",
    user: "Kitchen",
  },
];

const lowStockItems = [
  {
    name: "Cooking Oil",
    category: "Ingredients",
    current: "8 L",
    minimum: "15 L",
  },
  {
    name: "Tomatoes",
    category: "Vegetables",
    current: "5 Kg",
    minimum: "20 Kg",
  },
  {
    name: "Chicken Breast",
    category: "Meat",
    current: "7 Kg",
    minimum: "15 Kg",
  },
  {
    name: "Mineral Water",
    category: "Beverages",
    current: "12 Bottles",
    minimum: "30 Bottles",
  },
];

function InventoryPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Inventory Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor stock levels, inventory value, and stock movements.
        </p>
      </div>


      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>

                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>

              </div>

            </div>
          );
        })}

      </div>


      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">


        {/* Recent Movements */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>
              <h2 className="font-bold text-slate-900">
                Recent Stock Movements
              </h2>

              <p className="text-xs text-slate-500">
                Latest inventory activity
              </p>
            </div>

            <Boxes className="h-5 w-5 text-blue-600" />

          </div>


          <div className="divide-y divide-slate-100">

            {recentMovements.map((movement, index) => {

              const isStockIn = movement.type === "Stock In";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between px-5 py-4"
                >

                  <div className="flex items-center gap-3">

                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isStockIn
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {isStockIn ? (
                        <ArrowDownToLine className="h-4 w-4" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4" />
                      )}
                    </div>


                    <div>

                      <p className="text-sm font-semibold text-slate-900">
                        {movement.item}
                      </p>

                      <p className="text-xs text-slate-400">
                        {movement.date} • {movement.user}
                      </p>

                    </div>

                  </div>


                  <div className="text-right">

                    <p
                      className={`text-sm font-bold ${
                        isStockIn
                          ? "text-emerald-600"
                          : "text-orange-600"
                      }`}
                    >
                      {isStockIn ? "+" : "-"}
                      {movement.quantity}
                    </p>

                    <p className="text-xs text-slate-400">
                      {movement.type}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </div>


        {/* Low Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>
              <h2 className="font-bold text-slate-900">
                Low Stock Alerts
              </h2>

              <p className="text-xs text-slate-500">
                Items requiring restocking
              </p>
            </div>

            <AlertTriangle className="h-5 w-5 text-orange-500" />

          </div>


          <div className="divide-y divide-slate-100">

            {lowStockItems.map((item) => (

              <div
                key={item.name}
                className="flex items-center justify-between px-5 py-4"
              >

                <div>

                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.category}
                  </p>

                </div>


                <div className="text-right">

                  <p className="text-sm font-bold text-orange-600">
                    {item.current}
                  </p>

                  <p className="text-xs text-slate-400">
                    Minimum: {item.minimum}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>


      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="font-bold text-slate-900">
          Inventory Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage your restaurant inventory and stock operations.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <button className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50">

            <ArrowDownToLine className="h-5 w-5 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Stock In
              </p>

              <p className="text-xs text-slate-500">
                Receive new inventory
              </p>
            </div>

          </button>


          <button className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50">

            <ArrowUpFromLine className="h-5 w-5 text-orange-600" />

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Stock Out
              </p>

              <p className="text-xs text-slate-500">
                Record inventory usage
              </p>
            </div>

          </button>


          <button className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50">

            <TrendingUp className="h-5 w-5 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-slate-900">
                View Reports
              </p>

              <p className="text-xs text-slate-500">
                Analyze inventory
              </p>
            </div>

          </button>

        </div>

      </div>

    </div>
  );
}

export default InventoryPage;