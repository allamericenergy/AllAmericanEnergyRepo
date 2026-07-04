BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[aae_organizations] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000),
    [billingInfo] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_organizations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_organizations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [aae_users_status_df] DEFAULT 'invited',
    [orgId] NVARCHAR(1000),
    [lastLogin] DATETIME2,
    [twoFactorEnabled] BIT NOT NULL CONSTRAINT [aae_users_twoFactorEnabled_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [aae_users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[aae_companies] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [industry] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_companies_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_companies_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_contacts] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000),
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [role] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_contacts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_contacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_deals] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000),
    [contactId] NVARCHAR(1000),
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [amount] DECIMAL(32,16) NOT NULL CONSTRAINT [aae_deals_amount_df] DEFAULT 0,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [aae_deals_currency_df] DEFAULT 'USD',
    [stage] NVARCHAR(1000) NOT NULL CONSTRAINT [aae_deals_stage_df] DEFAULT 'prospecting',
    [probability] INT NOT NULL CONSTRAINT [aae_deals_probability_df] DEFAULT 10,
    [ownerId] NVARCHAR(1000) NOT NULL,
    [closeDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_deals_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_deals_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_tasks] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [dueDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [aae_tasks_status_df] DEFAULT 'open',
    [assigneeId] NVARCHAR(1000),
    [relatedType] NVARCHAR(1000),
    [relatedId] NVARCHAR(1000),
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [aae_tasks_priority_df] DEFAULT 'medium',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_tasks_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_tasks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_notes] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [relatedType] NVARCHAR(1000) NOT NULL,
    [relatedId] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_notes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [aae_notes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [orgId] NVARCHAR(1000),
    [userId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [objectType] NVARCHAR(1000) NOT NULL,
    [objectId] NVARCHAR(1000),
    [diff] NVARCHAR(1000),
    [ip] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [aae_audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[aae_refresh_tokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [revoked] BIT NOT NULL CONSTRAINT [aae_refresh_tokens_revoked_df] DEFAULT 0,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [aae_refresh_tokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [aae_refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_users_orgId_idx] ON [dbo].[aae_users]([orgId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_companies_orgId_idx] ON [dbo].[aae_companies]([orgId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_contacts_orgId_idx] ON [dbo].[aae_contacts]([orgId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_contacts_companyId_idx] ON [dbo].[aae_contacts]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_deals_orgId_stage_idx] ON [dbo].[aae_deals]([orgId], [stage]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_deals_ownerId_idx] ON [dbo].[aae_deals]([ownerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_tasks_orgId_status_idx] ON [dbo].[aae_tasks]([orgId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_tasks_assigneeId_idx] ON [dbo].[aae_tasks]([assigneeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_notes_orgId_relatedType_relatedId_idx] ON [dbo].[aae_notes]([orgId], [relatedType], [relatedId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_audit_logs_orgId_objectType_idx] ON [dbo].[aae_audit_logs]([orgId], [objectType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [aae_refresh_tokens_userId_idx] ON [dbo].[aae_refresh_tokens]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[aae_users] ADD CONSTRAINT [aae_users_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_companies] ADD CONSTRAINT [aae_companies_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_contacts] ADD CONSTRAINT [aae_contacts_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_contacts] ADD CONSTRAINT [aae_contacts_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[aae_companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_deals] ADD CONSTRAINT [aae_deals_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_deals] ADD CONSTRAINT [aae_deals_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[aae_companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_deals] ADD CONSTRAINT [aae_deals_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[aae_contacts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_deals] ADD CONSTRAINT [aae_deals_ownerId_fkey] FOREIGN KEY ([ownerId]) REFERENCES [dbo].[aae_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_tasks] ADD CONSTRAINT [aae_tasks_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_tasks] ADD CONSTRAINT [aae_tasks_assigneeId_fkey] FOREIGN KEY ([assigneeId]) REFERENCES [dbo].[aae_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_notes] ADD CONSTRAINT [aae_notes_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_notes] ADD CONSTRAINT [aae_notes_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[aae_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_audit_logs] ADD CONSTRAINT [aae_audit_logs_orgId_fkey] FOREIGN KEY ([orgId]) REFERENCES [dbo].[aae_organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_audit_logs] ADD CONSTRAINT [aae_audit_logs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[aae_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[aae_refresh_tokens] ADD CONSTRAINT [aae_refresh_tokens_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[aae_users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

