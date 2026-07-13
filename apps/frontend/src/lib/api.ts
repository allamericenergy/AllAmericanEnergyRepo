import axios from "axios";

const authStorageKeys = [
  "aae_access_token",
  "aae_refresh_token",
  "aae_user",
  "aae_permissions",
  "aae_role"
];

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aae_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");
    const hadSession = Boolean(localStorage.getItem("aae_access_token"));
    const isAuthAction = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/logout");

    if (status === 401 && hadSession && !isAuthAction) {
      for (const key of authStorageKeys) {
        localStorage.removeItem(key);
      }

      const loginPath = "/login?sessionTimedOut=1";
      if (window.location.pathname !== "/login" || window.location.search !== "?sessionTimedOut=1") {
        window.location.assign(loginPath);
      }
    }

    return Promise.reject(error);
  }
);
