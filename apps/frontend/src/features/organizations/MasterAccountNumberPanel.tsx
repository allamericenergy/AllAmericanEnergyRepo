import { Button, MenuItem, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { api } from "../../lib/api";

interface MasterAccountNumberRow {
  id: number;
  utilityId: number;
  utilityName: string | null;
  accountNumber: boolean;
  serviceRefPodId: boolean;
  masterAccountNumber: string;
}

const columns: GridColumn<MasterAccountNumberRow>[] = [
  { field: "utilityName", headerName: "Utility", minWidth: 240, flex: 1 },
  { field: "masterAccountNumber", headerName: "MasterAccountNumber", minWidth: 220 },
  { field: "accountNumber", headerName: "Account Number", minWidth: 180, valueFormatter: (value) => value ? "YES" : "NO" },
  { field: "serviceRefPodId", headerName: "Service Ref/POD ID", minWidth: 200, valueFormatter: (value) => value ? "YES" : "NO" }
];

export function MasterAccountNumberPanel() {
  const [utilityId, setUtilityId] = useState("");
  const [accountNumber, setAccountNumber] = useState("YES");
  const [serviceRefPodId, setServiceRefPodId] = useState("YES");
  const [masterAccountNumber, setMasterAccountNumber] = useState("Account Number");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  const loading = utilities.isLoading || settings.isLoading;
  const loadError = utilities.isError || settings.isError;
  return (
    <section className="panel companies-panel utility-value-size-panel master-account-number-panel">
      <div className="panel-title-row"><h2>MasterAccount Number</h2></div>
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
      <div className="panel-title-row"><Button variant="contained" disabled={saving || !utilityId || loading || loadError} onClick={() => void save()}>{saving ? "Saving..." : "Save"}</Button></div>
      {loading ? <p className="muted">Loading settings...</p> : null}
      <div className="master-account-number-grid">
        <IntiliGrid initialPageSize={50} columns={columns} rows={settings.data?.data ?? []} onRowClick={(row) => selectUtility(String(row.utilityId))} />
      </div>
    </section>
  );
}
