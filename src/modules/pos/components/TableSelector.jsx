import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Wine, UtensilsCrossed, Armchair, Search, Sparkles } from "lucide-react";

// Helper to determine if a table is a bar stool/counter seat
export const isBarSeatTable = (table) => {
  if (!table) return false;
  return (
    table.is_bar_seat === true ||
    table.is_bar_seat === 1 ||
    table.is_bar_seat === "true" ||
    table.isBarSeat === true ||
    table.type === "bar" ||
    table.section === "BAR" ||
    String(table.location || "").toLowerCase().includes("bar") ||
    String(table.table_number || "").toLowerCase().startsWith("bar") ||
    String(table.table_number || "").toLowerCase().startsWith("b-")
  );
};

function TableSelector({
  tables: initialTables = [],
  loading: externalLoading,
  selectedTable,
  onSelectTable,
}) {
  const { user } = useAuth();
  const [tables, setTables] = useState(initialTables);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeOrders, setActiveOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const userRole = (user?.role || "").toUpperCase();
  const isBartender = userRole === "BARTENDER" || user?.role_id === 8;

  // Default active tab: If user is bartender, default to BAR seats!
  const [activeTab, setActiveTab] = useState(isBartender ? "BAR" : "ALL");

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

      setTables(data.tables || data.data || (Array.isArray(data) ? data : []));
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

  // Synchronize when external tables are updated
  useEffect(() => {
    if (initialTables && initialTables.length > 0) {
      setTables(initialTables);
    }
  }, [initialTables]);

  const currentEmployeeId = user?.employee_id || user?.employeeId || user?.id;
  const isManagerOrAdmin =
    ["ADMIN", "MANAGER", "CASHIER"].includes(userRole) ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 4;

  // Counts for tabs
  const counts = useMemo(() => {
    let barCount = 0;
    let diningCount = 0;
    tables.forEach((t) => {
      if (isBarSeatTable(t)) {
        barCount++;
      } else {
        diningCount++;
      }
    });
    return {
      all: tables.length,
      bar: barCount,
      dining: diningCount,
    };
  }, [tables]);

  // Filtered tables based on tab and search
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const isBar = isBarSeatTable(table);

      if (activeTab === "BAR" && !isBar) return false;
      if (activeTab === "DINING" && isBar) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = String(table.table_number || table.tableNumber || "").toLowerCase();
        const loc = String(table.location || "").toLowerCase();
        return num.includes(q) || loc.includes(q);
      }

      return true;
    });
  }, [tables, activeTab, searchQuery]);

  if (loading && tables.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Loading floor tables & bar stools...</p>
      </div>
    );
  }

  if (error && tables.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
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

  return (
    <div className="space-y-3">
      {/* Header with Title, Bartender Indicator & Refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              Select Table / Bar Seat
              {isBartender && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 flex items-center gap-1">
                  <Wine className="h-3 w-3" /> Bartender Mode
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              {isBartender
                ? "Assign this order to a bar stool or dining guest"
                : "Choose a dining table or bar seat to assign this order"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchTables();
            fetchActiveOrders();
          }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition self-start sm:self-auto"
        >
          Refresh Floor
        </button>
      </div>

      {/* Filter Tabs & Quick Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAR")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${
              activeTab === "BAR"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <Wine className="h-3 w-3" />
            Bar Stools ({counts.bar})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DINING")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${
              activeTab === "DINING"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-800 hover:bg-blue-100/60"
            }`}
          >
            <UtensilsCrossed className="h-3 w-3" />
            Dining ({counts.dining})
          </button>
        </div>

        {/* Quick Search inside TableSelector */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white py-1 pl-8 pr-2.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of Tables & Bar Stools */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredTables.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isBar = isBarSeatTable(table);

          const activeOrderForTable = activeOrders.find((o) => {
            const isUnpaid =
              o.status !== "completed" &&
              o.status !== "paid" &&
              o.payment_status !== "paid" &&
              o.is_paid !== true;

            if (!isUnpaid) return false;

            const amt = Number(o.total_amount || o.total || o.grand_total || o.subtotal || 0);
            if (amt <= 0) return false;

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

          const hasActiveUnpaidOrder = Boolean(activeOrderForTable);
          const isAvailable = !hasActiveUnpaidOrder;
          const displayStatus = isAvailable ? "available" : "occupied";

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

          const canSelectTable = isAvailable || isMyTable || isManagerOrAdmin || (isBartender && isBar);

          return (
            <button
              key={table.id}
              type="button"
              disabled={!canSelectTable}
              onClick={() => canSelectTable && onSelectTable(table)}
              className={`
                relative rounded-xl border p-3.5 text-left transition
                ${
                  isSelected
                    ? isBar
                      ? "border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/30 shadow-md"
                      : "border-blue-600 bg-blue-50/90 ring-2 ring-blue-600/30 shadow-md"
                    : canSelectTable && isAvailable
                    ? isBar
                      ? "border-amber-200/90 bg-linear-to-b from-amber-50/30 to-white hover:border-amber-400 hover:bg-amber-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 shadow-xs"
                    : canSelectTable && !isAvailable
                    ? "border-amber-300 bg-amber-50/60 hover:border-amber-400 shadow-xs"
                    : "cursor-not-allowed border-rose-200/80 bg-slate-100/70 opacity-65 border-dashed"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{isBar ? "🍸" : "🍽️"}</span>
                  <span className="text-sm font-black text-slate-900 truncate">
                    {table.table_number || table.tableNumber || `Table #${table.id}`}
                  </span>
                </div>

                <span
                  className={`
                    rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider
                    ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-900 border border-amber-200"
                    }
                  `}
                >
                  {displayStatus}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  {table.capacity || 1} {table.capacity === 1 ? "seat" : "seats"}
                </span>

                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    isBar
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isBar ? "Bar Stool" : "Dining"}
                </span>
              </div>

              {/* Show Waiter/Bartender Badge if Occupied and Selectable */}
              {!isAvailable && canSelectTable && (
                <div className="mt-2 flex items-center gap-1 rounded-lg bg-amber-100/90 px-2 py-1 text-[10px] font-bold text-amber-950 border border-amber-200/80">
                  <span>👤</span>
                  <span className="truncate">Serving: {waiterName || (isBar ? "Bartender" : "Waiter")}</span>
                </div>
              )}

              {/* Show Lock Tag if locked for another staff */}
              {!canSelectTable && (
                <div
                  className="mt-2 flex items-center gap-1 rounded-lg bg-rose-100/90 px-2 py-1 text-[9px] font-extrabold text-rose-900 border border-rose-200"
                  title={`Occupied by ${waiterName || "another staff"}`}
                >
                  🔒 Occupied by {waiterName || "another staff"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-600">
            No tables or bar seats found in this section.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === "BAR"
              ? "Create Bar Stools in Floor Management (/pos/tables) to assign bar orders."
              : "Create tables from the table management page."}
          </p>
        </div>
      )}
    </div>
  );
}

export default TableSelector;