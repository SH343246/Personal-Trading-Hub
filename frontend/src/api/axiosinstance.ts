import axios from "axios";
import { logout } from "./logout";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");

const api = axios.create({ baseURL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");
        const r = await api.post("/refresh", { refresh_token: refreshToken });
        const newAccessToken = r.data.access_token;
        localStorage.setItem("access_token", newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (e) {
        logout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
