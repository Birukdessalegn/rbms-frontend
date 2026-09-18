import api from "./api";

/**
 * Fetch all leave requests
 */
export const fetchLeaveRequests = async () => {
  const data = await api("/leave");
  const list =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data?.leaveRequests) ? data.leaveRequests : null) ||
    (Array.isArray(data?.data?.leaveRequests) ? data.data.leaveRequests : null) ||
    (Array.isArray(data?.data) ? data.data : null) ||
    [];
  return {
    success: data?.success ?? true,
    count: data?.count ?? list.length,
    leaveRequests: list,
  };
};

/**
 * Fetch leave request by ID
 */
export const fetchLeaveRequestById = async (id) => {
  const res = await api(`/leave/${id}`);
  return res.leaveRequest || res.data || res;
};

/**
 * Fetch all leave types (Annual, Sick, Emergency, etc.)
 */
export const fetchLeaveTypes = async () => {
  const res = await api("/leave/types");
  const types = res.leaveTypes || res.data || (Array.isArray(res) ? res : []);
  return types;
};

/**
 * Create a new leave request
 */
export const createLeaveRequest = async (payload) => {
  return await api("/leave", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * Approve leave request
 */
export const approveLeaveRequest = async (id, managerComment = "") => {
  return await api(`/leave/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({
      managerComment: managerComment.trim() || undefined,
    }),
  });
};

/**
 * Reject leave request
 */
export const rejectLeaveRequest = async (id, managerComment) => {
  return await api(`/leave/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({
      managerComment: managerComment ? managerComment.trim() : "Rejected by manager",
    }),
  });
};
