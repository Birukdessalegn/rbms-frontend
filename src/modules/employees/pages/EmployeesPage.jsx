import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  X,
  CheckCircle,
  XCircle,
  CalendarDays,
  Phone,
  Briefcase,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  KeyRound,
  User,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

// =====================================================
// CONSTANTS
// =====================================================

const roles = [
  { id: 1, name: "admin" },
  { id: 2, name: "manager" },
  { id: 3, name: "hr" },
  { id: 4, name: "finance" },
  { id: 5, name: "cashier" },
  { id: 6, name: "waiter" },
  { id: 7, name: "chef" },
  { id: 8, name: "bartender" },
];

const departments = [
  { id: 1, name: "Management" },
  { id: 2, name: "Human Resources" },
  { id: 3, name: "Service" },
  { id: 4, name: "Kitchen" },
  { id: 5, name: "Bar" },
  { id: 6, name: "Finance" },
  { id: 7, name: "Administration" },
];

const statusStyles = {
  active: "bg-green-100 text-green-700",
  Active: "bg-green-100 text-green-700",

  "on leave": "bg-yellow-100 text-yellow-700",
  "On Leave": "bg-yellow-100 text-yellow-700",

  absent: "bg-red-100 text-red-700",
  Absent: "bg-red-100 text-red-700",

  inactive: "bg-gray-100 text-gray-600",
  Inactive: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  roleId: "",
  departmentId: "",
  shiftStartTime: "18:00",
  shiftEndTime: "07:00",
  hireDate: "",
  salary: "",
  status: "active",
  attendance: "Present",
};

// =====================================================
// DATE & TIME HELPERS
// =====================================================

function formatDate(date) {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return timeStr;
  const minutes = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minutes}${ampm}`;
}

function parseShiftStringToTimes(shiftStr) {
  if (!shiftStr) return { startTime: "18:00", endTime: "07:00" };

  const parseSingleTime = (str) => {
    if (!str) return null;
    const clean = str.trim().toUpperCase();

    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = match12[2];
      const period = match12[3];
      if (period === "PM" && h < 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}`;
    }

    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = String(parseInt(match24[1], 10)).padStart(2, "0");
      const m = match24[2];
      return `${h}:${m}`;
    }
    return null;
  };

  const parts = shiftStr.split(/[-–—to]/i);
  if (parts.length >= 2) {
    const start = parseSingleTime(parts[0]);
    const end = parseSingleTime(parts[1]);
    if (start && end) {
      return { startTime: start, endTime: end };
    }
  }

  return { startTime: "18:00", endTime: "07:00" };
}

function getEmployeeUsername(employee) {
  if (!employee) return "-";
  const emailVal = employee.email || employee.user_email || employee.userEmail || "";
  const firstVal = employee.first_name || employee.firstName || "";
  const lastVal = employee.last_name || employee.lastName || "";
  const fallbackFromEmail = emailVal ? emailVal.split("@")[0] : null;
  const fallbackFromName = firstVal ? `${firstVal}${lastVal}`.toLowerCase().replace(/\s+/g, "") : null;

  const un =
    employee.username ||
    employee.user_username ||
    employee.user_name ||
    employee.userName ||
    employee.user?.username ||
    employee.user?.user_name ||
    employee.User?.username ||
    employee.User?.user_name ||
    employee.account_username ||
    fallbackFromEmail ||
    fallbackFromName;

  return un && String(un).trim() !== "" ? String(un).trim() : "-";
}

// =====================================================
// MAIN COMPONENT
// =====================================================

