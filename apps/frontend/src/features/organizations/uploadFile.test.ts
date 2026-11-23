import { expect, it } from "vitest";
import { buildUploadFiles, uploadFileCsv, uploadFileName, type UploadBill } from "./uploadFile";

const template = ["Bill Property Code", "Bill Unit Name", "Vendor Payee Name", "Amount", "Bill Account", "Description", "Bill Date",
  "Due Date", "Posting Date", "Bill Reference", "Bill Remarks", "Memo For Check", "Purchase Order Number"];
const company = { id: 1, name: "Acme", columns: template };
const bill = (values: Record<string, string> = {}, extra: Partial<UploadBill> = {}): UploadBill => ({
  id: "0", fileName: "a.pdf", billType: "Power", accountNumber: "00123", serviceRefPod: "", lowConfidence: [], needsReview: false,
  values: { accountNumber: "00123", utility: "City Power", totalInvoiceCost: "120.5", totalNewCharges: "120.50",
    statementDate: "2026-11-02", paymentDueDate: "2026-11-25", readDateStart: "2026-10-01", readDateEnd: "2026-10-31", ...values },
  ...extra
});
const build = (item: UploadBill, columns = template) => buildUploadFiles([item], [{ companies: [{ ...company, columns }] }])[0];

it("fills bill values in column order and leaves accounting columns blank", () => {
  const file = build(bill());
  expect(file.rows[0].cells).toEqual(["", "", "City Power", "120.50", "", "Power service 10/01/2026 - 10/31/2026",
    "11/02/2026", "11/25/2026", "", "", "", "00123", ""]);
  expect(file.blankColumns).toContain("Bill Account");
});

it.each<[Record<string, string>, string]>([
  [{ balanceForward: "0" }, "120.50"],
  [{ totalNewCharges: "", balanceForward: "0.00" }, "120.50"],
  [{ totalInvoiceCost: "-5", totalNewCharges: "-5" }, "-5.00"],
  [{ totalInvoiceCost: "200", balanceForward: "79.50" }, ""],
  [{ balanceForward: "30" }, ""],
  [{ totalInvoiceCost: "200" }, ""],
  [{ totalNewCharges: "" }, ""],
  [{ totalInvoiceCost: "" }, ""]
])("chooses an amount only when it is unambiguous: %j", (values, amount) => {
  const file = build(bill(values), ["Amount"]);
  expect(file.rows[0].cells[0]).toBe(amount);
  expect(file.warnings).toHaveLength(amount ? 0 : 1);
});

it("matches other columns to extracted field names", () => {
  const file = build(bill({ customerName: "Jane", serviceRefPod: "P1" }),
    ["Account Number", "Service Ref / POD", "Utility Account Name", "Company Name", "constructor"]);
  expect(file.rows[0].cells).toEqual(["00123", "P1", "Jane", "Acme", ""]);
});

it("separates companies and skips uncertain or unconfigured bills", () => {
  const other = { id: 2, name: "Other", columns: ["Amount"] };
  const files = buildUploadFiles([bill(), bill(), bill(), bill(), bill()],
    [[company], [other], [company, other], [], [{ ...company, id: 3, columns: [] }]].map((companies) => ({ companies })));
  expect(files.map((file) => [file.company.id, file.rows.length])).toEqual([[1, 1], [2, 1]]);
});

it("warns about duplicates and uncertain values", () => {
  const bills = [bill(), bill({}, { id: "1", fileName: "b.pdf", needsReview: true, lowConfidence: ["utility"] })];
  const [file] = buildUploadFiles(bills, bills.map(() => ({ companies: [company] })));
  expect(file.warnings).toHaveLength(3);
});

it("writes importable CSV without allowing formulas", () => {
  const columns = ["Utility", "Account Number", "Meter", "Rate", "City"];
  const csv = uploadFileCsv(build(bill({ utility: '=HYPERLINK("x")', meter: "-12", rate: "@SUM(1)", city: "A, B" }), columns));
  expect(csv).toBe('"Utility","Account Number","Meter","Rate","City"\r\n"\'=HYPERLINK(""x"")","00123","-12","\'@SUM(1)","A, B"\r\n');
});

it("makes a safe file name", () => {
  expect(uploadFileName({ ...company, name: "A/B: Co" }, new Date(2026, 10, 2))).toBe("A B Co Upload 2026-11-02.csv");
});
