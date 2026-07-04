export type Role = "superadmin" | "admin" | "member" | "user";

export type Action =
  | "org:administer"
  | "user:administer"
  | "company:create"
  | "company:read"
  | "company:update"
  | "company:delete"
  | "contact:create"
  | "contact:read"
  | "contact:update"
  | "contact:delete"
  | "deal:create"
  | "deal:read"
  | "deal:update"
  | "deal:delete"
  | "task:create"
  | "task:read"
  | "task:update"
  | "task:delete"
  | "note:create"
  | "note:read"
  | "note:update"
  | "note:delete"
  | "report:read"
  | "audit:read"
  | "data:export";

export const permissionMatrix: Record<Role, Action[]> = {
  superadmin: [
    "org:administer",
    "user:administer",
    "company:create",
    "company:read",
    "company:update",
    "company:delete",
    "contact:create",
    "contact:read",
    "contact:update",
    "contact:delete",
    "deal:create",
    "deal:read",
    "deal:update",
    "deal:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "note:create",
    "note:read",
    "note:update",
    "note:delete",
    "report:read",
    "audit:read",
    "data:export"
  ],
  admin: [
    "user:administer",
    "company:create",
    "company:read",
    "company:update",
    "company:delete",
    "contact:create",
    "contact:read",
    "contact:update",
    "contact:delete",
    "deal:create",
    "deal:read",
    "deal:update",
    "deal:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "note:create",
    "note:read",
    "note:update",
    "note:delete",
    "report:read",
    "audit:read",
    "data:export"
  ],
  member: [
    "company:read",
    "contact:create",
    "contact:read",
    "contact:update",
    "deal:create",
    "deal:read",
    "deal:update",
    "task:create",
    "task:read",
    "task:update",
    "note:create",
    "note:read",
    "note:update",
    "report:read"
  ],
  user: [
    "company:read",
    "contact:create",
    "contact:read",
    "contact:update",
    "deal:read",
    "task:create",
    "task:read",
    "task:update",
    "note:create",
    "note:read",
    "note:update"
  ]
};

export function can(role: Role, action: Action) {
  return permissionMatrix[role].includes(action);
}
