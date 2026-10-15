IF COL_LENGTH('dbo.tblCompany', 'CompanyFolderID') IS NULL
BEGIN
  ALTER TABLE [dbo].[tblCompany]
    ADD [CompanyFolderID] nvarchar(255) NULL;
END

IF COL_LENGTH('dbo.tblCompany', 'ContractFolderID') IS NULL
BEGIN
  ALTER TABLE [dbo].[tblCompany]
    ADD [ContractFolderID] nvarchar(255) NULL;
END

IF COL_LENGTH('dbo.tblCompany', 'UtilityBillsFolderID') IS NULL
BEGIN
  ALTER TABLE [dbo].[tblCompany]
    ADD [UtilityBillsFolderID] nvarchar(255) NULL;
END
