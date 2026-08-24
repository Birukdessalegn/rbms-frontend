import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
} from "lucide-react";

const stats = [
  {
    title: "Today's Orders",
    value: "128",
    change: "+12.5%",
    icon: ShoppingCart,
  },
  {
    title: "Active Tables",
    value: "24",
    change: "+4.2%",
    icon: Utensils,
  },
  {
    title: "Customers Today",
    value: "186",
    change: "+8.1%",
    icon: Users,
  },
  {
    title: "Today's Revenue",
    value: "48,420 ETB",
    change: "+15.3%",
    icon: DollarSign,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here's what's happening in your restaurant and bar today.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </h2>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />

                <span className="font-medium text-green-600">
                  {stat.change}
                </span>

                <span className="text-gray-400">
                  from last month
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h2 className="font-semibold text-gray-900">
                Recent Orders
              </h2>

              <p className="text-sm text-gray-500">
                Latest restaurant and bar orders
              </p>
            </div>

            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {[
              {
                customer: "Abebe Kebede",
                order: "#ORD-1024",
                type: "Restaurant",
                amount: "850 ETB",
                status: "Completed",
              },
              {
                customer: "Sara Ahmed",
                order: "#ORD-1023",
                type: "Bar",
                amount: "1,250 ETB",
                status: "Preparing",
              },
              {
                customer: "John Smith",
                order: "#ORD-1022",
                type: "Restaurant",
                amount: "620 ETB",
                status: "Pending",
              },
              {
                customer: "Meron Tesfaye",
                order: "#ORD-1021",
                type: "Bar",
                amount: "1,850 ETB",
                status: "Completed",
              },
            ].map((order) => (
              <div
                key={order.order}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {order.customer}
                  </p>

                  <p className="text-sm text-gray-500">
                    {order.order} · {order.type}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {order.amount}
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      order.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : order.status === "Preparing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900">
              Quick Actions
            </h2>

            <p className="text-sm text-gray-500">
              Common restaurant and bar operations
            </p>
          </div>

          <div className="space-y-3 p-5">
            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />

              <div>
                <p className="font-medium text-gray-900">
                  New Order
                </p>

                <p className="text-xs text-gray-500">
                  Create a restaurant or bar order
                </p>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Utensils className="h-5 w-5 text-green-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Table Management
                </p>

                <p className="text-xs text-gray-500">
                  View and manage tables
                </p>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Users className="h-5 w-5 text-purple-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Customers
                </p>

                <p className="text-xs text-gray-500">
                  Manage customer information
                </p>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50">
              <Clock className="h-5 w-5 text-orange-600" />

              <div>
                <p className="font-medium text-gray-900">
                  Today's Activity
                </p>

                <p className="text-xs text-gray-500">
                  View today's restaurant and bar activity
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}