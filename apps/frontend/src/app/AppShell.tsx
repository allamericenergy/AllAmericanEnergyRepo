import { Avatar, Menu, MenuItem } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Gauge, Handshake, LayoutDashboard, Shield, UserCog, Users } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { navByRole, normalizeRole, roleLabels, type Role } from "../lib/permissions";
import { useAuthStore } from "../features/auth/authStore";
import { api } from "../lib/api";

const iconMap = {
  Dashboard: LayoutDashboard,
  Organizations: Building2,
  Companies: Building2,
  Contracts: Handshake,
  Meters: Gauge,
  Members: Users,
  Activity,
  "Audit Log": Shield,
  Admin: UserCog
};

const pathMap: Record<string, string> = {
  Dashboard: "/",
  Organizations: "/organizations",
  Companies: "/companies",
  Contracts: "/contracts",
  Meters: "/meters",
  Members: "/members",
  Activity: "/activity",
  Admin: "/admin",
  "Audit Log": "/admin"
};

export function AppShell() {
  const navigate = useNavigate();
  const logoutUser = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const role = normalizeRole(user?.role ?? localStorage.getItem("aae_role"));
  const nav = navByRole[role];
  const activityCount = useQuery({
    queryKey: ["activity-unread-counts"],
    queryFn: async () => (await api.get("/reports/activity-unread-counts")).data as { total: number; byCompany: Record<string, number> },
    refetchInterval: 30000,
    retry: false
  });
  const privilegedMenuItems = role === "superadmin"
    ? [
        { label: "Organizations", path: "/organizations", Icon: Building2 },
        { label: "Audit Log", path: "/admin", Icon: Shield },
        { label: "Admin", path: "/admin", Icon: UserCog }
      ]
    : [];

  async function logout() {
    setAccountMenuAnchor(null);
    await logoutUser();
    navigate("/login");
  }

  function goTo(path: string) {
    setAccountMenuAnchor(null);
    navigate(path);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="AllAmericanEnergy" style={{ height: 150, width: "auto" }} className="brand-logo" />
        </div>
        <nav className="topbar-nav">
          {nav.map((item) => {
            const Icon = iconMap[item as keyof typeof iconMap];
            return (
              <NavLink key={item} to={pathMap[item] ?? "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={18} />
                {item}{item === "Activity" ? <span className="activity-nav-count">({activityCount.data?.total ?? 0})</span> : null}
              </NavLink>
            );
          })}
        </nav>
        <button
          type="button"
          className="user-menu-trigger"
          onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
          aria-controls={accountMenuAnchor ? "account-menu" : undefined}
          aria-haspopup="menu"
          aria-expanded={Boolean(accountMenuAnchor)}
        >
          <Avatar className="user-avatar">{roleLabels[role].slice(0, 1)}</Avatar>
          <span>
            <strong>{roleLabels[role]}</strong>
            <small>{role === "superadmin" ? "Administrator" : roleLabels[role]}</small>
          </span>
        </button>
        <Menu
          id="account-menu"
          anchorEl={accountMenuAnchor}
          open={Boolean(accountMenuAnchor)}
          onClose={() => setAccountMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {privilegedMenuItems.map(({ label, path, Icon }) => (
            <MenuItem key={label} onClick={() => goTo(path)}>
              <Icon size={16} />
              {label}
            </MenuItem>
          ))}
          <MenuItem onClick={logout}>Logout</MenuItem>
        </Menu>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
