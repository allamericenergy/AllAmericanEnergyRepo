import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Activity, ArrowRightLeft, BriefcaseBusiness, Building2, CircleDollarSign, Factory, Package, Pencil, Plug, Plus, StickyNote, Tags, Trash2, Upload, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import * as XLSX from "xlsx";
import { api } from "../../lib/api";

interface OrganizationRow {
  id: string;
  name: string;
  address?: string | null;
  billingInfo?: string | null;
  usersCount: number;
  companiesCount: number;
  contactsCount: number;
  dealsCount: number;
  tasksCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RateColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  identity: boolean;
  computed: boolean;
  hasDefault: boolean;
  primaryKey: boolean;
  editable: boolean;
}

type RateRow = Record<string, unknown> & { id: string | number };
type RateForm = Record<string, string | boolean>;

interface OrganizationNoteRow {
  id: string;
  content: string;
  relatedType: string;
  relatedId: string;
  relatedName: string;
  companyId?: number | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  updatedAt: string;
}

interface RatesResponse {
  total: number;
  primaryKey: string | null;
  columns: RateColumnMetadata[];
  data: Array<Record<string, unknown>>;
}

const organizationColumns: GridColumn<OrganizationRow>[] = [
  { field: "name", headerName: "Organization", minWidth: 220, flex: 1 },
  { field: "address", headerName: "Address", minWidth: 240 },
  { field: "usersCount", headerName: "Users", width: 110 },
  { field: "companiesCount", headerName: "Companies", width: 130 },
  { field: "contactsCount", headerName: "Contacts", width: 120 },
  { field: "dealsCount", headerName: "Deals", width: 110 },
  { field: "tasksCount", headerName: "Tasks", width: 110 }
];

const legacySections = [
  { key: "rates", label: "Rate", endpoint: "rates", tableName: "tbl_Rate", singularName: "Rate", pluralName: "Rates", icon: CircleDollarSign },
  { key: "brokers", label: "Broker", endpoint: "brokers", tableName: "tbl_Broker", singularName: "Broker", pluralName: "Brokers", icon: BriefcaseBusiness },
  { key: "suppliers", label: "Supplier", endpoint: "suppliers", tableName: "tbl_Supplier", singularName: "Supplier", pluralName: "Suppliers", icon: Factory },
  { key: "onsite-generations", label: "OnSiteGeneration", endpoint: "onsite-generations", tableName: "tbl_OnSiteGeneration", singularName: "OnSiteGeneration", pluralName: "OnSiteGeneration", icon: Zap },
  { key: "pass-throughs", label: "PassThrough", endpoint: "pass-throughs", tableName: "tbl_PassThrough", singularName: "PassThrough", pluralName: "PassThrough", icon: ArrowRightLeft },
  { key: "products", label: "Product", endpoint: "products", tableName: "tbl_Product", singularName: "Product", pluralName: "Products", icon: Package },
  { key: "utilities", label: "Utilities", endpoint: "utilities", tableName: "tbl_Utility", singularName: "Utility", pluralName: "Utilities", icon: Plug },
  { key: "swings", label: "Swing", endpoint: "swings", tableName: "tbl_Swing", singularName: "Swing", pluralName: "Swings", icon: Activity },
  { key: "types", label: "Type", endpoint: "types", tableName: "tbl_Type", singularName: "Type", pluralName: "Types", icon: Tags }
] as const;

type OrganizationSection = "organizations" | "notes" | typeof legacySections[number]["key"];

