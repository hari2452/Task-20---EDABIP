import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

// Add JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // JSON requests
    // Let Axios/browser automatically set the correct
    // multipart/form-data boundary for FormData requests.
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;