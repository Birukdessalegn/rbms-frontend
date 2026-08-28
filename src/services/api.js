const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {

    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach JWT token
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log("API Request:", {
    url: `${API_URL}${endpoint}`,
    method: options.method || "GET",
    hasToken: !!token,
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  console.log("API Response:", response.status, data);

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};

export default api;