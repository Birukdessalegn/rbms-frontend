import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  Search,
  CalendarDays,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  LogOut,
  X,
  History,
  Info,
  Filter,
  RefreshCw,
  Clock3,
  User,
  Building2,
  FileText,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import api from "../../../services/api";
import {
  checkInEmployee,
  checkOutEmployee,
  fetchTodayAttendance,
  fetchAttendanceLogs,
  fetchEmployeeAttendanceHistory,
} from "../../../services/attendanceService";

// Helper: Format Time (e.g. 06:15 PM)
function formatTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper: Format Date (e.g. 31 Aug 2026)
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Helper: Calculate Active Duration
function getActiveDuration(checkInString) {
  if (!checkInString) return "-";
  const start = new Date(checkInString);
  if (Number.isNaN(start.getTime())) return "-";
  const now = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return "0h 0m";
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs}h ${diffMins}m`;
}

function AttendancePage() {
  // Data States
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab State: "today" | "history"
  const [activeTab, setActiveTab] = useState("today");

  // Terminal Quick Check-In / Search State
  const [terminalSearch, setTerminalSearch] = useState("");
  const [selectedTerminalEmp, setSelectedTerminalEmp] = useState(null);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Filters State for History Tab
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "",
    status: "all",
    page: 1,
    limit: 20,
  });

  // Employee History Modal
  const [historyModalEmployee, setHistoryModalEmployee] = useState(null);
  const [employeeHistoryLogs, setEmployeeHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Toast / Popup State
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 4000);
  };

  // Grace Period Indicator Check (6:20 PM rule)
  const isGracePeriodActive = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // 6:20 PM is 18:20
    if (hours < 18) return true;
    if (hours === 18 && minutes <= 20) return true;
    return false;
  }, []);

  // Fetch All Employees (for terminal dropdown & absent calculation)
  const loadEmployees = async () => {
    try {
      const data = await api("/employees");
      const list =
        (Array.isArray(data) ? data : null) ||
        (Array.isArray(data?.employees) ? data.employees : null) ||
        (Array.isArray(data?.data?.employees) ? data.data.employees : null) ||
        (Array.isArray(data?.data) ? data.data : null) ||
        [];
      setEmployees(list);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  // Fetch Today's Shift Attendance
  const loadTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetchTodayAttendance();
      setTodayAttendance(res.attendance || []);
    } catch (err) {
      console.error("Failed to load today's attendance:", err);
      showToast("error", err.message || "Failed to load today's shift attendance");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Historical Logs
  const loadAttendanceLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetchAttendanceLogs(filters);
      setLogs(res.attendance || []);
    } catch (err) {
      console.error("Failed to load attendance logs:", err);
      showToast("error", err.message || "Failed to load attendance history logs");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadTodayAttendance();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadAttendanceLogs();
    }
  }, [activeTab, filters.startDate, filters.endDate, filters.employeeId, filters.page]);

  // Terminal Employee Selection Filter
  const filteredEmployeesForTerminal = useMemo(() => {
    if (!terminalSearch.trim()) return [];
    const searchLower = terminalSearch.toLowerCase();
    return employees.filter((emp) => {
      const name = `${emp.first_name || emp.firstName || ""} ${emp.last_name || emp.lastName || ""}`.trim();
      const code = emp.employee_code || emp.employeeCode || "";
      const username = emp.username || "";
      return (
        name.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower)
      );
    });
  }, [employees, terminalSearch]);

  // Check-In Action Handler
  const handleCheckInSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedTerminalEmp) return;

    try {
      setActionLoading(true);
      const res = await checkInEmployee(selectedTerminalEmp.id, checkInNotes);
      showToast(
        "success",
        res.message || `${getEmpName(selectedTerminalEmp)} checked in successfully!`
      );
      setShowCheckInModal(false);
      setSelectedTerminalEmp(null);
      setTerminalSearch("");
      setCheckInNotes("");
      await loadTodayAttendance();
    } catch (err) {
      console.error("Check-in failed:", err);
      showToast("error", err.message || "Failed to check in employee");
    } finally {
      setActionLoading(false);
    }
  };

  // Check-Out Action Handler
  const handleCheckOut = async (empId, empName) => {
    const confirmed = window.confirm(`Check out ${empName || "this employee"} for today's shift?`);
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await checkOutEmployee(empId);
      showToast("success", res.message || `${empName || "Employee"} checked out successfully!`);
      await loadTodayAttendance();
      if (activeTab === "history") {
        await loadAttendanceLogs();
      }
    } catch (err) {
      console.error("Check-out failed:", err);
      showToast("error", err.message || "Failed to check out employee");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Single Employee Attendance History Modal
  const handleViewEmployeeHistory = async (emp) => {
    try {
      setHistoryModalEmployee(emp);
      setLoadingHistory(true);
      const empId = emp.employee_id || emp.id;
      const res = await fetchEmployeeAttendanceHistory(empId);
      setEmployeeHistoryLogs(res.attendance || []);
    } catch (err) {
      console.error("Failed to load employee history:", err);
      showToast("error", "Failed to fetch attendance history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper Name Formatter
  const getEmpName = (emp) => {
    if (!emp) return "Employee";
    if (emp.name) return emp.name;
    const first = emp.first_name || emp.firstName || "";
    const last = emp.last_name || emp.lastName || "";
    return `${first} ${last}`.trim() || "Unnamed Employee";
  };

  // Calculations for Stats
  const activeShiftCount = useMemo(
    () => todayAttendance.filter((a) => !a.check_out).length,
    [todayAttendance]
  );
  const presentCount = useMemo(
    () => todayAttendance.filter((a) => String(a.status).toLowerCase() === "present").length,
    [todayAttendance]
  );
  const lateCount = useMemo(
    () => todayAttendance.filter((a) => String(a.status).toLowerCase() === "late").length,
    [todayAttendance]
  );
  const totalEmployeesCount = employees.length || todayAttendance.length;
  const absentCount = Math.max(0, totalEmployeesCount - todayAttendance.length);

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed right-5 top-5 z-[200] animate-in fade-in slide-in-from-top-2">
          <div
            className={`flex min-w-[320px] items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} className="shrink-0 text-green-600" />
            ) : (
              <XCircle size={20} className="shrink-0 text-red-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.type === "success" ? "Success" : "Notice"}</p>
              <p className="text-sm">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, type: "", message: "" })}
              className="rounded-md p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Attendance Terminal</h1>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Cashier & Door Control
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Check-in arriving staff, record check-outs, and monitor night shift working hours.
          </p>
        </div>

        {/* Live Status & Grace Period Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium ${
              isGracePeriodActive
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <Clock size={16} className="shrink-0" />
            <div>
              <p className="font-semibold">
                {isGracePeriodActive ? "Grace Period Active (<= 6:20 PM)" : "After Grace Period (> 6:20 PM)"}
              </p>
              <p className="text-[11px] opacity-80">
                {isGracePeriodActive ? "New check-ins marked PRESENT" : "New check-ins marked LATE"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              loadTodayAttendance();
              if (activeTab === "history") loadAttendanceLogs();
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : "text-gray-500"} />
            Refresh
          </button>
        </div>
      </div>

      {/* CASHIER QUICK CHECK-IN TERMINAL BAR */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-300">
              <LogIn size={20} />
              <h2 className="text-lg font-bold">Quick Employee Door Check-In</h2>
            </div>
            <p className="text-xs text-blue-200/80">
              Search by employee name or code to check them in upon arrival at the venue.
            </p>
          </div>

          {/* Quick Search & Check-In Input */}
          <div className="relative w-full lg:w-96">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff name or code (e.g. EMP005)..."
                value={terminalSearch}
                onChange={(e) => setTerminalSearch(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-blue-200/50 outline-none backdrop-blur-md transition focus:border-blue-400 focus:bg-white/20"
              />
              {terminalSearch && (
                <button
                  onClick={() => setTerminalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {terminalSearch.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 text-gray-900 shadow-2xl">
                {filteredEmployeesForTerminal.length > 0 ? (
                  filteredEmployeesForTerminal.map((emp) => {
                    const empName = getEmpName(emp);
                    const isCheckedIn = todayAttendance.some(
                      (att) => Number(att.employee_id) === Number(emp.id) && !att.check_out
                    );
                    const checkedInRecord = todayAttendance.find(
                      (att) => Number(att.employee_id) === Number(emp.id) && !att.check_out
                    );

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between px-4 py-2.5 transition hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {empName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{empName}</p>
                            <p className="text-xs text-gray-500">
                              {emp.employee_code || emp.employeeCode || `EMP-${emp.id}`} • {emp.role || emp.department || "Staff"}
                            </p>
                          </div>
                        </div>

                        {isCheckedIn ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Checked In ({formatTime(checkedInRecord?.check_in)})
                            </span>
                            <button
                              onClick={() => handleCheckOut(emp.id, empName)}
                              disabled={actionLoading}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                              Check Out
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTerminalEmp(emp);
                              setShowCheckInModal(true);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            <LogIn size={14} />
                            Check In
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-gray-500">No matching employee found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATISTICAL CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-green-200 bg-green-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Present (&le; 6:20 PM)</p>
              <h2 className="mt-1 text-2xl font-bold text-green-900">{presentCount}</h2>
              <p className="mt-1 text-xs text-green-600">On time check-ins</p>
            </div>
            <div className="rounded-xl bg-green-100 p-3 text-green-700">
              <UserCheck size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Late Check-Ins</p>
              <h2 className="mt-1 text-2xl font-bold text-amber-900">{lateCount}</h2>
              <p className="mt-1 text-xs text-amber-600">Arrived after 6:20 PM</p>
            </div>
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Clock3 size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Active On Shift</p>
              <h2 className="mt-1 text-2xl font-bold text-blue-900">{activeShiftCount}</h2>
              <p className="mt-1 text-xs text-blue-600">Currently working now</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Not Checked In</p>
              <h2 className="mt-1 text-2xl font-bold text-red-900">{absentCount}</h2>
              <p className="mt-1 text-xs text-red-600">Registered staff pending</p>
            </div>
            <div className="rounded-xl bg-red-100 p-3 text-red-700">
              <UserX size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "today"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock size={18} />
          Today's Shift Attendance ({todayAttendance.length})
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <History size={18} />
          Attendance Logs & History
        </button>
      </div>

      {/* TAB 1: TODAY'S SHIFT ATTENDANCE */}
      {activeTab === "today" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Active Shift Log</h2>
              <p className="text-xs text-gray-500">Live attendance for current/overnight shift.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Shift Date:</span>
              <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {formatDate(new Date())}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center text-gray-500">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
          ) : todayAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Role / Dept</th>
                    <th className="px-5 py-3.5">Check In</th>
                    <th className="px-5 py-3.5">Check Out</th>
                    <th className="px-5 py-3.5">Shift Duration</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Notes</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayAttendance.map((record) => {
                    const empName = `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Staff Member";
                    const isCheckedOut = !!record.check_out;
                    const statusLower = String(record.status).toLowerCase();

                    return (
                      <tr key={record.id} className="transition hover:bg-gray-50/80">
                        {/* Employee Name & Code */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                              {empName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{empName}</p>
                              <p className="text-xs text-gray-500">{record.employee_code || `EMP-${record.employee_id}`}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role & Dept */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-800">{record.role || "-"}</p>
                          <p className="text-xs text-gray-500">{record.department || "-"}</p>
                        </td>

                        {/* Check In */}
                        <td className="px-5 py-4 font-medium text-gray-800">
                          {formatTime(record.check_in)}
                        </td>

                        {/* Check Out */}
                        <td className="px-5 py-4 text-gray-700">
                          {isCheckedOut ? (
                            <span className="font-medium">{formatTime(record.check_out)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                              Active Shift
                            </span>
                          )}
                        </td>

                        {/* Shift Duration */}
                        <td className="px-5 py-4 text-gray-700 font-medium">
                          {isCheckedOut
                            ? `${record.total_hours || 0} hrs`
                            : getActiveDuration(record.check_in)}
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${
                              statusLower === "present"
                                ? "bg-green-100 text-green-800"
                                : statusLower === "late"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {statusLower === "present" ? (
                              <CheckCircle size={13} />
                            ) : (
                              <AlertCircle size={13} />
                            )}
                            {record.status}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-5 py-4 text-xs text-gray-500 max-w-[150px] truncate">
                          {record.notes || "-"}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewEmployeeHistory(record)}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                              title="View Employee History"
                            >
                              <History size={17} />
                            </button>

                            {!isCheckedOut ? (
                              <button
                                onClick={() => handleCheckOut(record.employee_id, empName)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                <LogOut size={14} />
                                Check Out
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-gray-400">Completed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Clock size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="font-semibold text-gray-700">No staff checked in yet for today's shift</p>
              <p className="text-xs text-gray-400 mt-1">Use the quick check-in bar above to register staff arrival.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORICAL ATTENDANCE LOGS */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Filter size={18} className="text-blue-600" />
                <span>Filter Logs</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:items-center">
                {/* Start Date */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value, page: 1 }))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value, page: 1 }))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                {/* Employee Dropdown */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Employee</label>
                  <select
                    value={filters.employeeId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, employeeId: e.target.value, page: 1 }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="">All Staff</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {getEmpName(emp)} ({emp.employee_code || emp.employeeCode || emp.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(filters.startDate || filters.endDate || filters.employeeId) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({ startDate: "", endDate: "", employeeId: "", status: "all", page: 1, limit: 20 })}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex h-48 items-center justify-center text-gray-500">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-5 py-3.5">Role / Dept</th>
                      <th className="px-5 py-3.5">Check In</th>
                      <th className="px-5 py-3.5">Check Out</th>
                      <th className="px-5 py-3.5">Total Hours</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const empName = `${log.first_name || ""} ${log.last_name || ""}`.trim() || "Staff Member";
                      const statusLower = String(log.status).toLowerCase();

                      return (
                        <tr key={log.id} className="transition hover:bg-gray-50/80">
                          <td className="px-5 py-4 font-medium text-gray-900">
                            {formatDate(log.attendance_date || log.created_at)}
                          </td>
                          <td className="px-5 py-4 font-medium text-gray-900">
                            {empName}
                            <span className="block text-xs font-normal text-gray-400">
                              {log.employee_code || `EMP-${log.employee_id}`}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-700">
                            {log.role || "-"}
                            <span className="block text-xs text-gray-400">{log.department || "-"}</span>
                          </td>
                          <td className="px-5 py-4 text-gray-800 font-medium">{formatTime(log.check_in)}</td>
                          <td className="px-5 py-4 text-gray-800">{formatTime(log.check_out)}</td>
                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {log.total_hours ? `${log.total_hours} hrs` : "-"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                statusLower === "present"
                                  ? "bg-green-100 text-green-800"
                                  : statusLower === "late"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleViewEmployeeHistory(log)}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                              title="View History"
                            >
                              <History size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <FileText size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-700">No attendance logs found</p>
                <p className="text-xs text-gray-400 mt-1">Try broadening your date or employee filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECK-IN CONFIRMATION MODAL */}
      {showCheckInModal && selectedTerminalEmp && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                <LogIn size={20} />
                <span>Confirm Check-In</span>
              </div>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setSelectedTerminalEmp(null);
                  setCheckInNotes("");
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl bg-blue-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Employee Details</p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">{getEmpName(selectedTerminalEmp)}</h3>
                <p className="text-xs text-gray-600">
                  {selectedTerminalEmp.employee_code || selectedTerminalEmp.employeeCode || `EMP-${selectedTerminalEmp.id}`} •{" "}
                  {selectedTerminalEmp.role || selectedTerminalEmp.department || "Staff"}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Arrival Notes (Optional)</label>
                <textarea
                  rows="3"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="e.g. Arrived via main entrance, uniform complete..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Check-in status will be marked as{" "}
                  <strong className="uppercase">{isGracePeriodActive ? "PRESENT" : "LATE"}</strong> based on backend
                  grace period rules.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedTerminalEmp(null);
                    setCheckInNotes("");
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE EMPLOYEE HISTORY DRAWER / MODAL */}
      {historyModalEmployee && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {getEmpName(historyModalEmployee)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{getEmpName(historyModalEmployee)}</h3>
                  <p className="text-xs text-gray-500">Attendance History & Shift Logs</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalEmployee(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="flex h-48 items-center justify-center text-gray-500">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              ) : employeeHistoryLogs.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {employeeHistoryLogs.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatDate(h.attendance_date || h.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{formatTime(h.check_in)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatTime(h.check_out)}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {h.total_hours ? `${h.total_hours} hrs` : getActiveDuration(h.check_in)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                String(h.status).toLowerCase() === "present"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{h.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">No attendance history recorded for this staff member.</div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={() => setHistoryModalEmployee(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
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

export default AttendancePage;