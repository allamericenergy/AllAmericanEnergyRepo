import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { Columns3, Database, FileText, Upload } from "lucide-react";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { api } from "../../lib/api";
import { CreateUploadsDialog } from "./CreateUploadsDialog";

const MAX_FILE_MB = 15;
// Claude reads each bill in roughly 20–60 seconds; a few at once keeps large batches moving.
const PARALLEL_EXTRACTIONS = 3;

interface ExtractedField { key: string; value: string; page: number | null; confidence: "high" | "medium" | "low" }
interface ExtractionResult {
  fileName: string;
  pageCount: number;
  billType: string;
  bill: Record<string, string>;
  fields: ExtractedField[];
  requiredFields: string[];
  missingFields: string[];
  extraction: {
    status: "complete" | "needs_review";
    method: string;
    issues: Array<{ field: string; message: string }>;
    /** 0–100 average of the per-field confidence scores; null when nothing was read. */
    confidence?: number | null;
    /** When the AI read the PDF (ISO timestamp). */
    processedOn?: string;
  };
  warnings: string[];
}
interface PdfUpload {
  id: string;
  file: File;
  status: "Ready" | "Extracting" | "Complete" | "Needs review" | "Failed" | "Cancelled";
  error?: string;
  result?: ExtractionResult;
}
type BillRow = Record<string, string> & { id: string };
type SaveResult =
  | { fileName: string; status: "inserted"; table: string; invoiceId: string; skippedFields: string[] }
  | { fileName: string; status: "duplicate"; table: string; invoiceId: string; matchCount: number; accountNumber: string; meter: string; serviceRefPod: string; statementDate: string; existingAccountNumber: string; skipped?: boolean }
  | { fileName: string; status: "failed"; message: string; code?: "MISSING_STATEMENT_DATE" | "METER_NOT_FOUND" };
type FieldRow = { id: string; fileName: string; field: string; value: string; page: string; confidence: string };

