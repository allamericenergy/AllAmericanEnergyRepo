IF COL_LENGTH('dbo.aae_notes', 'companyId') IS NULL
BEGIN
  ALTER TABLE dbo.aae_notes ADD [companyId] INT NULL;
END;
GO

UPDATE notes
SET [companyId] = TRY_CONVERT(INT, notes.[relatedId])
FROM dbo.aae_notes notes
WHERE notes.[companyId] IS NULL
  AND notes.[relatedType] = 'company'
  AND TRY_CONVERT(INT, notes.[relatedId]) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM dbo.tblCompany company
    WHERE company.[id] = TRY_CONVERT(INT, notes.[relatedId])
  );
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [name] = 'aae_notes_companyId_idx'
    AND [object_id] = OBJECT_ID('dbo.aae_notes')
)
BEGIN
  CREATE NONCLUSTERED INDEX [aae_notes_companyId_idx] ON dbo.aae_notes([companyId]);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE [name] = 'FK_aae_notes_tblCompany'
    AND [parent_object_id] = OBJECT_ID('dbo.aae_notes')
)
BEGIN
  ALTER TABLE dbo.aae_notes WITH CHECK
  ADD CONSTRAINT [FK_aae_notes_tblCompany]
    FOREIGN KEY ([companyId]) REFERENCES dbo.tblCompany([id]);
END;
GO
