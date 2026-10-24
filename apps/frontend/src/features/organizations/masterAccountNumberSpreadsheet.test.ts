import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createMasterAccountTemplate, MASTER_ACCOUNT_HEADERS, parseMasterAccountUpload, parseMasterAccountUploadDetailed } from "./masterAccountNumberSpreadsheet";

describe("MasterAccount Number spreadsheet", () => {
  it("creates a populated template with dropdowns and a hidden utility ID", async () => {
    const workbook = await createMasterAccountTemplate(
      [{ id: 1, name: "Utility One" }, { id: 2, name: "Utility Two" }],
      [{ utilityId: 1, masterAccountNumber: "BOTH", accountNumber: false, serviceRefPodId: true }]
    );
    const sheet = workbook.getWorksheet("Settings")!;
    expect(sheet.getRow(1).values).toEqual([undefined, ...MASTER_ACCOUNT_HEADERS]);
    expect(sheet.getRow(2).values).toEqual([undefined, "Utility One", "BOTH", "NO", "YES", 1]);
    expect(sheet.getRow(3).values).toEqual([undefined, "Utility Two", "Account Number", "YES", "YES", 2]);
    expect(sheet.getColumn(5).hidden).toBe(true);
    expect(sheet.getCell("B2").dataValidation.formulae).toEqual(['"Account Number,Service Ref/POD ID,BOTH"']);
    expect(sheet.getCell("C2").dataValidation.formulae).toEqual(['"YES,NO"']);
    expect(workbook.worksheets.map((item) => item.name)).toEqual(["Settings", "Instructions"]);
  });

  it("parses valid settings", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      MASTER_ACCOUNT_HEADERS,
      ["Utility", "Service Ref/POD ID", "NO", "YES", 4]
    ]), "Settings");
    expect(parseMasterAccountUpload(workbook)).toEqual([{
      utilityId: 4, masterAccountNumber: "Service Ref/POD ID", accountNumber: false, serviceRefPodId: true
    }]);
  });

  it("recovers missing hidden utility IDs from utility names", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      MASTER_ACCOUNT_HEADERS.slice(0, 4),
      ["Black Hills Energy", "Account Number", "YES", "YES"],
      ["Black Hills Energy", "Service Ref/POD ID", "NO", "YES"]
    ]), "Settings");
    expect(parseMasterAccountUpload(workbook, [
      { id: 14, name: "Black Hills Energy" },
      { id: 27, name: "Black Hills Energy" }
    ])).toEqual([
      { utilityId: 14, masterAccountNumber: "Account Number", accountNumber: true, serviceRefPodId: true },
      { utilityId: 27, masterAccountNumber: "Service Ref/POD ID", accountNumber: false, serviceRefPodId: true }
    ]);
  });

  it("reports an unmatched utility when the hidden ID is missing", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      MASTER_ACCOUNT_HEADERS.slice(0, 4),
      ["Unknown Utility", "Account Number", "YES", "YES"]
    ]), "Settings");
    expect(() => parseMasterAccountUpload(workbook, [{ id: 1, name: "Known Utility" }])).toThrow("None of the spreadsheet utilities match");
  });

  it("skips obsolete utilities while keeping current utility rows", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      MASTER_ACCOUNT_HEADERS.slice(0, 4),
      ["Known Utility", "Account Number", "YES", "YES"],
      ["Old Utility", "BOTH", "YES", "NO"]
    ]), "Settings");
    expect(parseMasterAccountUploadDetailed(workbook, [{ id: 8, name: "Known Utility" }])).toEqual({
      rows: [{ utilityId: 8, masterAccountNumber: "Account Number", accountNumber: true, serviceRefPodId: true }],
      skippedUtilities: ["Old Utility"]
    });
  });

  it.each([
    [[MASTER_ACCOUNT_HEADERS, ["Utility", "BOTH", "YES", "NO", 0]], "Utility ID"],
    [[MASTER_ACCOUNT_HEADERS, ["Utility", "invalid", "YES", "NO", 1]], "MasterAccountNumber"],
    [[MASTER_ACCOUNT_HEADERS, ["Utility", "BOTH", "maybe", "NO", 1]], "must be YES or NO"],
    [[MASTER_ACCOUNT_HEADERS, ["One", "BOTH", "YES", "NO", 1], ["Two", "BOTH", "YES", "NO", 1]], "appears more than once"]
  ])("rejects invalid spreadsheet rows", (source, message) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(source), "Settings");
    expect(() => parseMasterAccountUpload(workbook)).toThrow(message);
  });
});
