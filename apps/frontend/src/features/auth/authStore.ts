import { create } from "zustand";
import { api } from "../../lib/api";
import type { Role } from "../../lib/permissions";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  orgId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem("aae_user") ?? "null") as AuthUser | null,
  permissions: JSON.parse(localStorage.getItem("aae_permissions") ?? "[]") as string[],
  accessToken: localStorage.getItem("aae_access_token"),
  refreshToken: localStorage.getItem("aae_refresh_token"),

  async login(email, password, rememberMe) {
    const response = await api.post("/auth/login", { email, password, rememberMe });
    localStorage.setItem("aae_access_token", response.data.accessToken);
    localStorage.setItem("aae_refresh_token", response.data.refreshToken);
    localStorage.setItem("aae_user", JSON.stringify(response.data.user));
    localStorage.setItem("aae_role", response.data.user.role);
    set({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user
    });
    await get().loadMe();
  },

  async loadMe() {
    const response = await api.get("/users/me");
    localStorage.setItem("aae_user", JSON.stringify(response.data.user));
    localStorage.setItem("aae_permissions", JSON.stringify(response.data.permissions));
    set({ user: response.data.user, permissions: response.data.permissions });
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("aae_access_token");
      localStorage.removeItem("aae_refresh_token");
      localStorage.removeItem("aae_user");
      localStorage.removeItem("aae_permissions");
      localStorage.removeItem("aae_role");
      set({ user: null, permissions: [], accessToken: null, refreshToken: null });
    }
  },

  hasPermission(permission) {
    const permissions = get().permissions;
    const [module] = permission.split(".");
    return permissions.includes(permission) || permissions.includes(`${module}.Manage`);
  }
}));
