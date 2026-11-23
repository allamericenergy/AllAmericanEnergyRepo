import { csvCell } from "../../vendor/IntiliGrid/exporting/CsvExporter";

export interface UploadBill {
  id: string;
  fileName: string;
  billType: string;
  accountNumber: string;
  serviceRefPod: string;
  values: Record<string, string>;
  lowConfidence: string[];
  needsReview: boolean;
}
export interface UploadCompany { id: number; name: string | null; columns: string[] }
export interface UploadFile {
  company: UploadCompany;
  rows: Array<{ id: string; fileName: string; cells: string[] }>;
  blankColumns: string[];
  warnings: string[];
}

const normalize = (text: string) => text.replace(/[^a-z0-9]/gi, "").toLowerCase();

// Saved column name (normalized) -> bill field, where the two names differ.
// "Bill Account" is deliberately absent: in bill imports it is the GL account,
// not the utility account number. Columns with no bill field stay blank.
const columnFields = new Map([
  ["vendorpayeename", "utility"],
  ["vendor", "utility"],
  ["billdate", "statementDate"],
  ["duedate", "paymentDueDate"],
  ["memoforcheck", "accountNumber"],
  ["temperaturelatest", "temperature"],
  ["productbilltype", "product"],
  ["heatingdegreedays", "heatingDegDays"],
  ["coolingdegreedays", "coolingDegDays"]
]);

const usDate = (value: string) => value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$2/$3/$1");

function money(value: string | undefined) {
  const text = String(value ?? "").replace(/[$,\s]/g, "");
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

/** The amount to pay, only when an earlier balance cannot make it ambiguous. */
function billAmount(values: Record<string, string>): { value: string; warning?: string } {
  const total = money(values.totalInvoiceCost);
  const current = money(values.totalNewCharges);
  const forward = money(values.balanceForward);
  if (total !== null && !forward && (current === total || (current === null && forward === 0))) {
    return { value: total.toFixed(2) };
  }
  const shown = (amount: number | null) => amount === null ? "not found" : amount.toFixed(2);
  return {
    value: "",
    warning: `Amount left blank, enter the amount to pay (new charges: ${shown(current)}, balance forward: ${shown(forward)}, invoice total: ${shown(total)}).`
  };
}

function cellFor(column: string, bill: UploadBill, company: UploadCompany): { value: string; fields: string[]; warning?: string } {
  const { values } = bill;
  const name = normalize(column);
  if (name === "amount") return { ...billAmount(values), fields: ["totalInvoiceCost", "totalNewCharges", "balanceForward"] };
  if (name === "companyname") return { value: company.name ?? "", fields: [] };
  if (name === "description") {
    const period = values.readDateStart && values.readDateEnd ? ` ${usDate(values.readDateStart)} - ${usDate(values.readDateEnd)}` : "";
    const type = bill.billType === "Unknown" ? "Utility" : bill.billType;
    return { value: `${type} service${period}`, fields: ["readDateStart", "readDateEnd"] };
  }
  const field = name === "utilityaccountname" && values.customerName ? "customerName"
    : columnFields.get(name) ?? Object.keys(values).find((key) => normalize(key) === name);
  return field ? { value: usDate(String(values[field] ?? "").trim()), fields: [field] } : { value: "", fields: [] };
}

/** One file per company, one row per bill, in the company's saved column order. */
export function buildUploadFiles(bills: UploadBill[], matches: Array<{ companies: UploadCompany[] }>): UploadFile[] {
  const groups = new Map<number, { company: UploadCompany; bills: UploadBill[] }>();
  bills.forEach((bill, index) => {
    const companies = matches[index]?.companies ?? [];
    // A bill is never put in a file when its company is uncertain.
    if (companies.length !== 1 || !companies[0].columns.length) return;
    const group = groups.get(companies[0].id) ?? { company: companies[0], bills: [] };
    group.bills.push(bill);
    groups.set(companies[0].id, group);
  });

  return [...groups.values()].map(({ company, bills: companyBills }) => {
    const warnings: string[] = [];
    const seen = new Map<string, string>();
    const rows = companyBills.map((bill) => {
      const cells = company.columns.map((column) => cellFor(column, bill, company));
      const warn = (message: string) => warnings.push(`${bill.fileName}: ${message}`);
      if (bill.needsReview) warn("Extraction needs review, check the values against the PDF.");
      cells.forEach((cell, index) => {
        if (cell.warning) warn(cell.warning);
        if (cell.value && cell.fields.some((field) => bill.lowConfidence.includes(field))) {
          warn(`${company.columns[index]} was hard to read, check it.`);
        }
      });
      // Same identity Submit to DB uses for duplicates; a repeat here would be paid twice.
      if (bill.accountNumber && bill.values.statementDate) {
        const key = [bill.accountNumber, bill.serviceRefPod, bill.values.meter ?? "", bill.values.statementDate].map(normalize).join("|");
        if (seen.has(key)) warn(`Looks like the same bill as ${seen.get(key)}, remove one before uploading.`);
        else seen.set(key, bill.fileName);
      }
      return { id: bill.id, fileName: bill.fileName, cells: cells.map((cell) => cell.value) };
    });
    const blankColumns = company.columns.filter((_column, index) => rows.every((row) => !row.cells[index]));
    return { company, rows, blankColumns, warnings };
  });
}

// PDF text is untrusted: stop spreadsheets running it as a formula. Negative amounts stay numbers.
const safeText = (value: string) =>
  /^\s*[=+\-@]|^[\t\r]/.test(value) && !/^-\d+(\.\d+)?$/.test(value) ? `'${value}` : value;

export function uploadFileCsv({ company, rows }: UploadFile) {
  // Plain cells, without the grid's ="00123" Excel wrapper, which importers read literally.
  return [company.columns, ...rows.map((row) => row.cells)]
    .map((cells) => `${cells.map((value) => csvCell(safeText(value))).join(",")}\r\n`)
    .join("");
}

export function uploadFileName(company: UploadCompany, date = new Date()) {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
  const name = (company.name ?? "").replace(/[\\/:*?"<>|\r\n\t]+/g, " ").replace(/\s+/g, " ").trim() || `Company ${company.id}`;
  return `${name} Upload ${day}.csv`;
}
