import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Download } from "lucide-react";
import { api } from "../../lib/api";
import { buildUploadFiles, uploadFileCsv, uploadFileName, type UploadBill, type UploadCompany, type UploadFile } from "./uploadFile";

interface Match { meterFound: boolean; companies: UploadCompany[] }

/** Matches extracted bills to companies and creates each company's upload CSV from its UploadsColumns. */
export function CreateUploadsDialog({ bills, onClose }: { bills: UploadBill[]; onClose: () => void }) {
  const lookup = useQuery({
    queryKey: ["create-uploads", bills],
    queryFn: async () => (await api.post<{ data: Match[] }>("/upload-columns/lookup", {
      bills: bills.map(({ accountNumber, serviceRefPod }) => ({ accountNumber, serviceRefPod }))
    })).data.data,
    // Look up again on every click, so newly added meters and columns show.
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false
  });
  const serverError = isAxiosError(lookup.error) ? lookup.error.response?.data?.error : undefined;
  const matches = lookup.isFetching || lookup.isError ? undefined : lookup.data;
  const files = matches ? buildUploadFiles(bills, matches) : [];
  const included = files.reduce((count, file) => count + file.rows.length, 0);

  return <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="create-uploads-title">
    <DialogTitle id="create-uploads-title">CreateUploads</DialogTitle>
    <DialogContent>
      {lookup.isFetching ? <p role="status"><CircularProgress size={14} /> Checking account numbers…</p> : null}
      {lookup.isError ? <Alert severity="error">
        {typeof serverError === "string" ? serverError : "Unable to check the account numbers. Please try again."}
      </Alert> : null}
      {matches ? <>
        {included < bills.length ? <Alert severity="warning">
          {bills.length - included} of {bills.length} bill(s) cannot go in an upload file. The reason is shown under each bill below.
        </Alert> : null}
        {files.map((file) => <UploadFilePreview key={file.company.id} file={file} />)}
        {bills.map((bill, index) => <BillMatch key={bill.id} bill={bill} match={matches[index]} />)}
      </> : null}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>;
}

function downloadCsv(file: UploadFile) {
  const url = URL.createObjectURL(new Blob([uploadFileCsv(file)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = uploadFileName(file.company);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function UploadFilePreview({ file }: { file: UploadFile }) {
  const { company, rows, blankColumns, warnings } = file;
  const name = company.name || `Company ${company.id}`;
  return <section className="create-uploads-file" aria-label={`Upload file for ${name}`}>
    <div className="create-uploads-file-title">
      <h3>{name}: {rows.length} bill(s)</h3>
      <Button variant="contained" startIcon={<Download size={16} />} onClick={() => downloadCsv(file)}>Create Upload File (CSV)</Button>
    </div>
    {blankColumns.length ? <Alert severity="info">
      Blank in this file, fill in before uploading: <strong>{blankColumns.join(", ")}</strong>
    </Alert> : null}
    {warnings.length ? <Alert severity="warning">
      <ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
    </Alert> : null}
    <div className="create-uploads-preview" tabIndex={0} role="region" aria-label={`CSV preview for ${name}`}>
      <table>
        <thead><tr>{company.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.id} title={row.fileName}>
            {row.cells.map((value, index) => <td key={index}>{value}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

function BillMatch({ bill, match: { meterFound, companies } }: { bill: UploadBill; match: Match }) {
  const problem = !bill.accountNumber.trim() ? "No account number was extracted from this PDF."
    : !meterFound ? "This account number was not found in the meter list."
    : !companies.length ? "The meter for this account number has no active company."
    : companies.length > 1 ? "This account number belongs to more than one company, so it is not put in an upload file. All of them are shown."
    : null;

  return <section className="create-uploads-bill" aria-label={bill.fileName}>
    <h3>{bill.fileName}</h3>
    <p>Account Number: <strong>{bill.accountNumber || "Not found"}</strong></p>
    {problem ? <Alert severity="warning">{problem}</Alert> : null}
    {companies.map((company) => <div key={company.id}>
      <p>Company Name: <strong>{company.name || `Company ${company.id}`}</strong></p>
      {company.columns.length ? <>
        <p>UploadsColumns ({company.columns.length}):</p>
        <ol className="create-uploads-columns">
          {company.columns.map((column) => <li key={column}>{column}</li>)}
        </ol>
      </> : <Alert severity="info">No UploadsColumns are saved for this company. Add them under Organization → UploadsColumns.</Alert>}
    </div>)}
  </section>;
}
