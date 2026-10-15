IF COL_LENGTH('dbo.tbl_Utility', 'AccountNumberSize') IS NULL
BEGIN
  ALTER TABLE dbo.tbl_Utility ADD [AccountNumberSize] INT NULL;
END;

IF COL_LENGTH('dbo.tbl_Utility', 'ServiceRefSize') IS NULL
BEGIN
  ALTER TABLE dbo.tbl_Utility ADD [ServiceRefSize] INT NULL;
END;

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE [name] = 'CK_tbl_Utility_AccountNumberSize'
)
BEGIN
  ALTER TABLE dbo.tbl_Utility DROP CONSTRAINT [CK_tbl_Utility_AccountNumberSize];
END;

EXEC(N'ALTER TABLE dbo.tbl_Utility
  ADD CONSTRAINT [CK_tbl_Utility_AccountNumberSize]
  CHECK ([AccountNumberSize] IS NULL OR [AccountNumberSize] BETWEEN 0 AND 1000);');

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE [name] = 'CK_tbl_Utility_ServiceRefSize'
)
BEGIN
  ALTER TABLE dbo.tbl_Utility DROP CONSTRAINT [CK_tbl_Utility_ServiceRefSize];
END;

EXEC(N'ALTER TABLE dbo.tbl_Utility
  ADD CONSTRAINT [CK_tbl_Utility_ServiceRefSize]
  CHECK ([ServiceRefSize] IS NULL OR [ServiceRefSize] BETWEEN 0 AND 1000);');