export function OrganizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const companyNotesId = searchParams.get("companyId");
  const [section, setSection] = useState<OrganizationSection>(requestedSection === "notes" ? "notes" : "organizations");
  const [viewedOrganization, setViewedOrganization] = useState<OrganizationRow | null>(null);
  const selectedLegacySection = legacySections.find((item) => item.key === section);

  useEffect(() => {
    if (requestedSection === "notes") setSection("notes");
  }, [requestedSection]);

  function selectSection(nextSection: OrganizationSection) {
    setSection(nextSection);
    setSearchParams(nextSection === "notes" ? { section: "notes" } : {});
  }

  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await api.get("/reports/organizations")).data as { total: number; data: OrganizationRow[] },
    retry: false,
    enabled: section === "organizations"
  });

  return (
    <section className="page organization-page">
      <aside className="organization-side-menu" aria-label="Organization sections">
        <h2>Organization</h2>
        <button type="button" className={section === "organizations" ? "active" : ""} onClick={() => selectSection("organizations")}>
          <Building2 size={18} /> Organizations
        </button>
        {legacySections.map((item) => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.key} className={section === item.key ? "active" : ""} onClick={() => selectSection(item.key)}>
              <Icon size={18} /> {item.label}
            </button>
          );
        })}
        <button type="button" className={section === "notes" ? "active" : ""} onClick={() => selectSection("notes")}>
          <StickyNote size={18} /> Notes
        </button>
      </aside>

      <div className="organization-page-content">
        {section === "organizations" ? (
          <section className="panel companies-panel">
            <div className="panel-title-row">
              <h2>Organizations</h2>
              <span className="muted">{organizations.isLoading ? "Loading..." : `${organizations.data?.total ?? 0} total`}</span>
            </div>
            {organizations.isError ? <p className="error">Unable to load organization records.</p> : null}
            <IntiliGrid checkboxSelection columns={organizationColumns} rows={organizations.data?.data ?? []} onRowClick={setViewedOrganization} />
          </section>
        ) : section === "notes" ? (
          <OrganizationNotesPanel
            companyId={companyNotesId}
            onViewAll={() => setSearchParams({ section: "notes" })}
          />
        ) : selectedLegacySection ? (
          <LegacyTablePanel
            endpoint={selectedLegacySection.endpoint}
            tableName={selectedLegacySection.tableName}
            singularName={selectedLegacySection.singularName}
            pluralName={selectedLegacySection.pluralName}
          />
        ) : null}
      </div>

      <Dialog open={Boolean(viewedOrganization)} onClose={() => setViewedOrganization(null)} fullWidth maxWidth="sm">
        <DialogTitle>Organization Details</DialogTitle>
        <DialogContent>
          {viewedOrganization ? (
            <dl className="company-detail-list">
              <dt>Name</dt><dd>{viewedOrganization.name}</dd>
              <dt>Address</dt><dd>{viewedOrganization.address ?? "-"}</dd>
              <dt>Billing Info</dt><dd>{viewedOrganization.billingInfo ?? "-"}</dd>
              <dt>Users</dt><dd>{viewedOrganization.usersCount}</dd>
              <dt>Companies</dt><dd>{viewedOrganization.companiesCount}</dd>
              <dt>Contacts</dt><dd>{viewedOrganization.contactsCount}</dd>
              <dt>Deals</dt><dd>{viewedOrganization.dealsCount}</dd>
              <dt>Tasks</dt><dd>{viewedOrganization.tasksCount}</dd>
            </dl>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewedOrganization(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

const noteColumns: GridColumn<OrganizationNoteRow>[] = [
  { field: "content", headerName: "Note", minWidth: 260, flex: 1, valueFormatter: (value) => plainText(String(value ?? "")) || "-" },
  { field: "relatedType", headerName: "Related Type", width: 140, valueFormatter: (value) => displayName(String(value ?? "")) },
  { field: "relatedName", headerName: "Related Record", minWidth: 180 },
  { field: "authorName", headerName: "Author", minWidth: 170 },
  { field: "organizationName", headerName: "Organization", minWidth: 180 },
  { field: "updatedAt", headerName: "Last Updated", width: 190, valueFormatter: (value) => formatDate(value) }
];

function OrganizationNotesPanel({ companyId, onViewAll }: { companyId: string | null; onViewAll: () => void }) {
  const [viewingNote, setViewingNote] = useState<OrganizationNoteRow | null>(null);
  const notes = useQuery({
    queryKey: ["organization-notes"],
    queryFn: async () => (await api.get("/reports/organization-notes")).data as { total: number; data: OrganizationNoteRow[] },
    retry: false
  });
  const companyNotes = useMemo(
    () => (notes.data?.data ?? []).filter((note) => (
      String(note.companyId ?? (note.relatedType === "company" ? note.relatedId : "")) === companyId
    )),
    [companyId, notes.data?.data]
  );
  const displayedNotes = companyId ? companyNotes : notes.data?.data ?? [];
  const notesTitle = companyId && companyNotes[0]?.relatedName
    ? `Notes — ${companyNotes[0].relatedName}`
    : "Notes";

  return (
    <>
      <section className="panel companies-panel">
        <div className="panel-title-row">
          <h2>{notesTitle}</h2>
          <div className="panel-title-actions">
            <span className="muted">{notes.isLoading ? "Loading..." : `${displayedNotes.length} total`}</span>
            {companyId ? <Button variant="outlined" onClick={onViewAll}>View All Notes</Button> : null}
          </div>
        </div>
        {notes.isError ? <p className="error">{apiError(notes.error) ?? "Unable to load organization notes."}</p> : null}
        {companyId ? (
          <div className="company-notes-page-list">
            {!notes.isLoading && !companyNotes.length ? <p className="muted">No notes found for this company.</p> : null}
            {companyNotes.map((note) => (
              <article className="company-full-note" key={note.id}>
                <div className="organization-note-content" dangerouslySetInnerHTML={{ __html: note.content }} />
                <small>
                  Updated {formatDate(note.updatedAt)} by {note.authorName}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <IntiliGrid columns={noteColumns} rows={displayedNotes} onRowClick={setViewingNote} />
        )}
      </section>

      <Dialog open={Boolean(viewingNote)} onClose={() => setViewingNote(null)} fullWidth maxWidth="sm">
        <DialogTitle>Note Details</DialogTitle>
        <DialogContent>
          {viewingNote ? (
            <>
              <div className="organization-note-content" dangerouslySetInnerHTML={{ __html: viewingNote.content }} />
              <dl className="company-detail-list organization-note-details">
                <dt>Related Type</dt><dd>{displayName(viewingNote.relatedType)}</dd>
                <dt>Related Record</dt><dd>{viewingNote.relatedName || viewingNote.relatedId}</dd>
                <dt>Related ID</dt><dd>{viewingNote.relatedId}</dd>
                <dt>Author</dt><dd>{viewingNote.authorName}</dd>
                <dt>Author Email</dt><dd>{viewingNote.authorEmail}</dd>
                <dt>Organization</dt><dd>{viewingNote.organizationName}</dd>
                <dt>Created</dt><dd>{formatDate(viewingNote.createdAt)}</dd>
                <dt>Last Updated</dt><dd>{formatDate(viewingNote.updatedAt)}</dd>
              </dl>
            </>
          ) : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewingNote(null)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
}

interface LegacyTablePanelProps {
  endpoint: string;
  tableName: string;
  singularName: string;
  pluralName: string;
}

function LegacyTablePanel({ endpoint, tableName, singularName, pluralName }: LegacyTablePanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [deleting, setDeleting] = useState<RateRow | null>(null);
  const [form, setForm] = useState<RateForm>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [error, setError] = useState("");

  const records = useQuery({
    queryKey: ["organization-table", endpoint],
    queryFn: async () => (await api.get(`/reports/${endpoint}`)).data as RatesResponse,
    retry: false
  });

  const editableColumns = records.data?.columns.filter((column) => column.editable) ?? [];
  const rows = useMemo(() => {
    const key = records.data?.primaryKey;
    return (records.data?.data ?? []).map((row, index) => ({
      ...row,
      id: (key ? row[key] : undefined) as string | number ?? `${endpoint}-${index}`
    }));
  }, [endpoint, records.data]);

  const columns = useMemo<GridColumn<RateRow>[]>(() => {
    const dataColumns = (records.data?.columns ?? []).map((column): GridColumn<RateRow> => ({
      field: column.name as keyof RateRow,
      headerName: displayName(column.name),
      minWidth: rateColumnWidth(column),
      flex: ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType) ? 1 : undefined,
      valueFormatter: (value) => formatRateValue(value, column.dataType)
    }));
    return [
      ...dataColumns,
      {
        field: "__actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        pinned: "right",
        renderCell: ({ row }) => (
          <div className="rate-row-actions" onClick={(event) => event.stopPropagation()}>
            <Tooltip title={`Edit ${singularName.toLowerCase()}`}>
              <IconButton size="small" aria-label={`Edit ${singularName.toLowerCase()}`} onClick={() => openEdit(row)}><Pencil size={17} /></IconButton>
            </Tooltip>
            <Tooltip title={`Delete ${singularName.toLowerCase()}`}>
              <IconButton size="small" color="error" aria-label={`Delete ${singularName.toLowerCase()}`} onClick={() => setDeleting(row)}><Trash2 size={17} /></IconButton>
            </Tooltip>
          </div>
        )
      }
    ];
  }, [records.data, singularName]);

  function openCreate() {
    setEditing(null);
    setError("");
    setForm(formFromColumns(editableColumns));
    setFormOpen(true);
  }

  function openEdit(row: RateRow) {
    setEditing(row);
    setError("");
    setForm(formFromColumns(editableColumns, row));
    setFormOpen(true);
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    try {
      if (editing && records.data?.primaryKey) {
        await api.patch(`/reports/${endpoint}/${encodeURIComponent(String(editing[records.data.primaryKey]))}`, form);
      } else {
        await api.post(`/reports/${endpoint}`, form);
      }
      await records.refetch();
      setFormOpen(false);
    } catch (saveError) {
      setError(apiError(saveError) ?? `Unable to save the ${singularName.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!deleting || !records.data?.primaryKey) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/reports/${endpoint}/${encodeURIComponent(String(deleting[records.data.primaryKey]))}`);
      setDeleting(null);
      await records.refetch();
    } catch (deleteError) {
      setError(apiError(deleteError) ?? `Unable to delete the ${singularName.toLowerCase()}.`);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  async function uploadRates(file: File | null) {
    if (!file || endpoint !== "rates") return;
    setUploading(true);
    setUploadNotice("");
    setError("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("The uploaded file does not contain a worksheet.");
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: true })
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
      if (!rows.length) throw new Error("The uploaded file does not contain any rate rows.");
      const response = await api.post("/reports/rates/bulk", { rows }) as { data: { imported: number } };
      setUploadNotice(`${response.data.imported} rate${response.data.imported === 1 ? "" : "s"} imported successfully.`);
      await records.refetch();
    } catch (uploadError) {
      setError(apiError(uploadError) ?? (uploadError instanceof Error ? uploadError.message : "Unable to import rates."));
    } finally {
      setUploading(false);
    }
  }

  const formValid = editableColumns.every((column) => column.nullable || column.hasDefault || form[column.name] !== "");

  return (
    <>
      <section className="panel companies-panel">
        <div className="panel-title-row">
          <div>
            <h2>{pluralName}</h2>
            <span className="muted">{records.isLoading ? "Loading..." : `${records.data?.total ?? 0} total`}</span>
          </div>
          <div className="panel-title-actions">
            {endpoint === "rates" ? (
              <Button variant="outlined" component="label" startIcon={<Upload size={18} />} disabled={uploading || !records.data}>
                {uploading ? "Uploading..." : "Upload Excel/CSV"}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => { void uploadRates(event.target.files?.[0] ?? null); event.target.value = ""; }}
                />
              </Button>
            ) : null}
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate} disabled={!records.data}>Add New {singularName}</Button>
          </div>
        </div>
        {uploadNotice ? <p className="success-message">{uploadNotice}</p> : null}
        {endpoint === "rates" ? <p className="muted rate-upload-help">Use the first row for headers matching the Rate fields. Maximum 1,000 rows per upload.</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {records.isError ? <p className="error">{apiError(records.error) ?? `Unable to load ${tableName} records.`}</p> : null}
        <IntiliGrid columns={columns} rows={rows} />
      </section>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `Edit ${singularName}` : `Add New ${singularName}`}</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            {editableColumns.map((column) => column.dataType === "bit" ? (
              <FormControlLabel
                key={column.name}
                control={<Checkbox checked={Boolean(form[column.name])} onChange={(event) => setForm((current) => ({ ...current, [column.name]: event.target.checked }))} />}
                label={displayName(column.name)}
              />
            ) : (
              <TextField
                key={column.name}
                label={displayName(column.name)}
                required={!column.nullable && !column.hasDefault}
                type={inputType(column.dataType)}
                value={form[column.name] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, [column.name]: event.target.value }))}
                slotProps={inputType(column.dataType) === "number" ? { htmlInput: { step: "any" } } : undefined}
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRecord()} disabled={saving || !formValid}>
            {saving ? "Saving..." : editing ? `Update ${singularName}` : `Save ${singularName}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {singularName}?</DialogTitle>
        <DialogContent>This permanently deletes the selected record from {tableName}.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteRecord()} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function formFromColumns(columns: RateColumnMetadata[], row?: RateRow): RateForm {
  return Object.fromEntries(columns.map((column) => {
    const value = row?.[column.name];
    if (column.dataType === "bit") return [column.name, Boolean(value)];
    if (value == null) return [column.name, ""];
    if (["date", "datetime", "datetime2", "smalldatetime", "datetimeoffset"].includes(column.dataType)) {
      const date = new Date(String(value));
      return [column.name, Number.isNaN(date.getTime()) ? "" : column.dataType === "date" ? date.toISOString().slice(0, 10) : date.toISOString().slice(0, 16)];
    }
    return [column.name, String(value)];
  }));
}

function displayName(name: string) {
  return name.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inputType(dataType: string) {
  if (["tinyint", "smallint", "int", "bigint", "decimal", "numeric", "float", "real", "money", "smallmoney"].includes(dataType)) return "number";
  if (dataType === "date") return "date";
  if (["datetime", "datetime2", "smalldatetime", "datetimeoffset"].includes(dataType)) return "datetime-local";
  return "text";
}

function rateColumnWidth(column: RateColumnMetadata) {
  if (["date", "datetime", "datetime2", "smalldatetime", "datetimeoffset"].includes(column.dataType)) return 180;
  if (column.dataType === "bit") return 100;
  return 140;
}

function formatRateValue(value: unknown, dataType: string) {
  if (value == null || value === "") return "-";
  if (dataType === "bit") return value ? "Yes" : "No";
  if (["date", "datetime", "datetime2", "smalldatetime", "datetimeoffset"].includes(dataType)) {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }
  return String(value);
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function apiError(error: unknown) {
  return isAxiosError<{ error?: string }>(error) ? error.response?.data.error : undefined;
}
