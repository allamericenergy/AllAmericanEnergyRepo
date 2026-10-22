import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { api } from "../../lib/api";
import { createMasterAccountTemplate, parseMasterAccountUpload } from "./masterAccountNumberSpreadsheet";

interface MasterAccountNumberRow {
  id: number;
  utilityId: number;
  utilityName: string | null;
  accountNumber: boolean;
  serviceRefPodId: boolean;
  masterAccountNumber: "Account Number" | "Service Ref/POD ID" | "BOTH";
}

export function MasterAccountNumberPanel() {
  const [utilityId, setUtilityId] = useState("");
  const [accountNumber, setAccountNumber] = useState("YES");
  const [serviceRefPodId, setServiceRefPodId] = useState("YES");
  const [masterAccountNumber, setMasterAccountNumber] = useState("Account Number");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadRows, setUploadRows] = useState<ReturnType<typeof parseMasterAccountUpload>>([]);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<MasterAccountNumberRow | null>(null);
  const utilities = useQuery({
    queryKey: ["utility-meter-value-sizes"],
    queryFn: async () => (await api.get("/reports/utility-meter-value-sizes")).data as { data: { id: number; name: string | null }[] }
  });
  const settings = useQuery({
    queryKey: ["master-account-numbers"],
    queryFn: async () => (await api.get("/reports/master-account-numbers")).data as { data: MasterAccountNumberRow[] }
  });

  function selectUtility(id: string) {
    const setting = settings.data?.data.find((row) => String(row.utilityId) === id);
    setUtilityId(id);
    setMasterAccountNumber(setting?.masterAccountNumber ?? "Account Number");
    setAccountNumber(setting ? setting.accountNumber ? "YES" : "NO" : "YES");
    setServiceRefPodId(setting ? setting.serviceRefPodId ? "YES" : "NO" : "YES");
    setError("");
    setNotice("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.put("/reports/master-account-numbers", {
        utilityId: Number(utilityId), accountNumber: accountNumber === "YES", serviceRefPodId: serviceRefPodId === "YES", masterAccountNumber
      });
      await settings.refetch();
      setNotice("MasterAccount Number settings saved.");
    } catch (err) {
      setError(isAxiosError<{ error?: string }>(err) ? err.response?.data.error ?? "Unable to save settings." : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadTemplate() {
    const workbook = await createMasterAccountTemplate(utilities.data?.data ?? [], settings.data?.data ?? []);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "master-account-number-upload-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function selectUploadFile(file?: File) {
    setUploadError("");
    setUploadRows([]);
    setUploadFileName("");
    if (!file) return;
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("Choose an XLSX, XLS, or CSV spreadsheet.");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: true });
      const rows = parseMasterAccountUpload(workbook);
      setUploadRows(rows);
      setUploadFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to read the spreadsheet.");
    }
  }

  async function uploadSpreadsheet() {
    setUploading(true);
    setUploadError("");
    setNotice("");
    try {
      const response = await api.post("/reports/master-account-numbers/bulk", { rows: uploadRows });
      await settings.refetch();
      setNotice(`${response.data.uploaded} MasterAccount Number setting(s) uploaded.`);
      setUploadOpen(false);
      setUploadRows([]);
      setUploadFileName("");
    } catch (err) {
      setUploadError(isAxiosError<{ error?: string }>(err) ? err.response?.data.error ?? "Unable to upload settings." : "Unable to upload settings.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteSetting() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/reports/master-account-numbers/${deleting.id}`);
      if (utilityId === String(deleting.utilityId)) selectUtility("");
      await settings.refetch();
      setDeleting(null);
      setNotice("MasterAccount Number setting deleted.");
    } catch (err) {
      setError(isAxiosError<{ error?: string }>(err) ? err.response?.data.error ?? "Unable to delete settings." : "Unable to delete settings.");
    } finally {
      setSaving(false);
    }
  }

  const columns: GridColumn<MasterAccountNumberRow>[] = [
    { field: "utilityName", headerName: "Utility", minWidth: 240, flex: 1 },
    { field: "masterAccountNumber", headerName: "MasterAccountNumber", minWidth: 220 },
    { field: "accountNumber", headerName: "Account Number", minWidth: 180, valueFormatter: (value) => value ? "YES" : "NO" },
    { field: "serviceRefPodId", headerName: "Service Ref/POD ID", minWidth: 200, valueFormatter: (value) => value ? "YES" : "NO" },
    {
      field: "id", headerName: "Actions", width: 120, pinned: "right",
      renderCell: ({ row }) => <span className="grid-action-buttons">
        <Tooltip title="Update setting"><IconButton size="small" aria-label={`Update ${row.utilityName ?? "utility"} setting`} onClick={(event) => { event.stopPropagation(); selectUtility(String(row.utilityId)); }}><Pencil size={16} /></IconButton></Tooltip>
        <Tooltip title="Delete setting"><IconButton size="small" color="error" aria-label={`Delete ${row.utilityName ?? "utility"} setting`} onClick={(event) => { event.stopPropagation(); setError(""); setNotice(""); setDeleting(row); }}><Trash2 size={16} /></IconButton></Tooltip>
      </span>
    }
  ];

  const loading = utilities.isLoading || settings.isLoading;
  const loadError = utilities.isError || settings.isError;
  return (
    <section className="panel companies-panel utility-value-size-panel master-account-number-panel">
      <div className="panel-title-row">
        <h2>MasterAccount Number</h2>
        <Button variant="outlined" startIcon={<Upload size={17} />} disabled={loading || loadError} onClick={() => { setUploadError(""); setUploadOpen(true); }}>Upload spreadsheet</Button>
      </div>
      <p className="muted">Select a utility to add or update its Account Number and Service Ref/POD ID settings.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {loadError ? <p className="error" role="alert">Unable to load utilities or saved settings.</p> : null}
      {notice ? <p className="success-message" role="status">{notice}</p> : null}
      <div className="company-form-grid">
        <TextField select required label="Utility" value={utilityId} disabled={saving || loading || loadError} onChange={(event) => selectUtility(event.target.value)}>
          <MenuItem value="" disabled>Select utility</MenuItem>
          {(utilities.data?.data ?? []).map((utility) => <MenuItem key={utility.id} value={String(utility.id)}>{utility.name ?? `Utility ${utility.id}`}</MenuItem>)}
        </TextField>
        <TextField select required label="MasterAccountNumber" value={masterAccountNumber} disabled={saving} onChange={(event) => setMasterAccountNumber(event.target.value)}>
          <MenuItem value="Account Number">Account Number</MenuItem>
          <MenuItem value="Service Ref/POD ID">Service Ref/POD ID</MenuItem>
          <MenuItem value="BOTH">BOTH</MenuItem>
        </TextField>
        <TextField select label="Account Number" value={accountNumber} disabled={saving} onChange={(event) => setAccountNumber(event.target.value)}>
          <MenuItem value="YES">YES</MenuItem><MenuItem value="NO">NO</MenuItem>
        </TextField>
        <TextField select label="Service Ref/POD ID" value={serviceRefPodId} disabled={saving} onChange={(event) => setServiceRefPodId(event.target.value)}>
          <MenuItem value="YES">YES</MenuItem><MenuItem value="NO">NO</MenuItem>
        </TextField>
      </div>
      <div className="panel-title-row"><Button variant="contained" disabled={saving || !utilityId || loading || loadError} onClick={() => void save()}>{saving ? "Saving..." : settings.data?.data.some((row) => String(row.utilityId) === utilityId) ? "Update" : "Save"}</Button></div>
      {loading ? <p className="muted">Loading settings...</p> : null}
      <div className="master-account-number-grid">
        <IntiliGrid initialPageSize={50} columns={columns} rows={settings.data?.data ?? []} onRowClick={(row) => selectUtility(String(row.utilityId))} />
      </div>
      <Dialog open={uploadOpen} fullWidth maxWidth="sm" onClose={() => { if (!uploading) setUploadOpen(false); }}>
        <DialogTitle>Upload MasterAccount Number settings</DialogTitle>
        <DialogContent>
          <p>Download the required template, update the settings for the utilities you want to change, then upload the completed file.</p>
          {uploadError ? <p className="error" role="alert">{uploadError}</p> : null}
          <Button variant="outlined" startIcon={<Download size={17} />} disabled={uploading || loading} onClick={() => void downloadTemplate()}>Download template</Button>
          <div className="bulk-upload-controls">
            <input ref={uploadInput} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void selectUploadFile(file); }} />
            <Button variant="outlined" startIcon={<Upload size={17} />} disabled={uploading} onClick={() => uploadInput.current?.click()}>Choose completed spreadsheet</Button>
          </div>
          {uploadFileName ? <p className="muted">{uploadFileName}: {uploadRows.length} setting(s) ready to upload.</p> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={uploading} onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={uploading || !uploadRows.length} onClick={() => void uploadSpreadsheet()}>{uploading ? "Uploading..." : "Upload settings"}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleting)} onClose={() => { if (!saving) setDeleting(null); }}>
        <DialogTitle>Delete MasterAccount Number setting?</DialogTitle>
        <DialogContent>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <p>Delete the saved setting for <strong>{deleting?.utilityName ?? `Utility ${deleting?.utilityId ?? ""}`}</strong>? The utility and its meters will remain unchanged.</p>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={saving} onClick={() => void deleteSetting()}>{saving ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
