import { BarChart3, Building2, CheckSquare, Contact, Handshake, LayoutDashboard, Shield, UserCog } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { navByRole, type Role } from "../lib/permissions";

const iconMap = {
  Dashboard: LayoutDashboard,
  Organizations: Building2,
  Companies: Building2,
  Contacts: Contact,
  Deals: Handshake,
  Tasks: CheckSquare,
  Reports: BarChart3,
  "Audit Log": Shield,
  Admin: UserCog
};

const pathMap: Record<string, string> = {
  Dashboard: "/",
  Companies: "/companies",
  Contacts: "/contacts",
  Deals: "/deals",
  Tasks: "/tasks",
  Reports: "/reports"
};

export function AppShell() {
  const navigate = useNavigate();
  const role = (localStorage.getItem("aae_role") as Role | null) ?? "admin";
  const nav = navByRole[role];

  function logout() {
    localStorage.removeItem("aae_access_token");
    localStorage.removeItem("aae_role");
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AAE</span>
          <div>
            <strong>AllAmericanEnergy</strong>
            <small>CRM</small>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = iconMap[item as keyof typeof iconMap];
            return (
              <NavLink key={item} to={pathMap[item] ?? "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={18} />
                {item}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <input aria-label="Search" placeholder="Search contacts, companies, deals" />
          <div className="user-menu">
            <span>{role}</span>
            <button onClick={logout}>Log out</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
