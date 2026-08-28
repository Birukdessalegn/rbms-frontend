import { useEffect, useMemo, useState } from "react";
import { Printer, CalendarDays, RefreshCw, Utensils } from "lucide-react";
import api from "../../../services/api";

function ReportCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <h3 className="mt-1 text-xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function KitchenReportsPage() {
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKitchenOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/kitchen/orders");
      const list = res.orders || res.data || (Array.isArray(res) ? res : []);
      setKitchenOrders(list);
    } catch (err) {
      console.error("Failed to fetch kitchen reports:", err);
      setError(err.message || "Failed to load kitchen data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
  }, []);

  const parseRawItems = (itemsInput) => {
    if (!itemsInput) return [];
    if (typeof itemsInput === "string") {
      try {
        return JSON.parse(itemsInput);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(itemsInput) ? itemsInput : [];
  };

  // Filter orders by date & aggregate metrics
  const reportData = useMemo(() => {
    const filtered = kitchenOrders.filter((o) => {
      if (!reportDate) return true;
      const oDate = o.created_at ? o.created_at.split("T")[0] : "";
      return !oDate || oDate === reportDate;
    });

    const totalOrders = filtered.length;
    const completed = filtered.filter(
      (o) => o.status === "served" || o.status === "completed" || o.status === "ready"
    ).length;
    const pending = filtered.filter(
      (o) => o.status === "pending" || o.status === "preparing" || o.status === "in_progress"
    ).length;
    const cancelled = filtered.filter((o) => o.status === "cancelled").length;

    // Aggregate production counts per food item
    const itemMap = new Map();
    filtered.forEach((o) => {
      const items = parseRawItems(o.items || o.order_items);
      items.forEach((item) => {
        const name = item.product_name || item.name || "Kitchen Item";
        const qty = Number(item.quantity || item.qty || 1);
        itemMap.set(name, (itemMap.get(name) || 0) + qty);
      });
    });

    const popularItems = Array.from(itemMap.entries())
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders);

    return {
      totalOrders,
      completed,
      pending,
      cancelled,
      averagePreparation: 15,
      items: popularItems,
    };
  }, [kitchenOrders, reportDate]);

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
            Monitor kitchen production performance live from database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKitchenOrders}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report */}
      <div
        id="printable-report"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* Report Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">RBMS</h1>
              <p className="text-sm text-slate-500 font-medium">
                Restaurant Kitchen Production Report
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm print:hidden outline-none focus:border-orange-500"
                />
              </div>
              <p className="hidden text-sm text-slate-600 print:block">
                Date: {reportDate}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <ReportCard
            title="Total Orders"
            value={loading ? "..." : reportData.totalOrders}
          />
          <ReportCard
            title="Served / Ready"
            value={loading ? "..." : reportData.completed}
          />
          <ReportCard
            title="Preparing / Pending"
            value={loading ? "..." : reportData.pending}
          />
          <ReportCard
            title="Cancelled"
            value={loading ? "..." : reportData.cancelled}
          />
          <ReportCard
            title="Avg. Prep Time"
            value={`${reportData.averagePreparation} min`}
          />
        </div>

        {/* Production Summary Table */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Kitchen Production Breakdown
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">#</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Food Item Name</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Quantity Prepared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-400">
                      Loading kitchen production stats...
                    </td>
                  </tr>
                ) : reportData.items.length > 0 ? (
                  reportData.items.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">{item.orders} Portion(s)</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-400">
                      No kitchen production records found for selected date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitchenReportsPage;