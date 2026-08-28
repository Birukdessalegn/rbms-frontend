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
  { id: 4, name: "cashier" },
  { id: 5, name: "waiter" },
  { id: 6, name: "chef" },
  { id: 7, name: "bartender" },
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

const attendanceStyles = {
  Present: "bg-green-100 text-green-700",
  "On Leave": "bg-blue-100 text-blue-700",
  Absent: "bg-red-100 text-red-700",
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

  shift: "",
  hireDate: "",
  salary: "",

  status: "active",
  attendance: "Present",
};

// =====================================================
// DATE FORMAT
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

// =====================================================
// MAIN COMPONENT
// =====================================================

function EmployeesPage() {
  // ===================================================
  // DATA
  // ===================================================

  const [employeeList, setEmployeeList] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // ===================================================
  // TOAST / POPUP
  // ===================================================

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
      const data = await api("/employees");
      setEmployeeList(Array.isArray(data) ? data : data.employees || []);
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
      const searchLower = search.toLowerCase();
      return (
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.last_name?.toLowerCase().includes(searchLower) ||
        emp.employee_code?.toLowerCase().includes(searchLower)
      );
    });
  }, [employeeList, search]);

  // ===================================================
  // STATS
  // ===================================================

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

  // ===================================================
  // OPEN CREATE FORM
  // ===================================================

  const openCreateForm = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  // ===================================================
  // OPEN EDIT FORM
  // ===================================================

  const openEditForm = (employee) => {
    setEditingEmployee(employee);

    setForm({
      employeeCode: employee.employee_code || "",
      firstName: employee.first_name || "",
      lastName: employee.last_name || "",

      username: employee.username || "",
      password: "",
      email: employee.user_email || employee.email || "",

      phone: employee.phone || "",

      roleId: employee.role_id
        ? String(employee.role_id)
        : "",

      departmentId: employee.department_id
        ? String(employee.department_id)
        : "",

      shift: employee.shift || "",
      hireDate: employee.hire_date || "",

      salary:
        employee.salary !== null &&
        employee.salary !== undefined
          ? String(employee.salary)
          : "",

      status: employee.status || "active",
      attendance: employee.attendance || "Present",
    });

    setError("");
    setShowForm(true);
  };

  // ===================================================
  // FORM CHANGE
  // ===================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ===================================================
  // SAVE EMPLOYEE
  // ===================================================

  const handleSaveEmployee = async (e) => {
    e?.preventDefault();

    try {
      setSaving(true);
      setError("");

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

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

      // Username and password are required only
      // when creating a new employee.
      if (!editingEmployee && !form.username.trim()) {
        setError("Username is required.");
        return;
      }

      if (!editingEmployee && !form.password.trim()) {
        setError("Password is required.");
        return;
      }

      // -----------------------------------------------
      // PAYLOAD
      // -----------------------------------------------

      const payload = {
        employeeCode: form.employeeCode.trim(),

        firstName: form.firstName.trim(),

        lastName: form.lastName.trim(),

        username: form.username.trim(),

        // Backend should hash this password.
        password: form.password,

        email: form.email.trim() || null,

        phone: form.phone.trim() || null,

        roleId: Number(form.roleId),

        departmentId: Number(form.departmentId),

        shift: form.shift.trim() || null,

        hireDate: form.hireDate || null,

        salary: form.salary
          ? Number(form.salary)
          : 0,

        status: form.status,
      };

      console.log("Employee payload:", payload);

      // -----------------------------------------------
      // CREATE
      // -----------------------------------------------

      if (!editingEmployee) {
        await api("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      // -----------------------------------------------
      // UPDATE
      // -----------------------------------------------

      else {
        await api(`/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      // -----------------------------------------------
      // REFRESH
      // -----------------------------------------------

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

      const errorMessage =
        error.message || "Failed to save employee";

      // -----------------------------------------------
      // USERNAME ALREADY EXISTS
      // -----------------------------------------------

      if (
        errorMessage
          .toLowerCase()
          .includes("username already exists")
      ) {
        showToast(
          "error",
          "Username already registered."
        );
      }

      // -----------------------------------------------
      // EMAIL ALREADY EXISTS
      // -----------------------------------------------

      else if (
        errorMessage
          .toLowerCase()
          .includes("email already exists")
      ) {
        showToast(
          "error",
          "Email already registered."
        );
      }

      // -----------------------------------------------
      // OTHER ERRORS
      // -----------------------------------------------

      else {
        showToast(
          "error",
          errorMessage
        );
      }

      setError("");
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE EMPLOYEE
  // ===================================================

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

      // Keep employee in the list, but mark as inactive
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

      // Close details modal if this employee was selected
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

  // ===================================================
  // ACTIVATE EMPLOYEE
  // ===================================================

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

      // Update UI immediately
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

      // Update selected employee if modal is open
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

  // ===================================================
  // APPROVE LEAVE
  // ===================================================

  const approveLeave = async () => {
    if (!selectedEmployee?.leaveRequest) {
      return;
    }

    try {
      setError("");

      const updatedEmployee = {
        ...selectedEmployee,

        leaveRequest: {
          ...selectedEmployee.leaveRequest,
          status: "Approved",
        },

        status: "On Leave",

        attendance: "On Leave",
      };

      setEmployeeList((previous) =>
        previous.map((employee) =>
          employee.id === updatedEmployee.id
            ? updatedEmployee
            : employee
        )
      );

      setSelectedEmployee(updatedEmployee);

      showToast(
        "success",
        `${updatedEmployee.name}'s leave request has been approved.`
      );
    } catch (error) {
      console.error(
        "Failed to approve leave:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to approve leave"
      );

      setError("");
    }
  };

  // ===================================================
  // REJECT LEAVE
  // ===================================================

  const rejectLeave = async () => {
    if (!rejectReason.trim()) {
      showToast(
        "error",
        "Please enter a reason for rejection."
      );

      return;
    }

    if (!selectedEmployee?.leaveRequest) {
      return;
    }

    try {
      setError("");

      const updatedEmployee = {
        ...selectedEmployee,

        leaveRequest: {
          ...selectedEmployee.leaveRequest,

          status: "Rejected",

          rejectionReason: rejectReason,
        },

        status: "Active",

        attendance: "Present",
      };

      setEmployeeList((previous) =>
        previous.map((employee) =>
          employee.id === updatedEmployee.id
            ? updatedEmployee
            : employee
        )
      );

      setSelectedEmployee(updatedEmployee);

      setShowRejectBox(false);

      setRejectReason("");

      showToast(
        "success",
        `${updatedEmployee.name}'s leave request has been rejected.`
      );
    } catch (error) {
      console.error(
        "Failed to reject leave:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Failed to reject leave"
      );

      setError("");
    }
  };

  // ===================================================
  // CLOSE DETAILS MODAL
  // ===================================================

  const closeModal = () => {
    setSelectedEmployee(null);

    setShowRejectBox(false);

    setRejectReason("");
  };

  // ===================================================
  // GET EMPLOYEE NAME
  // ===================================================

  const getEmployeeName = (employee) => {
    if (employee.name) {
      return employee.name;
    }

    return `${employee.first_name || ""} ${
      employee.last_name || ""
    }`.trim() || "Unnamed Employee";
  };

  // ===================================================
  // INITIAL LOADING
  // ===================================================

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

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <div className="w-full space-y-6">

      {/* =================================================
          SUCCESS / ERROR POPUP
      ================================================= */}

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
            Manage employees, login accounts, attendance,
            and leave requests.
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
          description="Currently working"
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
          description="Not checked in"
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
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
            />

          </div>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px] text-left">

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
                  Attendance
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

              {filteredEmployees.map(
                (employee) => {

                  const employeeName =
                    getEmployeeName(employee);

                  const initials =
                    employeeName
                      .split(" ")
                      .filter(Boolean)
                      .map(
                        (name) => name[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  return (
                    <tr
                      key={employee.id}
                      onClick={() =>
                        setSelectedEmployee(
                          employee
                        )
                      }
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
                                `EMP-${String(
                                  employee.id
                                ).padStart(3, "0")}`}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* USERNAME */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-gray-700">

                          <User
                            size={15}
                            className="text-gray-400"
                          />

                          {employee.username || "-"}

                        </div>

                      </td>

                      {/* ROLE */}

                      <td className="px-5 py-4">

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
                          {employee.role || "-"}
                        </span>

                      </td>

                      {/* DEPARTMENT */}

                      <td className="px-5 py-4 text-sm text-gray-700">

                        {employee.department || "-"}

                      </td>

                      {/* PHONE */}

                      <td className="px-5 py-4 text-sm text-gray-600">

                        {employee.phone || "-"}

                      </td>

                      {/* ATTENDANCE */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            attendanceStyles[
                              employee.attendance
                            ] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {employee.attendance || "-"}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            statusStyles[
                              employee.status
                            ] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {employee.status || "-"}
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td
                        className="px-5 py-4 text-right"
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >

                        <div className="flex justify-end gap-2">

                          <button
                            onClick={() =>
                              openEditForm(
                                employee
                              )
                            }
                            className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                            title="Edit employee"
                          >
                            <Pencil size={17} />
                          </button>

                          {String(employee.status).toLowerCase() ===
                          "inactive" ? (
                            <button
                              onClick={() =>
                                handleActivateEmployee(
                                  employee
                                )
                              }
                              disabled={deleting}
                              className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                              title="Activate employee"
                            >
                              <UserCheck size={17} />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleDeleteEmployee(
                                  employee
                                )
                              }
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
                }
              )}

              {filteredEmployees.length ===
                0 && (
                <tr>

                  <td
                    colSpan="8"
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
            Employees currently working today.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

          {employeeList
            .filter(
              (employee) =>
                String(employee.status).toLowerCase() ===
                  "active" &&
                employee.attendance !== "Absent"
            )
            .slice(0, 6)
            .map((employee) => {

              const employeeName =
                getEmployeeName(employee);

              const initials =
                employeeName
                  .split(" ")
                  .filter(Boolean)
                  .map(
                    (name) => name[0]
                  )
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
                      {employee.attendance ===
                      "Present"
                        ? "Working"
                        : employee.attendance ||
                          "-"}
                    </p>

                  </div>

                </div>
              );
            })}

          {employeeList.filter(
            (employee) =>
              String(employee.status).toLowerCase() ===
                "active" &&
              employee.attendance !== "Absent"
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
                        <span className="text-red-500">
                          *
                        </span>
                      )}

                    </label>

                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleFormChange}
                      placeholder={
                        editingEmployee
                          ? "Leave blank to keep current password"
                          : "Enter password"
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />

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
                      Role{" "}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      name="roleId"
                      value={form.roleId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >

                      <option value="">
                        Select role
                      </option>

                      {roles.map((role) => (
                        <option
                          key={role.id}
                          value={role.id}
                        >
                          {role.name.charAt(0).toUpperCase() +
                            role.name.slice(1)}
                        </option>
                      ))}

                    </select>

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Department{" "}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >

                      <option value="">
                        Select department
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.name}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <FormInput
                    label="Shift"
                    name="shift"
                    value={form.shift}
                    onChange={handleFormChange}
                    placeholder="08:00 - 17:00"
                  />

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

              {/* STATUS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >

                    <option value="active">
                      Active
                    </option>

                    <option value="on leave">
                      On Leave
                    </option>

                    <option value="absent">
                      Absent
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Attendance
                  </label>

                  <select
                    name="attendance"
                    value={form.attendance}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >

                    <option value="Present">
                      Present
                    </option>

                    <option value="Absent">
                      Absent
                    </option>

                    <option value="On Leave">
                      On Leave
                    </option>

                  </select>

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
            onClick={(e) =>
              e.stopPropagation()
            }
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

                    {getEmployeeName(
                      selectedEmployee
                    )
                      .split(" ")
                      .filter(Boolean)
                      .map(
                        (name) => name[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}

                  </div>

                  <div>

                    <h3 className="text-xl font-semibold text-gray-900">

                      {getEmployeeName(
                        selectedEmployee
                      )}

                    </h3>

                    <p className="text-sm text-gray-500">

                      {selectedEmployee.employee_code ||
                        "-"}

                    </p>

                    <div className="mt-1 flex items-center gap-2">

                      <span className="text-sm capitalize text-gray-600">
                        {selectedEmployee.role ||
                          "-"}
                      </span>

                      <span className="text-gray-300">
                        •
                      </span>

                      <span className="text-sm text-gray-600">
                        {selectedEmployee.department ||
                          "-"}
                      </span>

                    </div>

                  </div>

                </div>

                <button
                  onClick={() =>
                    openEditForm(
                      selectedEmployee
                    )
                  }
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
                    value={
                      selectedEmployee.username
                    }
                  />

                  <InfoBox
                    icon={KeyRound}
                    label="Account Status"
                    value={
                      selectedEmployee.user_status ||
                      selectedEmployee.status
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
                    value={
                      selectedEmployee.department
                    }
                  />

                  <InfoBox
                    icon={Phone}
                    label="Phone"
                    value={
                      selectedEmployee.phone
                    }
                  />

                  <InfoBox
                    icon={Clock3}
                    label="Shift"
                    value={
                      selectedEmployee.shift
                    }
                  />

                  <InfoBox
                    icon={UserCheck}
                    label="Status"
                    value={
                      selectedEmployee.status
                    }
                  />

                  <InfoBox
                    icon={CalendarDays}
                    label="Hire Date"
                    value={formatDate(
                      selectedEmployee.hire_date
                    )}
                  />

                  <InfoBox
                    icon={Building2}
                    label="Salary"
                    value={
                      selectedEmployee.salary
                        ? Number(
                            selectedEmployee.salary
                          ).toLocaleString()
                        : "-"
                    }
                  />

                </div>

              </div>

              {/* ATTENDANCE */}

              <div className="mt-6">

                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Today&apos;s Attendance
                </h3>

                <div className="rounded-xl border border-gray-200 p-4">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-gray-100 p-2">
                        <Clock size={18} />
                      </div>

                      <div>

                        <p className="text-sm font-medium text-gray-900">
                          Attendance Status
                        </p>

                        <p className="text-xs text-gray-500">
                          Employee attendance today
                        </p>

                      </div>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        attendanceStyles[
                          selectedEmployee.attendance
                        ] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedEmployee.attendance ||
                        "-"}
                    </span>

                  </div>

                </div>

              </div>

              {/* LEAVE REQUEST */}

              <div className="mt-6">

                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Leave Request
                </h3>

                {selectedEmployee.leaveRequest ? (

                  <div className="rounded-xl border border-gray-200">

                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

                      <div>

                        <p className="font-semibold text-gray-900">
                          {
                            selectedEmployee
                              .leaveRequest
                              .type
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Leave request
                        </p>

                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedEmployee
                            .leaveRequest
                            .status ===
                          "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : selectedEmployee
                                .leaveRequest
                                .status ===
                              "Approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {
                          selectedEmployee
                            .leaveRequest
                            .status
                        }
                      </span>

                    </div>

                    <div className="space-y-4 p-5">

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                        <InfoBox
                          icon={CalendarDays}
                          label="Start Date"
                          value={formatDate(
                            selectedEmployee
                              .leaveRequest
                              .startDate
                          )}
                        />

                        <InfoBox
                          icon={CalendarDays}
                          label="End Date"
                          value={formatDate(
                            selectedEmployee
                              .leaveRequest
                              .endDate
                          )}
                        />

                        <InfoBox
                          icon={Clock}
                          label="Duration"
                          value={`${
                            selectedEmployee
                              .leaveRequest
                              .duration || 0
                          } Days`}
                        />

                      </div>

                      <div>

                        <p className="text-xs text-gray-500">
                          Reason
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-700">
                          {
                            selectedEmployee
                              .leaveRequest
                              .reason
                          }
                        </p>

                      </div>

                      {selectedEmployee
                        .leaveRequest
                        .rejectionReason && (

                        <div className="rounded-lg bg-red-50 p-3">

                          <p className="text-xs font-medium text-red-700">
                            Rejection Reason
                          </p>

                          <p className="mt-1 text-sm text-red-600">
                            {
                              selectedEmployee
                                .leaveRequest
                                .rejectionReason
                            }
                          </p>

                        </div>
                      )}

                    </div>

                  </div>

                ) : (

                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">

                    <p className="text-sm font-medium text-gray-700">
                      No leave request
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      This employee does not have a leave request.
                    </p>

                  </div>

                )}

              </div>

              {/* REJECT BOX */}

              {showRejectBox && (

                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">

                  <label className="mb-2 block text-sm font-medium text-red-800">
                    Reason for rejection
                  </label>

                  <textarea
                    rows="3"
                    value={rejectReason}
                    onChange={(e) =>
                      setRejectReason(
                        e.target.value
                      )
                    }
                    placeholder="Explain why the leave request is being rejected..."
                    className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400"
                  />

                </div>

              )}

            </div>

            {/* FOOTER */}

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>

              {selectedEmployee.leaveRequest?.status ===
                "Pending" && (

                <div className="flex gap-3">

                  {!showRejectBox ? (

                    <>

                      <button
                        onClick={() =>
                          setShowRejectBox(
                            true
                          )
                        }
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={17} />
                        Reject
                      </button>

                      <button
                        onClick={
                          approveLeave
                        }
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        <CheckCircle
                          size={17}
                        />
                        Approve
                      </button>

                    </>

                  ) : (

                    <>

                      <button
                        onClick={() => {
                          setShowRejectBox(
                            false
                          );

                          setRejectReason(
                            ""
                          );
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={
                          rejectLeave
                        }
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <XCircle size={17} />
                        Confirm Rejection
                      </button>

                    </>

                  )}

                </div>

              )}

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

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>

        </div>

        <div className="rounded-lg bg-gray-100 p-3">

          <Icon
            size={22}
            className="text-gray-700"
          />

        </div>

      </div>

    </div>
  );
}

// =====================================================
// INFO BOX
// =====================================================

function InfoBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">

      <div className="flex items-center gap-2">

        <Icon
          size={16}
          className="text-gray-500"
        />

        <p className="text-xs text-gray-500">
          {label}
        </p>

      </div>

      <p className="mt-2 text-sm font-semibold text-gray-900">
        {value || "-"}
      </p>

    </div>
  );
}

export default EmployeesPage;