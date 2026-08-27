import { useEffect, useState } from "react";

function TableSelector({
  selectedTable,
  onSelectTable,
}) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError("");


      const response = await fetch(`${import.meta.env.VITE_API_URL}/pos/tables`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
})

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch tables"
        );
      }

      setTables(data.tables || []);

    } catch (error) {
      console.error("Fetch tables error:", error);
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Loading tables...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          {error}
        </p>

        <button
          onClick={fetchTables}
          className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">
          Select Table
        </h3>

        <p className="text-xs text-slate-500">
          Choose a table for this order
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => {

          const isSelected =
            selectedTable?.id === table.id;

          const isAvailable =
            table.status === "available";

          return (
            <button
              key={table.id}
              disabled={!isAvailable}
              onClick={() => onSelectTable(table)}
              className={`
                rounded-xl border p-4 text-left transition

                ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20"
                    : isAvailable
                    ? "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                }
              `}
            >

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">
                  {table.table_number}
                </span>

                <span
                  className={`
                    rounded-full px-2 py-1 text-[10px] font-semibold

                    ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-500"
                    }
                  `}
                >
                  {table.status}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Capacity: {table.capacity}
              </p>

              {table.location && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {table.location}
                </p>
              )}

            </button>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            No restaurant tables created yet.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Create tables from the table management page.
          </p>
        </div>
      )}
    </div>
  );
}

export default TableSelector;