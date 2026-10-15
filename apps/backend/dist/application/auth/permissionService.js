import { prisma } from "../../db/prisma.js";
import { allPermissions, permissionMatrix } from "../../security/permissions.js";
function splitPermission(permission) {
    const [module, action] = permission.split(".");
    return { module, action, displayName: `${module} ${action}` };
}
export class PermissionService {
    async seedCatalog() {
        for (const permission of allPermissions) {
            const data = splitPermission(permission);
            await prisma.permission.upsert({
                where: { module_action: { module: data.module, action: data.action } },
                update: { displayName: data.displayName },
                create: data
            });
        }
    }
    async assignSystemRole(roleName, orgId) {
        const role = await prisma.authRole.upsert({
            where: { orgId_name: { orgId, name: roleName } },
            update: { description: `${roleName} system role`, isSystemRole: true },
            create: { name: roleName, orgId, description: `${roleName} system role`, isSystemRole: true, priority: this.priority(roleName) }
        });
        for (const permissionKey of permissionMatrix[roleName]) {
            const { module, action } = splitPermission(permissionKey);
            const permission = await prisma.permission.findUniqueOrThrow({ where: { module_action: { module, action } } });
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
                update: {},
                create: { roleId: role.id, permissionId: permission.id }
            });
        }
        return role;
    }
    async permissionsForUser(userId, fallbackRole) {
        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
        });
        const assigned = userRoles.flatMap((userRole) => userRole.role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}.${rolePermission.permission.action}`));
        return [...new Set([...permissionMatrix[fallbackRole], ...assigned])];
    }
    priority(role) {
        return { superadmin: 0, admin: 10, member: 50, user: 100 }[role];
    }
}
export const permissionService = new PermissionService();
