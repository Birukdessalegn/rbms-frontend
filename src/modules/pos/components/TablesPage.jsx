import { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Users, 
  MapPin, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Wine, 
  UtensilsCrossed, 
  Crown, 
  Armchair, 
  Search,
  Check,
  Sparkles
} from "lucide-react";
import api from "../../../services/api";

// Helper to determine if a table record is a bar stool/seat
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

// Helper to determine if a table is VIP
export const isVipTable = (table) => {
  if (!table) return false;
  return (
    table.type === "vip" ||
    table.section === "VIP" ||
    String(table.location || "").toLowerCase().includes("vip") ||
    String(table.table_number || "").toLowerCase().startsWith("vip")
  );
};

function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | BAR | DINING | VIP
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    tableNumber: "",
    seatType: "dining", // "dining" | "bar" | "vip"
    capacity: 4,
    location: "Main Dining Hall",
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
      setTables(data.tables || data.data || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // When seatType changes, auto-suggest sensible defaults for capacity and location
  const handleSeatTypeChange = (type) => {
    let defaultCapacity = 4;
    let defaultLocation = "Main Dining Hall";

    if (type === "bar") {
      defaultCapacity = 1;
      defaultLocation = "Bar Counter";
    } else if (type === "vip") {
      defaultCapacity = 6;
      defaultLocation = "VIP Lounge";
    }

    setFormData((prev) => ({
      ...prev,
      seatType: type,
      capacity: defaultCapacity,
      location: defaultLocation,
      // If tableNumber was empty or suggested, give a handy prefix
      tableNumber: prev.tableNumber || (type === "bar" ? "Bar-1" : type === "vip" ? "VIP-1" : "T-1"),
    }));
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();

    const isBar = formData.seatType === "bar";
    const section = isBar ? "BAR" : formData.seatType === "vip" ? "VIP" : "DINING";

    const payload = {
      tableNumber: formData.tableNumber.trim(),
      table_number: formData.tableNumber.trim(),
      capacity: Number(formData.capacity) || 1,
      is_bar_seat: isBar,
      isBarSeat: isBar,
      type: formData.seatType,
      section: section,
      location: formData.location.trim(),
    };

    try {
      const data = await api("/pos/tables", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newTable = data.table || data.data || {
        id: Date.now(),
        ...payload,
        status: "available",
      };

      setTables((previous) => [...previous, newTable]);

      showToast(
        `${isBar ? "Bar Stool" : "Table"} "${formData.tableNumber}" created successfully!`,
        "success"
      );

      // Reset form
      setFormData({
        tableNumber: "",
        seatType: "dining",
        capacity: 4,
        location: "Main Dining Hall",
      });

      setShowForm(false);
    } catch (error) {
      console.error("Create table error:", error);
      showToast(error.message || "Failed to create table", "error");
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm("Are you sure you want to delete this table / seat?")) return;

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
      showToast("Table / Seat deleted successfully!", "success");
    } catch (error) {
      console.error("Delete table error:", error);
      showToast(error.message || "Failed to delete table", "error");
    }
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    const total = tables.length;
    let barCount = 0;
    let vipCount = 0;
    let diningCount = 0;
    let availableCount = 0;
    let totalCapacity = 0;

    tables.forEach((t) => {
      totalCapacity += Number(t.capacity) || 1;
      if (t.status === "available" || !t.status) availableCount++;
      if (isBarSeatTable(t)) {
        barCount++;
      } else if (isVipTable(t)) {
        vipCount++;
      } else {
        diningCount++;
      }
    });

    return {
      total,
      barCount,
      vipCount,
      diningCount,
      availableCount,
      totalCapacity,
    };
  }, [tables]);

  // Filtered tables based on tab & search
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Tab filter
      if (activeTab === "BAR" && !isBarSeatTable(t)) return false;
      if (activeTab === "VIP" && !isVipTable(t)) return false;
      if (activeTab === "DINING" && (isBarSeatTable(t) || isVipTable(t))) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = String(t.table_number || t.tableNumber || "").toLowerCase();
        const loc = String(t.location || "").toLowerCase();
        const sec = String(t.section || "").toLowerCase();
        return num.includes(q) || loc.includes(q) || sec.includes(q);
      }

      return true;
    });
  }, [tables, activeTab, searchQuery]);

  return (
    <div className="relative space-y-6 pb-12">
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

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Tables & Floor Management
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              Floor Plan
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Configure dining tables, bar counter stools, and VIP seating for waiters and bartenders.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close Form" : "Add Table / Bar Seat"}
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Seating</span>
            <Armchair className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="mt-1 text-xs text-slate-400">{metrics.totalCapacity} total seat capacity</p>
        </div>

        <div className="rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50/50 to-orange-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
              <Wine className="h-3.5 w-3.5 text-amber-600" /> Bar Stools
            </span>
            <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
              Bartender
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950">{metrics.barCount}</p>
          <p className="mt-1 text-xs text-amber-700">Direct bar ordering</p>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-linear-to-br from-blue-50/50 to-indigo-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
              <UtensilsCrossed className="h-3.5 w-3.5 text-blue-600" /> Dining Tables
            </span>
            <span className="rounded-full bg-blue-200/70 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-900">
              Dine-In
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-950">{metrics.diningCount}</p>
          <p className="mt-1 text-xs text-blue-700">Main dining room</p>
        </div>

        <div className="rounded-2xl border border-purple-200/70 bg-linear-to-br from-purple-50/50 to-pink-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 text-purple-600" /> VIP Lounge
            </span>
            <span className="rounded-full bg-purple-200/70 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-900">
              VIP
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-950">{metrics.vipCount}</p>
          <p className="mt-1 text-xs text-purple-700">Lounge & private booths</p>
        </div>
      </div>

      {/* CREATE TABLE MODAL / FORM */}
      {showForm && (
        <div className="rounded-2xl border border-blue-200 bg-linear-to-b from-blue-50/30 via-white to-white p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Add New Table / Bar Seat
              </h2>
              <p className="text-sm text-slate-500">
                Designate whether this is a bar counter stool (for bartenders) or a regular dining table.
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateTable} className="space-y-4 max-w-2xl">
            {/* Seat / Table Type Selector */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Seating Type & Designation *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Dining Table Option */}
                <button
                  type="button"
                  onClick={() => handleSeatTypeChange("dining")}
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                    formData.seatType === "dining"
                      ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                      🍽️
                    </span>
                    {formData.seatType === "dining" && (
                      <Check className="h-4 w-4 text-blue-600 font-bold" />
                    )}
                  </div>
                  <span className="mt-2.5 font-bold text-sm text-slate-900">Dining Table</span>
                  <span className="text-[11px] text-slate-500">For dining floor & waiters</span>
                </button>

                {/* Bar Chair / Stool Option */}
                <button
                  type="button"
                  onClick={() => handleSeatTypeChange("bar")}
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                    formData.seatType === "bar"
                      ? "border-amber-600 bg-amber-50/80 ring-2 ring-amber-600/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold">
                      🍸
                    </span>
                    {formData.seatType === "bar" && (
                      <Check className="h-4 w-4 text-amber-600 font-bold" />
                    )}
                  </div>
                  <span className="mt-2.5 font-bold text-sm text-slate-900">Bar Chair / Stool</span>
                  <span className="text-[11px] text-slate-500">Assigned to bar & bartenders</span>
                </button>

                {/* VIP Lounge Booth Option */}
                <button
                  type="button"
                  onClick={() => handleSeatTypeChange("vip")}
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                    formData.seatType === "vip"
                      ? "border-purple-600 bg-purple-50/80 ring-2 ring-purple-600/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                      👑
                    </span>
                    {formData.seatType === "vip" && (
                      <Check className="h-4 w-4 text-purple-600 font-bold" />
                    )}
                  </div>
                  <span className="mt-2.5 font-bold text-sm text-slate-900">VIP Lounge</span>
                  <span className="text-[11px] text-slate-500">Private booth seating</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Table / Stool Number */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {formData.seatType === "bar" ? "Stool / Seat Number *" : "Table Number *"}
                </label>
                <input
                  type="text"
                  placeholder={formData.seatType === "bar" ? "Bar-1 or B1" : "T-1 or 12"}
                  value={formData.tableNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tableNumber: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      capacity: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Location / Section */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Floor Section / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bar Counter, Patio"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                {formData.seatType === "bar" ? "Create Bar Stool" : "Create Table"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Floor ({metrics.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAR")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "BAR"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <Wine className="h-3.5 w-3.5" />
            Bar Stools ({metrics.barCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DINING")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "DINING"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-800 hover:bg-blue-100/60"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Dining Room ({metrics.diningCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VIP")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "VIP"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100/60"
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            VIP ({metrics.vipCount})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search table or seat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* TABLES GRID */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === "BAR"
                ? "🍸 Bar Counter Stools & Seats"
                : activeTab === "VIP"
                ? "👑 VIP Lounge Tables"
                : activeTab === "DINING"
                ? "🍽️ Dining Room Tables"
                : "Floor Overview"}
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredTables.length} of {tables.length} configured seating positions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-3 text-sm font-semibold text-slate-500">Loading tables & seating...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Armchair className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">No tables found</p>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery
                ? "No seating matching your search query."
                : `No seats in the ${activeTab} section yet. Click "Add Table / Bar Seat" to create one.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredTables.map((table) => {
              const isBar = isBarSeatTable(table);
              const isVip = isVipTable(table);
              const isAvailable = table.status === "available" || !table.status;

              return (
                <div
                  key={table.id}
                  className={`relative rounded-2xl border p-4.5 transition hover:shadow-md ${
                    isBar
                      ? "border-amber-200/80 bg-linear-to-b from-amber-50/40 to-white hover:border-amber-400"
                      : isVip
                      ? "border-purple-200/80 bg-linear-to-b from-purple-50/40 to-white hover:border-purple-400"
                      : "border-slate-200 bg-white hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Seat Icon */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                        isBar
                          ? "bg-amber-100 text-amber-800"
                          : isVip
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isBar ? (
                        <Wine className="h-5 w-5" />
                      ) : isVip ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>

                    {/* Status badge & delete */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isAvailable
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {isAvailable ? "Available" : "Occupied"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id)}
                        title="Delete Table"
                        className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Seat / Table Label */}
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                          isBar
                            ? "bg-amber-200/70 text-amber-900"
                            : isVip
                            ? "bg-purple-200/70 text-purple-900"
                            : "bg-slate-200/70 text-slate-800"
                        }`}
                      >
                        {isBar ? "Bar Stool" : isVip ? "VIP" : "Table"}
                      </span>
                    </div>

                    <h3 className="mt-1 text-base font-black text-slate-900 truncate">
                      {table.table_number || table.tableNumber || `Table #${table.id}`}
                    </h3>
                  </div>

                  {/* Seat details */}
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{table.capacity || 1} {table.capacity === 1 ? "seat" : "seats"}</span>
                    </p>

                    {(table.location || isBar) && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {table.location || (isBar ? "Bar Counter" : "Main Floor")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TablesPage;