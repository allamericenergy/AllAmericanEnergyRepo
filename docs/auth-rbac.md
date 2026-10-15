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

## Admin Approval Workflow

Public Admin registration creates an inactive account with status `pending_approval`. The applicant cannot log in until a Super Admin approves the request.

When an Admin request is submitted:

- The applicant is stored with company, department, designation, phone, optional profile photo, and document metadata.
- Super Admin users receive in-app notifications.
- The request appears under `Admin > Pending Admin Requests`.

Super Admin actions:

- `Approve`: confirms approval, changes status to `active`, marks email verified, assigns Admin role permissions, records approver, approval date, approval notes, and employee code.
- `Reject`: requires a rejection reason and optional message, changes status to `rejected`, and notifies the applicant.
- `Send Message`: records a message for the applicant and creates an in-app notification.

Applicant states:

- `pending_approval`: registration submitted and waiting for Super Admin approval.
- `active`: approved and can log in.
- `rejected`: rejected with reason and optional message.

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
