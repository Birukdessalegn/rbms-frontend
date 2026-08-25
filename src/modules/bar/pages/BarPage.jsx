import {
  Wine,
  ClipboardList,
  Flame,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    title: "New Orders",
    value: "8",
    description: "Waiting for preparation",
    icon: ClipboardList,
  },
  {
    title: "Preparing",
    value: "5",
    description: "Currently being prepared",
    icon: Flame,
  },
  {
    title: "Ready Orders",
    value: "12",
    description: "Ready for pickup",
    icon: CheckCircle2,
  },
  {
    title: "Today's Orders",
    value: "64",
    description: "Total drink orders today",
    icon: TrendingUp,
  },
];

const recentOrders = [
  {
    id: "#B-1042",
    table: "Table 4",
    items: "2 Mojito, 1 Cola",
    status: "New",
    time: "2 min ago",
  },
  {
    id: "#B-1041",
    table: "Table 8",
    items: "3 Beer, 2 Juice",
    status: "Preparing",
    time: "6 min ago",
  },
  {
    id: "#B-1040",
    table: "Table 2",
    items: "2 Cappuccino",
    status: "Ready",
    time: "9 min ago",
  },
  {
    id: "#B-1039",
    table: "Table 6",
    items: "1 Cocktail, 2 Water",
    status: "Ready",
    time: "12 min ago",
  },
];

function BarPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Wine className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bar Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Monitor drink orders and bar operations.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
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

                  <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Icon className="h-5 w-5" />
                </div>

              </div>
            </div>
          );
        })}

      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>
              <h2 className="font-bold text-slate-900">
                Recent Drink Orders
              </h2>

              <p className="text-xs text-slate-500">
                Latest orders received by the bar
              </p>
            </div>

            <Clock3 className="h-5 w-5 text-slate-400" />

          </div>

          <div className="divide-y divide-slate-100">

            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
              >

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <span className="text-sm font-bold text-slate-900">
                      {order.id}
                    </span>

                    <span className="text-xs text-slate-400">
                      •
                    </span>

                    <span className="text-xs font-medium text-slate-500">
                      {order.table}
                    </span>

                  </div>

                  <p className="mt-1 truncate text-sm text-slate-600">
                    {order.items}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    {order.time}
                  </p>

                </div>

                <StatusBadge status={order.status} />

              </div>
            ))}

          </div>

        </div>

        {/* Quick Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="font-bold text-slate-900">
            Bar Overview
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Current workload
          </p>

          <div className="mt-6 space-y-5">

            <ProgressItem
              label="New Orders"
              value={8}
              total={20}
            />

            <ProgressItem
              label="Preparing"
              value={5}
              total={20}
            />

            <ProgressItem
              label="Ready"
              value={12}
              total={20}
            />

          </div>

          <div className="mt-6 rounded-xl bg-purple-50 p-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
                <Wine className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-purple-900">
                  Bar is operational
                </p>

                <p className="text-xs text-purple-700">
                  Orders are being processed normally.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    New: "bg-blue-50 text-blue-700 border-blue-200",
    Preparing: "bg-amber-50 text-amber-700 border-amber-200",
    Ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
        styles[status] || "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function ProgressItem({ label, value, total }) {
  const percentage = Math.min((value / total) * 100, 100);

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-500">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-purple-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

    </div>
  );
}

export default BarPage;