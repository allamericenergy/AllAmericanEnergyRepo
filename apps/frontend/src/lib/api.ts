import axios from "axios";

const authStorageKeys = [
  "aae_access_token",
  "aae_refresh_token",
  "aae_user",
  "aae_permissions",
  "aae_role"
];

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const productionApiBaseUrl =
  configuredApiBaseUrl || "https://backend02-c3ehhyf3edeeefen.centralus-01.azurewebsites.net/api";

// Automatically determines if the app is local or deployed
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiBaseUrl = isLocal ? "http://localhost:4000/api" : productionApiBaseUrl;

console.log("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL);
console.log("API baseURL", apiBaseUrl);

export const api = axios.create({
  baseURL: apiBaseUrl
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
