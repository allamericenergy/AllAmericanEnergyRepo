import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
<<<<<<< HEAD
import { parseAccountReport, parseAccountReportWorkbook, summarizeAccountReport, processedDateFromFilename, displayProcessedDate } from "./accountReport";
=======
import { parseAccountReport, summarizeAccountReport, processedDateFromFilename, displayProcessedDate } from "./accountReport";
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
import { createAccountReportPdf } from "./accountReportPdf";
const headers = ["Statement Date", "Utility", "New Charges", "Account Number"];
const parse = (rows: unknown[][]) => parseAccountReport(XLSX.utils.aoa_to_sheet([headers, ...rows]));
describe("Account Report", () => {
<<<<<<< HEAD
  it("combines every sheet by utility while preserving source products in a single PDF", () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ["09/14/2026", "Eversource", 10, "001"]]), "Electric");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ["09/15/2026", "eversource", 20, "002"], ["09/15/2026", "Other", 5, "003"]]), "Gas");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([]), "Empty");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers]), "No statements");
    const rows = parseAccountReportWorkbook(book, "Daily Bill Check_20261003.xlsx");
    expect(rows).toHaveLength(3);
    expect(rows.map(row => row.product)).toEqual(["Electric", "Gas", "Gas"]);
    expect(rows.every(row => row.processedDate === "2026-10-03")).toBe(true);
    expect(summarizeAccountReport(rows)).toEqual([
      { month: "2026-09", utilityType: "Eversource", cents: 3000, count: 2 },
      { month: "2026-09", utilityType: "Other", cents: 500, count: 1 }
    ]);
    const pdf = createAccountReportPdf(rows);
    expect(pdf.getNumberOfPages()).toBe(2);
    expect(pdf.output()).toContain("$30.00");
    expect(pdf.output()).toContain("(Electric)");
    expect(pdf.output()).toContain("(Gas)");
  });
  it("identifies errors in later sheets instead of returning a partial report", () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ["09/14/2026", "Utility", 10]]), "Electric");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ["bad", "Utility", 20]]), "Gas");
    expect(() => parseAccountReportWorkbook(book)).toThrow('Worksheet "Gas": Row 2');
  });
  it("applies the workbook date system to every sheet and rejects empty workbooks", () => {
    const book = XLSX.utils.book_new();
    expect(() => parseAccountReportWorkbook(book)).toThrow("no data rows");
    book.Workbook = { WBProps: { date1904: true } };
    for (const name of ["Electric", "Gas"]) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, [46279, "Utility", 10]]), name);
    expect(parseAccountReportWorkbook(book).map(row => row.statementDate)).toEqual(["2030-09-15", "2030-09-15"]);
  });
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  it("reads the date after Daily Bill Check_ and includes it in the PDF", () => {
    const sheet = XLSX.utils.aoa_to_sheet([headers, ["09-14-2026", "Eversource", 10, "001"]]);
    const rows = parseAccountReport(sheet, false, "Electric", "Daily Bill Check_20261003.xlsx");
    expect(rows[0].processedDate).toBe("2026-10-03");
    expect(displayProcessedDate(rows[0].processedDate)).toBe("10/03/2026");
    expect(createAccountReportPdf(rows).output()).toContain("10/03/2026");
    expect(processedDateFromFilename("Daily Bill Check_20260105.csv")).toBe("2026-01-05");
    expect(() => processedDateFromFilename("Daily Bill Check_20260230.xlsx")).toThrow("filename is invalid");
    expect(processedDateFromFilename("Daily Bill Check_202610031.xlsx")).toBe("");
  });
  it("uses the filename date for every row and formats Processed Date with leading zeros", () => {
    const sheet = XLSX.utils.aoa_to_sheet([[...headers, "Processed Date"], ["09-14-2026", "Eversource", 10, "001", "invalid old value"], ["09-15-2026", "Eversource", 20, "002", ""]]);
    const rows = parseAccountReport(sheet, false, "Electric", "20261003_accounts.xlsx");
    expect(rows.map(row => row.processedDate)).toEqual(["2026-10-03", "2026-10-03"]);
    expect(displayProcessedDate(rows[0].processedDate)).toBe("10/03/2026");
    const pdf = createAccountReportPdf(rows).output();
    expect(pdf).toContain("10/03/2026");
    expect(pdf).toContain("Account Total");
    expect(pdf).not.toContain("Total New Charges");
  });
  it("validates filename dates and never substitutes the spreadsheet Processed Date", () => {
    expect(processedDateFromFilename("20240229_accounts.xlsx")).toBe("2024-02-29");
    expect(() => processedDateFromFilename("20260229_accounts.xlsx")).toThrow("filename is invalid");
    expect(processedDateFromFilename("accounts.xlsx")).toBe("");
    const sheet = XLSX.utils.aoa_to_sheet([[...headers, "Processed Date"], ["09-14-2026", "Eversource", 10, "001", "09-05-2026"]]);
    expect(() => parseAccountReport(sheet, false, "Electric", "accounts.xlsx")).toThrow("filename must contain a date");
    expect(parseAccountReport(sheet)[0].processedDate).toBe("");
  });
  it("requires Utility even when the worksheet and Product have names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["Statement Date", "Product", "New Charges"], ["09-14-2026", "Electric", 10]]);
    expect(() => parseAccountReport(sheet, false, "Electric")).toThrow("Required columns: Statement Date, Utility");
  });
  it("reads MM-dd-yyyy statement dates and validates calendar days", () => {
    const rows = parse([["09-14-2026", "Electric", 10], ["12-01-2026", "Electric", 20]]);
    expect(rows.map(row => row.statementDate)).toEqual(["2026-09-14", "2026-12-01"]);
    expect(rows.map(row => row.month)).toEqual(["2026-09", "2026-12"]);
    expect(() => parse([["02-30-2026", "Electric", 1]])).toThrow("Row 2");
  });
  it("groups by calendar month and utility type, retaining cents and credits", () => {
    const rows = parse([["09/14/2026", "Electric", "$1,878.49", "00123"], ["2026-09-02", "Natural Gas", 1192.8], ["2026-09-30", "electric", "($78.49)"], ["2025-09-01", "Electric", 20]]);
    expect(rows[0].account).toBe("00123");
    expect(summarizeAccountReport(rows)).toEqual([
      { month: "2025-09", utilityType: "Electric", cents: 2000, count: 1 },
      { month: "2026-09", utilityType: "Electric", cents: 180000, count: 2 },
      { month: "2026-09", utilityType: "Natural Gas", cents: 119280, count: 1 }
    ]);
  });
  it("reads Excel dates and formatted account numbers", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["Statement Date", "Utility", "New Charges", "Account Number"], [46279, "Electric", 0, 123]]);
    sheet.D2.z = "000000";
    expect(parseAccountReport(sheet)[0]).toMatchObject({ statementDate: "2026-09-14", account: "000123", cents: 0 });
    expect(parseAccountReport(sheet, true)[0].statementDate).toBe("2030-09-15");
  });
  it("rejects bad dates, missing amounts, missing headers and invalid money", () => {
    expect(() => parse([["02/30/2026", "Electric", 1]])).toThrow("Row 2");
    expect(() => parse([["09/01/2026", "Electric", ""]])).toThrow("New Charges");
    expect(() => parse([["09/01/2026", "", 10]])).toThrow("Utility");
    expect(() => parse([["09/01/2026", "Electric", "1,2"]])).toThrow("New Charges");
    expect(() => parseAccountReport(XLSX.utils.aoa_to_sheet([["Amount"]]))).toThrow("Required columns");
  });
  it("preserves physical row numbers after blank rows and skips title rows", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["Report"], headers, [], ["bad", "Electric", 1]]);
    expect(() => parseAccountReport(sheet)).toThrow("Row 4");
  });
  it("creates a paginated PDF for long statement sets", () => {
    const rows = parse(Array.from({ length: 100 }, (_, i) => ["09/14/2026", "Electric", 1.01, String(i)]));
    const doc = createAccountReportPdf(rows);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output()).toContain("Account Report");
    expect(doc.output()).toContain("$101.00");
  });
  it("maps the requested source columns and uses the worksheet name as Product", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Statement Date", "Utility", "Total New Charges", "New Charges", "Service Address Line_1", "Service Address", "City", "Product", "Company"],
      ["09/14/2026", "Eversource", 1878.49, 999, "1669 THOMASTON AVE", "Other address", "WATERBURY", "Ignored product", "E & J Parts Cleaning"]
    ]);
    const rows = parseAccountReport(sheet, false, "Electric");
    expect(rows[0]).toMatchObject({ company: "Eversource", utility: "Eversource", cents: 187849, address: "1669 THOMASTON AVE", city: "WATERBURY", product: "Electric", utilityType: "Eversource" });
    const pdf = createAccountReportPdf(rows).output();
    expect(pdf).toContain("(Account Report)");
    expect(pdf).not.toContain("Monthly Batch Report");
    expect(pdf).not.toContain("REFRESH");
    expect(pdf).not.toContain("E & J Parts Cleaning");
    expect(pdf).toContain("(Eversource)");
    expect(pdf.indexOf("(Company)")).toBeLessThan(pdf.indexOf("(Total)"));
    expect(pdf.indexOf("(Total)")).toBeLessThan(pdf.indexOf("(Account Number)"));
    expect(pdf).toContain("$1,878.49");
    expect(pdf).toContain("(Electric)");
  });
});
