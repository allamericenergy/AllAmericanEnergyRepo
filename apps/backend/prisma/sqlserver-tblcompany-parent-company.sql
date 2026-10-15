IF COL_LENGTH('dbo.tblCompany', 'ParentCompanyID') IS NULL
BEGIN
  ALTER TABLE dbo.tblCompany ADD [ParentCompanyID] INT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [name] = 'FK_tblCompany_ParentCompany'
    AND [parent_object_id] = OBJECT_ID('dbo.tblCompany')
)
BEGIN
  ALTER TABLE dbo.tblCompany
  ADD CONSTRAINT [FK_tblCompany_ParentCompany]
    FOREIGN KEY ([ParentCompanyID]) REFERENCES dbo.tblCompany([id]);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE [name] = 'IX_tblCompany_ParentCompanyID'
    AND [object_id] = OBJECT_ID('dbo.tblCompany')
)
BEGIN
  CREATE INDEX [IX_tblCompany_ParentCompanyID]
    ON dbo.tblCompany([ParentCompanyID]);
END;
