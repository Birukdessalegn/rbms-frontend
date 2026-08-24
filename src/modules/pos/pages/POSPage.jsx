import TableSelector from "../components/TableSelector";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import CurrentOrder from "../components/CurrentOrder";

function POSPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage restaurant and bar orders.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Hold Order
          </button>

          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            New Order
          </button>
        </div>
      </div>

      {/* Order Type */}
      <div className="flex gap-2">
        <button className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white">
          Dine In
        </button>

        <button className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
          Takeaway
        </button>

        <button className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
          Delivery
        </button>
      </div>

      {/* Main POS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left side */}
        <div className="space-y-6 xl:col-span-2">

          {/* Tables */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Tables
              </h2>

              <p className="text-sm text-gray-500">
                Select a table for this order.
              </p>
            </div>

            <TableSelector />
          </div>

          {/* Products */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">

            <CategoryTabs />

            <div className="mt-5">
              <ProductGrid />
            </div>

          </div>
        </div>

        {/* Right side */}
        <div className="xl:col-span-1">
          <CurrentOrder />
        </div>

      </div>
    </div>
  );
}

export default POSPage;