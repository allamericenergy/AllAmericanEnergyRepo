/* Preserve fractional contract rates and fees. */
IF COL_LENGTH('dbo.tbl_Contract', 'Rate-kWh/therms') IS NOT NULL
BEGIN
  ALTER TABLE dbo.tbl_Contract ALTER COLUMN [Rate-kWh/therms] DECIMAL(19,8) NULL;
END;

IF COL_LENGTH('dbo.tbl_Contract', 'Fee-kWh/Dth') IS NOT NULL
BEGIN
  ALTER TABLE dbo.tbl_Contract ALTER COLUMN [Fee-kWh/Dth] DECIMAL(19,8) NULL;
END;
