-- SQL Server BIT maps to boolean: 0 = false, 1 = true.
IF COL_LENGTH('dbo.tblCompany', 'isDeleted') IS NULL
BEGIN
  ALTER TABLE dbo.tblCompany
    ADD [isDeleted] BIT NOT NULL
      CONSTRAINT [DF_tblCompany_isDeleted] DEFAULT (0) WITH VALUES;
END;
