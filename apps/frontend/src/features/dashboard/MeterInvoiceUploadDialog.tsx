import { useEffect, useRef, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { isAxiosError } from "axios";
import { Database } from "lucide-react";
import { api } from "../../lib/api";

const MAX_FILE_MB = 15;
const PARALLEL_EXTRACTIONS = 3;

interface ExtractionResult {
  fileName: string;
  billType: string;
  bill: Record<string, string>;
  extraction: { status: "complete" | "needs_review"; confidence?: number | null; processedOn?: string };
}
type AccountCheck = "matches" | "otherMeter" | "notFound" | "missing" | "unknown";
interface UploadItem {
  id: string;
  file: File;
  status: "Extracting" | "Checking" | "Done" | "Failed";
  error?: string;
  result?: ExtractionResult;
  account?: AccountCheck;
  saveMessage?: string;
  saveStatus?: "inserted" | "duplicate" | "failed";
}
type SaveResult =
  | { status: "inserted"; table: string; invoiceId: string }
  | { status: "duplicate"; matchCount: number; invoiceId: string }
  | { status: "failed"; message: string };

const normalizeAccount = (value: unknown) => String(value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
export const isPdfFile = (file: File) => /\.pdf$/i.test(file.name) && (!file.type || file.type === "application/pdf");

function serverMessage(cause: unknown, fallback: string) {
  const serverError = isAxiosError(cause) ? cause.response?.data?.error : undefined;
  return typeof serverError === "string" ? serverError : serverError?.message ?? fallback;
}

const accountText: Record<AccountCheck, { severity: "success" | "warning" | "error"; text: string }> = {
  matches: { severity: "success", text: "Account number matches this meter." },
  otherMeter: { severity: "warning", text: "Account number exists in the meter list, but not on this meter." },
  notFound: { severity: "error", text: "Account number does not exist in the meter list." },
  missing: { severity: "error", text: "No account number was found on the bill." },
  unknown: { severity: "warning", text: "Unable to check whether the account number exists." }
};

/**
 * Upload Invoices from the meter view: runs ExtractPDF on each PDF, then checks
 * the bill's account number against this meter and the meter list.
 */
export function MeterInvoiceUploadDialog({ files, meterAccountNumber, onClose, onSaved }: {
  files: File[];
  meterAccountNumber: string | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const request = useRef<AbortController | null>(null);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  async function checkAccount(accountNumber: string | undefined, signal: AbortSignal): Promise<AccountCheck> {
    const value = (accountNumber ?? "").trim();
    if (!value) return "missing";
    if (normalizeAccount(value) === normalizeAccount(meterAccountNumber) && normalizeAccount(value)) return "matches";
    try {
      const { data } = await api.get<{ exists: boolean }>("/reports/meters/check-duplicate", { params: { field: "accountNumber", value }, signal });
      return data.exists ? "otherMeter" : "notFound";
    } catch {
      return "unknown";
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    const initial = files.map((file, index): UploadItem => {
      const error = !isPdfFile(file) ? "Only PDF files can be uploaded."
        : !file.size || file.size > MAX_FILE_MB * 1024 * 1024 ? `Choose a non-empty PDF no larger than ${MAX_FILE_MB} MB.` : undefined;
      return { id: String(index), file, error, status: error ? "Failed" : "Extracting" };
    });
    setItems(initial);
    const queue = initial.filter((item) => !item.error);
    if (!queue.length) return () => controller.abort();
    setRunning(true);
    async function worker() {
      for (let item = queue.shift(); item && !controller.signal.aborted; item = queue.shift()) {
        const form = new FormData();
        form.append("pdf", item.file);
        try {
          const { data } = await api.post<ExtractionResult>("/pdf/extract-claude", form, { signal: controller.signal });
          if (controller.signal.aborted) return;
          update(item.id, { result: data, status: "Checking" });
          const account = await checkAccount(data.bill.accountNumber, controller.signal);
          if (controller.signal.aborted) return;
          update(item.id, { account, status: "Done" });
        } catch (cause) {
          if (controller.signal.aborted) return;
          update(item.id, { status: "Failed", error: serverMessage(cause, "Unable to extract this PDF.") });
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(PARALLEL_EXTRACTIONS, queue.length) }, worker))
      .finally(() => { if (!controller.signal.aborted) setRunning(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  function close() {
    request.current?.abort();
    onClose();
  }

  // Only bills whose account number exists in the meter list can be inserted.
  const savable = items.filter((item) => item.result && (item.account === "matches" || item.account === "otherMeter")
    && item.saveStatus !== "inserted" && item.saveStatus !== "duplicate");
  const duplicates = items.filter((item) => item.saveStatus === "duplicate");

  async function save(toSave: UploadItem[], allowDuplicate = false) {
    if (!toSave.length || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await api.post<{ data: SaveResult[] }>("/utility-invoices", {
        invoices: toSave.map((item) => ({
          fileName: item.file.name, billType: item.result!.billType, bill: item.result!.bill, allowDuplicate,
          extraction: { status: item.result!.extraction.status, confidence: item.result!.extraction.confidence ?? null, processedOn: item.result!.extraction.processedOn }
        }))
      });
      toSave.forEach((item, index) => {
        const result = data.data[index];
        if (!result) return;
        update(item.id, {
          saveStatus: result.status,
          saveMessage: result.status === "inserted" ? `Saved to ${result.table} (Invoice ID ${result.invoiceId}).`
            : result.status === "duplicate" ? `Duplicate: ${result.matchCount} existing invoice(s) with the same Account Number, Service Ref/POD, Meter and Statement Date.`
              : result.message
        });
      });
      if (data.data.some((result) => result?.status === "inserted")) onSaved();
    } catch (cause) {
      setSaveError(serverMessage(cause, "Unable to save the invoices. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const done = items.filter((item) => item.status === "Done" || item.status === "Failed").length;

  return <Dialog open onClose={close} fullWidth maxWidth="md" aria-labelledby="meter-upload-invoices-title">
    <DialogTitle id="meter-upload-invoices-title">Upload Invoices</DialogTitle>
    <DialogContent>
      {running ? <p className="extract-pdf-row-status" role="status" aria-live="polite">
        <CircularProgress size={14} thickness={5} aria-hidden="true" /> Extracting PDFs… {done} of {items.length} done
      </p> : null}
      <table className="duplicate-invoice-table">
        <thead><tr><th>PDF File</th><th>Bill Type</th><th>Account Number</th><th>Statement Date</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((item) => <tr key={item.id}>
            <td>{item.file.name}</td>
            <td>{item.result?.billType ?? "—"}</td>
            <td>{item.result?.bill.accountNumber || "—"}</td>
            <td>{item.result?.bill.statementDate || "—"}</td>
            <td>
              {item.status === "Extracting" ? <span className="extract-pdf-row-status"><CircularProgress size={12} aria-hidden="true" /> Reading…</span>
                : item.status === "Checking" ? <span className="extract-pdf-row-status"><CircularProgress size={12} aria-hidden="true" /> Checking account…</span>
                  : item.error ? <Alert severity="error" sx={{ py: 0 }}>{item.error}</Alert>
                    : item.account ? <Alert severity={accountText[item.account].severity} sx={{ py: 0 }}>
                      {accountText[item.account].text}
                      {item.result?.extraction.status === "needs_review" ? " Some values need review." : ""}
                      {item.saveMessage ? <div><b>{item.saveMessage}</b></div> : null}
                    </Alert> : null}
            </td>
          </tr>)}
        </tbody>
      </table>
      {saveError ? <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert> : null}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={saving}>{running ? "Cancel" : "Close"}</Button>
      {duplicates.length ? <Button variant="outlined" color="warning" disabled={saving} onClick={() => void save(duplicates, true)}>
        Insert duplicates anyway ({duplicates.length})
      </Button> : null}
      <Button variant="contained" color="success" disabled={running || saving || !savable.length}
        startIcon={saving ? <CircularProgress size={14} /> : <Database size={16} />} onClick={() => void save(savable)}>
        {saving ? "Saving…" : `Submit to DB (${savable.length})`}
      </Button>
    </DialogActions>
  </Dialog>;
}
