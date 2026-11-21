import { Alert, Autocomplete, Button, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

interface CompanyOption {
  id: number;
  companyName: string | null;
}

/** Same splitting rules as the server: one per line, or tab / comma separated; repeats removed. */
function parseColumnList(text: string) {
  const seen = new Set<string>();
  return text.split(/[\r\n\t,]+/).map((part) => part.replace(/\s+/g, " ").trim()).filter((name) => {
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function UploadColumnsPanel() {
  const queryClient = useQueryClient();
  const [company, setCompany] = useState<CompanyOption | null>(null);
  const [columnsText, setColumnsText] = useState("");
  const [notice, setNotice] = useState("");

  const companies = useQuery({
    queryKey: ["tbl-companies"],
    queryFn: async () => (await api.get("/reports/tbl-companies")).data as { total: number; data: CompanyOption[] }
  });
  const companyOptions = useMemo(
    () => [...(companies.data?.data ?? [])].sort((a, b) => (a.companyName ?? "").localeCompare(b.companyName ?? "")),
    [companies.data]
  );

  const saved = useQuery({
    queryKey: ["upload-columns", company?.id],
    queryFn: async () => (await api.get(`/upload-columns/${company!.id}`)).data as { columns: string[] },
    enabled: Boolean(company)
  });

  // Show the company's saved list so it can be reviewed or edited.
  useEffect(() => {
    if (saved.data) setColumnsText(saved.data.columns.join("\n"));
  }, [saved.data]);

  const submit = useMutation({
    mutationFn: async () => (await api.post("/upload-columns", { companyId: company!.id, columns: columnsText })).data as { saved: number },
    onSuccess: (data) => {
      setNotice(`Saved ${data.saved} column${data.saved === 1 ? "" : "s"} for ${company?.companyName ?? "the company"}.`);
      void queryClient.invalidateQueries({ queryKey: ["upload-columns", company?.id] });
    }
  });

  const parsed = parseColumnList(columnsText);

  return (
    <section className="panel companies-panel upload-columns-panel">
      <div className="panel-title-row">
        <h2>Upload Columns</h2>
      </div>
      <p className="muted">Select a company, then type or paste its column list: one per line, or tab / comma separated. Submitting replaces the company's saved list.</p>
      {companies.isError ? <p className="error">Unable to load companies.</p> : null}
      <Autocomplete
        options={companyOptions}
        value={company}
        loading={companies.isLoading}
        onChange={(_event, value) => { setCompany(value); setColumnsText(""); setNotice(""); submit.reset(); }}
        getOptionLabel={(option) => option.companyName ?? `Company ${option.id}`}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => <TextField {...params} label="Company" required />}
      />
      <TextField
        label="Column list"
        value={columnsText}
        onChange={(event) => { setColumnsText(event.target.value); setNotice(""); }}
        multiline
        minRows={10}
        maxRows={24}
        fullWidth
        disabled={!company || saved.isFetching}
        placeholder={"Document Title\nUtility Account Name\nAccount Number\n..."}
        helperText={company ? (saved.isFetching ? "Loading saved columns..." : `${parsed.length} column${parsed.length === 1 ? "" : "s"}`) : "Select a company first"}
      />
      {saved.isError ? <Alert severity="error">Unable to load the saved columns for this company.</Alert> : null}
      {submit.isError ? <Alert severity="error">{apiError(submit.error) ?? "Unable to save the columns. Please try again."}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <div className="upload-columns-actions">
        <Button variant="contained" disabled={!company || !parsed.length || submit.isPending || saved.isFetching} onClick={() => submit.mutate()}>
          {submit.isPending ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </section>
  );
}

function apiError(error: unknown) {
  return isAxiosError<{ error?: string }>(error) ? error.response?.data.error : undefined;
}
