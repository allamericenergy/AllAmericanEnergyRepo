IF OBJECT_ID('dbo.tblMasterAccountNumber', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tblMasterAccountNumber (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UtilityId] INT NOT NULL,
    [AccountNumber] BIT NOT NULL,
    [ServiceRefPodId] BIT NOT NULL,
    CONSTRAINT [UQ_tblMasterAccountNumber_UtilityId] UNIQUE ([UtilityId]),
    CONSTRAINT [FK_tblMasterAccountNumber_Utility] FOREIGN KEY ([UtilityId]) REFERENCES dbo.tbl_Utility ([id])
  );
END;

IF COL_LENGTH('dbo.tblMasterAccountNumber', 'MasterAccountNumber') IS NULL
BEGIN
  ALTER TABLE dbo.tblMasterAccountNumber ADD [MasterAccountNumber] NVARCHAR(30) NOT NULL
    CONSTRAINT [DF_tblMasterAccountNumber_MasterAccountNumber] DEFAULT N'Account Number' WITH VALUES
    CONSTRAINT [CK_tblMasterAccountNumber_MasterAccountNumber]
      CHECK ([MasterAccountNumber] IN (N'Account Number', N'Service Ref/POD ID', N'BOTH'));
END;
