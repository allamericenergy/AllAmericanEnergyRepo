import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Activity, ArrowRightLeft, BriefcaseBusiness, Building2, CircleDollarSign, Factory, Map as MapIcon, MapPin, Package, Pencil, Plug, Plus, Signpost, StickyNote, Tags, Trash2, Upload, Zap } from "lucide-react";
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

const locationSections = [
  { key: "states", label: "States", icon: MapIcon },
  { key: "cities", label: "Cities", icon: MapPin },
  { key: "zip-codes", label: "ZIP Codes", icon: Signpost }
] as const;

type LocationSection = typeof locationSections[number]["key"];
type OrganizationSection = "organizations" | "notes" | LocationSection | typeof legacySections[number]["key"];

export function OrganizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const companyNotesId = searchParams.get("companyId");
  const validSections = [
    "organizations",
    "notes",
    ...legacySections.map((item) => item.key),
    ...locationSections.map((item) => item.key)
  ] as string[];
  const initialSection = requestedSection && validSections.includes(requestedSection)
    ? requestedSection as OrganizationSection
    : "organizations";
  const [section, setSection] = useState<OrganizationSection>(initialSection);
  const [viewedOrganization, setViewedOrganization] = useState<OrganizationRow | null>(null);
  const selectedLegacySection = legacySections.find((item) => item.key === section);
  const selectedLocationSection = locationSections.find((item) => item.key === section);

  useEffect(() => {
    if (requestedSection && validSections.includes(requestedSection)) setSection(requestedSection as OrganizationSection);
  }, [requestedSection]);

  function selectSection(nextSection: OrganizationSection) {
    setSection(nextSection);
    setSearchParams(nextSection === "organizations" ? {} : { section: nextSection });
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
        {locationSections.map((item) => {
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
        ) : selectedLocationSection ? (
          <LocationTablePanel kind={selectedLocationSection.key} />
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
  {
    field: "content",
    headerName: "Note",
    minWidth: 260,
    flex: 1,
    renderCell: ({ value }) => {
      const text = plainText(String(value ?? "")) || "-";
      return (
        <Tooltip title={text} arrow enterDelay={300}>
          <span className="notes-grid-cell-text">{text}</span>
        </Tooltip>
      );
    }
  },
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

interface LocationRow {
  id: string | number;
  name?: string;
  code?: string;
  capital?: string;
  stateId?: string | number;
  state?: string;
  stateName?: string;
  cityId?: string | number;
  city?: string;
  isCapital?: boolean;
  isActive?: boolean;
}

interface LocationResponse {
  total: number;
  data: LocationRow[];
}

function LocationTablePanel({ kind }: { kind: LocationSection }) {
  const singularName = kind === "states" ? "State" : kind === "cities" ? "City" : "ZIP Code";
  const pluralName = kind === "states" ? "States" : kind === "cities" ? "Cities" : "ZIP Codes";
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadRows, setUploadRows] = useState<Array<Record<string, unknown>>>([]);
  const [stateForm, setStateForm] = useState({ name: "", code: "", capital: "" });
  const [cityForm, setCityForm] = useState({ stateId: "", name: "", isCapital: false });
  const [zipForm, setZipForm] = useState({ stateId: "", cityId: "", code: "", isActive: true });

  const records = useQuery({
    queryKey: ["organization-locations", kind],
    queryFn: async () => (await api.get(`/reports/location-${kind}`)).data as LocationResponse,
    retry: false
  });
  const states = useQuery({
    queryKey: ["organization-locations", "state-options"],
    queryFn: async () => (await api.get("/reports/location-states")).data as LocationResponse,
    enabled: kind === "cities" || kind === "zip-codes",
    retry: false
  });
  const zipCities = useQuery({
    queryKey: ["organization-locations", "zip-city-options", zipForm.stateId],
    queryFn: async () => (await api.get("/reports/us-cities", { params: { state: zipForm.stateId } })).data as LocationResponse,
    enabled: kind === "zip-codes" && Boolean(zipForm.stateId),
    retry: false
  });

  const columns = useMemo<GridColumn<LocationRow>[]>(() => {
    if (kind === "states") {
      return [
        { field: "name", headerName: "State", minWidth: 200, flex: 1 },
        { field: "code", headerName: "Code", width: 110 },
        { field: "capital", headerName: "Capital", minWidth: 200, flex: 1 }
      ];
    }
    if (kind === "cities") {
      return [
        { field: "name", headerName: "City", minWidth: 220, flex: 1 },
        { field: "stateName", headerName: "State", minWidth: 180 },
        { field: "state", headerName: "State Code", width: 130 },
        { field: "isCapital", headerName: "Capital City", width: 130, valueFormatter: (value) => value ? "Yes" : "No" }
      ];
    }
    return [
      { field: "code", headerName: "ZIP Code", minWidth: 160 },
      { field: "city", headerName: "City", minWidth: 220, flex: 1 },
      { field: "stateName", headerName: "State", minWidth: 180 },
      { field: "state", headerName: "State Code", width: 130 },
      { field: "isActive", headerName: "Active", width: 110, valueFormatter: (value) => value ? "Yes" : "No" }
    ];
  }, [kind]);

  function openCreate() {
    setError("");
    setNotice("");
    setStateForm({ name: "", code: "", capital: "" });
    setCityForm({ stateId: "", name: "", isCapital: false });
    setZipForm({ stateId: "", cityId: "", code: "", isActive: true });
    setFormOpen(true);
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    try {
      const payload = kind === "states"
        ? stateForm
        : kind === "cities"
          ? { ...cityForm, stateId: Number(cityForm.stateId) }
          : { cityId: Number(zipForm.cityId), code: zipForm.code, isActive: zipForm.isActive };
      await api.post(`/reports/location-${kind}`, payload);
      await records.refetch();
      if (kind === "states") await states.refetch();
      setFormOpen(false);
      setNotice(`${singularName} added successfully.`);
    } catch (saveError) {
      setError(apiError(saveError) ?? `Unable to add the ${singularName.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  function openUpload() {
    setUploadRows([]);
    setUploadFileName("");
    setUploadError("");
    setNotice("");
    setUploadOpen(true);
  }

  async function selectUploadFile(file?: File) {
    setUploadRows([]);
    setUploadFileName(file?.name ?? "");
    setUploadError("");
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The file does not contain a worksheet.");
      const parsed = parseLocationUpload(kind, workbook.Sheets[sheetName]);
      if (!parsed.length) throw new Error("The file does not contain any location rows.");
      setUploadRows(parsed);
    } catch (parseError) {
      setUploadError(parseError instanceof Error ? parseError.message : "Unable to read the file.");
    }
  }

  async function uploadRecords() {
    if (!uploadRows.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const response = await api.post(`/reports/location-${kind}/bulk`, { rows: uploadRows });
      const result = response.data as { imported: number; existing: number; citiesCreated?: number };
      await records.refetch();
      setUploadOpen(false);
      setNotice(
        `Imported ${result.imported} ${result.imported === 1 ? singularName.toLowerCase() : pluralName.toLowerCase()}.`
        + (result.existing ? ` ${result.existing} existing row(s) skipped.` : "")
        + (result.citiesCreated ? ` ${result.citiesCreated} missing city record(s) also created.` : "")
      );
    } catch (uploadFailure) {
      setUploadError(apiError(uploadFailure) ?? "Unable to upload the location records.");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const headers = kind === "states"
      ? ["State Name", "State Code", "Capital"]
      : kind === "cities"
        ? ["State", "City", "Is Capital"]
        : ["State", "City", "ZIP", "Is Active"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, pluralName);
    XLSX.writeFile(workbook, `${kind}-upload-template.xlsx`);
  }

  const formValid = kind === "states"
    ? Boolean(stateForm.name.trim() && stateForm.code.trim().length === 2 && stateForm.capital.trim())
    : kind === "cities"
      ? Boolean(cityForm.stateId && cityForm.name.trim())
      : Boolean(zipForm.cityId && zipForm.code.trim());
  const uploadHelp = kind === "states"
    ? "Required columns: State Name, State Code, Capital."
    : kind === "cities"
      ? "Required columns: State, City. Optional: Is Capital. State may be a code or full name."
      : "Required columns: State, City, ZIP. Optional: Is Active. Missing cities are created automatically.";

  return (
    <>
      <section className="panel companies-panel">
        <div className="panel-title-row">
          <div>
            <h2>{pluralName}</h2>
            <span className="muted">{records.isLoading ? "Loading..." : `${records.data?.total ?? 0} total`}</span>
          </div>
          <div className="panel-title-actions">
            <Button variant="outlined" startIcon={<Upload size={18} />} onClick={openUpload}>Upload Excel/CSV</Button>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate}>Add New {singularName}</Button>
          </div>
        </div>
        {notice ? <p className="success-message">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {records.isError ? <p className="error">{apiError(records.error) ?? `Unable to load ${pluralName.toLowerCase()}.`}</p> : null}
        <IntiliGrid columns={columns} rows={records.data?.data ?? []} />
      </section>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New {singularName}</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            {kind === "states" ? (
              <>
                <TextField required label="State Name" value={stateForm.name} onChange={(event) => setStateForm((current) => ({ ...current, name: event.target.value }))} />
                <TextField required label="State Code" value={stateForm.code} onChange={(event) => setStateForm((current) => ({ ...current, code: event.target.value.toUpperCase().slice(0, 2) }))} />
                <TextField required label="Capital" value={stateForm.capital} onChange={(event) => setStateForm((current) => ({ ...current, capital: event.target.value }))} />
              </>
            ) : kind === "cities" ? (
              <>
                <TextField select required label="State" value={cityForm.stateId} onChange={(event) => setCityForm((current) => ({ ...current, stateId: event.target.value }))}>
                  <MenuItem value="">Select state</MenuItem>
                  {states.data?.data.map((state) => <MenuItem key={state.id} value={String(state.id)}>{state.name} ({state.code})</MenuItem>)}
                </TextField>
                <TextField required label="City" value={cityForm.name} onChange={(event) => setCityForm((current) => ({ ...current, name: event.target.value }))} />
                <FormControlLabel control={<Checkbox checked={cityForm.isCapital} onChange={(event) => setCityForm((current) => ({ ...current, isCapital: event.target.checked }))} />} label="Capital city" />
              </>
            ) : (
              <>
                <TextField select required label="State" value={zipForm.stateId} onChange={(event) => setZipForm((current) => ({ ...current, stateId: event.target.value, cityId: "" }))}>
                  <MenuItem value="">Select state</MenuItem>
                  {states.data?.data.map((state) => <MenuItem key={state.id} value={String(state.id)}>{state.name} ({state.code})</MenuItem>)}
                </TextField>
                <TextField select required label="City" value={zipForm.cityId} onChange={(event) => setZipForm((current) => ({ ...current, cityId: event.target.value }))}>
                  <MenuItem value="">Select city</MenuItem>
                  {zipCities.data?.data.map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
                </TextField>
                <TextField required label="ZIP Code" value={zipForm.code} onChange={(event) => setZipForm((current) => ({ ...current, code: event.target.value.slice(0, 10) }))} />
                <FormControlLabel control={<Checkbox checked={zipForm.isActive} onChange={(event) => setZipForm((current) => ({ ...current, isActive: event.target.checked }))} />} label="Active" />
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRecord()} disabled={saving || !formValid}>{saving ? "Saving..." : `Save ${singularName}`}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload {pluralName}</DialogTitle>
        <DialogContent>
          <p className="muted">{uploadHelp} Maximum {kind === "states" ? 500 : 1000} rows.</p>
          {uploadError ? <p className="error">{uploadError}</p> : null}
          <div className="bulk-upload-controls">
            <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={uploading}>
              Choose Excel/CSV File
              <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void selectUploadFile(event.target.files?.[0])} />
            </Button>
            <span>{uploadFileName || "No file selected"}</span>
          </div>
          {uploadRows.length ? <p className="muted">{uploadRows.length} row(s) ready to upload.</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={downloadTemplate} disabled={uploading}>Download Template</Button>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
          <Button variant="contained" onClick={() => void uploadRecords()} disabled={uploading || !uploadRows.length}>{uploading ? "Uploading..." : `Upload ${pluralName}`}</Button>
        </DialogActions>
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
  const [rateUploadOpen, setRateUploadOpen] = useState(false);
  const [rateUploadUtilityId, setRateUploadUtilityId] = useState("");
  const [rateUploadFile, setRateUploadFile] = useState<File | null>(null);
  const [rateUploadError, setRateUploadError] = useState("");
  const [error, setError] = useState("");

  const records = useQuery({
    queryKey: ["organization-table", endpoint],
    queryFn: async () => (await api.get(`/reports/${endpoint}`)).data as RatesResponse,
    retry: false
  });

  const utilities = useQuery({
    queryKey: ["organization-table", "utilities", "rate-options"],
    queryFn: async () => (await api.get("/reports/utilities")).data as RatesResponse,
    enabled: endpoint === "rates",
    retry: false
  });

  const editableColumns = records.data?.columns.filter((column) => column.editable) ?? [];
  const utilityColumn = endpoint === "rates"
    ? editableColumns.find((column) => column.name.toLowerCase() === "utilityid")
    : undefined;
  const utilityOptions = useMemo(() => {
    if (!utilities.data) return [];
    const primaryKey = utilities.data.primaryKey;
    const nameColumn = utilities.data.columns.find((column) => column.name.toLowerCase() === "utility")
      ?? utilities.data.columns.find((column) => column.name !== primaryKey && ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType));
    if (!primaryKey || !nameColumn) return [];
    return utilities.data.data.map((row) => ({
      id: String(row[primaryKey] ?? ""),
      name: String(row[nameColumn.name] ?? "")
    })).filter((option) => option.id && option.name);
  }, [utilities.data]);
  const rows = useMemo(() => {
    const key = records.data?.primaryKey;
    return (records.data?.data ?? []).map((row, index) => ({
      ...row,
      id: (key ? row[key] : undefined) as string | number ?? `${endpoint}-${index}`
    }));
  }, [endpoint, records.data]);

  const columns = useMemo<GridColumn<RateRow>[]>(() => {
    const dataColumns = (records.data?.columns ?? []).map((column): GridColumn<RateRow> => {
      const isUtility = endpoint === "rates" && column.name.toLowerCase() === "utilityid";
      return {
        field: column.name as keyof RateRow,
        headerName: isUtility ? "Utility" : displayName(column.name),
        minWidth: isUtility ? 180 : rateColumnWidth(column),
        flex: ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType) ? 1 : undefined,
        valueFormatter: (value) => isUtility
          ? utilityOptions.find((utility) => utility.id === String(value ?? ""))?.name ?? "-"
          : formatRateValue(value, column.dataType)
      };
    });
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
  }, [endpoint, records.data, singularName, utilityOptions]);

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

  function openRateUpload() {
    setRateUploadUtilityId("");
    setRateUploadFile(null);
    setRateUploadError("");
    setRateUploadOpen(true);
  }

  async function downloadRateTemplate() {
    const templateColumns = editableColumns.filter((column) => column.name !== utilityColumn?.name);
    if (!templateColumns.length) return;
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rates", { views: [{ state: "frozen", ySplit: 1 }] });
    worksheet.columns = templateColumns.map((column) => ({
      header: column.name,
      key: column.name,
      width: Math.max(16, Math.min(32, displayName(column.name).length + 6))
    }));
    worksheet.getRow(1).height = 24;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1683D8" } };
      cell.alignment = { vertical: "middle" };
    });
    worksheet.autoFilter = `A1:${excelColumnName(templateColumns.length)}1`;
    const instructions = workbook.addWorksheet("Instructions");
    instructions.getCell("A1").value = "Rate Upload Instructions";
    instructions.getCell("A1").font = { bold: true, size: 14 };
    instructions.getCell("A3").value = "1. Select the Utility in the upload dialog.";
    instructions.getCell("A4").value = "2. Enter one rate per row on the Rates sheet.";
    instructions.getCell("A5").value = "3. Do not rename or remove the column headers.";
    instructions.getCell("A6").value = "4. Save as XLSX, XLS, or CSV and upload the file.";
    instructions.getColumn("A").width = 70;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rate-upload-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadRates() {
    if (!rateUploadFile || !rateUploadUtilityId || endpoint !== "rates") return;
    setUploading(true);
    setUploadNotice("");
    setRateUploadError("");
    try {
      const workbook = XLSX.read(await rateUploadFile.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("The uploaded file does not contain a worksheet.");
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: true })
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
      if (!rows.length) throw new Error("The uploaded file does not contain any rate rows.");
      const response = await api.post("/reports/rates/bulk", { rows, utilityId: Number(rateUploadUtilityId) }) as { data: { imported: number } };
      setUploadNotice(`${response.data.imported} rate${response.data.imported === 1 ? "" : "s"} imported successfully.`);
      await records.refetch();
      setRateUploadOpen(false);
      setRateUploadFile(null);
    } catch (uploadError) {
      setRateUploadError(apiError(uploadError) ?? (uploadError instanceof Error ? uploadError.message : "Unable to import rates."));
    } finally {
      setUploading(false);
    }
  }

  const formValid = editableColumns.every((column) => column.nullable || column.hasDefault || form[column.name] !== "")
    && (endpoint !== "rates" || Boolean(utilityColumn && form[utilityColumn.name] !== "" && !utilities.isLoading && !utilities.isError));

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
              <Button variant="outlined" startIcon={<Upload size={18} />} disabled={uploading || !records.data} onClick={openRateUpload}>
                Upload Excel/CSV
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
            {endpoint === "rates" && utilityColumn ? (
              <TextField
                select
                label="Utility"
                required
                value={form[utilityColumn.name] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, [utilityColumn.name]: event.target.value }))}
                disabled={utilities.isLoading || utilities.isError}
                helperText={utilities.isLoading ? "Loading utilities..." : utilities.isError ? "Unable to load utilities." : "Required — rates belong to a utility"}
              >
                <MenuItem value="" disabled>Select utility</MenuItem>
                {utilityOptions.map((utility) => (
                  <MenuItem key={utility.id} value={utility.id}>{utility.name}</MenuItem>
                ))}
              </TextField>
            ) : null}
            {endpoint === "rates" && !utilityColumn ? <p className="error">Utility relationship is not configured for rates.</p> : null}
            {editableColumns.filter((column) => column.name !== utilityColumn?.name).map((column) => column.dataType === "bit" ? (
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

      <Dialog open={rateUploadOpen} onClose={() => !uploading && setRateUploadOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload Rates</DialogTitle>
        <DialogContent>
          <p className="muted">Select the utility that these rates belong to, then upload the completed Excel or CSV template.</p>
          {rateUploadError ? <p className="error">{rateUploadError}</p> : null}
          <div className="company-form-grid">
            <TextField
              select
              required
              label="Utility"
              value={rateUploadUtilityId}
              onChange={(event) => {
                setRateUploadUtilityId(event.target.value);
                setRateUploadFile(null);
                setRateUploadError("");
              }}
              disabled={uploading || utilities.isLoading || utilities.isError}
              helperText={utilities.isLoading ? "Loading utilities..." : utilities.isError ? "Unable to load utilities." : "Applied to every rate in the selected file"}
            >
              <MenuItem value="" disabled>Select utility</MenuItem>
              {utilityOptions.map((utility) => (
                <MenuItem key={utility.id} value={utility.id}>{utility.name}</MenuItem>
              ))}
            </TextField>
            <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={uploading || !rateUploadUtilityId}>
              Choose Excel/CSV File
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setRateUploadFile(event.target.files?.[0] ?? null);
                  setRateUploadError("");
                  event.target.value = "";
                }}
              />
            </Button>
            <span className="muted">{rateUploadFile?.name ?? "No file selected"}</span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void downloadRateTemplate()} disabled={uploading || !editableColumns.length}>Download Template</Button>
          <Button onClick={() => setRateUploadOpen(false)} disabled={uploading}>Cancel</Button>
          <Button variant="contained" onClick={() => void uploadRates()} disabled={uploading || !rateUploadUtilityId || !rateUploadFile}>
            {uploading ? "Uploading..." : "Upload Rates"}
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

function excelColumnName(columnCount: number) {
  let value = columnCount;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name || "A";
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

function parseLocationUpload(kind: LocationSection, worksheet: XLSX.WorkSheet) {
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: true })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
  const normalized = (row: Record<string, unknown>) => new Map(
    Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value])
  );
  const text = (row: Map<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const value = String(row.get(key) ?? "").trim();
      if (value) return value;
    }
    return "";
  };
  const boolean = (value: unknown, defaultValue: boolean) => {
    if (value === "" || value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    const normalizedValue = String(value).trim().toLowerCase();
    if (["true", "yes", "y", "1", "active"].includes(normalizedValue)) return true;
    if (["false", "no", "n", "0", "inactive"].includes(normalizedValue)) return false;
    throw new Error(`"${String(value)}" is not a valid Yes/No value.`);
  };

  return sourceRows.map((source, index) => {
    const row = normalized(source);
    const rowNumber = index + 2;
    if (kind === "states") {
      const name = text(row, "statename", "state");
      const code = text(row, "statecode", "code").toUpperCase();
      const capital = text(row, "capital");
      if (!name || code.length !== 2 || !capital) {
        throw new Error(`Row ${rowNumber}: State Name, a 2-character State Code, and Capital are required.`);
      }
      return { name, code, capital };
    }
    if (kind === "cities") {
      const state = text(row, "state", "statecode", "statename");
      const city = text(row, "city", "cityname");
      if (!state || !city) throw new Error(`Row ${rowNumber}: State and City are required.`);
      return { state, city, isCapital: boolean(row.get("iscapital"), false) };
    }
    const state = text(row, "state", "statecode", "statename");
    const city = text(row, "city", "cityname");
    const zip = text(row, "zip", "zipcode", "postalcode");
    if (!state || !city || !zip) throw new Error(`Row ${rowNumber}: State, City, and ZIP are required.`);
    return { state, city, zip, isActive: boolean(row.get("isactive"), true) };
  });
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
