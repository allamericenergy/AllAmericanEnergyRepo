import { useEffect, useState } from "react";
import { Alert, Button, MenuItem, Stack, TextField } from "@mui/material";
import * as XLSX from "xlsx";
import { parseAccountReport, summarizeAccountReport, money, monthLabel, displayDate, displayProcessedDate, type AccountReportRow } from "./accountReport";
import { createAccountReportPdf } from "./accountReportPdf";

export function AccountReportPage() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<AccountReportRow[]>([]);
  const [month, setMonth] = useState("");
  const [utility, setUtility] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfDownload, setPdfDownload] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => () => { if (pdfDownload) URL.revokeObjectURL(pdfDownload.url); }, [pdfDownload]);
  useEffect(() => { setPdfDownload(null); }, [rows, month, utility]);
  const filtered = rows.filter(row => (!month || row.month === month) && (!utility || row.utilityType.toLowerCase() === utility));
  const summary = summarizeAccountReport(filtered);
  const total = filtered.reduce((sum, row) => sum + row.cents, 0);
  const utilities = [...new Map(rows.map(row => [row.utilityType.toLowerCase(), row.utilityType])).entries()];
  async function upload(file?: File) {
    setWorkbook(null); setRows([]); setError(""); setMonth(""); setUtility(""); setFileName(file?.name ?? "");
    if (!file) return;
    setBusy(true);
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("Choose an XLSX, XLS, or CSV spreadsheet.");
      if (file.size > 20 * 1024 * 1024) throw new Error("Choose a spreadsheet smaller than 20 MB.");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, raw: true });
      if (!book.SheetNames.length) throw new Error("The spreadsheet has no worksheets.");
      setWorkbook(book); setSheet(book.SheetNames[0]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function submit() {
    setRows([]); setError(""); setMonth(""); setUtility("");
    try {
      if (!workbook) return;
      const parsed = parseAccountReport(workbook.Sheets[sheet], !!workbook.Workbook?.WBProps?.date1904, sheet, fileName);
      summarizeAccountReport(parsed);
      if (!Number.isSafeInteger(parsed.reduce((sum, row) => sum + row.cents, 0))) throw new Error("Total New Charges is too large.");
      setRows(parsed);
    } catch (e) { setError((e as Error).message); }
  }
  function download() {
    setBusy(true); setError("");
    try {
      const doc = createAccountReportPdf(filtered);
      const url = URL.createObjectURL(doc.output("blob"));
      const name = `AccountReport-${month || "all-months"}.pdf`;
      setPdfDownload({ url, name });
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { setError(`Unable to create PDF: ${(e as Error).message}`); }
    finally { setBusy(false); }
  }
  return <section className="panel account-report-panel">
    <h2>Account Report</h2>
    {/*<p className="muted">Upload a spreadsheet and submit to total New Charges by statement month and utility type.</p>
     <p className="muted">Required: Statement Date, Utility, and Total New Charges (or New Charges). Utility type grouping and filtering use the Utility column. The PDF uses Utility as Company and Company Folder Name, Total New Charges as Amount, Service Address Line_1 as Service Address, and the worksheet name as Product. City is copied directly. Processed Date comes only from the YYYYMMdd date in the spreadsheet filename and displays as MM/dd/YYYY. Example: Daily Bill Check_20261003.xlsx gives 10/03/2026. The older YYYYMMdd_ filename format is also supported. Optional: Account Number. Text dates use MM-dd-yyyy (for example, 09-14-2026), MM/DD/YYYY, or YYYY-MM-DD.</p> */}
    <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
      <Button component="label" variant="outlined" disabled={busy}>Choose spreadsheet<input aria-label="Choose spreadsheet" hidden type="file" accept=".xlsx,.xls,.csv" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></Button>
      <span>{fileName || "No file selected"}</span>
      {workbook && <TextField select size="small" label="Worksheet" value={sheet} onChange={e => { setSheet(e.target.value); setRows([]); setError(""); }} sx={{ minWidth: 180 }}>{workbook.SheetNames.map(name => <MenuItem key={name} value={name}>{name}</MenuItem>)}</TextField>}
      <Button variant="contained" disabled={!workbook || busy} onClick={submit}>{busy ? "Working..." : "Submit"}</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    {pdfDownload && <Alert severity="success" sx={{ mt: 2 }}>PDF ready. If the download did not start, <a href={pdfDownload.url} download={pdfDownload.name}>save the PDF</a> or <a href={pdfDownload.url} target="_blank" rel="noreferrer">open it in a new tab</a>.</Alert>}
    {rows.length > 0 && <>
      <Stack direction="row" spacing={2} useFlexGap sx={{ my: 3, flexWrap: "wrap" }}>
        <TextField select label="Statement month" size="small" value={month} onChange={e => setMonth(e.target.value)} sx={{ minWidth: 200 }}><MenuItem value="">All months</MenuItem>{[...new Set(rows.map(row => row.month))].sort().map(value => <MenuItem key={value} value={value}>{monthLabel(value)}</MenuItem>)}</TextField>
        <TextField select label="Utility type" size="small" value={utility} onChange={e => setUtility(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All utility types</MenuItem>{utilities.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
        <Button variant="contained" onClick={() => void download()} disabled={busy || !filtered.length}>Download PDF</Button>
      </Stack>
      <h3>Account Total: {money(total)}</h3>
      <p className="muted">{filtered.length} statement rows. PDF includes the selected rows, with a separate section for each company and month.</p>
      {!filtered.length ? <Alert severity="info">No statements match these filters.</Alert> : <>
        <div className="account-report-table-wrap"><table className="account-report-table"><thead><tr><th>Statement month</th><th>Utility type</th><th>Statements</th><th>Account Total</th></tr></thead><tbody>{summary.map(group => <tr key={`${group.month}-${group.utilityType}`}><td>{monthLabel(group.month)}</td><td>{group.utilityType}</td><td>{group.count}</td><td>{money(group.cents)}</td></tr>)}</tbody></table></div>
        <h3>Statement details</h3>
        <div className="account-report-table-wrap"><table className="account-report-table"><thead><tr>{["Account Number", "Company Folder Name", "City", "Utility", "Product", "Amount", "Statement Date", "Service Address", "Processed Date"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={index}>{[row.account, row.utility, row.city, row.utility, row.product, money(row.cents), displayDate(row.statementDate), row.address, displayProcessedDate(row.processedDate)].map((value, i) => <td key={i}>{value || "—"}</td>)}</tr>)}</tbody></table></div>
      </>}
    </>}
  </section>;
}
