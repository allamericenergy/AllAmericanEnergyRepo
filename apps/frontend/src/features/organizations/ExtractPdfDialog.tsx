import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { isAxiosError } from "axios";
import { Upload } from "lucide-react";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { api } from "../../lib/api";

interface ExtractionResult {
  fileName: string;
  pageCount: number;
  bill: Record<string, unknown>;
  extraction: { status: string; issues: Array<{ field: string; message: string }> };
  warnings: string[];
  lines: Array<{ pageNumber: number; lineNumber: number; text: string }>;
}
type BillTableRow = Record<string, string> & { id: string; fileName: string; reviewNotes: string };
const lineColumns: GridColumn<ExtractionResult["lines"][number] & { id: string; fileName: string }>[] = [
  { field: "fileName", headerName: "PDF File", minWidth: 240, flex: 1 },
  { field: "pageNumber", headerName: "Page", width: 90 },
  { field: "lineNumber", headerName: "Line", width: 90 },
  { field: "text", headerName: "Extracted Text", minWidth: 400, flex: 1 }
];
function fieldLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") {
    return Object.entries(value).map(([key, part]) => `${fieldLabel(key)}: ${displayValue(part)}`).join(" · ");
  }
  return String(value);
}
function displayBillValue(field: string, value: unknown): string {
  if (field === "temperature" && value && typeof value === "object") {
    const temperature = value as { month?: unknown; value?: unknown; unit?: unknown };
    const month = String(temperature.month ?? "Latest");
    const numericValue = temperature.value == null ? "" : String(temperature.value);
    const unit = temperature.unit == null ? "°" : String(temperature.unit);
    return `${month}: ${numericValue}${unit}`;
  }
  if (field === "temperatureHistory" && Array.isArray(value)) {
    return value.map((item) => {
      const entry = item as { month?: unknown; value?: unknown; unit?: unknown };
      const reading = entry.value == null ? "Needs review" : `${String(entry.value)}${entry.unit == null ? "°" : String(entry.unit)}`;
      return `${String(entry.month ?? "-")}: ${reading}`;
    }).join(" · ");
  }
  return displayValue(value);
}

interface PdfUpload {
  id: string;
  file: File;
  status: "Ready" | "Extracting" | "Complete" | "Needs review" | "Failed" | "Cancelled";
  error?: string;
  result?: ExtractionResult;
}
const uploadColumns: GridColumn<{ id: string; fileName: string; status: string; message: string }>[] = [
  { field: "fileName", headerName: "PDF File", minWidth: 240, flex: 2 },
  { field: "status", headerName: "Status", width: 140 },
  { field: "message", headerName: "Details", minWidth: 300, flex: 2 }
];

