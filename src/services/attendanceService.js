import api from "./api";

/**
 * 1. Check In Employee
 * Endpoint: POST /api/attendance/check-in
 * @param {number|string} employeeId
 * @param {string} notes
 */
export const checkInEmployee = async (employeeId, notes = "") => {
  return await api("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({
      employeeId: Number(employeeId),
      notes: notes.trim() || undefined,
    }),
  });
};

/**
 * 2. Check Out Employee
 * Endpoint: PUT /api/attendance/check-out/:employeeId
 * @param {number|string} employeeId
 */
export const checkOutEmployee = async (employeeId) => {
  return await api(`/attendance/check-out/${employeeId}`, {
    method: "PUT",
  });
};

/**
 * 3. Fetch Today's Shift Attendance
 * Endpoint: GET /api/attendance/today
 */
export const fetchTodayAttendance = async () => {
  const data = await api("/attendance/today");
  const list =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data?.attendance) ? data.attendance : null) ||
    (Array.isArray(data?.data?.attendance) ? data.data.attendance : null) ||
    (Array.isArray(data?.data) ? data.data : null) ||
    [];
  return {
    success: data?.success ?? true,
    count: data?.count ?? list.length,
    attendance: list,
  };
};

/**
 * 4. Fetch All Attendance Logs (Filtered & Paginated)
 * Endpoint: GET /api/attendance
 * @param {Object} params - { startDate, endDate, employeeId, page, limit }
 */
export const fetchAttendanceLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);
  if (params.employeeId) queryParams.append("employeeId", params.employeeId);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const queryString = queryParams.toString();
  const endpoint = `/attendance${queryString ? `?${queryString}` : ""}`;

  const data = await api(endpoint);
  const list =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data?.attendance) ? data.attendance : null) ||
    (Array.isArray(data?.data?.attendance) ? data.data.attendance : null) ||
    (Array.isArray(data?.data) ? data.data : null) ||
    [];

  return {
    success: data?.success ?? true,
    count: data?.count ?? list.length,
    attendance: list,
  };
};

/**
 * 5. Fetch Single Employee Attendance History
 * Endpoint: GET /api/attendance/employee/:employeeId
 * @param {number|string} employeeId
 */
export const fetchEmployeeAttendanceHistory = async (employeeId) => {
  const data = await api(`/attendance/employee/${employeeId}`);
  const list =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data?.attendance) ? data.attendance : null) ||
    (Array.isArray(data?.data?.attendance) ? data.data.attendance : null) ||
    (Array.isArray(data?.data) ? data.data : null) ||
    [];

  return {
    success: data?.success ?? true,
    count: data?.count ?? list.length,
    attendance: list,
  };
};
