import * as XLSX from "xlsx";

export interface AccountReportRow {
  account: string; company: string; city: string; utility: string; utilityType: string;
  cents: number; statementDate: string; month: string; address: string; processedDate: string;
  product?: string;
}
const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  statementDate: ["statementdate"],
  cents: ["totalnewcharges", "newcharges"], account: ["accountnumber", "account", "accountno"],
  city: ["city"],
  utility: ["utility", "utilityname"], address: ["serviceaddressline1", "serviceaddress", "address"]
};

function dateValue(value: unknown, date1904: boolean): string {
  let year: number, month: number, day: number;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parsed) throw new Error("Invalid date");
    year = parsed.y; month = parsed.m; day = parsed.d;
  } else {
    const text = String(value ?? "").trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(text);
    const us = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
    if (!iso && !us) throw new Error("Use an Excel date, MM-dd-yyyy, MM/DD/YYYY, or YYYY-MM-DD");
    year = Number(iso ? iso[1] : us![3]); month = Number(iso ? iso[2] : us![1]); day = Number(iso ? iso[3] : us![2]);
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 9999 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error("Invalid date");
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function amount(value: unknown): number {
  let text = String(value ?? "").trim();
  if (/^\(.*\)$/.test(text)) text = "-" + text.slice(1, -1);
  text = text.replace(/^(-?)\$\s*/, "$1");
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) throw new Error("New Charges must be a number with at most two decimal places");
  const cents = Math.round(Number(text.replace(/,/g, "")) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("New Charges is too large");
  return cents;
}

export function processedDateFromFilename(fileName: string): string {
  const match = /Daily Bill Check_(\d{4})(\d{2})(\d{2})(?=_|\.|$)/i.exec(fileName)
    ?? /(?:^|[^0-9])(\d{4})(\d{2})(\d{2})_/.exec(fileName);
  if (!match) return "";
  try { return dateValue(`${match[1]}-${match[2]}-${match[3]}`, false); }
  catch { throw new Error("The YYYYMMdd date in the spreadsheet filename is invalid."); }
}

<<<<<<< HEAD
export function parseAccountReport(sheet: XLSX.WorkSheet, date1904 = false, sheetName = "", fileName = "", allowEmpty = false): AccountReportRow[] {
=======
export function parseAccountReport(sheet: XLSX.WorkSheet, date1904 = false, sheetName = "", fileName = ""): AccountReportRow[] {
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  const filenameProcessedDate = processedDateFromFilename(fileName);
  if (fileName && !filenameProcessedDate) throw new Error("The spreadsheet filename must contain a date, for example Daily Bill Check_20261003.xlsx or 20261003_accounts.xlsx.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
  const required = ["statementDate", "utility", "cents"];
  const headerIndex = rows.findIndex(row => required.every(key => row.some(cell => aliases[key as keyof typeof aliases].includes(normalize(cell)))));
  if (headerIndex < 0) throw new Error("Required columns: Statement Date, Utility, and Total New Charges (or New Charges).");
  const header = rows[headerIndex].map(normalize);
  const columns = Object.fromEntries(Object.entries(aliases).map(([key, names]) => {
    const preferred = (key === "cents" || key === "address") ? names.find(name => header.includes(name)) : undefined;
    const matches = header.flatMap((name, index) => (preferred ? name === preferred : names.includes(name)) ? [index] : []);
    if (matches.length > 1) throw new Error(`Multiple columns match ${key}. Keep only one matching column.`);
    return [key, matches[0] ?? -1];
  })) as Record<keyof typeof aliases, number>;
  const result: AccountReportRow[] = [];
  rows.slice(headerIndex + 1).forEach((row, index) => {
    if (row.every(cell => String(cell ?? "").trim() === "")) return;
    const get = (key: keyof typeof aliases) => row[columns[key]] ?? "";
    const text = (key: keyof typeof aliases) => {
      if (columns[key] < 0) return "";
      const cell = sheet[XLSX.utils.encode_cell({ r: headerIndex + index + 1, c: columns[key] })];
      return String(cell?.z && cell.t === "n" ? XLSX.SSF.format(cell.z, cell.v) : cell?.w ?? get(key)).trim();
    };
    try {
      const statementDate = dateValue(get("statementDate"), date1904);
      const utilityType = text("utility");
      if (!utilityType) throw new Error("Utility is required");
      result.push({ account: text("account"), company: utilityType, city: text("city"), utility: utilityType, utilityType, product: sheetName,
        cents: amount(get("cents")), statementDate, month: statementDate.slice(0, 7), address: text("address"),
        processedDate: filenameProcessedDate });
    } catch (error) { throw new Error(`Row ${headerIndex + index + 2}: ${(error as Error).message}`); }
  });
<<<<<<< HEAD
  if (!result.length && !allowEmpty) throw new Error("The worksheet has no data rows.");
  return result;
}

export function parseAccountReportWorkbook(workbook: XLSX.WorkBook, fileName = ""): AccountReportRow[] {
  const result: AccountReportRow[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const cells = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
    if (!cells.some(row => row.some(cell => String(cell ?? "").trim() !== ""))) continue;
    try {
      result.push(...parseAccountReport(sheet, Boolean(workbook.Workbook?.WBProps?.date1904), name, fileName, true));
    } catch (error) {
      throw new Error(`Worksheet "${name}": ${(error as Error).message}`);
    }
  }
  if (!result.length) throw new Error("The spreadsheet has no data rows.");
  summarizeAccountReport(result);
  if (!Number.isSafeInteger(result.reduce((sum, row) => sum + row.cents, 0))) throw new Error("Total New Charges is too large.");
  return result.sort((a, b) => a.utilityType.toLowerCase().localeCompare(b.utilityType.toLowerCase()) || a.month.localeCompare(b.month) || a.statementDate.localeCompare(b.statementDate));
}

=======
  if (!result.length) throw new Error("The worksheet has no data rows.");
  return result;
}

>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
export function summarizeAccountReport(rows: AccountReportRow[]) {
  const groups = new Map<string, { month: string; utilityType: string; cents: number; count: number }>();
  for (const row of rows) {
    const key = `${row.month}|${row.utilityType.toLowerCase()}`;
    const group = groups.get(key) ?? { month: row.month, utilityType: row.utilityType, cents: 0, count: 0 };
    group.cents += row.cents; group.count++;
    if (!Number.isSafeInteger(group.cents)) throw new Error("Total New Charges is too large.");
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month) || a.utilityType.localeCompare(b.utilityType));
}
export const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
export const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const displayDate = (date: string) => date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}/${date.slice(0, 4)}` : "";
export const displayProcessedDate = (date: string) => date ? `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}` : "";
