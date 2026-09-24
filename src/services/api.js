const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  // Attach JWT token
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    console.log("API Request:", {
      url: `${API_URL}${endpoint}`,
      method: options.method || "GET",
      hasToken: !!token,
    });
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    console.error(`🚨 [NETWORK ERROR] Failed to connect to ${options.method || "GET"} ${API_URL}${endpoint}:`, networkErr);
    throw networkErr;
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (import.meta.env.DEV) {
    console.log("API Response:", response.status, data);
  }

  if (!response.ok) {
    console.error(`🚨 [API ERROR ${response.status}] ${options.method || "GET"} ${API_URL}${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      errorResponse: data,
      endpoint,
    });

    if (response.status === 401) {
      console.warn("Session expired or invalid token. Redirecting to login...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    const error = new Error(
      data.error || data.message || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    error.retryAfter = data.retryAfter;
    throw error;
  }

  return data;
};

// Convenience HTTP methods
api.get = (endpoint, options = {}) => api(endpoint, { ...options, method: "GET" });
api.post = (endpoint, data, options = {}) =>
  api(endpoint, {
    ...options,
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
api.put = (endpoint, data, options = {}) =>
  api(endpoint, {
    ...options,
    method: "PUT",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
api.delete = (endpoint, options = {}) => api(endpoint, { ...options, method: "DELETE" });

export default api;