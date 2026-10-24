import * as XLSX from "xlsx";

export const MASTER_ACCOUNT_HEADERS = ["Utility", "MasterAccountNumber", "Account Number", "Service Ref/POD ID", "Utility ID"];

export interface MasterAccountUploadRow {
  utilityId: number;
  masterAccountNumber: "Account Number" | "Service Ref/POD ID" | "BOTH";
  accountNumber: boolean;
  serviceRefPodId: boolean;
}

interface TemplateUtility {
  id: number;
  name: string | null;
}

interface TemplateSetting extends MasterAccountUploadRow {}

function yesNo(value: unknown, rowNumber: number, field: string) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "YES") return true;
  if (normalized === "NO") return false;
  throw new Error(`Row ${rowNumber}: ${field} must be YES or NO.`);
}

export async function createMasterAccountTemplate(utilities: TemplateUtility[], settings: TemplateSetting[]) {
  const ExcelJS = await import("exceljs");
  const settingsByUtility = new Map(settings.map((setting) => [setting.utilityId, setting]));
  const rows = utilities.map((utility) => {
    const setting = settingsByUtility.get(utility.id);
    return {
      utility: utility.name ?? `Utility ${utility.id}`,
      masterAccountNumber: setting?.masterAccountNumber ?? "Account Number",
      accountNumber: setting?.accountNumber === false ? "NO" : "YES",
      serviceRefPodId: setting?.serviceRefPodId === false ? "NO" : "YES",
      utilityId: utility.id
    };
  });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Settings", { views: [{ state: "frozen", ySplit: 1 }] });
  worksheet.columns = [
    { header: "Utility", key: "utility", width: 32 },
    { header: "MasterAccountNumber", key: "masterAccountNumber", width: 24 },
    { header: "Account Number", key: "accountNumber", width: 18 },
    { header: "Service Ref/POD ID", key: "serviceRefPodId", width: 22 },
    { header: "Utility ID", key: "utilityId", width: 12, hidden: true }
  ];
  worksheet.addRows(rows);
  worksheet.autoFilter = `A1:D${Math.max(1, rows.length + 1)}`;
  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    if (columnNumber === 5) return;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1683D8" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  for (let row = 2; row <= rows.length + 1; row += 1) {
    worksheet.getCell(`B${row}`).dataValidation = {
      type: "list", allowBlank: false, formulae: ['"Account Number,Service Ref/POD ID,BOTH"'],
      showErrorMessage: true, errorTitle: "Invalid selection", error: "Choose a value from the dropdown."
    };
    for (const column of ["C", "D"]) worksheet.getCell(`${column}${row}`).dataValidation = {
      type: "list", allowBlank: false, formulae: ['"YES,NO"'],
      showErrorMessage: true, errorTitle: "Invalid selection", error: "Choose YES or NO from the dropdown."
    };
  }
  const instructions = workbook.addWorksheet("Instructions");
  instructions.getCell("A1").value = "Master Account Number upload instructions";
  instructions.getCell("A1").font = { bold: true, size: 14 };
  instructions.getCell("A3").value = "1. Keep the Utility names and hidden internal identifier unchanged.";
  instructions.getCell("A4").value = "2. Select values from the dropdowns in the other three columns.";
  instructions.getCell("A5").value = "3. Remove utility rows you do not want to update.";
  instructions.getCell("A6").value = "4. Save the workbook and upload the completed file.";
  instructions.getColumn("A").width = 88;
  return workbook;
}

export function parseMasterAccountUploadDetailed(workbook: XLSX.WorkBook, utilities: TemplateUtility[] = []) {
  const worksheet = workbook.Sheets.Settings ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("The spreadsheet does not contain a worksheet.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: true });
  if (!rows.length) throw new Error("The spreadsheet has no settings to upload.");
  const uploaded: MasterAccountUploadRow[] = [];
  const skippedUtilities: string[] = [];
  const utilityIds = new Set<number>();
  const utilityIdsByName = new Map<string, number[]>();
  for (const utility of utilities) {
    const name = String(utility.name ?? "").trim().toLowerCase();
    if (!name) continue;
    utilityIdsByName.set(name, [...(utilityIdsByName.get(name) ?? []), utility.id]);
  }
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const suppliedUtilityId = Number(row["Utility ID"]);
    let utilityId = suppliedUtilityId;
    if (!Number.isInteger(suppliedUtilityId) || suppliedUtilityId <= 0) {
      const utilityName = String(row.Utility ?? "").trim();
      const matches = utilityIdsByName.get(utilityName.toLowerCase()) ?? [];
      utilityId = matches.shift() ?? 0;
      if (!utilityId) {
        if (!utilities.length) throw new Error(`Row ${rowNumber}: Utility ID must be a positive number.`);
        skippedUtilities.push(utilityName || `Row ${rowNumber}`);
        return;
      }
    }
    if (utilityIds.has(utilityId)) throw new Error(`Row ${rowNumber}: Utility ID ${utilityId} appears more than once.`);
    utilityIds.add(utilityId);
    const masterAccountNumber = String(row.MasterAccountNumber ?? "").trim();
    if (!(masterAccountNumber === "Account Number" || masterAccountNumber === "Service Ref/POD ID" || masterAccountNumber === "BOTH")) {
      throw new Error(`Row ${rowNumber}: MasterAccountNumber must be Account Number, Service Ref/POD ID, or BOTH.`);
    }
    uploaded.push({
      utilityId,
      masterAccountNumber,
      accountNumber: yesNo(row["Account Number"], rowNumber, "Account Number"),
      serviceRefPodId: yesNo(row["Service Ref/POD ID"], rowNumber, "Service Ref/POD ID")
    });
  });
  if (!uploaded.length) throw new Error("None of the spreadsheet utilities match the current utility list.");
  return { rows: uploaded, skippedUtilities };
}

export function parseMasterAccountUpload(workbook: XLSX.WorkBook, utilities: TemplateUtility[] = []): MasterAccountUploadRow[] {
  return parseMasterAccountUploadDetailed(workbook, utilities).rows;
}
