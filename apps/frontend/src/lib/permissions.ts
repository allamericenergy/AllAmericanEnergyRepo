export type Role = "superadmin" | "admin" | "member" | "user";

export const roleLabels: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  member: "Member",
  user: "User"
};

export const navByRole: Record<Role, string[]> = {
  superadmin: ["Dashboard", "Companies", "Contracts", "Meters", "Members", "Activity"],
  admin: ["Dashboard", "Companies", "Contracts", "Meters", "Members", "Activity"],
  member: ["Dashboard", "Companies", "Contracts", "Meters", "Members", "Activity"],
  user: ["Dashboard", "Members", "Activity"]
};

export function normalizeRole(value: string | null | undefined): Role {
  const normalized = (value ?? "admin").toLowerCase().replace(/[^a-z]/g, "");

  if (normalized === "superadmin") return "superadmin";
  if (normalized === "member") return "member";
  if (normalized === "user") return "user";
  return "admin";
}
