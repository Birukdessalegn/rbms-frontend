import { useEffect, useState } from "react";
import { Plus, Users, MapPin, Trash2, CheckCircle2, XCircle, X } from "lucide-react";
import api from "../../../services/api";

function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    tableNumber: "",
    capacity: 2,
    location: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);

      const data = await api("/pos/tables");

      setTables(data.tables || []);

    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCreateTable = async (e) => {
    e.preventDefault();

    try {
      const data = await api("/pos/tables", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      // Add newly created table immediately
      setTables((previous) => [
        ...previous,
        data.table,
      ]);

      showToast(`Table "${formData.tableNumber}" created successfully!`, "success");

      // Reset form
      setFormData({
        tableNumber: "",
        capacity: 2,
        location: "",
      });

      setShowForm(false);

    } catch (error) {
      console.error("Create table error:", error);
      showToast(error.message || "Failed to create table", "error");
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm("Are you sure you want to delete this table?")) return;

    try {
      try {
        await api(`/tables/${id}`, {
          method: "DELETE",
        });
      } catch {
        await api(`/pos/tables/${id}`, {
          method: "DELETE",
        });
      }

      setTables((previous) => previous.filter((table) => table.id !== id));
      showToast("Table deleted successfully!", "success");
    } catch (error) {
      console.error("Delete table error:", error);
      showToast(error.message || "Failed to delete table", "error");
    }
  };

  return (
    <div className="relative space-y-6">

      {/* SUCCESS / ERROR TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            toast.type === "success"
              ? "bg-slate-900/95 border border-emerald-500/40 text-emerald-200"
              : "bg-slate-900/95 border border-rose-500/40 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}

          <span className="text-sm font-semibold">{toast.message}</span>

          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Restaurant Tables
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage tables where customers can sit and dine.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </button>

      </div>


      {/* Create Form */}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Add Restaurant Table
            </h2>

            <p className="text-sm text-slate-500">
              Create a table for customer seating.
            </p>
          </div>

          <form
            onSubmit={handleCreateTable}
            className="grid gap-4 md:grid-cols-3"
          >

            {/* Table Number */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Table Number
              </label>

              <input
                type="text"
                placeholder="T1"
                value={formData.tableNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tableNumber: e.target.value,
                  })
                }
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>


            {/* Capacity */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Capacity
              </label>

              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: Number(e.target.value),
                  })
                }
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>


            {/* Location */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Location
              </label>

              <input
                type="text"
                placeholder="Main Hall"
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>


            {/* Buttons */}

            <div className="md:col-span-3 flex justify-end gap-3">

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Table
              </button>

            </div>

          </form>

        </div>
      )}


      {/* Tables */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Tables
          </h2>

          <p className="text-sm text-slate-500">
            {tables.length} tables configured
          </p>
        </div>


        {loading ? (
          <p className="text-sm text-slate-500">
            Loading tables...
          </p>
        ) : tables.length === 0 ? (

          <div className="py-12 text-center">

            <p className="text-sm font-semibold text-slate-600">
              No tables yet
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Click "Add Table" to create your first table.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

            {tables.map((table) => (

              <div
                key={table.id}
                className="rounded-2xl border border-slate-200 p-5 hover:shadow-md transition"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        table.status === "available"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {table.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteTable(table.id)}
                      title="Delete Table"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {table.table_number}
                </h3>

                <div className="mt-2 space-y-1">

                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {table.capacity} seats
                  </p>

                  {table.location && (
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {table.location}
                    </p>
                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

export default TablesPage;