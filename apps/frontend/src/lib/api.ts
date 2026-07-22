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

let refreshRequest: Promise<string> | null = null;

function refreshAccessToken() {
  if (refreshRequest) return refreshRequest;
  const refreshToken = localStorage.getItem("aae_refresh_token");
  const storedUser = localStorage.getItem("aae_user");
  const userId = storedUser ? (JSON.parse(storedUser) as { id?: string }).id : undefined;
  if (!refreshToken || !userId) return Promise.reject(new Error("No refresh session is available"));

  refreshRequest = axios.post<{ accessToken: string }>(`${apiBaseUrl}/auth/refresh`, { userId, refreshToken })
    .then((response) => {
      localStorage.setItem("aae_access_token", response.data.accessToken);
      return response.data.accessToken;
    })
    .finally(() => {
      refreshRequest = null;
    });
  return refreshRequest;
}

function clearStoredSession() {
  for (const key of authStorageKeys) localStorage.removeItem(key);
}

function redirectToLogin() {
  const loginPath = "/login?sessionTimedOut=1";
  if (window.location.pathname !== "/login" || window.location.search !== "?sessionTimedOut=1") {
    window.location.assign(loginPath);
  }
}

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("aae_access_token");
  const requestUrl = String(config.url ?? "");
  if (!token && localStorage.getItem("aae_refresh_token") && !requestUrl.includes("/auth/")) {
    try {
      token = await refreshAccessToken();
    } catch {
      clearStoredSession();
      redirectToLogin();
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");
    const hasRefreshSession = Boolean(localStorage.getItem("aae_refresh_token"));
    const isAuthAction = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/logout") || requestUrl.includes("/auth/refresh");
    const originalRequest = error.config as (typeof error.config & { _aaeRetried?: boolean }) | undefined;

    if (status === 401 && hasRefreshSession && !isAuthAction && originalRequest && !originalRequest._aaeRetried) {
      originalRequest._aaeRetried = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api.request(originalRequest);
      } catch {
        clearStoredSession();
        redirectToLogin();
      }
    } else if (status === 401 && !isAuthAction) {
      clearStoredSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