export function ExtractPdfDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

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
    setUploads((current) => current.map((item) => item.error ? item : { ...item, status: "Ready", result: undefined }));
    try {
      // Process one file at a time to keep PDF parsing memory bounded.
      for (const item of pending) {
        if (controller.signal.aborted) break;
        setUploads((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "Extracting" } : entry));
        const form = new FormData();
        form.append("pdf", item.file);
        try {
          const response = await api.post<ExtractionResult>("/pdf/extract", form, { signal: controller.signal });
          if (controller.signal.aborted) break;
          setUploads((current) => current.map((entry) => entry.id === item.id
            ? { ...entry, result: response.data, status: response.data.extraction.status === "complete" ? "Complete" : "Needs review" }
            : entry));
        } catch (cause) {
          if (controller.signal.aborted) break;
          const serverError = isAxiosError(cause) ? cause.response?.data?.error : undefined;
          const message = typeof serverError === "string" ? serverError : serverError?.message ?? "Unable to extract this PDF. Please select it again to retry.";
          setUploads((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "Failed", error: message } : entry));
        }
      }
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }

  const results = uploads.filter((item) => item.result);
  const billFields = useMemo(() => {
    const preferred = ["billType", "temperature", "temperatureHistory", "days"];
    const found = new Set(results.flatMap((item) => Object.keys(item.result!.bill)));
    preferred.forEach((field) => found.add(field));
    return [...preferred, ...[...found].filter((field) => !preferred.includes(field)).sort((a, b) => fieldLabel(a).localeCompare(fieldLabel(b)))];
  }, [results]);
  const billColumns = useMemo<GridColumn<BillTableRow>[]>(() => [
    { field: "fileName", headerName: "PDF File", minWidth: 240, pinned: "left" },
    ...billFields.map((field): GridColumn<BillTableRow> => ({
      field,
      headerName: fieldLabel(field),
      minWidth: field === "temperatureHistory" ? 720
        : ["serviceAddress", "serviceProvidedTo", "servicePeriod", "temperature"].includes(field) ? 220 : 150
    })),
    { field: "reviewNotes", headerName: "Review Notes", minWidth: 320 }
  ], [billFields]);
  const billRows: BillTableRow[] = results.map((item) => {
    const result = item.result!;
    const row: BillTableRow = {
      id: item.id,
      fileName: item.file.name,
      reviewNotes: result.extraction.issues.map((issue) => `${fieldLabel(issue.field)}: ${issue.message}`).join(" · ")
    };
    for (const field of billFields) {
      const value = result.bill[field];
      row[field] = value === null || value === undefined
        ? (result.extraction.issues.some((issue) => issue.field === field || issue.field.startsWith(`${field}.`)) ? "Needs review" : "Not found in PDF")
        : displayBillValue(field, value);
    }
    return row;
  });
  const finished = uploads.filter((item) => ["Complete", "Needs review", "Failed"].includes(item.status)).length;

  return <Dialog open={open} onClose={close} fullWidth maxWidth="xl" aria-labelledby="extract-pdf-title">
    <DialogTitle id="extract-pdf-title">ExtractPDF</DialogTitle>
    <DialogContent>
      <p className="muted">Select multiple utility bill PDFs (maximum 10 MB per file), then click Submit to extract them. Results include Read Demand and Billed Demand as separate fields, with their units when found.</p>
      <div className="bulk-upload-controls">
        <Button component="label" variant="outlined" startIcon={<Upload size={16} />} disabled={loading}>
          Choose PDFs
          <input hidden multiple type="file" accept=".pdf,application/pdf" onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (!selected.length) return;
            setUploads(selected.map((file, index) => {
              const error = !/\.pdf$/i.test(file.name) ? "Choose a PDF file."
                : !file.size || file.size > 10 * 1024 * 1024 ? "Choose a non-empty PDF no larger than 10 MB." : undefined;
              return { id: String(index), file, error, status: error ? "Failed" : "Ready" };
            }));
          }} />
        </Button>
        <span>{uploads.length ? `${uploads.length} file(s) selected` : "No files selected"}</span>
      </div>
      {loading ? <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mt: 2 }}>Extracting PDFs… {finished} of {uploads.length} processed.</Alert> : null}
      {uploads.length ? <div style={{ height: 240, marginTop: 16 }}>
        <IntiliGrid columns={uploadColumns} rows={uploads.map((item) => ({
          id: item.id, fileName: item.file.name, status: item.status,
          message: item.error ?? (item.result ? [`${item.result.pageCount} page(s)`, ...item.result.warnings].join(" · ") : "")
        }))} />
      </div> : null}
      {results.length ? <>
        <Alert severity={uploads.some((item) => item.status === "Needs review" || item.status === "Failed") ? "warning" : "success"} sx={{ mt: 2 }}>
          {results.length} PDF(s) extracted. Review each file’s values and review notes below.
        </Alert>
        <div style={{ height: 400, marginTop: 16 }}><IntiliGrid columns={billColumns} rows={billRows} /></div>
        <details style={{ marginTop: 16 }}>
          <summary>View extracted text by file, page and line</summary>
          <div style={{ height: 350, marginTop: 12 }}>
            <IntiliGrid columns={lineColumns} rows={results.flatMap((item) => item.result!.lines.map((line) => ({
              ...line, fileName: item.file.name, id: `${item.id}-${line.pageNumber}-${line.lineNumber}`
            })))} />
          </div>
        </details>
      </> : null}
    </DialogContent>
    <DialogActions>
      <Button onClick={close}>{loading ? "Cancel" : "Close"}</Button>
      <Button variant="contained" disabled={!uploads.some((item) => !item.error) || loading} onClick={() => void submit()}>{loading ? "Extracting…" : "Submit"}</Button>
    </DialogActions>
  </Dialog>;
}
