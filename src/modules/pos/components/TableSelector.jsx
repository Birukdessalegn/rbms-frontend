import { useState } from "react";

const tables = [
  { id: 1, name: "Table 1", seats: 2, status: "available" },
  { id: 2, name: "Table 2", seats: 4, status: "occupied" },
  { id: 3, name: "Table 3", seats: 4, status: "available" },
  { id: 4, name: "Table 4", seats: 6, status: "reserved" },
  { id: 5, name: "Table 5", seats: 2, status: "available" },
  { id: 6, name: "Table 6", seats: 8, status: "occupied" },
  { id: 7, name: "Table 7", seats: 4, status: "available" },
  { id: 8, name: "Table 8", seats: 6, status: "available" },
];

function TableSelector({ selectedTable: selectedTableProp, onSelectTable }) {
  const [internalSelectedTable, setInternalSelectedTable] = useState(null);
  const selectedTable = selectedTableProp !== undefined ? selectedTableProp : internalSelectedTable;

  const handleSelect = (tableId) => {
    if (selectedTableProp === undefined) {
      setInternalSelectedTable(tableId);
    }
    if (onSelectTable) {
      onSelectTable(tableId);
    }
  };

  const getStatusStyles = (status) => {
    if (status === "available") {
      return "border-green-200 bg-green-50 text-green-700 hover:border-green-400";
    }

    if (status === "occupied") {
      return "border-red-200 bg-red-50 text-red-700 cursor-not-allowed";
    }

    if (status === "reserved") {
      return "border-yellow-200 bg-yellow-50 text-yellow-700 cursor-not-allowed";
    }

    return "";
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {tables.map((table) => {
          const isAvailable = table.status === "available";
          const isSelected = selectedTable === table.id;

          return (
            <button
              key={table.id}
              disabled={!isAvailable}
              onClick={() => handleSelect(table.id)}
              className={`
                rounded-xl border p-4 text-center transition
                ${getStatusStyles(table.status)}
                ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
              `}
            >
              <div className="text-lg font-bold">
                {table.name.replace("Table ", "T")}
              </div>

              <div className="mt-1 text-xs">
                {table.seats} seats
              </div>

              <div className="mt-2 text-xs font-medium capitalize">
                {table.status}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected table */}
      {selectedTable && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Table {selectedTable} selected for this order.
        </div>
      )}
    </div>
  );
}

export default TableSelector;