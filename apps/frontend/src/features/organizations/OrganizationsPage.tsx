import { MasterAccountNumberPanel, type MasterAccountNumberRow } from "./MasterAccountNumberPanel";
import { AccountReportPage } from "./AccountReportPage";
import { UploadColumnsPanel } from "./UploadColumnsPanel";
import { ExtractPdfDialog, hasParkedExtraction, type ExtractPdfReturnState } from "./ExtractPdfDialog";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Activity, ArrowRightLeft, BriefcaseBusiness, Building2, CircleDollarSign, Columns3, Factory, Map as MapIcon, MapPin, Package, Pencil, Plug, Plus, Signpost, StickyNote, Tags, Trash2, Upload, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import * as XLSX from "xlsx";
import { api } from "../../lib/api";
import { companyStatusColor } from "../../lib/companyStatusColor";

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
  { key: "company-statuses", label: "Company Status", endpoint: "company-statuses", tableName: "tbl_CompanyStatus", singularName: "Company Status", pluralName: "Company Status", icon: Building2 },
  { key: "meter-statuses", label: "Meter Status", endpoint: "meter-statuses", tableName: "tbl_Status", singularName: "Meter Status", pluralName: "Meter Status", icon: Activity },
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

const meterValueSections = [
  { key: "account-number-values", label: "Add Account Value", field: "account-number" },
  { key: "service-ref-values", label: "Add ServiceRef Value", field: "service-ref" }
] as const;

