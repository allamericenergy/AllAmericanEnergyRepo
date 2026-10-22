import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip } from "@mui/material";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";

interface Preview {
  record: { id: number; label: string | null };
  confirmation: string;
  relations: Array<{ meterId: number | null; meter: string | null; contractId: number | null; contract: string | null; companyId: number | null; company: string | null; parentCompanyId: number | null; parentCompany: string | null }>;
}

export function DeleteRecordButton({ kind, id, onDeleted }: { kind: "meters" | "contracts"; id: string | number; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const label = kind === "meters" ? "meter" : "contract";
  function showError(error: unknown) {
    setError(isAxiosError(error) ? error.response?.data?.error ?? error.message : "Unable to delete this record.");
  }
  async function review() {
    setOpen(true); setPreview(null); setError(""); setBusy(true);
    try { setPreview((await api.get(`/reports/${kind}/${id}/deletion-preview`)).data); }
    catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      await api.delete(`/reports/${kind}/${id}`, { data: { confirmation: preview.confirmation } });
      setOpen(false);
      onDeleted();
      await client.invalidateQueries();
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  const describe = (name: string | null, id: number | null) => id == null ? "None" : `${name || "Unnamed"} (#${id})`;
  return <>
    <Tooltip title={`Delete ${label}`}><IconButton size="small" color="error" aria-label={`Delete ${label}`} onClick={(event) => { event.stopPropagation(); void review(); }}><Trash2 size={16} /></IconButton></Tooltip>
    <Dialog open={open} fullWidth maxWidth="md" onClose={() => { if (!busy) setOpen(false); }} onClick={(event) => event.stopPropagation()}>
      <DialogTitle>Delete {label}?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {busy && !preview && <p>Loading related records…</p>}
        {preview && <>
          <p>Permanently delete {label} {describe(preview.record.label, preview.record.id)} and its notes and links? This cannot be undone.</p>
          <p>The table shows this {label} and its relationships. Only the selected {label} will be deleted. Other meters, contracts, companies, and parent companies will be kept; their links to this {label} will be removed.</p>
          {preview.relations.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", textAlign: "left" }}><thead><tr><th>Meter</th><th>Contract</th><th>Company / Subcompany</th><th>Parent company</th></tr></thead><tbody>
            {preview.relations.map((row, index) => <tr key={index}><td>{describe(row.meter, row.meterId)}</td><td>{describe(row.contract, row.contractId)}</td><td>{describe(row.company, row.companyId)}</td><td>{describe(row.parentCompany, row.parentCompanyId)}</td></tr>)}
          </tbody></table></div> : <p>No related meters, contracts, or companies.</p>}
        </>}
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button color="error" variant="contained" disabled={busy || !preview} onClick={() => void remove()}>{busy ? "Please wait…" : `Delete ${label}`}</Button></DialogActions>
    </Dialog>
  </>;
}
