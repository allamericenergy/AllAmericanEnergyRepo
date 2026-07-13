IF COL_LENGTH('dbo.tblCompany', 'Customer ID') IS NOT NULL
BEGIN
  IF COLUMNPROPERTY(OBJECT_ID('dbo.tblCompany'), 'Customer ID', 'IsComputed') = 0
  BEGIN
    ALTER TABLE [dbo].[tblCompany] DROP COLUMN [Customer ID];
  END
END

IF COL_LENGTH('dbo.tblCompany', 'Customer ID') IS NULL
BEGIN
  ALTER TABLE [dbo].[tblCompany]
  ADD [Customer ID] AS (RIGHT('CID0000' + CONVERT([varchar](10), [id]), (10))) PERSISTED NOT NULL;
END
