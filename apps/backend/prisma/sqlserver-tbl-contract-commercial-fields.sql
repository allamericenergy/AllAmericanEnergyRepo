/* Add commercial lookup fields used by the Add/Edit Contract form. */

IF COL_LENGTH('dbo.tbl_Contract', 'Swing') IS NULL
  ALTER TABLE dbo.tbl_Contract ADD [Swing] INT NULL;

IF COL_LENGTH('dbo.tbl_Contract', 'PassThrough') IS NULL
  ALTER TABLE dbo.tbl_Contract ADD [PassThrough] INT NULL;

IF COL_LENGTH('dbo.tbl_Contract', 'BillType') IS NULL
  ALTER TABLE dbo.tbl_Contract ADD [BillType] INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = 'tbl_Contract_Swing_fkey')
  ALTER TABLE dbo.tbl_Contract
    ADD CONSTRAINT [tbl_Contract_Swing_fkey]
    FOREIGN KEY ([Swing]) REFERENCES dbo.tbl_Swing([id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = 'tbl_Contract_PassThrough_fkey')
  ALTER TABLE dbo.tbl_Contract
    ADD CONSTRAINT [tbl_Contract_PassThrough_fkey]
    FOREIGN KEY ([PassThrough]) REFERENCES dbo.tbl_PassThrough([id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = 'tbl_Contract_BillType_fkey')
  ALTER TABLE dbo.tbl_Contract
    ADD CONSTRAINT [tbl_Contract_BillType_fkey]
    FOREIGN KEY ([BillType]) REFERENCES dbo.tbl_BillType([id]);
