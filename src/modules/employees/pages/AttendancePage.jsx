import {
  Users,
  UserCheck,
  Clock,
  UserX,
  Search,
  CalendarDays,
  MoreVertical,
  Eye,
  LogIn,
  LogOut,
  Pencil,
  UserMinus,
  ClipboardList,
} from "lucide-react";

import { useState } from "react";
const attendance = [
  {
    id: 1,
    name: "Abebe Kebede",
    role: "Manager",
    checkIn: "08:02 AM",
    checkOut: "05:01 PM",
    status: "Present",
  },
  {
    id: 2,
    name: "Meron Tesfaye",
    role: "Waiter",
    checkIn: "10:15 AM",
    checkOut: "-",
    status: "Late",
  },
  {
    id: 3,
    name: "Dawit Alemu",
    role: "Chef",
    checkIn: "08:55 AM",
    checkOut: "-",
    status: "Present",
  },
  {
    id: 4,
    name: "Hana Bekele",
    role: "Bartender",
    checkIn: "-",
    checkOut: "-",
    status: "On Leave",
  },
  {
    id: 5,
    name: "Yonas Girma",
    role: "Cashier",
    checkIn: "-",
    checkOut: "-",
    status: "Absent",
  },
];

const stats = [
  {
    title: "Present",
    value: "18",
    description: "Employees checked in",
    icon: UserCheck,
  },
  {
    title: "Late",
    value: "3",
    description: "Employees arrived late",
    icon: Clock,
  },
  {
    title: "Absent",
    value: "4",
    description: "Not checked in",
    icon: UserX,
  },
  {
    title: "Total Staff",
    value: "24",
    description: "Employees scheduled",
    icon: Users,
  },
];

const statusStyles = {
  Present: "bg-green-100 text-green-700",
  Late: "bg-yellow-100 text-yellow-700",
  Absent: "bg-red-100 text-red-700",
  "On Leave": "bg-blue-100 text-blue-700",
};

function AttendancePage() {
const [openMenu, setOpenMenu] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    type: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track employee attendance, check-ins, and working hours.
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
          <CalendarDays size={18} className="text-gray-500" />

          <input
            type="date"
            defaultValue="2026-08-26"
            className="bg-transparent text-sm text-gray-700 outline-none"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    {stat.description}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-100 p-3">
                  <Icon size={22} className="text-gray-700" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Records
            </h2>

            <p className="text-sm text-gray-500">
              Employee attendance for the selected date
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search employee..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Employee
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Role
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Check In
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Check Out
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {attendance.map((employee) => (
                <tr
                  key={employee.id}
                  className="transition hover:bg-gray-50"
                >
                  {/* Employee */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                        {employee.name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          EMP-
                          {String(employee.id).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4 text-sm text-gray-700">
                    {employee.role}
                  </td>

                  {/* Check In */}
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {employee.checkIn}
                  </td>

                  {/* Check Out */}
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {employee.checkOut}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        statusStyles[employee.status]
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="relative px-5 py-4">
                    <button
                      onClick={() =>
                        setOpenMenu(
                          openMenu === employee.id ? null : employee.id
                        )
                      }
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openMenu === employee.id && (
                      <div className="absolute right-5 top-12 z-50 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">

                        {/* View Details */}
                        <button
                          onClick={() => {
                            console.log("View details:", employee);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Eye size={16} className="text-gray-500" />
                          View Details
                        </button>

                        {/* Check In */}
                        {(employee.status === "Absent" ||
                          employee.status === "On Leave") && (
                          <button
                            onClick={() => {
                              console.log("Check in:", employee);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogIn size={16} className="text-green-600" />
                            Check In
                          </button>
                        )}

                        {/* Check Out */}
                        {(employee.status === "Present" ||
                          employee.status === "Late") && (
                          <button
                            onClick={() => {
                              console.log("Check out:", employee);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut size={16} className="text-blue-600" />
                            Check Out
                          </button>
                        )}

                        {/* Edit Attendance */}
                        <button
                          onClick={() => {
                            console.log("Edit attendance:", employee);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={16} className="text-gray-500" />
                          Edit Attendance
                        </button>

                        {/* Mark Absent */}
                        {employee.status !== "Absent" &&
                          employee.status !== "On Leave" && (
                          <button
                            onClick={() => {
                              console.log("Mark absent:", employee);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <UserMinus size={16} className="text-red-500" />
                            Mark as Absent
                          </button>
                        )}

                        {/* Mark Leave */}
                        {/* Request Leave */}
{employee.status !== "On Leave" && (
  <button
    onClick={() => {
      setSelectedEmployee(employee);
      setShowLeaveModal(true);
      setOpenMenu(null);
    }}
    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
  >
    <ClipboardList size={16} className="text-yellow-600" />
    Request Leave
  </button>
)}

                        <div className="my-1 border-t border-gray-100" />

                        {/* Attendance History */}
                        <button
                          onClick={() => {
                            console.log("Attendance history:", employee);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Clock size={16} className="text-gray-500" />
                          Attendance History
                        </button>
                      </div>
                      )}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendance Summary
          </h2>

          <p className="text-sm text-gray-500">
            Overview of today&apos;s staff attendance
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Attendance Rate
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              87.5%
            </p>

            <p className="mt-1 text-xs text-gray-500">
              21 of 24 employees
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Average Check-in
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              08:42 AM
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Today&apos;s average
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Late Arrivals
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              3
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Employees arrived late
            </p>
          </div>
        </div>
      </div>
{/* Leave Request Modal */}
{showLeaveModal && selectedEmployee && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">

    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Request Leave
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {selectedEmployee.name} · {selectedEmployee.role}
          </p>
        </div>

        <button
          onClick={() => setShowLeaveModal(false)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ✕
        </button>

      </div>

      {/* Form */}
      <div className="space-y-5 p-6">

        {/* Leave Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Leave Type
          </label>

          <select
            value={leaveForm.type}
            onChange={(e) =>
              setLeaveForm({
                ...leaveForm,
                type: e.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            <option>Annual Leave</option>
            <option>Sick Leave</option>
            <option>Emergency Leave</option>
            <option>Unpaid Leave</option>
            <option>Other</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Start Date
            </label>

            <input
              type="date"
              value={leaveForm.startDate}
              onChange={(e) =>
                setLeaveForm({
                  ...leaveForm,
                  startDate: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              End Date
            </label>

            <input
              type="date"
              value={leaveForm.endDate}
              min={leaveForm.startDate}
              onChange={(e) =>
                setLeaveForm({
                  ...leaveForm,
                  endDate: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

        </div>

        {/* Reason */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Reason
          </label>

          <textarea
            rows={4}
            placeholder="Enter reason for leave..."
            value={leaveForm.reason}
            onChange={(e) =>
              setLeaveForm({
                ...leaveForm,
                reason: e.target.value,
              })
            }
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">

          <button
            onClick={() => {
              setShowLeaveModal(false);
              setSelectedEmployee(null);
            }}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              console.log("Leave request:", {
                employee: selectedEmployee,
                ...leaveForm,
              });

              setShowLeaveModal(false);
              setSelectedEmployee(null);

              setLeaveForm({
                type: "Annual Leave",
                startDate: "",
                endDate: "",
                reason: "",
              });
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Submit Request
          </button>

        </div>

      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default AttendancePage;