const labelOverrides: Record<string, string> = {
  serviceRefPod: "Service Ref / POD",
  temperature: "Temperature (Latest)",
  product: "Product (Bill Type)",
  billedDemandCcf: "Billed Demand CCF",
  readDemandCcf: "Read Demand CCF",
  stateLocalConsumptionTax: "State/Local Consumption Tax",
  electricSupplySvcEss: "Electric Supply Svc ESS",
  heatingDegDays: "Heating Degree Days",
  coolingDegDays: "Cooling Degree Days"
};
export function fieldLabel(key: string): string {
  if (labelOverrides[key]) return labelOverrides[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace(/\bKwh\b/g, "kWh").replace(/\bKw\b/g, "kW").replace(/\bEss\b/g, "ESS").replace(/^Ne\b/, "NE");
}

const uploadColumns: GridColumn<{ id: string; fileName: string; status: string; message: string }>[] = [
  { field: "fileName", headerName: "PDF File", minWidth: 240, flex: 2 },
  {
    field: "status",
    headerName: "Status",
    width: 150,
    renderCell: ({ row }) => row.status === "Extracting"
      ? <span className="extract-pdf-row-status"><CircularProgress size={14} thickness={5} aria-hidden="true" /> Reading…</span>
      : row.status
  },
  { field: "message", headerName: "Details", minWidth: 300, flex: 2 }
];
const fieldColumns: GridColumn<FieldRow>[] = [
  { field: "fileName", headerName: "PDF File", minWidth: 220, flex: 1 },
  { field: "field", headerName: "Field", minWidth: 200 },
  { field: "value", headerName: "Value", minWidth: 220, flex: 1 },
  { field: "page", headerName: "Page", width: 80 },
  { field: "confidence", headerName: "Confidence", width: 120 }
];

function errorMessage(cause: unknown): string {
  const serverError = isAxiosError(cause) ? cause.response?.data?.error : undefined;
  return typeof serverError === "string" ? serverError
    : serverError?.message ?? "Unable to extract this PDF. Please select it again to retry.";
}

/**
 * Extraction kept in memory while the user adds a missing meter on the Meters
 * page, so ExtractPDF can reopen with the same results instead of re-reading
 * the PDFs. Lives for the browser tab's session only.
 */
interface ParkedExtraction { uploads: PdfUpload[]; saved: Record<string, SaveResult>; uploadId: string }
let parkedExtraction: ParkedExtraction | null = null;

/** Navigation state the Meters page sends back after the meter form closes. */
export interface ExtractPdfReturnState { resumeExtractPdf: true; meterAdded: boolean }
export const EXTRACT_PDF_RETURN_PATH = "/organizations";

export function hasParkedExtraction() {
  return parkedExtraction !== null;
}

export function ExtractPdfDialog({ open, onClose, resume }: { open: boolean; onClose: () => void; resume?: { meterAdded: boolean } | null }) {
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Save outcome per upload id; cleared whenever the files are extracted again.
  const [saved, setSaved] = useState<Record<string, SaveResult>>({});
  // Upload ids of duplicates waiting for the user to confirm or skip.
  const [pendingDuplicates, setPendingDuplicates] = useState<string[]>([]);
  // Upload ids with no matching meter, shown in the "add meter?" confirmation.
  const [pendingMissingMeters, setPendingMissingMeters] = useState<string[]>([]);
  // Bill to offer for insert after returning from Add New Meter.
  const [resumePrompt, setResumePrompt] = useState<{ uploadId: string; meterAdded: boolean } | null>(null);
  const [createUploadsOpen, setCreateUploadsOpen] = useState(false);
  const navigate = useNavigate();
  const request = useRef<AbortController | null>(null);

  // Restore the extraction parked before going to Add New Meter.
  useEffect(() => {
    if (!open || !resume || !parkedExtraction) return;
    const parked = parkedExtraction;
    parkedExtraction = null;
    setUploads(parked.uploads);
    setSaved(parked.saved);
    setSaveError("");
    setPendingDuplicates([]);
    setPendingMissingMeters([]);
    setResumePrompt({ uploadId: parked.uploadId, meterAdded: resume.meterAdded });
  }, [open, resume]);
  useEffect(() => () => request.current?.abort(), []);

  const update = (id: string, patch: Partial<PdfUpload>) =>
    setUploads((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));

  function close() {
    request.current?.abort();
    request.current = null;
    setUploads((current) => current.map((item) => item.status === "Extracting" || (loading && item.status === "Ready")
      ? { ...item, status: "Cancelled" } : item));
    setLoading(false);
    onClose();
  }

  async function submit() {
    const pending = uploads.filter((item) => !item.error);
    if (!pending.length || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setSaved({});
    setSaveError("");
    setPendingDuplicates([]);
    setPendingMissingMeters([]);
    setUploads((current) => current.map((item) => item.error ? item : { ...item, status: "Ready", result: undefined }));
    const queue = [...pending];
    async function worker() {
      for (let item = queue.shift(); item && !controller.signal.aborted; item = queue.shift()) {
        update(item.id, { status: "Extracting" });
        const form = new FormData();
        form.append("pdf", item.file);
        try {
          const { data } = await api.post<ExtractionResult>("/pdf/extract-claude", form, { signal: controller.signal });
          if (controller.signal.aborted) return;
          update(item.id, { result: data, status: data.extraction.status === "complete" ? "Complete" : "Needs review" });
        } catch (cause) {
          if (controller.signal.aborted) return;
          update(item.id, { status: "Failed", error: errorMessage(cause) });
        }
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL_EXTRACTIONS, pending.length) }, worker));
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }

  const results = useMemo(
    () => uploads.filter((item): item is PdfUpload & { result: ExtractionResult } => Boolean(item.result)),
    [uploads]
  );

  // One grid per bill type, each showing that type's required fields.
  const billGroups = useMemo(() => {
    const groups = new Map<string, typeof results>();
    for (const item of results) groups.set(item.result.billType, [...(groups.get(item.result.billType) ?? []), item]);
    return [...groups.entries()].map(([billType, items]) => {
      const requiredFields = items[0].result.requiredFields;
      const columns: GridColumn<BillRow>[] = [
        { field: "fileName", headerName: "PDF File", minWidth: 240, pinned: "left" },
        { field: "status", headerName: "Status", width: 130 },
        ...requiredFields.map((key): GridColumn<BillRow> => ({
          field: key,
          headerName: fieldLabel(key),
          minWidth: key === "billCheck" ? 260 : /address|name|supplier|utility|product/i.test(key) ? 220 : 150,
          // A Bill Check of OK (new charges + balance forward = invoice cost) turns the cell green.
          ...(key === "billCheck" ? {
            renderCell: ({ value }) => value === "OK"
              ? <span className="bill-check-ok" title="Total New Charges + Balance Forward = Total Invoice Cost">OK</span>
              : String(value ?? "")
          } : {})
        })),
        { field: "reviewNotes", headerName: "Review Notes", minWidth: 360 }
      ];
      const rows: BillRow[] = items.map((item) => {
        const { bill, fields, extraction } = item.result;
        const lowConfidence = new Set(fields.filter((field) => field.confidence === "low").map((field) => field.key));
        const row: BillRow = {
          id: item.id,
          fileName: item.file.name,
          status: item.status,
          reviewNotes: extraction.issues.map((issue) => `${fieldLabel(issue.field)}: ${issue.message}`).join(" · ")
        };
        for (const key of requiredFields) {
          const value = bill[key];
          row[key] = value == null ? "Not found" : lowConfidence.has(key) ? `${value} (check)` : value;
        }
        return row;
      });
      return { billType, columns, rows };
    });
  }, [results]);

  // Not yet saved, failed, or a duplicate the user has not decided on yet.
  const savable = results.filter((item) => {
    const result = saved[item.id];
    // A bill without a statement date fails again until it is re-extracted, so it is not retried.
    if (result?.status === "failed" && result.code === "MISSING_STATEMENT_DATE") return false;
    return !result || result.status === "failed" || (result.status === "duplicate" && !result.skipped);
  });

  async function saveToDatabase(items: typeof results, allowDuplicate = false) {
    if (!items.length || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await api.post<{ data: SaveResult[] }>("/utility-invoices", {
        invoices: items.map((item) => ({ fileName: item.file.name, billType: item.result.billType, bill: item.result.bill, allowDuplicate,
          extraction: { status: item.result.extraction.status, confidence: item.result.extraction.confidence ?? null, processedOn: item.result.extraction.processedOn } }))
      });
      setSaved((current) => {
        const next = { ...current };
        items.forEach((item, index) => { if (data.data[index]) next[item.id] = data.data[index]; });
        return next;
      });
      setPendingDuplicates(items.filter((_item, index) => data.data[index]?.status === "duplicate").map((item) => item.id));
      // Kept across the duplicate re-submit, which only sends the duplicates;
      // ids that later save successfully drop out via meterNotFound.
      const missing = items.filter((_item, index) => {
        const result = data.data[index];
        return result?.status === "failed" && result.code === "METER_NOT_FOUND";
      }).map((item) => item.id);
      setPendingMissingMeters((current) => [...new Set([...current, ...missing])]);
    } catch (cause) {
      const serverError = isAxiosError(cause) ? cause.response?.data?.error : undefined;
      setSaveError(typeof serverError === "string" ? serverError : serverError?.message ?? "Unable to save the invoices. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function insertDuplicates() {
    const items = results.filter((item) => pendingDuplicates.includes(item.id));
    setPendingDuplicates([]);
    void saveToDatabase(items, true);
  }

  function skipDuplicates() {
    setSaved((current) => {
      const next = { ...current };
      for (const id of pendingDuplicates) {
        const result = next[id];
        if (result?.status === "duplicate") next[id] = { ...result, skipped: true };
      }
      return next;
    });
    setPendingDuplicates([]);
  }

  const saveMessage = (result: SaveResult) => result.status === "inserted"
    ? `Saved to ${result.table} (Invoice ID ${result.invoiceId})${result.skippedFields.length ? `. Not saved: ${result.skippedFields.join("; ")}` : ""}`
    : result.status === "duplicate"
      ? `${result.skipped ? "Not inserted — duplicate" : "Duplicate, waiting for confirmation"}: ${result.matchCount} existing invoice(s) in ${result.table} with the same Account Number, Service Ref/POD, Meter and Statement Date (latest Invoice ID ${result.invoiceId}).`
      : result.message;
  const missingStatementDate = results.filter((item) => {
    const result = saved[item.id];
    return result?.status === "failed" && result.code === "MISSING_STATEMENT_DATE";
  });
  // Retryable once the meter has been added or corrected in the meter list.
  const meterNotFound = results.flatMap((item) => {
    const result = saved[item.id];
    return result?.status === "failed" && result.code === "METER_NOT_FOUND" ? [{ id: item.id, fileName: item.file.name, message: result.message, bill: item.result.bill }] : [];
  });
  // Ask about missing meters only after any duplicate confirmation is answered.
  const missingMeterPrompt = duplicateRowsPending() ? [] : meterNotFound.filter((row) => pendingMissingMeters.includes(row.id));

  function duplicateRowsPending() {
    return pendingDuplicates.some((id) => saved[id]?.status === "duplicate");
  }

  /** Opens Meters → Add New Meter, pre-filled with what the bill shows. */
  function addMeterFromBill(uploadId: string, bill: Record<string, string>) {
    const text = (key: string) => (bill[key] ?? "").trim();
    const serviceAddress = [text("serviceAddressLine1"), text("serviceAddressLine2")].filter(Boolean).join(", ");
    setPendingMissingMeters([]);
    parkedExtraction = { uploads, saved, uploadId };
    close();
    navigate("/meters", {
      state: {
        returnToExtractPdf: EXTRACT_PDF_RETURN_PATH,
        addMeter: {
          accountNumber: text("accountNumber"),
          serviceRefPod: text("serviceRefPod"),
          // Same name the invoice stores in Utility_Account_Name.
          utilityAccountName: text("customerName") || text("utilityAccountName"),
          meter: text("meter"),
          nameKey: text("nameKey"),
          serviceAddress,
          zip: text("zip").slice(0, 5),
          city: text("city"),
          state: text("state"),
          // Bill types (Power, Gas, Water, Sewer, Solar) are product names in the meter list.
          productName: text("product") || text("billType"),
          cycleReadDay: text("billingCycle")
        }
      }
    });
  }
  const duplicateRows = results.flatMap((item) => {
    const result = saved[item.id];
    return pendingDuplicates.includes(item.id) && result?.status === "duplicate" ? [{ id: item.id, result }] : [];
  });
  const savedResults = results.flatMap((item) => saved[item.id] ? [{ id: item.id, result: saved[item.id] }] : []);

  const fieldRows: FieldRow[] = results.flatMap((item) => item.result.fields.map((field) => ({
    id: `${item.id}-${field.key}`,
    fileName: item.file.name,
    field: fieldLabel(field.key),
    value: field.value,
    page: field.page == null ? "—" : String(field.page),
    confidence: field.confidence
  })));
  const finished = uploads.filter((item) => ["Complete", "Needs review", "Failed"].includes(item.status)).length;

  return <Dialog open={open} onClose={close} fullWidth maxWidth="xl" aria-labelledby="extract-pdf-title">
    <DialogTitle id="extract-pdf-title">ExtractPDF</DialogTitle>
    <DialogContent>
      <p className="muted">Select utility bill PDFs (maximum {MAX_FILE_MB} MB each), then click Submit. Claude reads each bill, including scanned pages and charts, detects whether it is a Power, Gas or Water bill, and fills in that bill type's required fields. Values marked "(check)" were hard to read.</p>
      <div className="bulk-upload-controls">
        <Button component="label" variant="outlined" startIcon={<Upload size={16} />} disabled={loading}>
          Choose PDFs
          <input hidden multiple type="file" accept=".pdf,application/pdf" onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (!selected.length) return;
            setSaved({});
            setSaveError("");
            setPendingDuplicates([]);
            setPendingMissingMeters([]);
            setUploads(selected.map((file, index) => {
              const error = !/\.pdf$/i.test(file.name) ? "Choose a PDF file."
                : !file.size || file.size > MAX_FILE_MB * 1024 * 1024 ? `Choose a non-empty PDF no larger than ${MAX_FILE_MB} MB.` : undefined;
              return { id: String(index), file, error, status: error ? "Failed" : "Ready" };
            }));
          }} />
        </Button>
        <span>{uploads.length ? `${uploads.length} file(s) selected` : "No files selected"}</span>
      </div>
      {uploads.length ? <div className="extract-pdf-grid-wrap">
        {loading ? <div className="extract-pdf-overlay">
          <div className="extract-pdf-processing" role="status" aria-live="polite" aria-label={`Processing PDFs, ${finished} of ${uploads.length} done`}>
            <div className="member-bill-processing-image" aria-hidden="true">
              <span className="member-bill-processing-ring" />
              <FileText size={34} />
              <span className="extract-pdf-scan-line" />
              <span className="member-bill-processing-dot dot-one" />
              <span className="member-bill-processing-dot dot-two" />
              <span className="member-bill-processing-dot dot-three" />
            </div>
          </div>
        </div> : null}
        <IntiliGrid columns={uploadColumns} rows={uploads.map((item) => ({
          id: item.id, fileName: item.file.name, status: item.status,
          message: item.error ?? (item.result
            ? [`${item.result.billType} bill`, `${item.result.pageCount} page(s)`,
              `${item.result.requiredFields.length - item.result.missingFields.length} of ${item.result.requiredFields.length} required fields found`].join(" · ")
            : "")
        }))} />
      </div> : null}
      {results.length ? <>
        <Alert severity={uploads.some((item) => item.status === "Needs review" || item.status === "Failed") ? "warning" : "success"} sx={{ mt: 2 }}>
          {results.length} PDF(s) extracted. Review the values and review notes below.
        </Alert>
        {billGroups.map((group) => <section key={group.billType} style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>{group.billType} bills ({group.rows.length})</h3>
          <div style={{ height: Math.min(400, 120 + group.rows.length * 44) }}>
            <IntiliGrid columns={group.columns} rows={group.rows} />
          </div>
        </section>)}
        {saveError ? <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert> : null}
        {missingStatementDate.length ? <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
          <strong>{missingStatementDate.length} invoice(s) not inserted — Statement Date is missing</strong>
          <div>A statement date is required to save an invoice. Check these bills and extract them again: {missingStatementDate.map((item) => item.file.name).join(", ")}</div>
        </Alert> : null}
        {meterNotFound.length ? <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
          <strong>{meterNotFound.length} invoice(s) not inserted — meter not found in the meter list</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {meterNotFound.map((row) => <li key={row.id}><b>{row.fileName}</b>: {row.message.replace(/^Not inserted: /, "")}</li>)}
          </ul>
          <div>Add or correct the meter on the Meters page, then click Submit to DB again.</div>
        </Alert> : null}
        {savedResults.length ? <Alert severity={savedResults.some(({ result }) => result.status === "failed") ? "warning" : "success"} sx={{ mt: 2 }}>
          <strong>Database save</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {savedResults.map(({ id, result }) => <li key={id}><b>{result.fileName}</b>: {saveMessage(result)}</li>)}
          </ul>
        </Alert> : null}
        <details style={{ marginTop: 16 }}>
          <summary>View each extracted value with its page and confidence</summary>
          <div style={{ height: 350, marginTop: 12 }}>
            <IntiliGrid columns={fieldColumns} rows={fieldRows} />
          </div>
        </details>
      </> : null}
    </DialogContent>
    <DialogActions disableSpacing sx={{ flexWrap: "wrap", gap: 1 }}>
      <Button onClick={close} disabled={saving}>{loading ? "Cancel" : "Close"}</Button>
      <Button variant="outlined" startIcon={<Columns3 size={16} />} disabled={!results.length || loading || saving}
        onClick={() => setCreateUploadsOpen(true)}>CreateUploads</Button>
      {results.length && !loading ? <Button variant="outlined" color="success" startIcon={saving ? <CircularProgress size={14} /> : <Database size={16} />}
        disabled={!savable.length || saving} onClick={() => void saveToDatabase(savable)}>
        {saving ? "Saving…" : savable.length ? `Submit to DB (${savable.length})` : "Submitted to DB"}
      </Button> : null}
      <Button variant="contained" disabled={!uploads.some((item) => !item.error) || loading || saving} onClick={() => void submit()}>{loading ? "Extracting…" : "Submit"}</Button>
    </DialogActions>
    {createUploadsOpen ? <CreateUploadsDialog
      bills={results.map(({ id, file, result }) => ({
        id, fileName: file.name, accountNumber: result.bill.accountNumber ?? "", serviceRefPod: result.bill.serviceRefPod ?? "",
        billType: result.billType, values: result.bill, needsReview: result.extraction.status === "needs_review",
        lowConfidence: result.fields.filter((field) => field.confidence === "low").map((field) => field.key)
      }))}
      onClose={() => setCreateUploadsOpen(false)} /> : null}
    {(() => {
      const resumeItem = resumePrompt ? results.find((item) => item.id === resumePrompt.uploadId) : undefined;
      return <Dialog open={Boolean(resumePrompt && resumeItem)} onClose={() => setResumePrompt(null)} maxWidth="sm" fullWidth aria-labelledby="resume-insert-title">
        <DialogTitle id="resume-insert-title">{resumePrompt?.meterAdded ? "Meter added" : "Meter not added"}</DialogTitle>
        <DialogContent>
          <Alert severity={resumePrompt?.meterAdded ? "success" : "warning"}>
            {resumePrompt?.meterAdded
              ? <>The meter for <b>{resumeItem?.file.name}</b> was added to the meter list.</>
              : <>No meter was saved for <b>{resumeItem?.file.name}</b>, so the invoice will fail the meter check again.</>}
          </Alert>
          <p>Do you want to insert this invoice into the database now?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResumePrompt(null)}>Not now</Button>
          <Button variant="contained" startIcon={<Database size={16} />} disabled={saving} onClick={() => {
            setResumePrompt(null);
            if (resumeItem) void saveToDatabase([resumeItem]);
          }}>Insert to DB</Button>
        </DialogActions>
      </Dialog>;
    })()}
    <Dialog open={missingMeterPrompt.length > 0} onClose={() => setPendingMissingMeters([])} maxWidth="sm" fullWidth aria-labelledby="missing-meter-title">
      <DialogTitle id="missing-meter-title">Meter not found</DialogTitle>
      <DialogContent>
        <p>{missingMeterPrompt.length === 1
          ? "No meter in the meter list matches this invoice, so it was not inserted."
          : `No meter in the meter list matches these ${missingMeterPrompt.length} invoices, so they were not inserted.`}</p>
        <ul style={{ paddingLeft: 18 }}>
          {missingMeterPrompt.map((row) => <li key={row.id} style={{ marginBottom: 6 }}>
            <b>{row.fileName}</b>: {row.message.replace(/^Not inserted: /, "")}
            {missingMeterPrompt.length > 1 ? <> <Button size="small" onClick={() => addMeterFromBill(row.id, row.bill)}>Add this meter</Button></> : null}
          </li>)}
        </ul>
        <p>Click OK to open Add New Meter with {missingMeterPrompt.length === 1 ? "this bill's" : "the first bill's"} details filled in. After you save the meter you will come back here to insert the invoice.</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPendingMissingMeters([])}>Cancel</Button>
        <Button variant="contained" onClick={() => addMeterFromBill(missingMeterPrompt[0].id, missingMeterPrompt[0].bill)}>OK</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={duplicateRows.length > 0} onClose={skipDuplicates} maxWidth="md" fullWidth aria-labelledby="duplicate-invoice-title">
      <DialogTitle id="duplicate-invoice-title">Duplicate invoices found</DialogTitle>
      <DialogContent>
        <p>{duplicateRows.length === 1 ? "This invoice matches" : `These ${duplicateRows.length} invoices match`} existing invoice records with the same Account Number, Service Ref/POD, Meter and Statement Date. Do you want to insert {duplicateRows.length === 1 ? "it" : "them"} anyway?</p>
        <table className="duplicate-invoice-table">
          <thead><tr><th>PDF File</th><th>Account Number</th><th>Meter</th><th>Service Ref/POD</th><th>Statement Date</th><th>Existing invoice(s)</th></tr></thead>
          <tbody>
            {duplicateRows.map(({ id, result }) => <tr key={id}>
              <td>{result.fileName}</td>
              <td>{result.accountNumber || "—"}</td>
              <td>{result.meter || "—"}</td>
              <td>{result.serviceRefPod || "—"}</td>
              <td>{result.statementDate || "—"}</td>
              <td>{result.matchCount} in {result.table.replace(/^tbl_|_UtilityInvoices$/g, "")} — latest ID {result.invoiceId}</td>
            </tr>)}
          </tbody>
        </table>
      </DialogContent>
      <DialogActions>
        <Button onClick={skipDuplicates}>Skip duplicates</Button>
        <Button variant="contained" color="warning" onClick={insertDuplicates}>Insert anyway</Button>
      </DialogActions>
    </Dialog>
  </Dialog>;
}
