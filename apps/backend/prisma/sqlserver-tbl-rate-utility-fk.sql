/* Associate every rate with a utility. Existing rows remain nullable until assigned. */

IF COL_LENGTH('dbo.tbl_Rate', 'UtilityId') IS NULL
  ALTER TABLE dbo.tbl_Rate ADD [UtilityId] INT NULL;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [name] = 'tbl_Rate_UtilityId_fkey'
    AND [parent_object_id] = OBJECT_ID('dbo.tbl_Rate')
)
  ALTER TABLE dbo.tbl_Rate
    ADD CONSTRAINT [tbl_Rate_UtilityId_fkey]
    FOREIGN KEY ([UtilityId]) REFERENCES dbo.tbl_Utility([id]);
