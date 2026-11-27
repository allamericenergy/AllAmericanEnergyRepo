import { Alert, Autocomplete, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeftRight, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { loadAllMeters } from "../../lib/loadAllMeters";
import {
  billCheck, formatInvoiceValue, INVOICE_SECTIONS, INVOICE_TYPES, invoiceChangeFormat, invoiceNumber, invoicePercentFormat,
  invoiceStatementKey, invoiceTypeForProduct, normalizeInvoiceKey, type InvoiceType, type MeterInvoiceRow
} from "./invoiceFields";

const MAX_SELECTED = 6;

interface SearchResponse {
  table: string;
  type: InvoiceType;
  total: number;
  accounts: string[];
  data: Array<Record<string, unknown>>;
}

interface AccountOption {
  accountNumber: string;
  label: string;
}

const field = (row: MeterInvoiceRow, name: string) => {
  const key = Object.keys(row).find((column) => normalizeInvoiceKey(column) === name);
  return key ? row[key] : undefined;
};
const rowCheck = (row: MeterInvoiceRow) => billCheck(field(row, "totalnewcharges"), field(row, "balanceforward"), field(row, "totalinvoicecost"));

/** Invoice Compare: pick a type and account number, choose invoices, see them side by side. */
export function InvoiceComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = (INVOICE_TYPES as string[]).includes(searchParams.get("type") ?? "") ? (searchParams.get("type") as InvoiceType) : "Power";
  const account = searchParams.get("account") ?? "";
  const companyId = searchParams.get("companyId") ?? "";
  const companyName = searchParams.get("company") ?? "";
  const [accountText, setAccountText] = useState(account);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  useEffect(() => setAccountText(account), [account]);

  function updateParams(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }
  const commitAccount = (value: string) => {
    if (value.trim() !== account) updateParams({ account: value.trim() });
  };

  // Account suggestions: the company's meters (or every meter you can see), filtered to the chosen type.
  const meters = useQuery({
    queryKey: ["invoice-compare-meters", companyId],
    queryFn: ({ signal }) => loadAllMeters<{ accountNumber?: string | null; meter?: string | null; product?: string | null; companyName?: string | null }>(companyId ? { companyId } : {}, signal),
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const accountOptions = useMemo<AccountOption[]>(() => {
    const byAccount = new Map<string, AccountOption>();
    for (const meter of meters.data?.data ?? []) {
      const number = meter.accountNumber?.trim();
      if (!number || invoiceTypeForProduct(meter.product) !== type || byAccount.has(number)) continue;
      const company = meter.companyName?.replace(/^(?:[▾↳]\s*)?(?:(?:Parent|Child)\s*·\s*)?/, "");
      byAccount.set(number, { accountNumber: number, label: [number, meter.meter ? `Meter ${meter.meter}` : null, companyId ? null : company].filter(Boolean).join(" · ") });
    }
    return [...byAccount.values()].sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  }, [meters.data, type, companyId]);

  const invoices = useQuery({
    queryKey: ["invoice-compare", type, account, companyId],
    queryFn: async ({ signal }) => {
      const response = await api.get<SearchResponse>("/utility-invoices/search", {
        params: { type, accountNumber: account || undefined, companyId: companyId || undefined }, signal
      });
      return { ...response.data, data: response.data.data.map((row, index): MeterInvoiceRow => ({ ...row, id: String(row.InvoiceID ?? `row-${index}`) })) };
    },
    enabled: Boolean(account || companyId),
    retry: false
  });
  const rows = useMemo(() => [...(invoices.data?.data ?? [])].sort((a, b) => invoiceStatementKey(b).localeCompare(invoiceStatementKey(a))), [invoices.data]);

  // New results: preselect the latest two invoices.
  useEffect(() => { setSelectedIds(rows.slice(0, 2).map((row) => row.id)); }, [rows]);

  const toggle = (id: string) => setSelectedIds((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : current.length >= MAX_SELECTED ? current : [...current, id]);
  const latest = rows[0];
  const lastYear = latest ? (() => {
    const match = /^(\d{4})-(\d{2})/.exec(invoiceStatementKey(latest));
    if (!match) return null;
    const target = `${Number(match[1]) - 1}-${match[2]}`;
    return rows.find((row) => String(field(row, "accountnumber") ?? "") === String(field(latest, "accountnumber") ?? "") && invoiceStatementKey(row).startsWith(target)) ?? null;
  })() : null;

  // Oldest on the left so each column's change reads against the one before it.
  const selected = rows.filter((row) => selectedIds.includes(row.id)).sort((a, b) => invoiceStatementKey(a).localeCompare(invoiceStatementKey(b)));
  const mixedAccounts = new Set(selected.map((row) => String(field(row, "accountnumber") ?? ""))).size > 1;
  const errorMessage = invoices.isError
    ? (isAxiosError(invoices.error) && (invoices.error.response?.data as { error?: { message?: string } } | undefined)?.error?.message) || "Unable to load invoices."
    : null;

  const sections = useMemo(() => {
    if (selected.length < 2) return [];
    const keys = [...new Set(selected.flatMap((row) => Object.keys(row)))].filter((key) => key !== "id");
    const grouped = INVOICE_SECTIONS.map((section) => ({ title: section.title, keys: [] as string[] }));
    for (const key of keys) {
      const sample = selected.map((row) => row[key]).find((value) => value != null && value !== "");
      grouped[INVOICE_SECTIONS.findIndex((section) => section.match(normalizeInvoiceKey(key), sample))].keys.push(key);
    }
    return grouped.map((section) => ({
      title: section.title,
      rows: section.keys.map((key) => {
        const normalized = normalizeInvoiceKey(key);
        const cells = selected.map((row) => {
          const check = normalized === "billcheck" ? rowCheck(row) : null;
          return { text: check ? check.text : formatInvoiceValue(row[key]), number: check ? Number(check.text) : invoiceNumber(normalized, row[key]) };
        });
        const first = cells[0].number;
        const last = cells[cells.length - 1].number;
        const overall = first !== null && last !== null ? { delta: last - first, percent: first ? (last - first) / Math.abs(first) : null } : null;
        return { key, cells, overall, same: cells.every((cell) => cell.text === cells[0].text) };
      }).filter((row) => !differencesOnly || !row.same)
    })).filter((section) => section.rows.length);
  }, [selected, differencesOnly]);

  const changeText = (delta: number, percent: number | null) => delta === 0
    ? "No change"
    : <>{invoiceChangeFormat.format(delta)}{percent !== null ? <small> ({invoicePercentFormat.format(percent)})</small> : null}</>;

  return (
    <section className="page invoice-compare-page">
      <header className="invoice-compare-heading">
        <h1><ArrowLeftRight size={26} />Compare Invoices</h1>
        <p className="muted">{companyName ? `${companyName} · ` : ""}Choose an invoice type and account number, then pick the invoices to compare.</p>
      </header>

      <div className="invoice-compare-filters">
        <TextField select size="small" label="Invoice type" value={type} onChange={(event) => updateParams({ type: event.target.value })} sx={{ minWidth: 160 }}>
          {INVOICE_TYPES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
        <Autocomplete
          freeSolo
          size="small"
          options={accountOptions}
          getOptionLabel={(option) => (typeof option === "string" ? option : option.accountNumber)}
          renderOption={(props, option) => <li {...props} key={option.accountNumber}>{option.label}</li>}
          inputValue={accountText}
          onInputChange={(_, value, reason) => { setAccountText(value); if (reason === "clear") commitAccount(""); }}
          onChange={(_, value) => commitAccount(typeof value === "string" ? value : value?.accountNumber ?? "")}
          loading={meters.isLoading}
          sx={{ minWidth: 320 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Account number"
              placeholder={companyId ? "All accounts of this company" : "Type or pick an account number"}
              onKeyDown={(event) => { if (event.key === "Enter") commitAccount(accountText); }}
              onBlur={() => commitAccount(accountText)}
            />
          )}
        />
        {companyId ? (
          <Button size="small" onClick={() => updateParams({ companyId: "", company: "" })}>Search all companies</Button>
        ) : null}
        <span className="invoice-compare-count muted">
          {invoices.isFetching ? "Loading…" : invoices.data ? `${invoices.data.total} invoice${invoices.data.total === 1 ? "" : "s"} found` : ""}
        </span>
      </div>

      {!account && !companyId ? (
        <div className="contract-view-empty"><FileText size={28} aria-hidden="true" /><strong>Enter an account number</strong><p>Invoices of the chosen type for that account appear here.</p></div>
      ) : errorMessage ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void invoices.refetch()}>Retry</Button>}>{errorMessage}</Alert>
      ) : invoices.isLoading ? (
        <p className="muted" role="status">Loading invoices…</p>
      ) : !rows.length ? (
        <div className="contract-view-empty"><FileText size={28} aria-hidden="true" /><strong>No invoices</strong><p>No {type} invoices found{account ? ` for account ${account}` : " for this company"}.</p></div>
      ) : (
        <>
          <section className="account-card invoice-compare-picker">
            <div className="invoice-compare-picker-head">
              <h2>Select invoices <small>{selectedIds.length} of {MAX_SELECTED} max</small></h2>
              <div className="invoice-compare-presets">
                <Button size="small" onClick={() => setSelectedIds(rows.slice(0, 2).map((row) => row.id))}>Latest two</Button>
                <Button size="small" disabled={!lastYear} onClick={() => latest && lastYear && setSelectedIds([latest.id, lastYear.id])}>Latest vs same month last year</Button>
                <Button size="small" onClick={() => setSelectedIds(rows.slice(0, MAX_SELECTED).map((row) => row.id))}>Latest {MAX_SELECTED}</Button>
                <Button size="small" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Clear</Button>
              </div>
            </div>
            <div className="invoice-compare-picker-list">
              <table className="invoice-compare-table">
                <thead>
                  <tr><th scope="col" aria-label="Select" /><th scope="col">Statement Date</th><th scope="col">Account</th><th scope="col">Meter</th><th scope="col">Total Invoice Cost</th><th scope="col">Invoice</th></tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const checked = selectedIds.includes(row.id);
                    return (
                      <tr key={row.id} className={checked ? "picked" : undefined} onClick={() => toggle(row.id)}>
                        <td><Checkbox size="small" checked={checked} disabled={!checked && selectedIds.length >= MAX_SELECTED} slotProps={{ input: { "aria-label": `Select invoice ${row.id}` } }} onClick={(event) => event.stopPropagation()} onChange={() => toggle(row.id)} /></td>
                        <td>{formatInvoiceValue(field(row, "statementdate"))}</td>
                        <td>{formatInvoiceValue(field(row, "accountnumber"))}</td>
                        <td>{formatInvoiceValue(field(row, "meter"))}</td>
                        <td>{formatInvoiceValue(field(row, "totalinvoicecost"))}</td>
                        <td>#{String(field(row, "invoiceid") ?? row.id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selected.length < 2 ? (
            <p className="muted invoice-compare-hint">Select at least two invoices to compare.</p>
          ) : (
            <>
              <div className="invoice-compare-bar">
                <strong>Comparing {selected.length} invoices</strong>
                <span className="muted">Oldest on the left; each value shows its change from the column before.{mixedAccounts ? " Invoices come from more than one account." : ""}</span>
                <FormControlLabel
                  className="invoice-compare-toggle"
                  control={<Checkbox size="small" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />}
                  label="Differences only"
                />
              </div>
              <div className="invoice-compare-sections">
                {sections.map((section) => (
                  <section key={section.title} className="account-card invoice-compare-scroll">
                    <h2>{section.title}</h2>
                    <table className="invoice-compare-table invoice-compare-matrix">
                      <thead>
                        <tr>
                          <th scope="col">Field</th>
                          {selected.map((row) => (
                            <th scope="col" key={row.id}>
                              {formatInvoiceValue(field(row, "statementdate"))}
                              <small>{mixedAccounts ? `${formatInvoiceValue(field(row, "accountnumber"))} · ` : ""}#{String(field(row, "invoiceid") ?? row.id)}</small>
                            </th>
                          ))}
                          <th scope="col">Change<small>first → last</small></th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row) => (
                          <tr key={row.key} className={row.same ? "same" : "changed"}>
                            <th scope="row">{row.key.replace(/_/g, " ")}</th>
                            {row.cells.map((cell, index) => {
                              const previous = index > 0 ? row.cells[index - 1].number : null;
                              const delta = index > 0 && previous !== null && cell.number !== null ? cell.number - previous : null;
                              return (
                                <td key={selected[index].id}>
                                  {cell.text}
                                  {delta ? <small className={delta > 0 ? "up" : "down"}>{invoiceChangeFormat.format(delta)}</small> : null}
                                </td>
                              );
                            })}
                            <td className={row.overall?.delta ? (row.overall.delta > 0 ? "up" : "down") : undefined}>
                              {row.overall ? changeText(row.overall.delta, row.overall.percent) : row.same ? "—" : "Changed"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
                {!sections.length ? <p className="muted invoice-compare-hint">These invoices have the same value in every field.</p> : null}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
