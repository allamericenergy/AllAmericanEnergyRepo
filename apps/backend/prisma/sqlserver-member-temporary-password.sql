IF COL_LENGTH('dbo.aae_users', 'temporaryPasswordEncrypted') IS NULL
BEGIN
  ALTER TABLE dbo.aae_users ADD temporaryPasswordEncrypted NVARCHAR(MAX) NULL;
END;
