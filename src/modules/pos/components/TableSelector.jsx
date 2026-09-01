import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

function TableSelector({
  selectedTable,
  onSelectTable,
}) {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeOrders, setActiveOrders] = useState([]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/pos/tables`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tables");
      }

      setTables(data.tables || []);
    } catch (error) {
      console.error("Fetch tables error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const [posRes, kitchenRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/pos/orders`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }).catch(() => null),
        fetch(`${import.meta.env.VITE_API_URL}/kitchen/orders`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }).catch(() => null),
      ]);

      const posData = posRes && posRes.ok ? await posRes.json() : {};
      const kitchenData = kitchenRes && kitchenRes.ok ? await kitchenRes.json() : {};

      const combined = [
        ...(posData.orders || posData.data || (Array.isArray(posData) ? posData : [])),
        ...(kitchenData.orders || kitchenData.data || (Array.isArray(kitchenData) ? kitchenData : [])),
      ];

      setActiveOrders(combined);
    } catch (e) {
      console.log("TableSelector active orders fetch notice:", e);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchActiveOrders();
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
          type="button"
          onClick={() => {
            fetchTables();
            fetchActiveOrders();
          }}
          className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentEmployeeId = user?.employee_id || user?.employeeId || user?.id;
  const userRole = (user?.role || "").toLowerCase();
  const isManagerOrAdmin =
    ["admin", "manager", "cashier"].includes(userRole) ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 4;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Select Table
          </h3>
          <p className="text-xs text-slate-500">
            Choose a table to assign this order
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchTables();
            fetchActiveOrders();
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Refresh Floor
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isAvailable = table.status === "available";

          const activeOrderForTable = activeOrders.find((o) => {
            const oTableId = String(o.table_id || o.tableId || o.table?.id || "");
            const oTableNum = String(
              o.table_number || o.tableNumber || o.table?.table_number || ""
            )
              .toLowerCase()
              .replace(/^t/, "");

            const tId = String(table.id || "");
            const tNum = String(table.table_number || table.tableNumber || "")
              .toLowerCase()
              .replace(/^t/, "");

            return (
              (oTableId && tId && oTableId === tId) ||
              (oTableNum && tNum && oTableNum === tNum) ||
              (oTableId && tNum && oTableId === tNum)
            );
          });

          const rawWaiterName =
            table.current_waiter_name ||
            table.waiter_first_name ||
            table.waiter_name ||
            table.waiterName ||
            table.waiter?.name ||
            activeOrderForTable?.waiter_name ||
            activeOrderForTable?.waiterName ||
            activeOrderForTable?.server_name ||
            activeOrderForTable?.user_name ||
            activeOrderForTable?.user?.username ||
            activeOrderForTable?.waiter?.username ||
            activeOrderForTable?.waiter?.name;

          const waiterName =
            rawWaiterName && rawWaiterName !== "Assigned Waiter" ? rawWaiterName : null;

          const isMyTable =
            (table.current_waiter_id && (
              Number(table.current_waiter_id) === Number(currentEmployeeId) ||
              String(table.current_waiter_id) === String(user?.id)
            )) ||
            (waiterName &&
              (user?.username || user?.name) &&
              waiterName.toLowerCase().includes((user?.username || user?.name).toLowerCase()));

          const canSelectTable = isAvailable || isMyTable || isManagerOrAdmin;

          return (
            <button
              key={table.id}
              type="button"
              disabled={!canSelectTable}
              onClick={() => canSelectTable && onSelectTable(table)}
              className={`
                rounded-xl border p-4 text-left transition relative
                ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20 shadow-md"
                    : canSelectTable && isAvailable
                    ? "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 shadow-xs"
                    : canSelectTable && !isAvailable
                    ? "border-amber-300 bg-amber-50/60 hover:border-amber-400 shadow-xs"
                    : "cursor-not-allowed border-rose-200/80 bg-slate-100/70 opacity-65 border-dashed"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">
                  Table #{table.table_number}
                </span>

                <span
                  className={`
                    rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                    ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-900 border border-amber-200"
                    }
                  `}
                >
                  {table.status}
                </span>
              </div>

              <p className="mt-1.5 text-xs font-medium text-slate-500">
                Capacity: {table.capacity} seats
              </p>

              {/* Show Waiter Badge if Occupied and Selectable (e.g. My Table or Admin) */}
              {table.status === "occupied" && canSelectTable && (
                <div className="mt-2 flex items-center gap-1 rounded-lg bg-amber-100/90 px-2 py-1 text-[11px] font-bold text-amber-950 border border-amber-200/80">
                  <span>👤</span>
                  <span className="truncate">Serving: {waiterName || "Assigned Waiter"}</span>
                </div>
              )}

              {/* Show Lock Tag if locked for another waiter */}
              {!canSelectTable && (
                <div
                  className="mt-2 flex items-center gap-1 rounded-lg bg-rose-100/90 px-2 py-1 text-[10px] font-extrabold text-rose-900 border border-rose-200"
                  title={`Occupied by ${waiterName || "another waiter"}`}
                >
                  🔒 Occupied by {waiterName || "another waiter"}
                </div>
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