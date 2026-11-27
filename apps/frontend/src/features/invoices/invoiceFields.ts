// Shared invoice-field helpers: the meter view's invoice dialog and the Invoice Compare page.

export interface MeterInvoiceRow {
  id: string;
  [column: string]: unknown;
}

export type InvoiceType = "Power" | "Gas" | "Water";
export const INVOICE_TYPES: InvoiceType[] = ["Power", "Gas", "Water"];

/** Invoice table for a meter's product (Electric/Solar → Power, Natural Gas → Gas, Water/Sewer → Water). */
export function invoiceTypeForProduct(product: string | null | undefined): InvoiceType | null {
  const name = (product ?? "").toLowerCase();
  if (/power|electric|solar/.test(name)) return "Power";
  if (/gas/.test(name)) return "Gas";
  if (/water|sewer/.test(name)) return "Water";
  return null;
}

/** Opens the Invoice Compare page in a new tab. */
export function openInvoiceCompare(options: { type?: InvoiceType | null; accountNumber?: string | null; companyId?: string | number | null; companyName?: string | null }) {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.accountNumber?.trim()) params.set("account", options.accountNumber.trim());
  if (options.companyId != null && String(options.companyId) !== "") params.set("companyId", String(options.companyId));
  if (options.companyName?.trim()) params.set("company", options.companyName.trim());
  window.open(`/invoices/compare?${params.toString()}`, "_blank", "noopener");
}

function formatInvoiceDate(value: unknown) {
  const text = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z)?$/.exec(text);
  if (dateOnly) return `${dateOnly[2]}/${dateOnly[3]}/${dateOnly[1]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

/** Amount in whole cents, or null when the value is blank or not a number. */
export function amountCents(value: unknown): number | null {
  if (value === null || value === undefined || value === false || String(value).trim() === "") return null;
  const number = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

/** Bill check: Total New Charges + Balance Forward, compared with Total Invoice Cost to the cent. */
export function billCheck(newCharges: unknown, balanceForward: unknown, invoiceCost: unknown) {
  const charges = amountCents(newCharges);
  const balance = amountCents(balanceForward);
  const invoice = amountCents(invoiceCost);
  if (charges === null || balance === null || invoice === null) return null;
  const sum = charges + balance;
  const format = (cents: number) => (cents / 100).toFixed(2);
  return { text: format(sum), invoiceText: format(invoice), matches: sum === invoice };
}

export const normalizeInvoiceKey = (key: string) => key.replace(/[^A-Za-z0-9]/g, "").toLowerCase();

export const INVOICE_SECTIONS: Array<{ title: string; match: (key: string, value: unknown) => boolean }> = [
  { title: "Invoice", match: (key, value) => /^(invoiceid|documenttitle|statementdate|invoicedate|invoicenumber|billcheck)$/.test(key) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value) && !/^(createdon|aiprocessedon)$/.test(key)) },
  { title: "Charges", match: (key) => /charge|cost|amount|balance|tax|fee|payment|credit|price|due|adjust|surcharge/.test(key) },
  { title: "Usage & Reads", match: (key) => /usage|kwh|kw|therm|ccf|mcf|gallon|demand|read|days|multiplier|loadfactor|temperature|consumption/.test(key) },
  { title: "Account & Meter", match: (key) => /vendor|utility|account|serviceref|pod|namekey|meter|address|city|state|zip|rate|product|customer|tariff/.test(key) },
  { title: "Processing", match: (key) => /extraction|createdon|aiprocessed|status|confidence|source|upload/.test(key) },
  { title: "Other", match: () => true }
];

export function formatInvoiceValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return formatInvoiceDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Number for comparison, or null for blanks, text, and identifier-like fields (account, meter, zip…). */
export function invoiceNumber(key: string, value: unknown): number | null {
  if (/id$|account|meter|serviceref|pod|zip|number|namekey|phone/.test(key)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^\s*-?\$?\s*[\d,]*\.?\d+\s*$/.test(value)) return null;
  const number = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export const invoiceChangeFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, signDisplay: "exceptZero" });
export const invoicePercentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

export function invoiceStatementKey(invoice: MeterInvoiceRow) {
  const key = Object.keys(invoice).find((name) => normalizeInvoiceKey(name) === "statementdate");
  return String((key && invoice[key]) ?? "");
}

export function invoiceOptionLabel(invoice: MeterInvoiceRow) {
  const find = (name: string) => Object.entries(invoice).find(([key]) => normalizeInvoiceKey(key) === name)?.[1];
  const cost = find("totalinvoicecost");
  return [formatInvoiceValue(find("statementdate")), cost == null || cost === "" ? null : formatInvoiceValue(cost), `#${String(find("invoiceid") ?? invoice.id)}`]
    .filter(Boolean).join(" · ");
}
