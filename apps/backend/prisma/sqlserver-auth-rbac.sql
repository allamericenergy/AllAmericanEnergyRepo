BEGIN TRY
BEGIN TRAN;

IF COL_LENGTH('dbo.aae_users', 'username') IS NULL ALTER TABLE [dbo].[aae_users] ADD [username] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'phone') IS NULL ALTER TABLE [dbo].[aae_users] ADD [phone] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'emailVerified') IS NULL ALTER TABLE [dbo].[aae_users] ADD [emailVerified] BIT NOT NULL CONSTRAINT [aae_users_emailVerified_df] DEFAULT 0;
IF COL_LENGTH('dbo.aae_users', 'failedLoginAttempts') IS NULL ALTER TABLE [dbo].[aae_users] ADD [failedLoginAttempts] INT NOT NULL CONSTRAINT [aae_users_failedLoginAttempts_df] DEFAULT 0;
IF COL_LENGTH('dbo.aae_users', 'lockoutEnd') IS NULL ALTER TABLE [dbo].[aae_users] ADD [lockoutEnd] DATETIME2 NULL;
IF COL_LENGTH('dbo.aae_users', 'createdBy') IS NULL ALTER TABLE [dbo].[aae_users] ADD [createdBy] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'updatedBy') IS NULL ALTER TABLE [dbo].[aae_users] ADD [updatedBy] NVARCHAR(1000) NULL;

IF COL_LENGTH('dbo.aae_refresh_tokens', 'rememberMe') IS NULL ALTER TABLE [dbo].[aae_refresh_tokens] ADD [rememberMe] BIT NOT NULL CONSTRAINT [aae_refresh_tokens_rememberMe_df] DEFAULT 0;
IF COL_LENGTH('dbo.aae_refresh_tokens', 'userAgent') IS NULL ALTER TABLE [dbo].[aae_refresh_tokens] ADD [userAgent] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_refresh_tokens', 'ip') IS NULL ALTER TABLE [dbo].[aae_refresh_tokens] ADD [ip] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_refresh_tokens', 'revokedAt') IS NULL ALTER TABLE [dbo].[aae_refresh_tokens] ADD [revokedAt] DATETIME2 NULL;

IF COL_LENGTH('dbo.aae_audit_logs', 'module') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [module] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_audit_logs', 'oldValue') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [oldValue] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.aae_audit_logs', 'newValue') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [newValue] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.aae_audit_logs', 'browser') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [browser] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_audit_logs', 'os') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [os] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_audit_logs', 'device') IS NULL ALTER TABLE [dbo].[aae_audit_logs] ADD [device] NVARCHAR(1000) NULL;

IF OBJECT_ID('dbo.aae_roles', 'U') IS NULL
CREATE TABLE [dbo].[aae_roles] (
  [id] NVARCHAR(1000) NOT NULL,
  [orgId] NVARCHAR(1000) NULL,
  [name] NVARCHAR(1000) NOT NULL,
  [description] NVARCHAR(1000) NULL,
  [priority] INT NOT NULL CONSTRAINT [aae_roles_priority_df] DEFAULT 100,
  [isSystemRole] BIT NOT NULL CONSTRAINT [aae_roles_isSystemRole_df] DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [aae_roles_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'aae_roles_orgId_name_key')
CREATE UNIQUE NONCLUSTERED INDEX [aae_roles_orgId_name_key] ON [dbo].[aae_roles]([orgId], [name]) WHERE [orgId] IS NOT NULL;

IF OBJECT_ID('dbo.aae_permissions', 'U') IS NULL
CREATE TABLE [dbo].[aae_permissions] (
  [id] NVARCHAR(1000) NOT NULL,
  [module] NVARCHAR(1000) NOT NULL,
  [action] NVARCHAR(1000) NOT NULL,
  [displayName] NVARCHAR(1000) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_permissions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [aae_permissions_module_action_key] UNIQUE NONCLUSTERED ([module], [action])
);

IF OBJECT_ID('dbo.aae_role_permissions', 'U') IS NULL
CREATE TABLE [dbo].[aae_role_permissions] (
  [id] NVARCHAR(1000) NOT NULL,
  [roleId] NVARCHAR(1000) NOT NULL,
  [permissionId] NVARCHAR(1000) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_role_permissions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_role_permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [aae_role_permissions_roleId_permissionId_key] UNIQUE NONCLUSTERED ([roleId], [permissionId])
);

IF OBJECT_ID('dbo.aae_user_roles', 'U') IS NULL
CREATE TABLE [dbo].[aae_user_roles] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [roleId] NVARCHAR(1000) NOT NULL,
  [assignedBy] NVARCHAR(1000) NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_user_roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_user_roles_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [aae_user_roles_userId_roleId_key] UNIQUE NONCLUSTERED ([userId], [roleId])
);

IF OBJECT_ID('dbo.aae_login_history', 'U') IS NULL
CREATE TABLE [dbo].[aae_login_history] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NULL,
  [email] NVARCHAR(1000) NOT NULL,
  [success] BIT NOT NULL,
  [reason] NVARCHAR(1000) NULL,
  [ip] NVARCHAR(1000) NULL,
  [userAgent] NVARCHAR(1000) NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_login_history_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_login_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF OBJECT_ID('dbo.aae_password_history', 'U') IS NULL
CREATE TABLE [dbo].[aae_password_history] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [passwordHash] NVARCHAR(1000) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_password_history_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_password_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF OBJECT_ID('dbo.aae_email_verifications', 'U') IS NULL
CREATE TABLE [dbo].[aae_email_verifications] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [tokenHash] NVARCHAR(1000) NOT NULL,
  [usedAt] DATETIME2 NULL,
  [expiresAt] DATETIME2 NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_email_verifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_email_verifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF OBJECT_ID('dbo.aae_password_reset_tokens', 'U') IS NULL
CREATE TABLE [dbo].[aae_password_reset_tokens] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [tokenHash] NVARCHAR(1000) NOT NULL,
  [usedAt] DATETIME2 NULL,
  [expiresAt] DATETIME2 NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_password_reset_tokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_password_reset_tokens_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF OBJECT_ID('dbo.aae_user_sessions', 'U') IS NULL
CREATE TABLE [dbo].[aae_user_sessions] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [refreshTokenId] NVARCHAR(1000) NULL,
  [ip] NVARCHAR(1000) NULL,
  [userAgent] NVARCHAR(1000) NULL,
  [expiresAt] DATETIME2 NOT NULL,
  [revokedAt] DATETIME2 NULL,
  [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [aae_user_sessions_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_user_sessions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_user_sessions_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH;