type LocationSection = typeof locationSections[number]["key"];
type MeterValueSection = typeof meterValueSections[number]["key"];
type OrganizationSection = "account-report" | "upload-columns" | "master-account-numbers" | "organizations" | "notes" | LocationSection | MeterValueSection | typeof legacySections[number]["key"];

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const accountReports = useMutation({
    mutationFn: async () => (await api.post("/reports/organizations/account-reports-folders")).data as {
      created: number; existing: number; skipped: number;
      failed: Array<{ id: number; companyName: string; error: string }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-documents"] })
  });
  const [extractPdfOpen, setExtractPdfOpen] = useState(false);
  // Set when the Meters page sends the user back after adding a meter from ExtractPDF.
  const [extractPdfResume, setExtractPdfResume] = useState<{ meterAdded: boolean } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const returnState = location.state as ExtractPdfReturnState | null;
  useEffect(() => {
    if (!returnState?.resumeExtractPdf) return;
    // Clear the navigation state so a refresh does not reopen the dialog.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    if (!hasParkedExtraction()) return;
    setExtractPdfResume({ meterAdded: Boolean(returnState.meterAdded) });
    setExtractPdfOpen(true);
  }, [returnState, location.pathname, location.search, navigate]);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const companyNotesId = searchParams.get("companyId");
  const validSections = [
    "account-report",
    "upload-columns",
    "master-account-numbers",
    "organizations",
    "notes",
    ...legacySections.map((item) => item.key),
    ...locationSections.map((item) => item.key),
    ...meterValueSections.map((item) => item.key)
  ] as string[];
  const initialSection = requestedSection && validSections.includes(requestedSection)
    ? requestedSection as OrganizationSection
    : "organizations";
  const [section, setSection] = useState<OrganizationSection>(initialSection);
  const [viewedOrganization, setViewedOrganization] = useState<OrganizationRow | null>(null);
  const selectedLegacySection = legacySections.find((item) => item.key === section);
  const selectedLocationSection = locationSections.find((item) => item.key === section);
  const selectedMeterValueSection = meterValueSections.find((item) => item.key === section);

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
        <button type="button" className={section === "account-report" ? "active" : ""} onClick={() => selectSection("account-report")}><CircleDollarSign size={18} /> Account Report</button>
        <button type="button" onClick={() => setExtractPdfOpen(true)}><Upload size={18} /> ExtractPDF</button>
        <button type="button" className={section === "upload-columns" ? "active" : ""} onClick={() => selectSection("upload-columns")}><Columns3 size={18} /> UploadsColumns</button>
        <button type="button" className={section === "organizations" ? "active" : ""} onClick={() => selectSection("organizations")}>
          <Building2 size={18} /> Organizations
        </button>
        {legacySections.filter((item) => item.key !== "rates").map((item) => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.key} className={section === item.key ? "active" : ""} onClick={() => selectSection(item.key)}>
              <Icon size={18} /> {item.label}
            </button>
          );
        })}
        {locationSections.filter((item) => item.key === "states").map((item) => {
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
              <Button variant="outlined" disabled={accountReports.isPending} onClick={() => accountReports.mutate()}>
                {accountReports.isPending ? "Adding Account Reports..." : "Add Account Reports Folders"}
              </Button>
              <span className="muted">{organizations.isLoading ? "Loading..." : `${organizations.data?.total ?? 0} total`}</span>
            </div>
            {organizations.isError ? <p className="error">Unable to load organization records.</p> : null}
            <p className="muted">Add an Account Reports folder to all existing companies with a linked SharePoint folder. Existing folders are kept.</p>
            {accountReports.isError ? <p className="error" role="alert">{apiError(accountReports.error) ?? "Unable to add Account Reports folders. Please try again."}</p> : null}
            {accountReports.data ? (
              <div role="status">
                <p>{accountReports.data.created} created, {accountReports.data.existing} already present, {accountReports.data.skipped} skipped (no SharePoint company folder), {accountReports.data.failed.length} failed.</p>
                {accountReports.data.failed.length ? <ul>{accountReports.data.failed.map((company) => <li key={company.id}>{company.companyName}: {company.error}</li>)}</ul> : null}
              </div>
            ) : null}
            <IntiliGrid checkboxSelection exportFileName="companies" columns={organizationColumns} rows={organizations.data?.data ?? []} onRowClick={setViewedOrganization} />
          </section>
        ) : section === "upload-columns" ? (
          <UploadColumnsPanel />
        ) : section === "account-report" ? (
          <AccountReportPage />
        ) : section === "master-account-numbers" ? (
          <MasterAccountNumberPanel />
        ) : section === "notes" ? (
          <OrganizationNotesPanel
            companyId={companyNotesId}
            onViewAll={() => setSearchParams({ section: "notes" })}
          />
        ) : selectedLocationSection ? (
          <LocationTablePanel key={selectedLocationSection.key} kind={selectedLocationSection.key} />
        ) : selectedMeterValueSection ? (
          <MeterValueSizePanel
            key={selectedMeterValueSection.key}
            field={selectedMeterValueSection.field}
          />
        ) : selectedLegacySection ? (
          <LegacyTablePanel
            key={selectedLegacySection.key}
            endpoint={selectedLegacySection.endpoint}
            tableName={selectedLegacySection.tableName}
            singularName={selectedLegacySection.singularName}
            pluralName={selectedLegacySection.pluralName}
          />
        ) : null}
      </div>

      <ExtractPdfDialog open={extractPdfOpen} resume={extractPdfResume} onClose={() => { setExtractPdfOpen(false); setExtractPdfResume(null); }} />
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

interface UtilityMeterValueSize {
  id: number;
  name: string | null;
  accountNumberSize: number | null;
  serviceRefSize: number | null;
}

function MeterValueSizePanel({ field }: { field: "account-number" | "service-ref" }) {
  const isAccountNumber = field === "account-number";
  const title = isAccountNumber ? "Add Account Value" : "Add ServiceRef Value";
  const valueLabel = isAccountNumber ? "Account Number Size" : "Service Ref/POD Size";
  const [utilityId, setUtilityId] = useState("");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const utilities = useQuery({
    queryKey: ["utility-meter-value-sizes"],
    queryFn: async () => (await api.get("/reports/utility-meter-value-sizes")).data as { data: UtilityMeterValueSize[] },
    retry: false
  });

  const selectedUtility = utilities.data?.data.find((utility) => String(utility.id) === utilityId);
  const gridColumns = useMemo<GridColumn<UtilityMeterValueSize>[]>(() => [
    { field: "name", headerName: "Utility", minWidth: 240, flex: 1, valueFormatter: (value) => String(value ?? "-") },
    {
      field: isAccountNumber ? "accountNumberSize" : "serviceRefSize",
      headerName: valueLabel,
      minWidth: 220,
      valueFormatter: (value) => Number(value) === 0 ? "NO" : value == null ? "-" : String(value)
    }
  ], [isAccountNumber, valueLabel]);

  function selectUtility(nextUtilityId: string) {
    setUtilityId(nextUtilityId);
    setError("");
    setNotice("");
    const utility = utilities.data?.data.find((item) => String(item.id) === nextUtilityId);
    const currentSize = isAccountNumber ? utility?.accountNumberSize : utility?.serviceRefSize;
    setSize(currentSize === null || currentSize === undefined ? "" : String(currentSize));
  }

  async function submit() {
    const numericSize = Number(size);
    if (!utilityId) {
      setError("Select a utility type.");
      return;
    }
    if (!Number.isInteger(numericSize) || numericSize < 0 || numericSize > 1000) {
      setError("Enter a whole-number size from 0 to 1,000. Zero means NO.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.put(`/reports/utility-meter-value-sizes/${field}`, {
        utilityId: Number(utilityId),
        size: numericSize
      });
      await utilities.refetch();
      setNotice(`${valueLabel} for ${selectedUtility?.name ?? "the selected utility"} was saved as ${numericSize === 0 ? "NO" : numericSize}.`);
    } catch (submitError) {
      setError(apiError(submitError) ?? `Unable to save the ${valueLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel companies-panel utility-value-size-panel">
      <div className="panel-title-row">
        <div>
          <h2>{title}</h2>
          <p className="muted">Set the exact number of numeric digits required for each utility in tbl_MeterList. Separators such as - and _ are not counted.</p>
        </div>
      </div>
      {notice ? <p className="success-message">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {utilities.isError ? <p className="error">Unable to load utility types.</p> : null}
      {selectedUtility ? (
        <p className="utility-value-current-setting">
          Current setting: <strong>{(() => {
            const currentValue = isAccountNumber ? selectedUtility.accountNumberSize : selectedUtility.serviceRefSize;
            return currentValue === 0 ? "NO" : currentValue ?? "Not set";
          })()}</strong>
        </p>
      ) : null}
      <div className="utility-value-size-form">
        <TextField
          select
          required
          label="Utility Type"
          value={utilityId}
          onChange={(event) => selectUtility(event.target.value)}
          disabled={saving || utilities.isLoading || utilities.isError}
          helperText={utilities.isLoading ? "Loading utilities..." : "Select the utility this rule applies to"}
        >
          <MenuItem value="">Select utility type</MenuItem>
          {(utilities.data?.data ?? []).map((utility) => (
            <MenuItem key={utility.id} value={String(utility.id)}>{utility.name ?? `Utility ${utility.id}`}</MenuItem>
          ))}
        </TextField>
        <TextField
          required
          type="number"
          label={valueLabel}
          value={size}
          onChange={(event) => {
            setSize(event.target.value);
            setError("");
            setNotice("");
          }}
          disabled={saving}
          helperText="Exact numeric digit count; enter 0 for NO"
          slotProps={{ htmlInput: { min: 0, max: 1000, step: 1 } }}
        />
        <Button variant="contained" onClick={() => void submit()} disabled={saving || !utilityId || !size}>
          {saving ? "Saving..." : "Submit"}
        </Button>
      </div>
      <div className="utility-value-size-grid">
        <IntiliGrid
          loading={utilities.isLoading}
          columns={gridColumns}
          rows={utilities.data?.data ?? []}
          onRowClick={(utility) => selectUtility(String(utility.id))}
        />
      </div>
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
  actions?: never;
  cities?: never;
  zipCodes?: never;
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
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [deleting, setDeleting] = useState<LocationRow | null>(null);
  const singularName = kind === "states" ? "State" : kind === "cities" ? "City" : "ZIP Code";
  const pluralName = kind === "states" ? "States" : kind === "cities" ? "Cities" : "ZIP Codes";
  const [formOpen, setFormOpen] = useState(false);
  const [stateCityFormOpen, setStateCityFormOpen] = useState(false);
  const [stateZipFormOpen, setStateZipFormOpen] = useState(false);
  const [stateCityEditing, setStateCityEditing] = useState<LocationRow | null>(null);
  const [stateZipEditing, setStateZipEditing] = useState<LocationRow | null>(null);
  const [relatedDeleting, setRelatedDeleting] = useState<{ kind: "city" | "zip"; row: LocationRow } | null>(null);
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
  const [selectedCityByState, setSelectedCityByState] = useState<Record<string, string>>({});
  const [selectedZipByCity, setSelectedZipByCity] = useState<Record<string, string>>({});

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
  const relatedCities = useQuery({
    queryKey: ["organization-locations", "state-related-cities"],
    queryFn: async () => (await api.get("/reports/location-cities", { params: { take: 2000 } })).data as LocationResponse,
    enabled: kind === "states",
    retry: false
  });
  const relatedZips = useQuery({
    queryKey: ["organization-locations", "state-related-zips"],
    queryFn: async () => (await api.get("/reports/location-zip-codes", { params: { take: 2000 } })).data as LocationResponse,
    enabled: kind === "states",
    retry: false
  });
  const citiesByState = useMemo(() => {
    const grouped = new Map<string, LocationRow[]>();
    (relatedCities.data?.data ?? []).forEach((city) => {
      const key = String(city.stateId ?? "");
      grouped.set(key, [...(grouped.get(key) ?? []), city]);
    });
    return grouped;
  }, [relatedCities.data]);
  const zipsByCity = useMemo(() => {
    const grouped = new Map<string, LocationRow[]>();
    (relatedZips.data?.data ?? []).forEach((zip) => {
      const key = String(zip.cityId ?? "");
      grouped.set(key, [...(grouped.get(key) ?? []), zip]);
    });
    return grouped;
  }, [relatedZips.data]);

  const columns = useMemo<GridColumn<LocationRow>[]>(() => {
    if (kind === "states") {
      return [
        { field: "name", headerName: "State", minWidth: 200, flex: 1 },
        { field: "code", headerName: "Code", width: 110 },
        { field: "capital", headerName: "Capital", minWidth: 200, flex: 1 },
        {
          field: "cities", headerName: "Cities", minWidth: 220, sortable: false,
          renderCell: ({ row }) => {
            const cities = citiesByState.get(String(row.id)) ?? [];
            const selectedCityId = selectedCityByState[String(row.id)] ?? "";
            return <TextField select size="small" value={selectedCityId} onChange={(event) => {
              if (event.target.value === "__add_city__") return;
              setSelectedCityByState((current) => ({ ...current, [String(row.id)]: event.target.value }));
            }} onClick={(event) => event.stopPropagation()} slotProps={{ select: { displayEmpty: true } }} sx={{ minWidth: 190 }}>
              <MenuItem value="" disabled>{relatedCities.isLoading ? "Loading cities..." : cities.length ? `${cities.length} ${cities.length === 1 ? "city" : "cities"}` : "No cities"}</MenuItem>
              {cities.map((city) => <MenuItem key={city.id} value={String(city.id)}>
                <span className="location-dropdown-item-label">{city.name}</span>
                <span className="location-dropdown-item-actions">
                  <IconButton size="small" aria-label={`Edit ${city.name}`} onClick={(event) => {
                    event.preventDefault(); event.stopPropagation();
                    setStateCityEditing(city);
                    setCityForm({ stateId: String(row.id), name: city.name ?? "", isCapital: Boolean(city.isCapital) });
                    setError(""); setNotice(""); setStateCityFormOpen(true);
                  }}><Pencil size={15} /></IconButton>
                  <IconButton size="small" color="error" aria-label={`Delete ${city.name}`} onClick={(event) => {
                    event.preventDefault(); event.stopPropagation(); setRelatedDeleting({ kind: "city", row: city });
                  }}><Trash2 size={15} /></IconButton>
                </span>
              </MenuItem>)}
              <MenuItem value="__add_city__" onClick={(event) => {
                event.stopPropagation();
                setCityForm({ stateId: String(row.id), name: "", isCapital: false });
                setStateCityEditing(null);
                setError("");
                setNotice("");
                setStateCityFormOpen(true);
              }}><Plus size={16} />&nbsp; Add New City</MenuItem>
            </TextField>;
          }
        },
        {
          field: "zipCodes", headerName: "ZIP Codes", minWidth: 220, sortable: false,
          renderCell: ({ row }) => {
            const selectedCityId = selectedCityByState[String(row.id)] ?? "";
            const zips = selectedCityId ? zipsByCity.get(selectedCityId) ?? [] : [];
            const selectedZipId = selectedCityId ? selectedZipByCity[selectedCityId] ?? "" : "";
            return <TextField select size="small" value={selectedZipId} onChange={(event) => {
              if (!selectedCityId || event.target.value === "__add_zip__") return;
              setSelectedZipByCity((current) => ({ ...current, [selectedCityId]: event.target.value }));
            }} onClick={(event) => event.stopPropagation()} slotProps={{ select: { displayEmpty: true } }} sx={{ minWidth: 190 }}>
              <MenuItem value="" disabled>{relatedZips.isLoading ? "Loading ZIP codes..." : !selectedCityId ? "Select a city first" : zips.length ? `${zips.length} ZIP code${zips.length === 1 ? "" : "s"}` : "No ZIP codes"}</MenuItem>
              {zips.map((zip) => <MenuItem key={zip.id} value={String(zip.id)}>
                <span className="location-dropdown-item-label">{zip.code}</span>
                <span className="location-dropdown-item-actions">
                  <IconButton size="small" aria-label={`Edit ZIP ${zip.code}`} onClick={(event) => {
                    event.preventDefault(); event.stopPropagation();
                    setStateZipEditing(zip);
                    setZipForm({ stateId: String(row.id), cityId: String(zip.cityId ?? selectedCityId), code: zip.code ?? "", isActive: Boolean(zip.isActive) });
                    setError(""); setNotice(""); setStateZipFormOpen(true);
                  }}><Pencil size={15} /></IconButton>
                  <IconButton size="small" color="error" aria-label={`Delete ZIP ${zip.code}`} onClick={(event) => {
                    event.preventDefault(); event.stopPropagation(); setRelatedDeleting({ kind: "zip", row: zip });
                  }}><Trash2 size={15} /></IconButton>
                </span>
              </MenuItem>)}
              <MenuItem value="__add_zip__" onClick={(event) => {
                event.stopPropagation();
                setZipForm({ stateId: String(row.id), cityId: selectedCityId, code: "", isActive: true });
                setStateZipEditing(null);
                setError("");
                setNotice("");
                setStateZipFormOpen(true);
              }}><Plus size={16} />&nbsp; Add New ZIP Code</MenuItem>
            </TextField>;
          }
        },
        {
          field: "actions", headerName: "Actions", width: 120, sortable: false,
          renderCell: ({ row }) => <div onClick={(event) => event.stopPropagation()}>
            <Tooltip title="Edit state"><IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => {
              setEditing(row);
              setStateForm({ name: row.name ?? "", code: row.code ?? "", capital: row.capital ?? "" });
              setError(""); setNotice(""); setFormOpen(true);
            }}><Pencil size={17} /></IconButton></Tooltip>
            <Tooltip title="Delete state"><IconButton size="small" color="error" aria-label={`Delete ${row.name}`} onClick={() => { setError(""); setNotice(""); setDeleting(row); }}><Trash2 size={17} /></IconButton></Tooltip>
          </div>
        }
      ];
    }
    if (kind === "cities") {
      return [
        { field: "name", headerName: "City", minWidth: 220, flex: 1 },
        { field: "stateName", headerName: "State", minWidth: 180 },
        { field: "state", headerName: "State Code", width: 130 },
        { field: "isCapital", headerName: "Capital City", width: 130, valueFormatter: (value) => value ? "Yes" : "No" },
        {
          field: "actions", headerName: "Actions", width: 120, sortable: false,
          renderCell: ({ row }) => (
            <div onClick={(event) => event.stopPropagation()}>
              <Tooltip title="Edit city"><IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => {
                setEditing(row);
                setCityForm({ stateId: String(row.stateId), name: row.name ?? "", isCapital: Boolean(row.isCapital) });
                setError("");
                setNotice("");
                setFormOpen(true);
              }}><Pencil size={17} /></IconButton></Tooltip>
              <Tooltip title="Delete city"><IconButton size="small" color="error" aria-label={`Delete ${row.name}`} onClick={() => { setError(""); setNotice(""); setDeleting(row); }}><Trash2 size={17} /></IconButton></Tooltip>
            </div>
          )
        }
      ];
    }
    return [
      { field: "code", headerName: "ZIP Code", minWidth: 160 },
      { field: "city", headerName: "City", minWidth: 220, flex: 1 },
      { field: "stateName", headerName: "State", minWidth: 180 },
      { field: "state", headerName: "State Code", width: 130 },
      { field: "isActive", headerName: "Active", width: 110, valueFormatter: (value) => value ? "Yes" : "No" }
    ];
  }, [citiesByState, kind, relatedCities.isLoading, relatedZips.isLoading, selectedCityByState, selectedZipByCity, zipsByCity]);

  function openCreate() {
    setEditing(null);
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
      if (editing && (kind === "states" || kind === "cities")) await api.put(`/reports/location-${kind}/${editing.id}`, payload);
      else await api.post(`/reports/location-${kind}`, payload);
      await records.refetch();
      if (kind === "states") await states.refetch();
      setFormOpen(false);
      setNotice(`${singularName} ${editing ? "updated" : "added"} successfully.`);
    } catch (saveError) {
      setError(apiError(saveError) ?? `Unable to save the ${singularName.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function saveStateCity() {
    if (!cityForm.stateId || !cityForm.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...cityForm, stateId: Number(cityForm.stateId) };
      if (stateCityEditing) await api.put(`/reports/location-cities/${stateCityEditing.id}`, payload);
      else await api.post("/reports/location-cities", payload);
      await relatedCities.refetch();
      if (!stateCityEditing) setSelectedCityByState((current) => ({ ...current, [cityForm.stateId]: "" }));
      setStateCityFormOpen(false);
      setStateCityEditing(null);
      setNotice(`City ${stateCityEditing ? "updated" : "added"} successfully.`);
    } catch (saveError) {
      setError(apiError(saveError) ?? "Unable to save the city.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStateZip() {
    if (!zipForm.cityId || !zipForm.code.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = { cityId: Number(zipForm.cityId), code: zipForm.code, isActive: zipForm.isActive };
      if (stateZipEditing) await api.put(`/reports/location-zip-codes/${stateZipEditing.id}`, payload);
      else await api.post("/reports/location-zip-codes", payload);
      await relatedZips.refetch();
      setStateZipFormOpen(false);
      setStateZipEditing(null);
      setNotice(`ZIP Code ${stateZipEditing ? "updated" : "added"} successfully.`);
    } catch (saveError) {
      setError(apiError(saveError) ?? "Unable to save the ZIP code.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelatedLocation() {
    if (!relatedDeleting || saving) return;
    setSaving(true);
    setError("");
    try {
      const isCity = relatedDeleting.kind === "city";
      await api.delete(`/reports/location-${isCity ? "cities" : "zip-codes"}/${relatedDeleting.row.id}`);
      if (isCity) {
        await Promise.all([relatedCities.refetch(), relatedZips.refetch()]);
        setSelectedCityByState((current) => Object.fromEntries(Object.entries(current).filter(([, cityId]) => cityId !== String(relatedDeleting.row.id))));
        setSelectedZipByCity((current) => Object.fromEntries(Object.entries(current).filter(([cityId]) => cityId !== String(relatedDeleting.row.id))));
      } else {
        await relatedZips.refetch();
        setSelectedZipByCity((current) => Object.fromEntries(Object.entries(current).filter(([, zipId]) => zipId !== String(relatedDeleting.row.id))));
      }
      setRelatedDeleting(null);
      setNotice(`${isCity ? "City" : "ZIP Code"} deleted successfully.`);
    } catch (deleteError) {
      setError(apiError(deleteError) ?? `Unable to delete the ${relatedDeleting.kind === "city" ? "city" : "ZIP code"}.`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation() {
    if (!deleting || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/reports/location-${kind}/${deleting.id}`);
      await records.refetch();
      if (kind === "states") {
        await Promise.all([relatedCities.refetch(), relatedZips.refetch()]);
      }
      setDeleting(null);
      setNotice(`${singularName} deleted successfully.`);
    } catch (deleteError) {
      setError(apiError(deleteError) ?? `Unable to delete the ${singularName.toLowerCase()}.`);
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
        <DialogTitle>{editing ? "Edit" : "Add New"} {singularName}</DialogTitle>
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

      <Dialog open={stateCityFormOpen} onClose={() => { if (!saving) { setStateCityFormOpen(false); setStateCityEditing(null); } }} fullWidth maxWidth="sm">
        <DialogTitle>{stateCityEditing ? "Edit City" : "Add New City"}</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            <TextField
              label="State"
              value={records.data?.data.find((state) => String(state.id) === cityForm.stateId)?.name ?? ""}
              disabled
            />
            <TextField required label="City" value={cityForm.name} onChange={(event) => setCityForm((current) => ({ ...current, name: event.target.value }))} />
            <FormControlLabel control={<Checkbox checked={cityForm.isCapital} onChange={(event) => setCityForm((current) => ({ ...current, isCapital: event.target.checked }))} />} label="Capital city" />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setStateCityFormOpen(false); setStateCityEditing(null); }} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveStateCity()} disabled={saving || !cityForm.name.trim()}>{saving ? "Saving..." : stateCityEditing ? "Update City" : "Save City"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stateZipFormOpen} onClose={() => { if (!saving) { setStateZipFormOpen(false); setStateZipEditing(null); } }} fullWidth maxWidth="sm">
        <DialogTitle>{stateZipEditing ? "Edit ZIP Code" : "Add New ZIP Code"}</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            <TextField
              label="State"
              value={records.data?.data.find((state) => String(state.id) === zipForm.stateId)?.name ?? ""}
              disabled
            />
            <TextField select required label="City" value={zipForm.cityId} onChange={(event) => setZipForm((current) => ({ ...current, cityId: event.target.value }))}>
              <MenuItem value="">Select city</MenuItem>
              {(citiesByState.get(zipForm.stateId) ?? []).map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
            </TextField>
            <TextField required label="ZIP Code" value={zipForm.code} onChange={(event) => setZipForm((current) => ({ ...current, code: event.target.value.slice(0, 10) }))} />
            <FormControlLabel control={<Checkbox checked={zipForm.isActive} onChange={(event) => setZipForm((current) => ({ ...current, isActive: event.target.checked }))} />} label="Active" />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setStateZipFormOpen(false); setStateZipEditing(null); }} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveStateZip()} disabled={saving || !zipForm.cityId || !zipForm.code.trim()}>{saving ? "Saving..." : stateZipEditing ? "Update ZIP Code" : "Save ZIP Code"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(relatedDeleting)} onClose={() => !saving && setRelatedDeleting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Delete {relatedDeleting?.kind === "city" ? "City" : "ZIP Code"}?</DialogTitle>
        <DialogContent>
          <p>Delete <strong>{relatedDeleting?.kind === "city" ? relatedDeleting.row.name : relatedDeleting?.row.code}</strong>{relatedDeleting?.kind === "city" ? " and all its related ZIP codes" : ""}? This action cannot be undone.</p>
          {error ? <p className="error">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelatedDeleting(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteRelatedLocation()} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Delete {singularName}?</DialogTitle>
        <DialogContent>
          <p>Delete {deleting?.name}{kind === "states" ? " and all its related cities and ZIP codes" : " and all its related ZIP codes"}? This action cannot be undone.</p>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={saving} onClick={() => void deleteLocation()}>{saving ? "Deleting..." : "Delete"}</Button>
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
  const queryClient = useQueryClient();

  async function refreshStatusQueries() {
    if (endpoint === "company-statuses") {
      await Promise.all(["company-status-lookups", "tbl-companies"].map(
        (key) => queryClient.invalidateQueries({ queryKey: [key] })
      ));
      return;
    }
    if (endpoint !== "meter-statuses") return;
    await Promise.all(["meter-lookups", "meters", "contract-meters", "viewed-contract-meters"].map(
      (key) => queryClient.invalidateQueries({ queryKey: [key] })
    ));
  }
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [deleting, setDeleting] = useState<RateRow | null>(null);
  const [form, setForm] = useState<RateForm>({});
  const [utilityRateFormOpen, setUtilityRateFormOpen] = useState(false);
  const [utilityRateForm, setUtilityRateForm] = useState<RateForm>({});
  const [utilityMasterAccountNumber, setUtilityMasterAccountNumber] = useState<MasterAccountNumberRow["masterAccountNumber"]>("Account Number");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [rateUploadOpen, setRateUploadOpen] = useState(false);
  const [rateUploadUtilityId, setRateUploadUtilityId] = useState("");
  const [rateUploadFile, setRateUploadFile] = useState<File | null>(null);
  const [rateUploadError, setRateUploadError] = useState("");
  const [ratePasteOpen, setRatePasteOpen] = useState(false);
  const [ratePasteUtilityId, setRatePasteUtilityId] = useState("");
  const [ratePasteValues, setRatePasteValues] = useState("");
  const [ratePasteError, setRatePasteError] = useState("");
  const [savingPastedRates, setSavingPastedRates] = useState(false);
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

  const utilityRates = useQuery({
    queryKey: ["organization-table", "rates", "utility-rate-options"],
    queryFn: async () => (await api.get("/reports/rates")).data as RatesResponse,
    enabled: endpoint === "utilities",
    retry: false
  });

  const editableColumns = records.data?.columns.filter((column) => column.editable) ?? [];
  const masterAccountSettings = useQuery({
    queryKey: ["master-account-numbers"],
    queryFn: async () => (await api.get("/reports/master-account-numbers")).data as { data: MasterAccountNumberRow[] },
    enabled: endpoint === "utilities",
    retry: false
  });
  const masterAccountsByUtility = useMemo(() => new Map(
    (masterAccountSettings.data?.data ?? []).map((setting) => [String(setting.utilityId), setting.masterAccountNumber])
  ), [masterAccountSettings.data]);
  const utilityColumn = endpoint === "rates"
    ? editableColumns.find((column) => column.name.toLowerCase() === "utilityid")
    : undefined;
  const rateValueColumn = endpoint === "rates"
    ? editableColumns.find((column) => column.name.toLowerCase() === "rate")
      ?? editableColumns.find((column) => column.name.toLowerCase() === "name")
      ?? editableColumns.find((column) => column.name !== utilityColumn?.name && ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType))
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
  const utilityRatesByUtility = useMemo(() => {
    const response = utilityRates.data;
    const ratesByUtility = new Map<string, Array<{ id: string; name: string }>>();
    if (!response) return ratesByUtility;
    const utilityIdColumn = response.columns.find((column) => column.name.toLowerCase() === "utilityid");
    const rateColumn = response.columns.find((column) => column.name.toLowerCase() === "rate")
      ?? response.columns.find((column) => column.name.toLowerCase() === "name")
      ?? response.columns.find((column) => column.name !== response.primaryKey && column.name !== utilityIdColumn?.name && ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType));
    if (!utilityIdColumn || !rateColumn) return ratesByUtility;
    response.data.forEach((rate, index) => {
      const utilityId = String(rate[utilityIdColumn.name] ?? "");
      const name = String(rate[rateColumn.name] ?? "").trim();
      if (!utilityId || !name) return;
      const rates = ratesByUtility.get(utilityId) ?? [];
      rates.push({ id: String(response.primaryKey ? rate[response.primaryKey] : index), name });
      ratesByUtility.set(utilityId, rates);
    });
    return ratesByUtility;
  }, [utilityRates.data]);
  const utilityRateEditableColumns = utilityRates.data?.columns.filter((column) => column.editable) ?? [];
  const utilityRateUtilityColumn = utilityRateEditableColumns.find((column) => column.name.toLowerCase() === "utilityid");
  const rows = useMemo(() => {
    const key = records.data?.primaryKey;
    return (records.data?.data ?? []).map((row, index) => ({
      ...row,
      ...(endpoint === "utilities" ? {
        masterAccountNumber: masterAccountsByUtility.get(String(key ? row[key] : "")) ?? null
      } : {}),
      id: (key ? row[key] : undefined) as string | number ?? `${endpoint}-${index}`
    }));
  }, [endpoint, records.data, masterAccountsByUtility]);

  const columns = useMemo<GridColumn<RateRow>[]>(() => {
    const dataColumns = (records.data?.columns ?? []).map((column): GridColumn<RateRow> => {
      const isUtility = endpoint === "rates" && column.name.toLowerCase() === "utilityid";
      const isUtilityMeterSize = endpoint === "utilities" && ["accountnumbersize", "servicerefsize"].includes(column.name.toLowerCase());
      return {
        field: column.name as keyof RateRow,
        renderCell: endpoint === "company-statuses" && column.name === "Status"
          ? ({ value }) => <span className="status-badge" style={companyStatusColor(String(value ?? ""))}>{String(value ?? "")}</span>
          : undefined,
        headerName: isUtility ? "Utility" : displayName(column.name),
        minWidth: isUtility ? 180 : rateColumnWidth(column),
        flex: ["varchar", "nvarchar", "text", "ntext"].includes(column.dataType) ? 1 : undefined,
        valueFormatter: (value) => isUtility
          ? utilityOptions.find((utility) => utility.id === String(value ?? ""))?.name ?? "-"
          : isUtilityMeterSize && Number(value) === 0
            ? "NO"
          : formatRateValue(value, column.dataType)
      };
    });
    if (endpoint === "utilities") {
      dataColumns.push({
        field: "utilityRates",
        headerName: "Rate",
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => {
          const rates = utilityRatesByUtility.get(String(row.id)) ?? [];
          return (
            <TextField
              select
              size="small"
              value=""
              onChange={() => undefined}
              onClick={(event) => event.stopPropagation()}
              slotProps={{ select: { displayEmpty: true } }}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="" disabled>{utilityRates.isLoading ? "Loading rates..." : rates.length ? `${rates.length} rate${rates.length === 1 ? "" : "s"}` : "No rates"}</MenuItem>
              {rates.map((rate) => <MenuItem key={rate.id} value={rate.id}>{rate.name}</MenuItem>)}
              <MenuItem value="__add_rate__" onClick={(event) => {
                event.stopPropagation();
                const rateForm = formFromColumns(utilityRateEditableColumns);
                if (utilityRateUtilityColumn) rateForm[utilityRateUtilityColumn.name] = String(row.id);
                setUtilityRateForm(rateForm);
                setError("");
                setNotice("");
                setUtilityRateFormOpen(true);
              }}>
                <Plus size={16} />&nbsp; Add New Rate
              </MenuItem>
            </TextField>
          );
        }
      });
      dataColumns.push({
        field: "masterAccountNumber",
        headerName: "MasterAccount Number",
        minWidth: 220,
        valueFormatter: (value) => String(value ?? "-")
      });
    }
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
  }, [endpoint, records.data, singularName, utilityOptions, utilityRateEditableColumns, utilityRateUtilityColumn, utilityRates.isLoading, utilityRatesByUtility]);

  function openCreate() {
    setEditing(null);
    setError("");
    setNotice("");
    setForm(formFromColumns(editableColumns));
    setUtilityMasterAccountNumber("Account Number");
    setFormOpen(true);
  }

  function openEdit(row: RateRow) {
    setEditing(row);
    setError("");
    setNotice("");
    setForm(formFromColumns(editableColumns, row));
    const primaryKey = records.data?.primaryKey;
    const setting = primaryKey
      ? masterAccountSettings.data?.data.find((item) => String(item.utilityId) === String(row[primaryKey]))
      : undefined;
    setUtilityMasterAccountNumber(setting?.masterAccountNumber ?? "Account Number");
    setFormOpen(true);
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const wasEditing = Boolean(editing && records.data?.primaryKey);
      let savedUtilityId: string | number | undefined;
      if (editing && records.data?.primaryKey) {
        await api.patch(`/reports/${endpoint}/${encodeURIComponent(String(editing[records.data.primaryKey]))}`, form);
        savedUtilityId = editing[records.data.primaryKey] as string | number | undefined;
      } else {
        const response = await api.post(`/reports/${endpoint}`, form);
        savedUtilityId = records.data?.primaryKey
          ? response.data?.data?.[records.data.primaryKey] as string | number | undefined
          : undefined;
      }
      if (endpoint === "utilities" && savedUtilityId != null) {
        const existingSetting = masterAccountSettings.data?.data.find((item) => String(item.utilityId) === String(savedUtilityId));
        // An empty or 0 size means the utility does not use that identifier,
        // so its flag in tblMasterAccountNumber is turned off (0).
        const sizeIsOff = (columnName: string) => {
          const key = Object.keys(form).find((name) => name.toLowerCase() === columnName);
          if (key === undefined) return false;
          const value = String(form[key] ?? "").trim();
          return value === "" || Number(value) === 0;
        };
        await api.put("/reports/master-account-numbers", {
          utilityId: Number(savedUtilityId),
          accountNumber: sizeIsOff("accountnumbersize") ? false : existingSetting?.accountNumber ?? true,
          serviceRefPodId: sizeIsOff("servicerefsize") ? false : existingSetting?.serviceRefPodId ?? true,
          masterAccountNumber: utilityMasterAccountNumber
        });
        await masterAccountSettings.refetch();
      }
      await records.refetch();
      setFormOpen(false);
      setNotice(`${singularName} ${wasEditing ? "updated" : "added"} successfully.`);
      await refreshStatusQueries();
    } catch (saveError) {
      setError(apiError(saveError) ?? `Unable to save the ${singularName.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function saveUtilityRate() {
    if (!utilityRateUtilityColumn) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/reports/rates", utilityRateForm);
      await utilityRates.refetch();
      setUtilityRateFormOpen(false);
      setNotice("Rate added successfully.");
    } catch (saveError) {
      setError(apiError(saveError) ?? "Unable to save the rate.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!deleting || !records.data?.primaryKey) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/reports/${endpoint}/${encodeURIComponent(String(deleting[records.data.primaryKey]))}`);
      setDeleting(null);
      await records.refetch();
      setNotice(`${singularName} deleted successfully.`);
      await refreshStatusQueries();
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

  function openRatePaste() {
    setRatePasteUtilityId("");
    setRatePasteValues("");
    setRatePasteError("");
    setRatePasteOpen(true);
  }

  async function savePastedRates() {
    if (!ratePasteUtilityId || !rateValueColumn || endpoint !== "rates") return;
    const values = ratePasteValues.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!values.length) {
      setRatePasteError("Paste at least one rate.");
      return;
    }
    if (values.length > 1000) {
      setRatePasteError("You can add a maximum of 1,000 rates at a time.");
      return;
    }

    setSavingPastedRates(true);
    setNotice("");
    setRatePasteError("");
    try {
      const rows = values.map((value) => ({ [rateValueColumn.name]: value }));
      const response = await api.post("/reports/rates/bulk", { rows, utilityId: Number(ratePasteUtilityId) }) as { data: { imported: number } };
      setNotice(`${response.data.imported} rate${response.data.imported === 1 ? "" : "s"} added successfully.`);
      await records.refetch();
      setRatePasteOpen(false);
      setRatePasteValues("");
    } catch (pasteError) {
      setRatePasteError(apiError(pasteError) ?? (pasteError instanceof Error ? pasteError.message : "Unable to add rates."));
    } finally {
      setSavingPastedRates(false);
    }
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
    setNotice("");
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
      setNotice(`${response.data.imported} rate${response.data.imported === 1 ? "" : "s"} imported successfully.`);
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
    && (!["meter-statuses", "company-statuses"].includes(endpoint) || Boolean(String(form.Status ?? "").trim()))
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
              <>
                <Button variant="outlined" startIcon={<Upload size={18} />} disabled={uploading || !records.data} onClick={openRateUpload}>
                  Upload Excel/CSV
                </Button>
                <Button variant="outlined" startIcon={<Plus size={18} />} disabled={!records.data || !rateValueColumn} onClick={openRatePaste}>
                  Add More Rates
                </Button>
              </>
            ) : null}
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate} disabled={!records.data}>Add New {singularName}</Button>
          </div>
        </div>
        {notice ? <p className="success-message">{notice}</p> : null}
        {endpoint === "rates" ? <p className="muted rate-upload-help">Use the first row for headers matching the Rate fields. Maximum 1,000 rows per upload.</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {records.isError ? <p className="error">{apiError(records.error) ?? `Unable to load ${tableName} records.`}</p> : null}
        {endpoint === "utilities" && masterAccountSettings.isError ? <p className="error">Unable to load MasterAccount Number settings.</p> : null}
        {endpoint === "utilities" && utilityRates.isError ? <p className="error">Unable to load utility rates.</p> : null}
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
            {endpoint === "utilities" && editableColumns.find((column) => column.name.toLowerCase() === "utility") ? (() => {
              const column = editableColumns.find((item) => item.name.toLowerCase() === "utility")!;
              return (
                <TextField
                  key={column.name}
                  label={displayName(column.name)}
                  required={!column.nullable && !column.hasDefault}
                  value={form[column.name] ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, [column.name]: event.target.value }))}
                />
              );
            })() : null}
            {endpoint === "utilities" ? (
              <TextField
                select
                required
                label="Master Account Number"
                value={utilityMasterAccountNumber}
                onChange={(event) => setUtilityMasterAccountNumber(event.target.value as MasterAccountNumberRow["masterAccountNumber"])}
              >
                <MenuItem value="Account Number">Account Number</MenuItem>
                <MenuItem value="Service Ref/POD ID">Service Ref/POD ID</MenuItem>
                <MenuItem value="BOTH">BOTH</MenuItem>
              </TextField>
            ) : null}
            {editableColumns.filter((column) => column.name !== utilityColumn?.name && !(endpoint === "utilities" && column.name.toLowerCase() === "utility")).map((column) => column.dataType === "bit" ? (
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

      <Dialog open={utilityRateFormOpen} onClose={() => !saving && setUtilityRateFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add New Rate</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            <TextField
              label="Utility"
              value={(rows.find((row) => String(row.id) === String(utilityRateUtilityColumn ? utilityRateForm[utilityRateUtilityColumn.name] : "")) as RateRow | undefined)?.["Utility"] ?? ""}
              disabled
            />
            {utilityRateEditableColumns.filter((column) => column.name !== utilityRateUtilityColumn?.name).map((column) => column.dataType === "bit" ? (
              <FormControlLabel
                key={column.name}
                control={<Checkbox checked={Boolean(utilityRateForm[column.name])} onChange={(event) => setUtilityRateForm((current) => ({ ...current, [column.name]: event.target.checked }))} />}
                label={displayName(column.name)}
              />
            ) : (
              <TextField
                key={column.name}
                label={displayName(column.name)}
                required={!column.nullable && !column.hasDefault}
                type={inputType(column.dataType)}
                value={utilityRateForm[column.name] ?? ""}
                onChange={(event) => setUtilityRateForm((current) => ({ ...current, [column.name]: event.target.value }))}
                slotProps={inputType(column.dataType) === "number" ? { htmlInput: { step: "any" } } : undefined}
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUtilityRateFormOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void saveUtilityRate()}
            disabled={saving || !utilityRateUtilityColumn || utilityRateEditableColumns.some((column) => !column.nullable && !column.hasDefault && utilityRateForm[column.name] === "")}
          >{saving ? "Saving..." : "Save Rate"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ratePasteOpen} onClose={() => !savingPastedRates && setRatePasteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add More Rates</DialogTitle>
        <DialogContent>
          <p className="muted">Select a utility, then paste one rate per line. Blank lines are ignored.</p>
          {ratePasteError ? <p className="error">{ratePasteError}</p> : null}
          <div className="company-form-grid">
            <TextField
              select
              required
              label="Utility"
              value={ratePasteUtilityId}
              onChange={(event) => {
                setRatePasteUtilityId(event.target.value);
                setRatePasteError("");
              }}
              disabled={savingPastedRates || utilities.isLoading || utilities.isError}
              helperText={utilities.isLoading ? "Loading utilities..." : utilities.isError ? "Unable to load utilities." : "Applied to every pasted rate"}
            >
              <MenuItem value="" disabled>Select utility</MenuItem>
              {utilityOptions.map((utility) => (
                <MenuItem key={utility.id} value={utility.id}>{utility.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              required
              multiline
              minRows={8}
              label="Rates"
              placeholder={"Rate 1\nRate 2\nRate 3"}
              value={ratePasteValues}
              onChange={(event) => {
                setRatePasteValues(event.target.value);
                setRatePasteError("");
              }}
              disabled={savingPastedRates}
              helperText={`${ratePasteValues.split(/\r?\n/).filter((value) => value.trim()).length} of 1,000 rates`}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatePasteOpen(false)} disabled={savingPastedRates}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void savePastedRates()}
            disabled={savingPastedRates || !ratePasteUtilityId || !ratePasteValues.trim() || !rateValueColumn}
          >
            {savingPastedRates ? "Adding..." : "Add Rates"}
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
        <DialogContent>{endpoint === "utilities"
          ? "This permanently deletes the utility and its state/product mappings and MasterAccount Number settings. Existing rates and meters will be kept with their utility assignment cleared."
          : `This permanently deletes the selected record from ${tableName}.`}</DialogContent>
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
