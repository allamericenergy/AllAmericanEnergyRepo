export type Role = "superadmin" | "admin" | "member" | "user";

export const roleLabels: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  member: "Member",
  user: "User"
};

export const navByRole: Record<Role, string[]> = {
  superadmin: ["Dashboard", "Organizations", "Companies", "Contacts", "Deals", "Tasks", "Reports", "Audit Log", "Admin"],
  admin: ["Dashboard", "Companies", "Contacts", "Deals", "Tasks", "Reports", "Admin"],
  member: ["Dashboard", "Companies", "Contacts", "Deals", "Tasks", "Reports"],
  user: ["Dashboard", "Contacts", "Tasks"]
};
