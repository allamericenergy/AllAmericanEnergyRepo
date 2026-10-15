/*
  Fix tbl_CompanyMeterContract.ContractID so it references dbo.tbl_Contract(id).

  The current database error shows the FK points at dbo.tbl_Contract1(id):
    tbl_CompanyMeterContract_ContractID_fkey -> dbo.tbl_Contract1(id)

  Contract rows are inserted into dbo.tbl_Contract. Do not insert into
  dbo.tbl_Contract.[ContractID]; it is a persisted computed column:
    RIGHT('CTR0000' + CONVERT(varchar(10), [id]), 10)
*/

IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [name] = N'tbl_CompanyMeterContract_ContractID_fkey'
    AND parent_object_id = OBJECT_ID(N'dbo.tbl_CompanyMeterContract')
)
BEGIN
  ALTER TABLE dbo.tbl_CompanyMeterContract
  DROP CONSTRAINT tbl_CompanyMeterContract_ContractID_fkey;
END;

ALTER TABLE dbo.tbl_CompanyMeterContract WITH CHECK
ADD CONSTRAINT tbl_CompanyMeterContract_ContractID_fkey
FOREIGN KEY ([ContractID]) REFERENCES dbo.tbl_Contract([id])
ON UPDATE CASCADE
ON DELETE SET NULL;

ALTER TABLE dbo.tbl_CompanyMeterContract
CHECK CONSTRAINT tbl_CompanyMeterContract_ContractID_fkey;
