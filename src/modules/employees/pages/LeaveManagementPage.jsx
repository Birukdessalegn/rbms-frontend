import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Filter,
  User,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  Phone,
  HelpCircle,
  Briefcase,
  AlertTriangle,
  Info,
} from "lucide-react";
import api from "../../../services/api";
import {
  fetchLeaveRequests,
  fetchLeaveTypes,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../../../services/leaveService";

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal: Create Leave Request
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Modal: Review Action (Approve / Reject)
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    type: "approve", // 'approve' | 'reject'
    request: null,
    comment: "",
    loading: false,
    error: "",
  });

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [reqRes, typesRes, empRes] = await Promise.all([
        fetchLeaveRequests().catch(() => ({ leaveRequests: [] })),
        fetchLeaveTypes().catch(() => []),
        api("/employees").catch(() => []),
      ]);

      setRequests(reqRes.leaveRequests || []);
      setLeaveTypes(typesRes || []);

      const empList =
        (Array.isArray(empRes) ? empRes : null) ||
        empRes.employees ||
        empRes.data?.employees ||
        empRes.data ||
        [];
      setEmployees(empList.filter((e) => e.status !== "inactive"));
    } catch (err) {
      console.error("Failed to load leave management data:", err);
      setError("Failed to load leave records and employee directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Days Difference (Inclusive)
  const computedDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 1;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 3600 * 24)) + 1;
  }, [formData.startDate, formData.endDate]);

  // Selected leave type details
  const selectedLeaveType = useMemo(() => {
    if (!formData.leaveTypeId) return null;
    return leaveTypes.find((t) => String(t.id) === String(formData.leaveTypeId));
  }, [formData.leaveTypeId, leaveTypes]);

  const isUnpaidSelected = useMemo(() => {
    if (!selectedLeaveType) return false;
    return String(selectedLeaveType.name || "").toLowerCase().includes("unpaid");
  }, [selectedLeaveType]);

  // Handle Form Submission
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.employeeId) {
      setFormError("Please select an employee.");
      return;
    }
    if (!formData.leaveTypeId) {
      setFormError("Please select a leave category.");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError("Please select both start and end dates.");
      return;
    }
    if (computedDays <= 0) {
      setFormError("End date must be on or after start date.");
      return;
    }

    try {
      setSubmitting(true);
      await createLeaveRequest({
        employeeId: Number(formData.employeeId),
        leaveTypeId: Number(formData.leaveTypeId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: computedDays,
        reason: formData.reason.trim() || undefined,
      });

      setShowCreateModal(false);
      setFormData({
        employeeId: "",
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      await loadData();
    } catch (err) {
      console.error("Create leave request error:", err);
      setFormError(err.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Review Dialog
  const handleOpenReview = (request, type) => {
    setReviewModal({
      isOpen: true,
      type,
      request,
      comment: "",
      loading: false,
      error: "",
    });
  };

  // Execute Review (Approve or Reject)
  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.request) return;

    if (reviewModal.type === "reject" && !reviewModal.comment.trim()) {
      setReviewModal((prev) => ({
        ...prev,
        error: "Please provide a reason for rejecting this leave request.",
      }));
      return;
    }

    try {
      setReviewModal((prev) => ({ ...prev, loading: true, error: "" }));

      if (reviewModal.type === "approve") {
        await approveLeaveRequest(reviewModal.request.id, reviewModal.comment);
      } else {
        await rejectLeaveRequest(reviewModal.request.id, reviewModal.comment);
      }

      setReviewModal({
        isOpen: false,
        type: "approve",
        request: null,
        comment: "",
        loading: false,
        error: "",
      });
      await loadData();
    } catch (err) {
      console.error("Review action error:", err);
      setReviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to complete review action.",
      }));
    }
  };

  // Filtered Leave Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && (r.status || "pending").toLowerCase() !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== "all" && String(r.leave_type_id) !== String(typeFilter)) {
        return false;
      }
      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const fullName = `${r.first_name || ""} ${r.last_name || ""}`.toLowerCase();
        const code = (r.employee_code || "").toLowerCase();
        const typeName = (r.leave_type || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        return (
          fullName.includes(q) ||
          code.includes(q) ||
          typeName.includes(q) ||
          reason.includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, typeFilter, searchTerm]);

  // Metrics Summary
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedThisMonthCount = requests.filter(
    (r) => r.status === "approved" && (r.start_date || "").startsWith(currentMonthStr)
  ).length;
  const activeOnLeaveTodayCount = requests.filter((r) => {
    if (r.status !== "approved") return false;
    return r.start_date <= todayStr && todayStr <= r.end_date;
  }).length;

  // Helper for Leave Type Badges
  const getLeaveTypeBadge = (typeName) => {
    const name = (typeName || "Leave").toLowerCase();
    if (name.includes("annual") || name.includes("vacation")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-extrabold text-blue-800 border border-blue-200">
          🏖️ {typeName}
        </span>
      );
    }
    if (name.includes("sick")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-extrabold text-purple-800 border border-purple-200">
          🩺 {typeName}
        </span>
      );
    }
    if (name.includes("unpaid")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-800 border border-amber-200">
          ⏳ {typeName} (Unpaid)
        </span>
      );
    }
    if (name.includes("maternity") || name.includes("paternity")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-xs font-extrabold text-pink-800 border border-pink-200">
          👶 {typeName}
        </span>
      );
    }
    if (name.includes("emergency")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-extrabold text-rose-800 border border-rose-200">
          🚨 {typeName}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
        📋 {typeName || "General Leave"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-indigo-600" />
            Employee Leave & Vacation Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Submit leave requests, review staff applications, and seamlessly synchronize approved leave with Attendance & Payroll.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Plus size={16} />
            New Leave Request
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Applications
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{requests.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">All-time recorded</p>
        </div>

        {/* Pending Review */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Review
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-600">Awaiting manager decision</p>
        </div>

        {/* Active On Leave Today */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              On Leave Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-blue-700">{activeOnLeaveTodayCount}</p>
          <p className="mt-1 text-xs font-medium text-blue-600">Auto-marked in attendance</p>
        </div>

        {/* Approved This Month */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved This Month
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700">{approvedThisMonthCount}</p>
          <p className="mt-1 text-xs font-medium text-emerald-600">Scheduled for payroll</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Buttons */}
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              statusFilter === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Approved ({requests.filter((r) => r.status === "approved").length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              statusFilter === "rejected"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Rejected ({requests.filter((r) => r.status === "rejected").length})
          </button>

          {/* Leave Type Selector */}
          {leaveTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-hidden focus:border-indigo-500"
            >
              <option value="all">📁 All Leave Categories</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee, code, reason..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200/80 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Leave Schedule</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Employee Reason</th>
                <th className="px-4 py-3.5">Status & Audit</th>
                <th className="px-4 py-3.5 text-right">Manager Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Loading employee leave records...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                    No leave requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const empName = `${req.first_name || ""} ${req.last_name || ""}`.trim() || "Staff Member";
                  const isPending = (req.status || "pending") === "pending";
                  const isApproved = req.status === "approved";
                  const isRejected = req.status === "rejected";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      {/* Employee Info */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700 text-xs">
                            {req.first_name ? req.first_name[0].toUpperCase() : "E"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{empName}</span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              #{req.employee_code || `EMP-${req.employee_id}`}
                            </span>
                            {req.phone && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone size={9} /> {req.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category / Type */}
                      <td className="px-4 py-3.5 align-top">
                        {getLeaveTypeBadge(req.leave_type)}
                      </td>

                      {/* Leave Schedule */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-bold text-slate-800">
                            {req.start_date} <span className="text-slate-400 font-normal">to</span> {req.end_date}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Requested on: {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : "Recently"}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-black text-slate-800 text-[11px]">
                          {req.total_days} {req.total_days === 1 ? "Day" : "Days"}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5 align-top max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2 italic">
                          "{req.reason || "No written explanation provided."}"
                        </p>
                      </td>

                      {/* Status & Review Details */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 w-fit rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700 border border-amber-200">
                              <Clock size={11} />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200">
                              <CheckCircle size={11} />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 w-fit rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-black text-rose-700 border border-rose-200">
                              <XCircle size={11} />
                              Rejected
                            </span>
                          )}

                          {req.manager_comment && (
                            <span className="text-[10px] text-slate-500 italic mt-0.5">
                              Manager: "{req.manager_comment}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "approve")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-emerald-700 transition shadow-2xs"
                            >
                              <Check size={12} />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <X size={12} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">
                            {isApproved ? "Approved" : "Closed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SUBMIT NEW LEAVE REQUEST */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="text-indigo-600 h-5 w-5" />
                  Submit Leave Request
                </h3>
                <p className="text-xs text-slate-500">
                  Record an employee vacation, medical leave, or personal time off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCreate} className="mt-4 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (#{emp.employee_code || emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Leave Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Select Category...</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.max_days ? `(Up to ${type.max_days} days)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Policy Notification Banner */}
              {selectedLeaveType && (
                <div
                  className={`rounded-xl p-3 text-xs font-bold border flex items-start gap-2 ${
                    isUnpaidSelected
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-blue-50 text-blue-900 border-blue-200"
                  }`}
                >
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    {isUnpaidSelected ? (
                      <span>
                        <strong>Unpaid Leave Policy:</strong> Days taken under this category will be deducted from the monthly payroll at (Base Salary / 30) × Unpaid Days.
                      </span>
                    ) : (
                      <span>
                        <strong>Paid Leave Policy:</strong> 100% base pay is retained. Approved days are logged as <code className="bg-blue-100 px-1 rounded">on_leave</code> in attendance with 0 ETB payroll deduction.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              {formData.startDate && formData.endDate && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold">
                  <span className="text-slate-600">Calculated Leave Duration:</span>
                  <span className={computedDays > 0 ? "text-indigo-600 font-black text-sm" : "text-rose-600 font-black"}>
                    {computedDays > 0 ? `${computedDays} ${computedDays === 1 ? "Day" : "Days"}` : "Invalid date range"}
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Reason / Explanation
                </label>
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Annual family vacation, Medical surgery recovery, Personal emergency..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW DIALOG (APPROVE / REJECT) */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {reviewModal.type === "approve" ? (
                  <>
                    <CheckCircle className="text-emerald-600 h-5 w-5" />
                    Approve Leave Request
                  </>
                ) : (
                  <>
                    <XCircle className="text-rose-600 h-5 w-5" />
                    Reject Leave Request
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {reviewModal.error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                {reviewModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteReview} className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">
                  {reviewModal.request?.first_name} {reviewModal.request?.last_name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Category: <strong>{reviewModal.request?.leave_type}</strong> | Duration:{" "}
                  <strong>{reviewModal.request?.total_days} Days</strong> ({reviewModal.request?.start_date} to{" "}
                  {reviewModal.request?.end_date})
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {reviewModal.type === "approve" ? "Manager Note (Optional)" : "Rejection Reason (Required)"}
                </label>
                <textarea
                  rows="3"
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                  placeholder={
                    reviewModal.type === "approve"
                      ? "e.g. Approved. Cover provided by senior waiter."
                      : "e.g. Inadequate staff cover for weekend peak hours."
                  }
                  required={reviewModal.type === "reject"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={reviewModal.loading}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.loading}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-xs ${
                    reviewModal.type === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewModal.loading && <RefreshCw size={12} className="animate-spin" />}
                  {reviewModal.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
