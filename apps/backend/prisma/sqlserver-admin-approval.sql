BEGIN TRY
BEGIN TRAN;

IF COL_LENGTH('dbo.aae_users', 'company') IS NULL ALTER TABLE [dbo].[aae_users] ADD [company] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'department') IS NULL ALTER TABLE [dbo].[aae_users] ADD [department] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'designation') IS NULL ALTER TABLE [dbo].[aae_users] ADD [designation] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'profilePhotoUrl') IS NULL ALTER TABLE [dbo].[aae_users] ADD [profilePhotoUrl] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'documents') IS NULL ALTER TABLE [dbo].[aae_users] ADD [documents] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.aae_users', 'approvedBy') IS NULL ALTER TABLE [dbo].[aae_users] ADD [approvedBy] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'approvedAt') IS NULL ALTER TABLE [dbo].[aae_users] ADD [approvedAt] DATETIME2 NULL;
IF COL_LENGTH('dbo.aae_users', 'approvalNotes') IS NULL ALTER TABLE [dbo].[aae_users] ADD [approvalNotes] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.aae_users', 'rejectionReason') IS NULL ALTER TABLE [dbo].[aae_users] ADD [rejectionReason] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.aae_users', 'rejectionMessage') IS NULL ALTER TABLE [dbo].[aae_users] ADD [rejectionMessage] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.aae_users', 'employeeCode') IS NULL ALTER TABLE [dbo].[aae_users] ADD [employeeCode] NVARCHAR(1000) NULL;

IF OBJECT_ID('dbo.aae_notifications', 'U') IS NULL
CREATE TABLE [dbo].[aae_notifications] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [type] NVARCHAR(1000) NOT NULL,
  [title] NVARCHAR(1000) NOT NULL,
  [message] NVARCHAR(MAX) NOT NULL,
  [actionUrl] NVARCHAR(1000) NULL,
  [readAt] DATETIME2 NULL,
  [archivedAt] DATETIME2 NULL,
  [deletedAt] DATETIME2 NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

IF OBJECT_ID('dbo.aae_registration_messages', 'U') IS NULL
CREATE TABLE [dbo].[aae_registration_messages] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [senderId] NVARCHAR(1000) NULL,
  [senderRole] NVARCHAR(1000) NULL,
  [message] NVARCHAR(MAX) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_registration_messages_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [aae_registration_messages_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH;
