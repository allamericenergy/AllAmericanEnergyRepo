export const permissionModules = [
    "Dashboard",
    "Users",
    "Roles",
    "Permissions",
    "Projects",
    "Grids",
    "Rows",
    "Columns",
    "Reports",
    "Import",
    "Export",
    "Audit",
    "Settings",
    "Security",
    "System"
];
export const permissionActions = [
    "Create",
    "Read",
    "Update",
    "Delete",
    "Approve",
    "Export",
    "Import",
    "Print",
    "Share",
    "Manage"
];
export const allPermissions = permissionModules.flatMap((module) => permissionActions.map((action) => `${module}.${action}`));
export const permissionMatrix = {
    superadmin: allPermissions,
    admin: [
        "Dashboard.Read",
        "Users.Create",
        "Users.Read",
        "Users.Update",
        "Roles.Read",
        "Permissions.Read",
        "Projects.Create",
        "Projects.Read",
        "Projects.Update",
        "Projects.Delete",
        "Grids.Create",
        "Grids.Read",
        "Grids.Update",
        "Grids.Delete",
        "Rows.Create",
        "Rows.Read",
        "Rows.Update",
        "Rows.Delete",
        "Columns.Create",
        "Columns.Read",
        "Columns.Update",
        "Reports.Read",
        "Reports.Export",
        "Import.Import",
        "Export.Export",
        "Settings.Read",
        "Settings.Update"
    ],
    member: [
        "Dashboard.Read",
        "Projects.Read",
        "Grids.Read",
        "Grids.Update",
        "Rows.Create",
        "Rows.Read",
        "Rows.Update",
        "Columns.Read",
        "Reports.Read",
        "Import.Import",
        "Export.Export",
        "Export.Print",
        "Grids.Share"
    ],
    user: [
        "Dashboard.Read",
        "Projects.Read",
        "Grids.Read",
        "Rows.Read",
        "Export.Export"
    ]
};
export const legacyPermissionMap = {
    "org:administer": "System.Manage",
    "user:administer": "Users.Manage",
    "company:create": "Projects.Create",
    "company:read": "Projects.Read",
    "company:update": "Projects.Update",
    "company:delete": "Projects.Delete",
    "contact:create": "Rows.Create",
    "contact:read": "Rows.Read",
    "contact:update": "Rows.Update",
    "contact:delete": "Rows.Delete",
    "deal:create": "Grids.Create",
    "deal:read": "Grids.Read",
    "deal:update": "Grids.Update",
    "deal:delete": "Grids.Delete",
    "task:create": "Rows.Create",
    "task:read": "Rows.Read",
    "task:update": "Rows.Update",
    "task:delete": "Rows.Delete",
    "note:create": "Rows.Create",
    "note:read": "Rows.Read",
    "note:update": "Rows.Update",
    "note:delete": "Rows.Delete",
    "report:read": "Reports.Read",
    "audit:read": "Audit.Read",
    "data:export": "Export.Export"
};
export function normalizePermission(action) {
    return legacyPermissionMap[action] ?? action;
}
export function can(role, action) {
    const permission = normalizePermission(action);
    return permissionMatrix[role].includes(permission) || permissionMatrix[role].includes(`${permission.split(".")[0]}.Manage`);
}