function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 3000);
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const empRes = await api("/employees");

      const list =
        (Array.isArray(empRes) ? empRes : null) ||
        (Array.isArray(empRes?.employees) ? empRes.employees : null) ||
        (Array.isArray(empRes?.data?.employees) ? empRes.data.employees : null) ||
        (Array.isArray(empRes?.data) ? empRes.data : null) ||
        [];

      const enriched = list.map((emp) => {
        const uName =
          emp.username ||
          emp.user_username ||
          emp.user_name ||
          emp.userName ||
          emp.user?.username ||
          (emp.email ? emp.email.split("@")[0] : null) ||
          (emp.first_name || emp.firstName
            ? `${emp.first_name || emp.firstName}${emp.last_name || emp.lastName || ""}`.toLowerCase().replace(/\s+/g, "")
            : null);

        return {
          ...emp,
          username: uName,
        };
      });

      setEmployeeList(enriched);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return (Array.isArray(employeeList) ? employeeList : []).filter((emp) => {
      if (!search.trim()) return true;
      const searchLower = search.toLowerCase();
      const firstName = emp.first_name || emp.firstName || "";
      const lastName = emp.last_name || emp.lastName || "";
      const fullName = emp.name || `${firstName} ${lastName}`.trim();
      const code = emp.employee_code || emp.employeeCode || emp.code || "";
      const username = getEmployeeUsername(emp);

      return (
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        fullName.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower)
      );
    });
  }, [employeeList, search]);

  const safeEmployees = Array.isArray(employeeList) ? employeeList : [];
  const totalEmployees = safeEmployees.length;

  const activeToday = safeEmployees.filter(
    (employee) =>
      employee.attendance === "Present" &&
      String(employee.status).toLowerCase() === "active"
  ).length;

  const onLeave = safeEmployees.filter(
    (employee) =>
      String(employee.status).toLowerCase() === "on leave" ||
      employee.attendance === "On Leave"
  ).length;

  const absentToday = safeEmployees.filter(
    (employee) => employee.attendance === "Absent"
  ).length;

  const openCreateForm = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError("");
    setShowPassword(false);
    setShowForm(true);
  };

  const openEditForm = (employee) => {
    setEditingEmployee(employee);

    const parsedShift = parseShiftStringToTimes(employee.shift);
    const un = getEmployeeUsername(employee);

    const empRoleName = String(employee.role?.name || employee.role_name || employee.role || "").toLowerCase().trim();
    const matchedRole = roles.find((r) => r.name.toLowerCase() === empRoleName) ||
                        roles.find((r) => String(r.id) === String(employee.role_id || employee.roleId));

    const empDeptName = String(employee.department?.name || employee.department_name || employee.department || "").toLowerCase().trim();
    const matchedDept = departments.find((d) => d.name.toLowerCase() === empDeptName) ||
                        departments.find((d) => String(d.id) === String(employee.department_id || employee.departmentId));

    const rawHireDate = employee.hire_date || employee.hireDate || "";
    const formattedHireDate = rawHireDate ? String(rawHireDate).split("T")[0] : "";

    setForm({
      employeeCode: employee.employee_code || employee.employeeCode || employee.code || "",
      firstName: employee.first_name || employee.firstName || "",
      lastName: employee.last_name || employee.lastName || "",
      username: un === "-" ? "" : un,
      password: "",
      email: employee.user_email || employee.email || "",
      phone: employee.phone || "",
      roleId: matchedRole ? String(matchedRole.id) : (employee.role_id || employee.roleId ? String(employee.role_id || employee.roleId) : ""),
      departmentId: matchedDept ? String(matchedDept.id) : (employee.department_id || employee.departmentId ? String(employee.department_id || employee.departmentId) : ""),
      shiftStartTime: parsedShift.startTime,
      shiftEndTime: parsedShift.endTime,
      hireDate: formattedHireDate,
      salary: employee.salary !== null && employee.salary !== undefined ? String(employee.salary) : "",
      status: employee.status || "active",
      attendance: employee.attendance || "Present",
    });

    setError("");
    setShowPassword(false);
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveEmployee = async (e) => {
    e?.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.employeeCode.trim()) {
        setError("Employee ID is required.");
        return;
      }

      if (!form.firstName.trim()) {
        setError("First name is required.");
        return;
      }

      if (!form.lastName.trim()) {
        setError("Last name is required.");
        return;
      }

      if (!form.roleId) {
        setError("Please select a role.");
        return;
      }

      if (!form.departmentId) {
        setError("Please select a department.");
        return;
      }

      if (!editingEmployee && !form.username.trim()) {
        setError("Username is required.");
        return;
      }

      if (!editingEmployee && !form.password.trim()) {
        setError("Password is required.");
        return;
      }

      const selectedRole = roles.find((r) => String(r.id) === String(form.roleId));
      const selectedDept = departments.find((d) => String(d.id) === String(form.departmentId));

      const payload = {
        employeeCode: form.employeeCode.trim(),
        employee_code: form.employeeCode.trim(),

        firstName: form.firstName.trim(),
        first_name: form.firstName.trim(),

        lastName: form.lastName.trim(),
        last_name: form.lastName.trim(),

        username: form.username.trim() || null,

        // Only send password if user provided a new one
        ...(form.password && form.password.trim() ? { password: form.password.trim() } : {}),

        email: form.email.trim() || null,
        phone: form.phone.trim() || null,

        roleId: Number(form.roleId),
        role_id: Number(form.roleId),
        role: selectedRole?.name || null,
        roleName: selectedRole?.name || null,

        departmentId: Number(form.departmentId),
        department_id: Number(form.departmentId),
        department: selectedDept?.name || null,
        departmentName: selectedDept?.name || null,

        shift: form.shiftStartTime && form.shiftEndTime
          ? `${formatTimeTo12Hour(form.shiftStartTime)} - ${formatTimeTo12Hour(form.shiftEndTime)}`
          : "6:00PM - 7:00AM",

        hireDate: form.hireDate || null,
        hire_date: form.hireDate || null,

        salary: form.salary ? Number(form.salary) : 0,

        status: form.status,
      };

      console.log("Employee payload:", payload);

      if (!editingEmployee) {
        await api("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      await fetchEmployees();

      setShowForm(false);

      showToast(
        "success",
        editingEmployee
          ? "Employee updated successfully."
          : "Employee created successfully."
      );

      setEditingEmployee(null);
      setForm(emptyForm);
    } catch (error) {
      console.error("Failed to save employee:", error);

      const errorMessage = error.message || "Failed to save employee";

      if (errorMessage.toLowerCase().includes("username already exists")) {
        showToast("error", "Username already registered.");
      } else if (errorMessage.toLowerCase().includes("email already exists")) {
        showToast("error", "Email already registered.");
      } else {
        showToast("error", errorMessage);
      }

      setError("");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const employeeName =
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await api(`/employees/${employee.id}`, {
        method: "DELETE",
      });

      setEmployeeList((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: "inactive",
                attendance: "Absent",
              }
            : item
        )
      );

      setSelectedEmployee(null);

      showToast(
        "success",
        `${employeeName} has been deactivated.`
      );
    } catch (error) {
      console.error(
        "Failed to deactivate employee:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to deactivate employee"
      );

      setError("");
    } finally {
      setDeleting(false);
    }
  };

  const handleActivateEmployee = async (employee) => {
    const employeeName =
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to activate ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setDeleting(true);

      await api(`/employees/${employee.id}/activate`, {
        method: "PUT",
      });

      setEmployeeList((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: "active",
                attendance: "Present",
                user_status: "active",
              }
            : item
        )
      );

      setSelectedEmployee((previous) =>
        previous?.id === employee.id
          ? {
              ...previous,
              status: "active",
              attendance: "Present",
              user_status: "active",
            }
          : previous
      );

      showToast(
        "success",
        `${employeeName} has been activated.`
      );
    } catch (error) {
      console.error(
        "Failed to activate employee:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to activate employee"
      );

      setError("");
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setSelectedEmployee(null);
    setShowRejectBox(false);
    setRejectReason("");
  };

  const getEmployeeName = (employee) => {
    if (!employee) return "Unnamed Employee";
    if (employee.name) {
      return employee.name;
    }

    const firstName = employee.first_name || employee.firstName || "";
    const lastName = employee.last_name || employee.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Unnamed Employee";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="flex items-center gap-2">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading employees...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* SUCCESS / ERROR POPUP */}
      {toast.show && (
        <div className="fixed right-5 top-5 z-[200]">
          <div
            className={`flex min-w-[320px] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle
                size={20}
                className="shrink-0"
              />
            ) : (
              <XCircle
                size={20}
                className="shrink-0"
              />
            )}

            <div className="flex-1">
              <p className="text-sm font-semibold">
                {toast.type === "success"
                  ? "Success"
                  : "Error"}
              </p>

              <p className="text-sm">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() =>
                setToast({
                  show: false,
                  type: "",
                  message: "",
                })
              }
              className="rounded-md p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employees
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage employees, login accounts, and shifts.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-700"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          description="Employees under management"
          icon={Users}
        />

        <StatCard
          title="Active Today"
          value={activeToday}
          description="Currently active"
          icon={UserCheck}
        />

        <StatCard
          title="On Leave"
          value={onLeave}
          description="Employees on leave"
          icon={Clock}
        />

        <StatCard
          title="Absent Today"
          value={absentToday}
          description="Not on duty"
          icon={UserX}
        />
      </div>

      {/* EMPLOYEE TABLE */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* TABLE HEADER */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Employee List
            </h2>
            <p className="text-sm text-gray-500">
              Click an employee to view details.
            </p>
          </div>

          {/* SEARCH */}
          <div className="relative w-full lg:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Employee
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Username
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Role
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Department
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Phone
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => {
                const employeeName = getEmployeeName(employee);
                const initials = employeeName
                  .split(" ")
                  .filter(Boolean)
                  .map((name) => name[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    {/* EMPLOYEE */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.employee_code ||
                              employee.employeeCode ||
                              employee.code ||
                              `EMP-${String(employee.id).padStart(3, "0")}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* USERNAME */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User size={15} className="text-gray-400" />
                        {getEmployeeUsername(employee)}
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
                        {employee.role?.name ||
                          employee.role_name ||
                          employee.roleName ||
                          (typeof employee.role === "string"
                            ? employee.role
                            : null) ||
                          roles.find(
                            (r) =>
                              r.id ===
                              Number(employee.role_id || employee.roleId)
                          )?.name ||
                          "-"}
                      </span>
                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {employee.department?.name ||
                        employee.department_name ||
                        employee.departmentName ||
                        (typeof employee.department === "string"
                          ? employee.department
                          : null) ||
                        departments.find(
                          (d) =>
                            d.id ===
                            Number(
                              employee.department_id || employee.departmentId
                            )
                        )?.name ||
                        "-"}
                    </td>

                    {/* PHONE */}
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {employee.phone || "-"}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[employee.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {employee.status || "-"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td
                      className="px-5 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(employee)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit employee"
                        >
                          <Pencil size={17} />
                        </button>

                        {String(employee.status).toLowerCase() === "inactive" ? (
                          <button
                            onClick={() => handleActivateEmployee(employee)}
                            disabled={deleting}
                            className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                            title="Activate employee"
                          >
                            <UserCheck size={17} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteEmployee(employee)}
                            disabled={deleting}
                            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Deactivate employee"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    {search
                      ? "No employees found."
                      : "No employees have been added yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODAY'S STAFF */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Today&apos;s Staff
          </h2>
          <p className="text-sm text-gray-500">
            Employees currently scheduled.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {employeeList
            .filter(
              (employee) =>
                String(employee.status).toLowerCase() === "active"
            )
            .slice(0, 6)
            .map((employee) => {
              const employeeName = getEmployeeName(employee);
              const initials = employeeName
                .split(" ")
                .filter(Boolean)
                .map((name) => name[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={employee.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-gray-700 shadow-sm">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {employeeName}
                      </p>
                      <p className="text-xs capitalize text-gray-500">
                        {employee.role || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">
                      {employee.shift || "-"}
                    </p>
                    <p className="mt-1 text-xs text-green-600">
                      Active
                    </p>
                  </div>
                </div>
              );
            })}

          {employeeList.filter(
            (employee) =>
              String(employee.status).toLowerCase() === "active"
          ).length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-gray-400">
              No active employees today.
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingEmployee
                    ? "Update employee information."
                    : "Create an employee and their login account."}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSaveEmployee}
              className="max-h-[75vh] space-y-6 overflow-y-auto p-6"
            >
              {/* PERSONAL INFORMATION */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <User
                    size={18}
                    className="text-blue-600"
                  />
                  <h3 className="font-semibold text-gray-900">
                    Personal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Employee ID"
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleFormChange}
                    placeholder="EMP-001"
                    required
                  />

                  <FormInput
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="09XXXXXXXX"
                  />

                  <FormInput
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    placeholder="First name"
                    required
                  />

                  <FormInput
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    placeholder="Last name"
                    required
                  />

                  <FormInput
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="employee@example.com"
                  />

                  <FormInput
                    label="Hire Date"
                    name="hireDate"
                    type="date"
                    value={form.hireDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* LOGIN CREDENTIALS */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound
                    size={18}
                    className="text-blue-600"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Login Credentials
                    </h3>
                    <p className="text-xs text-gray-500">
                      These credentials will be stored in the users table.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleFormChange}
                    placeholder="e.g. brook"
                    required={!editingEmployee}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Password{" "}
                      {!editingEmployee && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleFormChange}
                        placeholder={
                          editingEmployee
                            ? "Leave blank to keep current password"
                            : "Enter password"
                        }
                        className="w-full rounded-lg border border-gray-200 pl-3 pr-10 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {editingEmployee && (
                      <p className="mt-1 text-xs text-gray-400">
                        Only enter a password if you want to change it.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* JOB INFORMATION */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Briefcase
                    size={18}
                    className="text-blue-600"
                  />
                  <h3 className="font-semibold text-gray-900">
                    Job Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="roleId"
                      value={form.roleId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SHIFT TIME INTERVAL SELECTOR */}
                  <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 uppercase tracking-wider">
                        <Clock size={15} className="text-blue-600" />
                        Shift Working Hours (Time Interval)
                      </label>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                        {formatTimeTo12Hour(form.shiftStartTime)} - {formatTimeTo12Hour(form.shiftEndTime)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Shift Start Time
                        </label>
                        <input
                          type="time"
                          name="shiftStartTime"
                          value={form.shiftStartTime}
                          onChange={handleFormChange}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Shift End Time
                        </label>
                        <input
                          type="time"
                          name="shiftEndTime"
                          value={form.shiftEndTime}
                          onChange={handleFormChange}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>

                    {/* Quick Shift Preset Options */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200/60 pt-2.5">
                      <span className="text-[11px] font-semibold text-gray-500">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "18:00", shiftEndTime: "07:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "18:00" && form.shiftEndTime === "07:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🌙 Night (6:00PM - 7:00AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "07:00", shiftEndTime: "18:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "07:00" && form.shiftEndTime === "18:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        ☀️ Day (7:00AM - 6:00PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, shiftStartTime: "16:00", shiftEndTime: "01:00" }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          form.shiftStartTime === "16:00" && form.shiftEndTime === "01:00"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🌇 Evening (4:00PM - 1:00AM)
                      </button>
                    </div>
                  </div>

                  <FormInput
                    label="Salary"
                    name="salary"
                    type="number"
                    value={form.salary}
                    onChange={handleFormChange}
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingEmployee
                    ? "Update Employee"
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          EMPLOYEE DETAILS MODAL
      ================================================= */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Employee Details
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Employee information and account details.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* PROFILE */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-700">
                    {getEmployeeName(selectedEmployee)
                      .split(" ")
                      .filter(Boolean)
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedEmployee.employee_code || "-"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm capitalize text-gray-600">
                        {selectedEmployee.role || "-"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        {selectedEmployee.department || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEditForm(selectedEmployee)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              </div>

              {/* LOGIN */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Login Account
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoBox
                    icon={User}
                    label="Username"
                    value={getEmployeeUsername(selectedEmployee)}
                  />
                  <InfoBox
                    icon={KeyRound}
                    label="Account Status"
                    value={
                      selectedEmployee.user_status || selectedEmployee.status
                    }
                  />
                </div>
              </div>

              {/* EMPLOYEE INFORMATION */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoBox
                    icon={Briefcase}
                    label="Department"
                    value={selectedEmployee.department}
                  />
                  <InfoBox
                    icon={Phone}
                    label="Phone"
                    value={selectedEmployee.phone}
                  />
                  <InfoBox
                    icon={Clock3}
                    label="Shift"
                    value={selectedEmployee.shift}
                  />
                  <InfoBox
                    icon={UserCheck}
                    label="Status"
                    value={selectedEmployee.status}
                  />
                  <InfoBox
                    icon={CalendarDays}
                    label="Hire Date"
                    value={formatDate(selectedEmployee.hire_date)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// FORM INPUT
// =====================================================

function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{value}</h2>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-3">
          <Icon size={22} className="text-gray-700" />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INFO BOX
// =====================================================

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-gray-500" />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

export default EmployeesPage;