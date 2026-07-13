# Authentication and RBAC

AllAmericanEnergy uses a modular authentication boundary with JWT access tokens, refresh tokens, SQL Server-backed sessions, login history, audit logs, password history, email verification tokens, and password reset tokens.

## Roles

| Role | Scope |
| --- | --- |
| `superadmin` | Full system access. Cannot be publicly registered. Only a seeded or existing superadmin can create another superadmin. |
| `admin` | Organization administration for users, members, reports, grids/projects, and application settings. Cannot manage superadmin, system security, licensing, or database controls. |
| `member` | Internal employee. Can use grids, edit assigned data, import/export, filter, sort, group, chart, comment, and manage assigned tasks. |
| `user` | Read-oriented role. Can view assigned grids, export allowed data, update own profile, and change password. |

## Permission Model

Permissions use `Module.Action` keys. Modules are:

`Dashboard`, `Users`, `Roles`, `Permissions`, `Projects`, `Grids`, `Rows`, `Columns`, `Reports`, `Import`, `Export`, `Audit`, `Settings`, `Security`, `System`.

Actions are:

`Create`, `Read`, `Update`, `Delete`, `Approve`, `Export`, `Import`, `Print`, `Share`, `Manage`.

Examples: `Users.Create`, `Users.Read`, `Grids.Export`, `Settings.Manage`.

## Security Controls

- BCrypt password hashing.
- Password policy: 12+ chars, uppercase, lowercase, number, special char.
- Last 5 passwords cannot be reused.
- Account lockout after 5 failed attempts for 30 minutes.
- Email verification gate before login.
- Refresh token storage and revocation.
- Multi-device session records.
- Login history and audit logging.
- Route-level API authorization with `401` and `403` responses.

## SQL Server Tables

All auth tables are prefixed with `aae_`:

- `aae_users`
- `aae_roles`
- `aae_permissions`
- `aae_role_permissions`
- `aae_user_roles`
- `aae_refresh_tokens`
- `aae_login_history`
- `aae_audit_logs`
- `aae_password_history`
- `aae_email_verifications`
- `aae_password_reset_tokens`
- `aae_user_sessions`

Run `apps/backend/prisma/sqlserver-auth-rbac.sql` to apply the auth/RBAC migration without dropping existing database tables.
