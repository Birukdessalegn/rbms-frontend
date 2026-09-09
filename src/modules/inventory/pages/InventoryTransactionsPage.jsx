import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Truck,
  PackageCheck,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  FileText,
  Eye,
  ShieldCheck,
  X,
  Building2,
  Wine,
  UtensilsCrossed,
  Check,
} from "lucide-react";
import api from "../../../services/api";

export default function InventoryTransactionsPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "dispatched" | "completed" | "pending"
  const [deptFilter, setDeptFilter] = useState("all"); // "all" | "bar" | "kitchen"
  const [activeTab, setActiveTab] = useState("transfers"); // "transfers" | "movements"

  // Selected Transfer Detail Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [manualReceivingNotes, setManualReceivingNotes] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const handleCloseModal = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedTransfer(null);
    setManualReceivingNotes("");
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    };
    if (selectedTransfer) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedTransfer, handleCloseModal]);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/inventory/transfers?limit=100");
      const list = res?.data || (Array.isArray(res) ? res : []);
      setTransfers(list);
    } catch (err) {
      console.error("Failed to load inventory transfers:", err);
      setError(err?.message || "Failed to load stock movements and transfers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Handle Mark Received (storekeeper assist)
  const handleMarkReceived = async (transferId) => {
    try {
      setIsReceiving(true);
      setError("");
      const res = await api(`/inventory/transfers/${transferId}/receive`, {
        method: "PUT",
        body: JSON.stringify({
          receivingNotes: manualReceivingNotes.trim() || "Verified and confirmed received by inventory controller",
        }),
      });

      if (res?.success || res?.data) {
        setActionSuccess(`Transfer received and added to ${res.data?.to_location?.toUpperCase() || "department"} inventory!`);
        setTimeout(() => setActionSuccess(""), 4000);
        setManualReceivingNotes("");
        await fetchTransfers();
        if (selectedTransfer?.id === transferId) {
          setSelectedTransfer(res.data);
        }
      }
    } catch (err) {
      setError(err?.message || "Failed to confirm receipt");
    } finally {
      setIsReceiving(false);
    }
  };

  // Filtered transfers list
  const filteredTransfers = useMemo(() => {
    return transfers.filter((item) => {
      const q = search.toLowerCase();
      const transferNum = (item.transfer_number || "").toLowerCase();
      const dispBy = (item.dispatched_by_username || "").toLowerCase();
      const recBy = (item.received_by_username || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      const recNotes = (item.receiving_notes || "").toLowerCase();
      const toLoc = (item.to_location || "").toLowerCase();

      // Check item names in transfer
      const hasMatchingProduct = Array.isArray(item.items)
        ? item.items.some((prod) => (prod.product_name || "").toLowerCase().includes(q))
        : false;

      const matchesSearch =
        !q ||
        transferNum.includes(q) ||
        dispBy.includes(q) ||
        recBy.includes(q) ||
        notes.includes(q) ||
        recNotes.includes(q) ||
        toLoc.includes(q) ||
        hasMatchingProduct;

      const matchesStatus =
        statusFilter === "all" ||
        (item.status || "").toLowerCase() === statusFilter.toLowerCase();

      const matchesDept =
        deptFilter === "all" ||
        (item.to_location || "").toLowerCase() === deptFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [transfers, search, statusFilter, deptFilter]);

  // Statistics counters
  const totalCount = transfers.length;
  const inTransitCount = transfers.filter((t) => (t.status || "").toLowerCase() === "dispatched").length;
  const completedCount = transfers.filter((t) => (t.status || "").toLowerCase() === "completed").length;
  const totalQtyTransferred = transfers.reduce((acc, t) => acc + Number(t.total_quantity || 0), 0);

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Stock Movements & Acceptance Audit
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track warehouse dispatches, in-transit deliveries, and verify exactly who received and accepted each item.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTransfers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTransfers}
            className="font-bold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Transfers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Total Transfers</p>
              <p className="text-xl font-black text-slate-900">{totalCount}</p>
              <p className="text-[10px] text-slate-400">Warehouse records</p>
            </div>
          </div>
        </div>

        {/* In Transit / Pending Acceptance */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Truck className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-amber-700">In Transit</p>
              <p className="text-xl font-black text-amber-900">{inTransitCount}</p>
              <p className="text-[10px] text-amber-700">Awaiting acceptance</p>
            </div>
          </div>
        </div>

        {/* Received & Accepted */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-emerald-700">Accepted & Verified</p>
              <p className="text-xl font-black text-emerald-900">{completedCount}</p>
              <p className="text-[10px] text-emerald-700">Fully received</p>
            </div>
          </div>
        </div>

        {/* Total Units Moved */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Total Units Restocked</p>
              <p className="text-xl font-black text-purple-900">{totalQtyTransferred}</p>
              <p className="text-[10px] text-slate-400">Outlets restocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transfer #, product, or staff..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="dispatched">In Transit / Dispatched (Pending Acceptance)</option>
              <option value="completed">Received & Accepted</option>
              <option value="pending">Pending Approval</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Destination Department Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="all">All Destinations (Bar & Kitchen)</option>
              <option value="bar">Bar Only</option>
              <option value="kitchen">Kitchen Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Transfers Table with Acceptance Details */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Transfers & Acceptance Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredTransfers.length} records. Click any row or &quot;View Detail&quot; to inspect full chain of custody.
            </p>
          </div>

          {inTransitCount > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <Truck className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span>{inTransitCount} in-transit awaiting department receipt</span>
            </div>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Transfer / Route</th>
                <th className="px-5 py-3">Items & Qty</th>
                <th className="px-5 py-3">Dispatched By</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Accepted & Received By</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length > 0 ? (
                filteredTransfers.map((item) => {
                  const isDispatched = (item.status || "").toLowerCase() === "dispatched";
                  const isCompleted = (item.status || "").toLowerCase() === "completed";
                  const isPending = (item.status || "").toLowerCase() === "pending";

                  const toLocationUpper = (item.to_location || "").toUpperCase();
                  const isBar = (item.to_location || "").toLowerCase() === "bar";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedTransfer(item)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      {/* Transfer # and Route */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{item.transfer_number}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">Warehouse</span>
                          <span className="text-slate-300">&rarr;</span>
                          <span className={`inline-flex items-center gap-1 font-bold ${isBar ? "text-purple-700" : "text-amber-700"}`}>
                            {isBar ? <Wine className="h-3 w-3" /> : <UtensilsCrossed className="h-3 w-3" />}
                            {toLocationUpper}
                          </span>
                        </div>
                      </td>

                      {/* Items & Qty */}
                      <td className="px-5 py-4">
                        <div className="max-w-[220px]">
                          {Array.isArray(item.items) && item.items.length > 0 ? (
                            <div>
                              <p className="font-semibold text-slate-800 truncate">
                                {item.items[0].product_name || `Product #${item.items[0].product_id}`}
                                {item.items.length > 1 && (
                                  <span className="ml-1 text-slate-400 font-normal">
                                    +{item.items.length - 1} more
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                Total {item.total_quantity || 0} units ({item.items.length} items)
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              {item.total_items || 0} items ({item.total_quantity || 0} units)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dispatched By */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {item.dispatched_by_username || item.requested_by_username || "Storekeeper"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isDispatched ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                            <Truck className="h-3 w-3 animate-pulse text-amber-600" />
                            In Transit
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Received & Accepted
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                            <Clock className="h-3 w-3 text-blue-600" />
                            Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Accepted & Received By (Crucial Detail) */}
                      <td className="px-5 py-4">
                        {isCompleted ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                              <span className="font-bold text-slate-900">
                                {item.received_by_username || "Department Staff"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {formatDate(item.received_at || item.updated_at)}
                            </p>
                            {item.receiving_notes && (
                              <p className="mt-1 text-[11px] italic text-slate-600 max-w-[200px] truncate" title={item.receiving_notes}>
                                &quot;{item.receiving_notes}&quot;
                              </p>
                            )}
                          </div>
                        ) : isDispatched ? (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs font-medium">
                              Awaiting physical count at {toLocationUpper}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransfer(item);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Audit Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ClipboardList className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No stock transfers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search || statusFilter !== "all" || deptFilter !== "all"
                        ? "Try clearing filters to see more results."
                        : "Direct transfers between Warehouse, Bar, and Kitchen will appear here."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ACCEPTANCE AUDIT MODAL */}
      {selectedTransfer && (
        <div
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Transfer Acceptance Details
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedTransfer.transfer_number} &bull; Warehouse to {selectedTransfer.to_location?.toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Visual Chain of Custody Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Chain of Custody & Acceptance Timeline
                </h3>

                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Step 1: Dispatched */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-white shadow-xs">
                      <Truck className="h-3 w-3" />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          Dispatched from Central Warehouse
                        </p>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {formatDate(selectedTransfer.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Dispatched by: <span className="font-bold text-slate-800">{selectedTransfer.dispatched_by_username || "Central Storekeeper"}</span>
                      </p>
                      {selectedTransfer.notes && (
                        <p className="mt-1 text-xs text-slate-500 italic">
                          Notes: &quot;{selectedTransfer.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Physical Acceptance at Outlet */}
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white shadow-xs ${
                        selectedTransfer.status === "completed"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {selectedTransfer.status === "completed" ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>

                    <div
                      className={`rounded-2xl border p-3.5 ${
                        selectedTransfer.status === "completed"
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-amber-200 bg-amber-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          {selectedTransfer.status === "completed"
                            ? `Accepted & Verified at ${selectedTransfer.to_location?.toUpperCase()}`
                            : `In-Transit to ${selectedTransfer.to_location?.toUpperCase()}`}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {selectedTransfer.status === "completed"
                            ? formatDate(selectedTransfer.received_at || selectedTransfer.updated_at)
                            : "Pending Confirmation"}
                        </span>
                      </div>

                      {selectedTransfer.status === "completed" ? (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-slate-700">
                            Accepted by:{" "}
                            <span className="font-bold text-emerald-900">
                              {selectedTransfer.received_by_username || "Department Staff"}
                            </span>
                          </p>
                          <p className="text-slate-700">
                            Acceptance Timestamp:{" "}
                            <span className="font-semibold text-slate-800">
                              {formatDate(selectedTransfer.received_at || selectedTransfer.updated_at)}
                            </span>
                          </p>
                          <div className="mt-2 rounded-xl bg-white/80 p-2.5 border border-emerald-200/60">
                            <p className="text-[11px] font-bold text-emerald-800 uppercase">
                              Inspection & Verification Notes:
                            </p>
                            <p className="text-xs text-slate-700 italic mt-0.5">
                              &quot;{selectedTransfer.receiving_notes || "Physical count verified and accepted in good order."}&quot;
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-amber-800">
                          <p>
                            Physical delivery has left the warehouse. The staff at{" "}
                            <span className="font-bold">{selectedTransfer.to_location?.toUpperCase()}</span> can confirm and accept the items on their screen once counted.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items in this Delivery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Transferred Items
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedTransfer.items?.length || selectedTransfer.total_items || 0} items &bull; {selectedTransfer.total_quantity || 0} units
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
                  {Array.isArray(selectedTransfer.items) && selectedTransfer.items.length > 0 ? (
                    selectedTransfer.items.map((prod, idx) => (
                      <div key={prod.id || idx} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <PackageCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                              {prod.product_name || `Product #${prod.product_id}`}
                            </p>
                            {prod.product_code && (
                              <p className="text-[10px] text-slate-400">
                                SKU: {prod.product_code}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">
                            +{prod.quantity}
                          </span>
                          <span className="ml-1 text-xs text-slate-500 font-medium">
                            {prod.unit || "pcs"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Item details recorded in transfer items summary.
                    </div>
                  )}
                </div>
              </div>

              {/* Storekeeper Assist: Mark Received if still dispatched */}
              {selectedTransfer.status === "dispatched" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    <h4 className="text-xs font-bold text-blue-900">
                      Storekeeper / Controller Assistance
                    </h4>
                  </div>
                  <p className="text-xs text-blue-700">
                    If {selectedTransfer.to_location?.toUpperCase()} staff called to confirm phone delivery, you can record acceptance here on their behalf.
                  </p>
                  <input
                    type="text"
                    value={manualReceivingNotes}
                    onChange={(e) => setManualReceivingNotes(e.target.value)}
                    placeholder="e.g. Phone confirmed with bartender Dawit, verified 24 units"
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleMarkReceived(selectedTransfer.id)}
                    disabled={isReceiving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
                  >
                    {isReceiving ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>Confirm Received & Record Audit Trail</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}