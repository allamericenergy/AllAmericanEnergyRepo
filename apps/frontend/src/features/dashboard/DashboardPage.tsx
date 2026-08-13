import { Alert, Badge, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, MenuItem, TextField, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Activity, Building2, Eye, FileText, Folder, FolderOpen, Pencil, Plus, Power, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { api } from "../../lib/api";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { useAuthStore } from "../auth/authStore";
import { MembersPanel } from "../members/MembersPage";

interface DashboardPageProps {
  view?: "reports" | "companies" | "contracts" | "meters";
}

export function DashboardPage({ view }: DashboardPageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isCompaniesView = view === "companies";
  const isContractsView = view === "contracts";
  const isMetersView = view === "meters";
  const isDashboardView = !view || view === "reports";
  const hasAdminDashboard = user?.role === "superadmin" || user?.role === "admin";
  const canManageMembers = hasAdminDashboard;
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyFormMode, setCompanyFormMode] = useState<"create" | "edit">("create");
  const [viewedCompany, setViewedCompany] = useState<TblCompanyRow | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<TblCompanyRow["id"] | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [activatingCompanyId, setActivatingCompanyId] = useState<TblCompanyRow["id"] | null>(null);
  const [companyError, setCompanyError] = useState("");
  const [newCompany, setNewCompany] = useState<NewCompanyForm>(emptyCompanyForm());
  const isCompanyFormValid = [
    newCompany.companyName,
    newCompany.legalEntityName,
    newCompany.phoneNumber,
    newCompany.mailingAddress,
    newCompany.city,
    newCompany.state,
    newCompany.postalCode
  ].every((value) => value.trim())
    && (!newCompany.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCompany.email.trim()));
  const [isBulkCompanyModalOpen, setIsBulkCompanyModalOpen] = useState(false);
  const [bulkCompanyRows, setBulkCompanyRows] = useState<NewCompanyForm[]>([]);
  const [bulkCompanyFileName, setBulkCompanyFileName] = useState("");
  const [bulkCompanyError, setBulkCompanyError] = useState("");
  const [bulkCompanyResult, setBulkCompanyResult] = useState<BulkCompanyResult | null>(null);
  const [isUploadingCompanies, setIsUploadingCompanies] = useState(false);
  const [duplicateCompanyNames, setDuplicateCompanyNames] = useState<string[]>([]);
  const [isDuplicateCompanyConfirmOpen, setIsDuplicateCompanyConfirmOpen] = useState(false);
  const [companyUploadNotice, setCompanyUploadNotice] = useState<{ message: string; severity: "success" | "warning" } | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<TblCompanyRow[]>([]);
  const [isUpdatingCompanyStatus, setIsUpdatingCompanyStatus] = useState(false);
  const [companyGridKey, setCompanyGridKey] = useState(0);

  useEffect(() => {
    if (!companyUploadNotice) return;
    const timeoutId = window.setTimeout(() => setCompanyUploadNotice(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [companyUploadNotice]);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractFormMode, setContractFormMode] = useState<"create" | "edit">("create");
  const [viewedContract, setViewedContract] = useState<ContractRow | null>(null);
  const [editingContractId, setEditingContractId] = useState<ContractRow["id"] | null>(null);
  const [savingContract, setSavingContract] = useState(false);
  const [isContractSubmitConfirmOpen, setIsContractSubmitConfirmOpen] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<ContractRow[]>([]);
  const [isUpdatingContractStatus, setIsUpdatingContractStatus] = useState(false);
  const [contractGridKey, setContractGridKey] = useState(0);
  const [togglingContractId, setTogglingContractId] = useState<ContractRow["id"] | null>(null);
  const [contractError, setContractError] = useState("");
  const [contractAvailabilityNotice, setContractAvailabilityNotice] = useState("");
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContractForm());
  const activityUnreadCounts = useQuery({
    queryKey: ["activity-unread-counts"],
    queryFn: async () => (await api.get("/reports/activity-unread-counts")).data as { total: number; byCompany: Record<string, number> },
    refetchInterval: 30000,
    retry: false
  });
  const contractCompanyId = viewedCompany?.id ? Number(viewedCompany.id) : contractForm.companyId;
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [meterFormMode, setMeterFormMode] = useState<"create" | "edit">("create");
  const [viewedMeter, setViewedMeter] = useState<MeterRow | null>(null);
  const [editingMeterId, setEditingMeterId] = useState<MeterRow["id"] | null>(null);
  const [savingMeter, setSavingMeter] = useState(false);
  const [togglingMeterId, setTogglingMeterId] = useState<MeterRow["id"] | null>(null);
  const [selectedMeters, setSelectedMeters] = useState<MeterRow[]>([]);
  const [isUpdatingMeterStatus, setIsUpdatingMeterStatus] = useState(false);
  const [meterGridKey, setMeterGridKey] = useState(0);
  const [meterError, setMeterError] = useState("");
  const [meterAvailabilityNotice, setMeterAvailabilityNotice] = useState("");
  const [meterForm, setMeterForm] = useState<MeterForm>(emptyMeterForm());
  const [isBulkMeterModalOpen, setIsBulkMeterModalOpen] = useState(false);
  const [bulkMeterRows, setBulkMeterRows] = useState<MeterForm[]>([]);
  const [bulkMeterFileName, setBulkMeterFileName] = useState("");
  const [bulkMeterError, setBulkMeterError] = useState("");
  const [bulkMeterResult, setBulkMeterResult] = useState<BulkMeterResult | null>(null);
  const [isUploadingMeters, setIsUploadingMeters] = useState(false);
  const [bulkMeterCompanyId, setBulkMeterCompanyId] = useState(0);

  useEffect(() => {
    if (!contractAvailabilityNotice) return;
    const timeoutId = window.setTimeout(() => setContractAvailabilityNotice(""), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [contractAvailabilityNotice]);
  const pipeline = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => (await api.get("/reports/pipeline")).data,
    retry: false
  });
  const companies = useQuery({
    queryKey: ["tbl-companies"],
    queryFn: async () => (await api.get("/reports/tbl-companies")).data as { total: number; data: TblCompanyRow[] },
    enabled: hasAdminDashboard || isCompaniesView || isContractsView || isMetersView,
    retry: false
  });
  const contracts = useQuery({
    queryKey: ["contracts", isContractsView ? "all" : viewedCompany?.id],
    queryFn: async () => (
      await api.get("/reports/contracts", {
        params: { companyId: isContractsView ? undefined : viewedCompany?.id }
      })
    ).data as { total: number; data: ContractRow[] },
    enabled: Boolean(viewedCompany) || isContractsView || (hasAdminDashboard && isDashboardView),
    retry: false
  });
  const contractLookups = useQuery({
    queryKey: ["contract-lookups"],
    queryFn: async () => (await api.get("/reports/contract-lookups")).data as {
      brokers: LookupOption[];
      suppliers: LookupOption[];
      swings: LookupOption[];
      passThroughs: LookupOption[];
      billTypes: LookupOption[];
      products: LookupOption[];
    },
    enabled: Boolean(viewedCompany) || isContractModalOpen,
    retry: false
  });
  const meters = useQuery({
    queryKey: ["meters", isMetersView ? "all" : viewedCompany?.id],
    queryFn: async () => (
      await api.get("/reports/meters", {
        params: { companyId: isMetersView ? undefined : viewedCompany?.id }
      })
    ).data as { total: number; data: MeterRow[] },
    enabled: Boolean(viewedCompany?.id) || isMetersView || (hasAdminDashboard && isDashboardView),
    retry: false
  });
  const members = useQuery({
    queryKey: ["members", "dashboard"],
    queryFn: async () => (await api.get("/reports/members")).data as { total: number },
    enabled: hasAdminDashboard && isDashboardView,
    retry: false
  });
  const meterLookups = useQuery({
    queryKey: ["meter-lookups"],
    queryFn: async () => (await api.get("/reports/meter-lookups")).data as MeterLookups,
    enabled: Boolean(viewedCompany) || isMetersView || isMeterModalOpen || isBulkMeterModalOpen,
    retry: false
  });
  const usStates = useQuery({
    queryKey: ["us-states"],
    queryFn: async () => (await api.get("/reports/us-states")).data as { data: USStateOption[] },
    retry: false
  });
  const meterZipMatches = useQuery({
    queryKey: ["meter-zip-details", meterForm.zip],
    queryFn: async () => (await api.get("/reports/zip-code-details", { params: { zip: meterForm.zip.trim() } })).data as { data: ZipDetailOption[] },
    enabled: Boolean(isMeterModalOpen && meterForm.zip.trim().length >= 2),
    retry: false
  });
  const normalizedMeterZip = meterForm.zip.trim();
  const exactMeterZipMatch = meterZipMatches.data?.data.find(
    (item) => String(item.code).trim() === normalizedMeterZip
  );
  const isMeterZipUnavailable = normalizedMeterZip.length >= 5
    && meterZipMatches.isSuccess
    && !exactMeterZipMatch;
  useEffect(() => {
    const normalizedZip = meterForm.zip.trim();
    const match = meterZipMatches.data?.data.find((item) => String(item.code).trim() === normalizedZip);
    if (!match) return;
    setMeterForm((current) => current.state === match.state && current.city === match.city
      ? current
      : { ...current, state: match.state, city: match.city });
  }, [meterForm.zip, meterZipMatches.data]);
  const contractMeters = useQuery({
    queryKey: ["contract-meters", contractCompanyId, contractForm.productId],
    queryFn: async () => (
      await api.get("/reports/meters", {
        params: {
          companyId: contractCompanyId || undefined,
          productId: contractForm.productId || undefined
        }
      })
    ).data as { total: number; data: MeterRow[] },
    enabled: Boolean(isContractModalOpen && contractCompanyId),
    retry: false
  });
  useEffect(() => {
    if (!isContractModalOpen || contractFormMode !== "create" || contractMeters.data?.data.length !== 1) return;
    const meterId = Number(contractMeters.data.data[0].id);
    setContractForm((current) => current.meterIds.length === 1 && current.meterIds[0] === meterId
      ? current
      : { ...current, meterIds: [meterId] });
  }, [contractFormMode, contractMeters.data, isContractModalOpen]);
  const companyDocuments = useQuery({
    queryKey: ["company-documents", viewedCompany?.id],
    queryFn: async () => (
      await api.get(`/reports/tbl-companies/${viewedCompany?.id}/documents`)
    ).data as CompanyDocumentsResponse,
    enabled: Boolean(viewedCompany?.id),
    retry: false
  });

  const companyColumns: GridColumn<TblCompanyRow>[] = [

    {
      field: "isActive",
      headerName: "Status",
      width: 120,
      renderCell: (params) => {
        const isActive = Boolean(params.value);

        return (
          <span className={`status-badge ${isActive ? "active" : "inactive"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    /* { field: "isActive", headerName: "Status", width: 120, valueFormatter: (value: unknown) => value ? "Active" : "Inactive" }, */
    { field: "customerId", headerName: "Customer ID", width: 140 },
    { field: "companyName", headerName: "Company", minWidth: 220, flex: 1 },
    { field: "legalEntityName", headerName: "Legal Entity", minWidth: 220 },
    { field: "email", headerName: "Email", minWidth: 220 },
    { field: "phoneNumber", headerName: "Phone", width: 150 },
    { field: "mailingAddress", headerName: "Address", minWidth: 240 },
    { field: "city", headerName: "City", width: 140 },
    { field: "state", headerName: "State", width: 120 },
    {
      field: "id",
      headerName: "Actions",
      width: 190,
      pinned: "right",
      renderCell: ({ row }) => (
        <span className="grid-action-buttons">
          <Tooltip title="View company">
            <IconButton size="small" aria-label="View company" onClick={(event) => { event.stopPropagation(); viewCompany(row); }}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit company">
            <IconButton size="small" aria-label="Edit company" onClick={(event) => { event.stopPropagation(); editCompany(row); }}>
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Company activity">
            <IconButton size="small" aria-label="Company activity" onClick={(event) => { event.stopPropagation(); navigate(`/companies/${row.id}/activities`); }}>
              <Badge className="company-activity-count" badgeContent={activityUnreadCounts.data?.byCompany[String(row.id)] ?? 0} color="error" max={99}>
                <Activity size={16} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? "Already active" : "Activate company"}>
            <span>
              <IconButton
                size="small"
                aria-label="Activate company"
                disabled={Boolean(row.isActive) || activatingCompanyId === row.id}
                onClick={(event) => { event.stopPropagation(); void activateCompany(row); }}
              >
                <Power size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      )
    },
  ];
  const contractColumns: GridColumn<ContractRow>[] = [

    { field: "contractId", headerName: "Contract ID", width: 140 },
    { field: "companyName", headerName: "Company", minWidth: 220, flex: 1 },
    { field: "broker", headerName: "Broker", minWidth: 180 },
    { field: "supplier", headerName: "Supplier", minWidth: 180 },
    { field: "swing", headerName: "Swing", minWidth: 140 },
    { field: "passThrough", headerName: "Pass Through", minWidth: 150 },
    { field: "billType", headerName: "Bill Type", minWidth: 140 },
    { field: "startDate", headerName: "Start Date", width: 140, valueFormatter: formatDate },
    { field: "endDate", headerName: "End Date", width: 140, valueFormatter: formatDate },
    {
      field: "isActive",
      headerName: "Status",
      width: 120,
      renderCell: ({ value }) => {
        const isActive = Boolean(value);
        return <span className={`status-badge ${isActive ? "active" : "inactive"}`}>{isActive ? "Active" : "Inactive"}</span>;
      }
    },
    {
      field: "id",
      headerName: "Actions",
      width: 150,
      pinned: "right",
      renderCell: ({ row }) => (
        <span className="grid-action-buttons">
          <Tooltip title="View contract">
            <IconButton size="small" aria-label="View contract" onClick={(event) => { event.stopPropagation(); setViewedContract(row); }}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit contract">
            <IconButton size="small" aria-label="Edit contract" onClick={(event) => { event.stopPropagation(); editContract(row); }}>
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? "Set inactive" : "Set active"}>
            <span>
              <IconButton
                size="small"
                aria-label={row.isActive ? "Set contract inactive" : "Set contract active"}
                disabled={togglingContractId === row.id}
                onClick={(event) => { event.stopPropagation(); void toggleContractActive(row); }}
              >
                <Power size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      )
    }
  ];
  const meterColumns: GridColumn<MeterRow>[] = [

    { field: "companyName", headerName: "Company", minWidth: 220, flex: 1 },
    { field: "accountNumber", headerName: "Account Number", minWidth: 170 },
    { field: "serviceRefPod", headerName: "Service Ref/POD", minWidth: 170 },
    { field: "nameKey", headerName: "Name Key", minWidth: 140 },
    { field: "meter", headerName: "Meter", minWidth: 140 },
    { field: "serviceAddress", headerName: "Service Address", minWidth: 220 },
    { field: "city", headerName: "City", minWidth: 130 },
    { field: "state", headerName: "State", width: 110 },
    { field: "zip", headerName: "Zip", width: 110 },
    { field: "taxExempt", headerName: "Tax Exempt", minWidth: 140, valueFormatter: (value) => lookupName(value, meterLookups.data?.taxExempts) },
    { field: "cycleReadDay", headerName: "Cycle/Read Day", minWidth: 150 },
    { field: "rate", headerName: "Rate", minWidth: 120, valueFormatter: (value) => lookupName(value, meterLookups.data?.rates) },
    { field: "demand", headerName: "Demand", minWidth: 120 },
    { field: "annualUsage", headerName: "Ann. Usage-Dth/kWh", minWidth: 190 },
    {
      field: "loadProfile",
      headerName: "Load Profile",
      minWidth: 150,
      renderCell: ({ row, value }) => String(row.demand ?? "").trim() ? String(value ?? "") : ""
    },
    { field: "iEnergyBill", headerName: "iEnergyBill", minWidth: 130, valueFormatter: (value) => lookupName(value, meterLookups.data?.iEnergyBills) },
    { field: "energyDashboard", headerName: "EnergyDashboard", minWidth: 170, valueFormatter: (value) => lookupName(value, meterLookups.data?.energyDashboards) },
    { field: "onSiteGeneration", headerName: "OnSiteGeneration", minWidth: 180, valueFormatter: (value) => lookupName(value, meterLookups.data?.onSiteGenerations) },
    { field: "status", headerName: "Status", minWidth: 140 },
    { field: "type", headerName: "Type", minWidth: 140 },
    { field: "product", headerName: "Product", minWidth: 140 },
    { field: "utility", headerName: "Utility", minWidth: 170 },
    {
      field: "isActive",
      headerName: "IsActive",
      width: 120,
      renderCell: ({ value }) => {
        const isActive = Boolean(value);
        return <span className={`status-badge ${isActive ? "active" : "inactive"}`}>{isActive ? "Active" : "Inactive"}</span>;
      }
    },
    {
      field: "id",
      headerName: "Actions",
      width: 150,
      pinned: "right",
      renderCell: ({ row }) => (
        <span className="grid-action-buttons">
          <Tooltip title="View meter">
            <IconButton size="small" aria-label="View meter" onClick={(event) => { event.stopPropagation(); setViewedMeter(row); }}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit meter">
            <IconButton size="small" aria-label="Edit meter" onClick={(event) => { event.stopPropagation(); editMeter(row); }}>
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? "Set inactive" : "Set active"}>
            <span>
              <IconButton
                size="small"
                aria-label={row.isActive ? "Set meter inactive" : "Set meter active"}
                disabled={togglingMeterId === row.id}
                onClick={(event) => { event.stopPropagation(); void toggleMeterActive(row); }}
              >
                <Power size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      )
    },

  ];

  function updateNewCompany<K extends keyof NewCompanyForm>(field: K, value: NewCompanyForm[K]) {
    setNewCompany((current) => ({ ...current, [field]: value }));
  }

  function updateContractForm<K extends keyof ContractForm>(field: K, value: ContractForm[K]) {
    setContractForm((current) => ({ ...current, [field]: value }));
  }

  function updateContractCurrency(field: "rate" | "fee", value: string) {
    if (/^\d*(?:\.\d*)?$/.test(value)) updateContractForm(field, value);
  }

  function updateContractCompany(value: number) {
    setContractForm((current) => ({ ...current, companyId: value, meterIds: [] }));
  }

  function updateContractProduct(value: number) {
    setContractForm((current) => ({ ...current, productId: value, meterIds: [] }));
  }

  function toggleContractMeter(meterId: number, checked: boolean) {
    setContractForm((current) => ({
      ...current,
      meterIds: checked
        ? Array.from(new Set([...current.meterIds, meterId]))
        : current.meterIds.filter((id) => id !== meterId)
    }));
  }

  function updateContractFile(file: File | null) {
    if (!file) {
      setContractForm((current) => ({ ...current, contractFile: null, cFile: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const contentBase64 = result.includes(",") ? result.split(",")[1] : result;
      setContractForm((current) => ({
        ...current,
        cFile: file.name,
        contractFile: {
          name: file.name,
          contentType: file.type || "application/octet-stream",
          contentBase64
        }
      }));
    };
    reader.readAsDataURL(file);
  }

  function updateMeterForm<K extends keyof MeterForm>(field: K, value: MeterForm[K]) {
    setMeterForm((current) => ({ ...current, [field]: value }));
  }

  function updateMeterZip(value: string) {
    setMeterForm((current) => ({ ...current, zip: value, state: "", city: "" }));
  }

  function updateMeterProduct(value: number) {
    setMeterForm((current) => ({ ...current, productId: value }));
  }

  function updateMeterUtility(value: number) {
    setMeterForm((current) => ({
      ...current,
      utilityId: value,
      rate: current.utilityId === value ? current.rate : 0
    }));
  }

  function openCreateCompany() {
    setCompanyError("");
    setCompanyFormMode("create");
    setEditingCompanyId(null);
    setNewCompany(emptyCompanyForm());
    setIsCompanyModalOpen(true);
  }

  function viewCompany(company: TblCompanyRow) {
    setViewedCompany(company);
  }

  function editCompany(company: TblCompanyRow) {
    setCompanyError("");
    setCompanyFormMode("edit");
    setEditingCompanyId(company.id);
    setNewCompany(companyToForm(company));
    setIsCompanyModalOpen(true);
  }

  async function activateCompany(company: TblCompanyRow) {
    setCompanyError("");
    setActivatingCompanyId(company.id);
    try {
      await api.patch(`/reports/tbl-companies/${company.id}`, { isActive: true });
      await companies.refetch();
      setViewedCompany((current) => current?.id === company.id ? { ...current, isActive: true } : current);
    } catch (error) {
      const serverMessage = companyApiError(error);
      setCompanyError(serverMessage ?? "Unable to activate company. Try again.");
    } finally {
      setActivatingCompanyId(null);
    }
  }

  async function openCreateContract() {
    setContractAvailabilityNotice("");
    setContractError("");
    const companyResult = companies.data ?? (await companies.refetch()).data;
    const companyCount = companyResult?.total ?? companyResult?.data.length;
    if (companyCount === 0) {
      setContractAvailabilityNotice("A contract cannot be assigned without a company. Add a company before creating a contract.");
      return;
    }
    if (viewedCompany && !viewedCompany.isActive) {
      setContractError("Make company active to add contracts.");
      return;
    }
    if (viewedCompany?.id) {
      try {
        const response = await api.get("/reports/meters", { params: { companyId: viewedCompany.id } });
        const availableMeters = response.data as { total: number; data: MeterRow[] };
        if (!availableMeters.data.length) {
          setContractError("");
          setContractAvailabilityNotice("Please add meters first before adding a contract.");
          return;
        }
      } catch (error) {
        setContractError(companyApiError(error) ?? "Unable to check available meters. Try again.");
        return;
      }
    }
    setContractError("");
    setContractFormMode("create");
    setEditingContractId(null);
    setContractForm({ ...emptyContractForm(), companyId: Number(viewedCompany?.id ?? 0) });
    setIsContractModalOpen(true);
  }

  function editContract(contract: ContractRow) {
    setContractError("");
    setContractFormMode("edit");
    setEditingContractId(contract.id);
    setContractForm(contractToForm(contract));
    setIsContractModalOpen(true);
  }

  async function toggleContractActive(contract: ContractRow) {
    setContractError("");
    setTogglingContractId(contract.id);
    try {
      await api.patch(`/reports/contracts/${contract.id}`, { isActive: !contract.isActive });
      await contracts.refetch();
    } catch (error) {
      const serverMessage = companyApiError(error);
      setContractError(serverMessage ?? "Unable to update contract status. Try again.");
    } finally {
      setTogglingContractId(null);
    }
  }

  const contractMonths = calculateContractMonths(contractForm.startDate, contractForm.endDate);
  const meterLoadProfile = calculateMeterLoadProfile(meterForm.demand, meterForm.annualUsage);
  const bulkMeterCompany = viewedCompany ?? companies.data?.data.find((company) => Number(company.id) === bulkMeterCompanyId);
  const contractNotesText = contractForm.notes.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim();
  const requiredContractFieldsValid = Boolean(
    contractForm.brokerId
    && contractForm.supplierId
    && contractForm.swingId
    && contractForm.passThroughId
    && contractForm.billTypeId
    && contractForm.rate
    && contractForm.fee
    && contractForm.startDate
    && contractForm.endDate
    && contractMonths !== null
    && contractForm.cFile
    && contractNotesText
  );
  const isContractFormValid = requiredContractFieldsValid && (contractFormMode === "edit" || Boolean(
    (viewedCompany?.id || contractForm.companyId)
    && contractForm.productId
    && contractForm.meterIds.length
  ));
  const selectedContractMeterNumbers = (contractMeters.data?.data ?? [])
    .filter((meter) => contractForm.meterIds.includes(Number(meter.id)))
    .map((meter) => meter.meter || meter.accountNumber || `Meter ${meter.id}`);
  const displayedContractFileName = shortenFileName(contractForm.cFile);

  function requestContractSubmit() {
    if (contractFormMode === "create") {
      setIsContractSubmitConfirmOpen(true);
      return;
    }
    void saveContract();
  }

  async function saveContract() {
    setContractError("");
    if (!viewedCompany && !contractForm.companyId) {
      setContractError("Company is required.");
      return;
    }
    if (!isContractFormValid) {
      setContractError("Complete all required contract fields, select at least one meter, and ensure the end date is not before the start date.");
      return;
    }

    setSavingContract(true);
    try {
      const payload = {
        companyId: viewedCompany?.id ? Number(viewedCompany.id) : contractForm.companyId || undefined,
        brokerId: contractForm.brokerId || undefined,
        supplierId: contractForm.supplierId || undefined,
        swingId: contractForm.swingId || undefined,
        passThroughId: contractForm.passThroughId || undefined,
        billTypeId: contractForm.billTypeId || undefined,
        productId: contractFormMode === "create" ? contractForm.productId || undefined : undefined,
        meterIds: contractFormMode === "create" ? contractForm.meterIds : undefined,
        rate: contractForm.rate.trim(),
        fee: contractForm.fee.trim(),
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        cFile: contractForm.cFile.trim(),
        contractFile: contractForm.contractFile ?? undefined,
        notes: contractForm.notes,
        isActive: contractForm.isActive
      };

      if (contractFormMode === "edit" && editingContractId !== null) {
        await api.patch(`/reports/contracts/${editingContractId}`, payload);
      } else {
        await api.post("/reports/contracts", payload);
      }

      await contracts.refetch();
      setIsContractModalOpen(false);
      setIsContractSubmitConfirmOpen(false);
      setEditingContractId(null);
      setContractFormMode("create");
      setContractForm(emptyContractForm());
    } catch (error) {
      const serverMessage = companyApiError(error);
      setContractError(serverMessage ?? "Unable to save contract. Check required fields and try again.");
    } finally {
      setSavingContract(false);
    }
  }

  async function companyIsAvailableForMeter() {
    const companyResult = companies.data ?? (await companies.refetch()).data;
    if (!companyResult) {
      setMeterError("Unable to check available companies. Try again.");
      return false;
    }
    const companyCount = companyResult.total ?? companyResult.data.length;
    if (companyCount === 0) {
      setMeterAvailabilityNotice("A meter cannot be assigned without a company. Add a company before creating or uploading meters.");
      return false;
    }
    return true;
  }

  async function openCreateMeter() {
    setMeterAvailabilityNotice("");
    setMeterError("");
    if (!await companyIsAvailableForMeter()) return;
    if (viewedCompany && !viewedCompany.isActive) {
      setMeterError("Make company active to add meters.");
      return;
    }
    setMeterError("");
    setMeterFormMode("create");
    setEditingMeterId(null);
    setMeterForm(emptyMeterForm());
    setIsMeterModalOpen(true);
  }

  async function openBulkMeterUpload() {
    setMeterAvailabilityNotice("");
    setMeterError("");
    if (!await companyIsAvailableForMeter()) return;
    if (viewedCompany && !viewedCompany.isActive) {
      setMeterError("Make company active to add meters.");
      return;
    }
    setBulkMeterError("");
    setBulkMeterResult(null);
    setBulkMeterRows([]);
    setBulkMeterFileName("");
    setBulkMeterCompanyId(viewedCompany?.id ? Number(viewedCompany.id) : 0);
    setIsBulkMeterModalOpen(true);
  }

  function updateBulkMeterCompany(companyId: number) {
    setBulkMeterCompanyId(companyId);
    setBulkMeterError("");
    setBulkMeterResult(null);
    setBulkMeterRows([]);
    setBulkMeterFileName("");
  }

  function closeMeterModal() {
    setIsMeterModalOpen(false);
    setEditingMeterId(null);
    setMeterFormMode("create");
    setMeterForm(emptyMeterForm());
  }

  function editMeter(meter: MeterRow) {
    setMeterError("");
    setMeterFormMode("edit");
    setEditingMeterId(meter.id);
    setMeterForm(meterToForm(meter));
    setIsMeterModalOpen(true);
  }

  async function toggleMeterActive(meter: MeterRow) {
    setMeterError("");
    setTogglingMeterId(meter.id);
    try {
      await api.patch(`/reports/meters/${meter.id}`, { isActive: !meter.isActive });
      await meters.refetch();
    } catch (error) {
      const serverMessage = companyApiError(error);
      setMeterError(serverMessage ?? "Unable to update meter status. Try again.");
    } finally {
      setTogglingMeterId(null);
    }
  }

  async function saveMeter() {
    const companyId = viewedCompany?.id ? Number(viewedCompany.id) : meterForm.companyId;
    if (!companyId) {
      setMeterError("Company is required.");
      return;
    }
    if (isMeterZipUnavailable && (!meterForm.city.trim() || !meterForm.state.trim())) {
      setMeterError("Enter the city and state for this new ZIP code.");
      return;
    }

    setMeterError("");
    setSavingMeter(true);
    try {
      const payload = {
        ...meterForm,
        companyId,
        taxExempt: meterForm.taxExempt || undefined,
        rate: meterForm.rate || undefined,
        loadProfile: meterLoadProfile,
        iEnergyBillId: meterForm.iEnergyBillId || undefined,
        energyDashboardId: meterForm.energyDashboardId || undefined,
        onSiteGenerationId: meterForm.onSiteGenerationId || undefined,
        typeId: meterForm.typeId || undefined,
        productId: meterForm.productId || undefined,
        utilityId: meterForm.utilityId || undefined,
        statusId: meterForm.statusId || undefined
      };

      if (meterFormMode === "edit" && editingMeterId !== null) {
        await api.patch(`/reports/meters/${editingMeterId}`, payload);
      } else {
        await api.post("/reports/meters", payload);
      }

      await meters.refetch();
      setEditingMeterId(null);
      setMeterFormMode("create");
      closeMeterModal();
    } catch (error) {
      const serverMessage = companyApiError(error);
      setMeterError(serverMessage ?? "Unable to save meter. Check fields and try again.");
    } finally {
      setSavingMeter(false);
    }
  }

  async function saveCompany() {
    setCompanyError("");
    const requiredFields = [
      ["Company name", newCompany.companyName],
      ["Legal name", newCompany.legalEntityName],
      ["Phone number", newCompany.phoneNumber],
      ["Mailing address", newCompany.mailingAddress],
      ["City", newCompany.city],
      ["State", newCompany.state],
      ["ZIP", newCompany.postalCode]
    ] as const;
    const missingField = requiredFields.find(([, value]) => !value.trim());
    if (missingField) {
      setCompanyError(`${missingField[0]} is required.`);
      return;
    }
    if (newCompany.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCompany.email.trim())) {
      setCompanyError("Enter a valid email address.");
      return;
    }

    setIsSavingCompany(true);
    try {
      const payload = {
        ...newCompany,
        organizationId: newCompany.organizationId || 1,
        companyName: newCompany.companyName.trim(),
        legalEntityName: newCompany.legalEntityName.trim(),
        mailingAddress: newCompany.mailingAddress.trim(),
        city: newCompany.city.trim(),
        state: newCompany.state.trim(),
        country: newCompany.country.trim(),
        postalCode: newCompany.postalCode.trim(),
        email: newCompany.email.trim(),
        phoneNumber: newCompany.phoneNumber.trim(),
        taxId: newCompany.taxId.trim(),
        url: newCompany.url.trim(),
        notes: newCompany.notes
      };

      if (companyFormMode === "edit" && editingCompanyId !== null) {
        await api.patch(`/reports/tbl-companies/${editingCompanyId}`, payload);
      } else {
        await api.post("/reports/tbl-companies", payload);
      }

      await companies.refetch();
      setIsCompanyModalOpen(false);
      setEditingCompanyId(null);
      setCompanyFormMode("create");
      setNewCompany(emptyCompanyForm());
    } catch (error) {
      const serverMessage = companyApiError(error);
      setCompanyError(serverMessage ?? "Unable to save company. Check required fields and try again.");
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function selectBulkCompanyFile(file: File | undefined) {
    setBulkCompanyError("");
    setBulkCompanyResult(null);
    setBulkCompanyRows([]);
    setBulkCompanyFileName(file?.name ?? "");
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) throw new Error("The workbook does not contain a worksheet.");
      const rows = parseBulkCompanies(worksheet);
      if (!rows.length) throw new Error("No company rows were found in the file.");
      if (rows.length > 500) throw new Error("A maximum of 500 companies can be uploaded at once.");
      setBulkCompanyRows(rows);
    } catch (error) {
      setBulkCompanyError(error instanceof Error ? error.message : "Unable to read the selected file.");
    }
  }

  async function selectBulkMeterFile(file: File | undefined) {
    const companyId = viewedCompany?.id ? Number(viewedCompany.id) : bulkMeterCompanyId;
    setBulkMeterError("");
    setBulkMeterResult(null);
    setBulkMeterRows([]);
    setBulkMeterFileName(file?.name ?? "");
    if (!file) return;
    if (!companyId) {
      setBulkMeterError("Select a company before choosing the meter file.");
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) throw new Error("The workbook does not contain a worksheet.");
      const rows = parseBulkMeters(worksheet, companyId, meterLookups.data);
      if (!rows.length) throw new Error("No meter rows were found in the file.");
      if (rows.length > 500) throw new Error("A maximum of 500 meters can be uploaded at once.");
      setBulkMeterRows(rows);
    } catch (error) {
      setBulkMeterError(error instanceof Error ? error.message : "Unable to read the selected file.");
    }
  }

  async function uploadBulkMeters() {
    const companyId = viewedCompany?.id ? Number(viewedCompany.id) : bulkMeterCompanyId;
    if (!companyId || !bulkMeterRows.length) return;
    setBulkMeterError("");
    setBulkMeterResult(null);
    setIsUploadingMeters(true);
    try {
      const response = await api.post("/reports/meters/bulk", {
        companyId,
        meters: bulkMeterRows
      });
      const result = response.data as BulkMeterResult;
      setBulkMeterResult(result);
      setBulkMeterRows([]);
      setBulkMeterFileName("");
      await meters.refetch();
    } catch (error) {
      setBulkMeterError(companyApiError(error) ?? "Unable to upload meters.");
    } finally {
      setIsUploadingMeters(false);
    }
  }

  async function updateSelectedContractStatus(isActive: boolean) {
    if (!selectedContracts.length) return;
    setContractError("");
    setIsUpdatingContractStatus(true);
    try {
      await api.patch("/reports/contracts/bulk-status", {
        ids: selectedContracts.map((contract) => contract.id),
        isActive
      });
      await contracts.refetch();
      setSelectedContracts([]);
      setContractGridKey((current) => current + 1);
    } catch (error) {
      setContractError(companyApiError(error) ?? `Unable to ${isActive ? "activate" : "deactivate"} selected contracts.`);
    } finally {
      setIsUpdatingContractStatus(false);
    }
  }

  async function updateSelectedMeterStatus(isActive: boolean) {
    if (!selectedMeters.length) return;
    setMeterError("");
    setIsUpdatingMeterStatus(true);
    try {
      await api.patch("/reports/meters/bulk-status", {
        ids: selectedMeters.map((meter) => meter.id),
        isActive
      });
      await meters.refetch();
      setSelectedMeters([]);
      setMeterGridKey((current) => current + 1);
    } catch (error) {
      setMeterError(companyApiError(error) ?? `Unable to mark selected meters ${isActive ? "active" : "inactive"}.`);
    } finally {
      setIsUpdatingMeterStatus(false);
    }
  }

  async function uploadBulkCompanies(confirmDuplicates = false) {
    if (!bulkCompanyRows.length) return;
    setBulkCompanyError("");
    setBulkCompanyResult(null);
    setIsUploadingCompanies(true);
    try {
      const response = await api.post("/reports/tbl-companies/bulk", { companies: bulkCompanyRows, confirmDuplicates });
      const result = response.data as BulkCompanyResult;
      setBulkCompanyResult(result);
      await companies.refetch();
      setIsDuplicateCompanyConfirmOpen(false);
      setDuplicateCompanyNames([]);
      setIsBulkCompanyModalOpen(false);
      setBulkCompanyRows([]);
      setBulkCompanyFileName("");
      setCompanyUploadNotice({
        severity: result.failed ? "warning" : "success",
        message: result.failed
          ? `Uploaded ${result.imported} of ${result.total} companies. ${result.failed} row(s) failed.`
          : `Successfully uploaded ${result.imported} companies.`
      });
    } catch (error) {
      if (isAxiosError<{ requiresConfirmation?: boolean; duplicates?: string[]; error?: string }>(error) && error.response?.data.requiresConfirmation) {
        setDuplicateCompanyNames(error.response.data.duplicates ?? []);
        setIsDuplicateCompanyConfirmOpen(true);
        setBulkCompanyError("");
      } else {
        setBulkCompanyError(companyApiError(error) ?? "Unable to upload companies.");
      }
    } finally {
      setIsUploadingCompanies(false);
    }
  }

  async function updateSelectedCompanyStatus(isActive: boolean) {
    if (!selectedCompanies.length) return;
    setCompanyError("");
    setIsUpdatingCompanyStatus(true);
    try {
      await api.patch("/reports/tbl-companies/bulk-status", {
        ids: selectedCompanies.map((company) => company.id),
        isActive
      });
      await companies.refetch();
      setSelectedCompanies([]);
      setCompanyGridKey((current) => current + 1);
      setCompanyUploadNotice({
        severity: "success",
        message: `${selectedCompanies.length} companies marked ${isActive ? "active" : "inactive"}.`
      });
    } catch (error) {
      setCompanyError(companyApiError(error) ?? "Unable to update selected companies.");
    } finally {
      setIsUpdatingCompanyStatus(false);
    }
  }

  function downloadCompanyTemplate() {
    const worksheet = XLSX.utils.json_to_sheet([{
      "Organization ID": 1,
      "Company Name": "Example Company",
      "Legal Entity Name": "Example Company LLC",
      Email: "company@example.com",
      "Phone Number": "555-0100",
      "Mailing Address": "100 Main Street",
      City: "Austin",
      State: "TX",
      Country: "USA",
      "Postal Code": "78701",
      "Tax ID": "",
      URL: "",
      Active: true
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Companies");
    XLSX.writeFile(workbook, "company-upload-template.xlsx");
  }

  async function downloadMeterTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const meterSheet = workbook.addWorksheet("Meters", { views: [{ state: "frozen", ySplit: 1 }] });
    meterSheet.columns = [
      { header: "Account Number", key: "accountNumber", width: 18 },
      { header: "Service Ref/POD", key: "serviceRefPod", width: 18 },
      { header: "Name Key", key: "nameKey", width: 14 },
      { header: "Meter", key: "meter", width: 18 },
      { header: "Service Address", key: "serviceAddress", width: 24 },
      { header: "City", key: "city", width: 16 },
      { header: "State", key: "state", width: 12 },
      { header: "Zip", key: "zip", width: 12, style: { numFmt: "@" } },
      { header: "Tax Exempt", key: "taxExempt", width: 18 },
      { header: "Cycle/Read Day", key: "cycleReadDay", width: 18 },
      { header: "Demand", key: "demand", width: 14 },
      { header: "Annual Usage", key: "annualUsage", width: 16 },
      { header: "iEnergyBill", key: "iEnergyBill", width: 18 },
      { header: "EnergyDashboard", key: "energyDashboard", width: 20 },
      { header: "OnSiteGeneration", key: "onSiteGeneration", width: 20 },
      { header: "Type", key: "type", width: 16 },
      { header: "Product", key: "product", width: 18 },
      { header: "Utility", key: "utility", width: 20 },
      { header: "Rate", key: "rate", width: 16 },
      { header: "Utility / Rate Alert", key: "utilityRateAlert", width: 34 },
      { header: "Status", key: "status", width: 16 },
      { header: "Notes", key: "notes", width: 28 },
      { header: "Active", key: "active", width: 12 },
      { header: "Utility Rate Range", key: "utilityRateRange", width: 2, hidden: true }
    ];
    meterSheet.addRow({
      accountNumber: "10001234",
      meter: "MTR-10001",
      serviceAddress: "100 Main Street",
      city: "Austin",
      state: "TX",
      zip: "012345",
      active: "TRUE"
    });
    meterSheet.autoFilter = "A1:W1";
    meterSheet.getRow(1).height = 24;
    meterSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1683D8" } };
      cell.alignment = { vertical: "middle" };
    });

    const lookupColumns = [
      { column: "taxExempt", sheet: "Tax Exempt", range: "TaxExemptOptions", options: meterLookups.data?.taxExempts },
      { column: "iEnergyBill", sheet: "iEnergyBill", range: "IEnergyBillOptions", options: meterLookups.data?.iEnergyBills },
      { column: "energyDashboard", sheet: "Energy Dashboard", range: "EnergyDashboardOptions", options: meterLookups.data?.energyDashboards },
      { column: "onSiteGeneration", sheet: "On Site Generation", range: "OnSiteGenerationOptions", options: meterLookups.data?.onSiteGenerations },
      { column: "type", sheet: "Types", range: "TypeOptions", options: meterLookups.data?.types },
      { column: "product", sheet: "Products", range: "ProductOptions", options: meterLookups.data?.products },
      { column: "utility", sheet: "Utilities", range: "UtilityOptions", options: meterLookups.data?.utilities },
      { column: "status", sheet: "Statuses", range: "StatusOptions", options: meterLookups.data?.statuses }
    ];

    for (const lookup of lookupColumns) {
      if (!lookup.options?.length) continue;
      const lookupSheet = workbook.addWorksheet(lookup.sheet, { views: [{ state: "frozen", ySplit: 1 }] });
      lookupSheet.columns = [
        { header: "ID", key: "id", width: 12 },
        { header: "Name", key: "name", width: 32 }
      ];
      lookupSheet.addRows(lookup.options.map((option) => ({ id: option.id, name: option.name ?? "" })));
      lookupSheet.getRow(1).font = { bold: true };
      workbook.definedNames.add(`'${lookup.sheet}'!$B$2:$B$${lookup.options.length + 1}`, lookup.range);
      if (lookup.range === "UtilityOptions") {
        workbook.definedNames.add(`'${lookup.sheet}'!$A$2:$A$${lookup.options.length + 1}`, "UtilityIds");
      }
      for (let row = 2; row <= 501; row += 1) {
        meterSheet.getRow(row).getCell(lookup.column).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [lookup.range],
          showErrorMessage: true,
          errorTitle: "Invalid value",
          error: `Choose a ${lookup.sheet} value from the dropdown.`
        };
      }
    }

    const utilities = meterLookups.data?.utilities ?? [];
    const rates = meterLookups.data?.rates ?? [];
    if (utilities.length) {
      const rateSheet = workbook.addWorksheet("Rates", { views: [{ state: "frozen", ySplit: 1 }] });
      rateSheet.columns = [
        { header: "Utility ID", key: "utilityId", width: 14 },
        { header: "Utility", key: "utility", width: 32 },
        { header: "Rate", key: "rate", width: 24 },
        { header: "Blank", key: "blank", width: 2 }
      ];
      rateSheet.getRow(1).font = { bold: true };
      workbook.definedNames.add("'Rates'!$D$2", "RateUtility_None");

      let rateRow = 2;
      for (const utility of utilities) {
        const utilityRates = rates.filter((rate) => String(rate.utilityId ?? "") === String(utility.id));
        const firstRateRow = rateRow;
        for (const rate of utilityRates) {
          rateSheet.addRow({ utilityId: utility.id, utility: utility.name ?? "", rate: rate.name ?? "" });
          rateRow += 1;
        }
        const range = utilityRates.length
          ? `'Rates'!$C$${firstRateRow}:$C$${rateRow - 1}`
          : "'Rates'!$D$2";
        workbook.definedNames.add(range, `RateUtility_${utility.id}`);
      }

      const utilityColumnLetter = meterSheet.getColumn("utility").letter;
      const utilityRateRangeColumnLetter = meterSheet.getColumn("utilityRateRange").letter;
      for (let row = 2; row <= 501; row += 1) {
        meterSheet.getRow(row).getCell("utilityRateRange").value = {
          formula: `"RateUtility_"&IFERROR(INDEX(UtilityIds,MATCH(${utilityColumnLetter}${row},UtilityOptions,0)),"None")`
        };
        meterSheet.getRow(row).getCell("rate").dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`INDIRECT($${utilityRateRangeColumnLetter}${row})`],
          showInputMessage: true,
          promptTitle: "Rate depends on Utility",
          prompt: "After changing Utility, select a new Rate from this dropdown.",
          showErrorMessage: true,
          errorTitle: "Invalid rate",
          error: "Choose a rate assigned to the selected Utility."
        };
      }
      const rateColumnLetter = meterSheet.getColumn("rate").letter;
      const alertColumnLetter = meterSheet.getColumn("utilityRateAlert").letter;
      for (let row = 2; row <= 501; row += 1) {
        meterSheet.getRow(row).getCell("utilityRateAlert").value = {
          formula: `IF(OR(${utilityColumnLetter}${row}="",${rateColumnLetter}${row}=""),"",IF(COUNTIF(INDIRECT($${utilityRateRangeColumnLetter}${row}),${rateColumnLetter}${row})>0,"","ALERT: Row "&ROW()&" - Rate does not match Utility"))`
        };
      }
      meterSheet.addConditionalFormatting({
        ref: `${rateColumnLetter}2:${rateColumnLetter}501`,
        rules: [{
          type: "expression",
          priority: 1,
          formulae: [
            `AND($${utilityColumnLetter}2<>"",$${rateColumnLetter}2<>"",COUNTIF(INDIRECT($${utilityRateRangeColumnLetter}2),$${rateColumnLetter}2)=0)`
          ],
          style: {
            font: { color: { argb: "FF9C0006" } },
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFC7CE" }, fgColor: { argb: "FFFFC7CE" } }
          }
        }]
      });
      meterSheet.addConditionalFormatting({
        ref: `${alertColumnLetter}2:${alertColumnLetter}501`,
        rules: [{
          type: "expression",
          priority: 2,
          formulae: [`$${alertColumnLetter}2<>""`],
          style: {
            font: { bold: true, color: { argb: "FF9C0006" } },
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFC7CE" }, fgColor: { argb: "FFFFC7CE" } }
          }
        }]
      });
    }

    for (let row = 2; row <= 501; row += 1) {
      meterSheet.getRow(row).getCell("active").dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"TRUE,FALSE"']
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meter-upload-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page">
      {isDashboardView ? (
      <div className="kpi-grid">
        {hasAdminDashboard ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/companies")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/companies"); }}>
            <span>Companies</span>
            <strong>{companies.isLoading ? "..." : companies.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {hasAdminDashboard ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/contracts")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/contracts"); }}>
            <span>Contracts</span>
            <strong>{contracts.isLoading ? "..." : contracts.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {hasAdminDashboard ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/meters")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/meters"); }}>
            <span>Meters</span>
            <strong>{meters.isLoading ? "..." : meters.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {hasAdminDashboard ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/members")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/members"); }}>
            <span>Members</span>
            <strong>{members.isLoading ? "..." : members.data?.total ?? 0}</strong>
          </article>
        ) : null}
      </div>
      ) : null}

      {(hasAdminDashboard && isDashboardView) || isCompaniesView ? (
        <section className="panel companies-panel">
          <div className="panel-title-row">
            <h2>Companies</h2>
            <div className="panel-title-actions">
              {selectedCompanies.length ? (
                <>
                  {selectedCompanies.length > 1 || !selectedCompanies[0].isActive ? (
                    <Button variant="outlined" color="success" onClick={() => void updateSelectedCompanyStatus(true)} disabled={isUpdatingCompanyStatus}>
                      {isUpdatingCompanyStatus ? "Updating..." : "Active"}
                    </Button>
                  ) : null}
                  {selectedCompanies.length > 1 || selectedCompanies[0].isActive ? (
                    <Button variant="outlined" color="warning" onClick={() => void updateSelectedCompanyStatus(false)} disabled={isUpdatingCompanyStatus}>
                      {isUpdatingCompanyStatus ? "Updating..." : "Inactive"}
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button variant="outlined" startIcon={<Upload size={18} />} onClick={() => setIsBulkCompanyModalOpen(true)}>Add Multiple Companies</Button>
              <Button variant="contained" onClick={openCreateCompany}>Add New Company</Button>
            </div>
          </div>
          {companyUploadNotice ? (
            <Alert severity={companyUploadNotice.severity} onClose={() => setCompanyUploadNotice(null)} className="company-section-notice">
              {companyUploadNotice.message}
            </Alert>
          ) : null}
          {/*  <p className="muted">Detailed company list from SQL Server table tblCompany.</p> */}
          {companies.isError ? <p className="error">Unable to load tblCompany records.</p> : null}
          <IntiliGrid key={companyGridKey} checkboxSelection columns={companyColumns} rows={companies.data?.data ?? []} onRowClick={viewCompany} onSelectionChange={(_ids, rows) => setSelectedCompanies(rows)} />
        </section>
      ) : null}

      {isContractsView ? (
        <section className="panel companies-panel">
          <div className="panel-title-row">
            <h2>Contracts</h2>
            <div className="panel-title-actions">
              {selectedContracts.length ? (
                <>
                  <Button variant="outlined" color="success" startIcon={<Power size={16} />} onClick={() => void updateSelectedContractStatus(true)} disabled={isUpdatingContractStatus}>Activate</Button>
                  <Button variant="outlined" color="warning" startIcon={<Power size={16} />} onClick={() => void updateSelectedContractStatus(false)} disabled={isUpdatingContractStatus}>Deactivate</Button>
                </>
              ) : null}
              <Button variant="contained" onClick={() => void openCreateContract()}>Add New Contract</Button>
            </div>
          </div>
          {contractAvailabilityNotice ? <Alert severity="error" variant="filled">{contractAvailabilityNotice}</Alert> : null}
          {contractError ? <p className="error">{contractError}</p> : null}
          {contracts.isError ? <p className="error">Unable to load contracts.</p> : null}
          {contracts.isLoading ? <p className="muted">Loading contracts...</p> : null}
          <IntiliGrid key={contractGridKey} checkboxSelection columns={contractColumns} rows={contracts.data?.data ?? []} onSelectionChange={(_ids, rows) => setSelectedContracts(rows)} />
        </section>
      ) : null}

      {isMetersView ? (
        <section className="panel companies-panel">
          <div className="panel-title-row">
            <h2>Meters</h2>
            <div className="panel-title-actions">
              {selectedMeters.length ? (
                <>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<Power size={16} />}
                    onClick={() => void updateSelectedMeterStatus(true)}
                    disabled={isUpdatingMeterStatus}
                  >
                    {isUpdatingMeterStatus ? "Updating..." : "Active"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Power size={16} />}
                    onClick={() => void updateSelectedMeterStatus(false)}
                    disabled={isUpdatingMeterStatus}
                  >
                    {isUpdatingMeterStatus ? "Updating..." : "Inactive"}
                  </Button>
                </>
              ) : null}
              <Button variant="outlined" startIcon={<Upload size={18} />} onClick={() => void openBulkMeterUpload()}>Add More Meters</Button>
              <Button variant="contained" onClick={() => void openCreateMeter()}>Add New Meter</Button>
            </div>
          </div>
          {meterAvailabilityNotice ? (
            <Alert severity="error" variant="filled" onClose={() => setMeterAvailabilityNotice("")}>
              {meterAvailabilityNotice}
            </Alert>
          ) : null}
          {meterError ? <p className="error">{meterError}</p> : null}
          {meters.isError ? <p className="error">Unable to load meters.</p> : null}
          {meters.isLoading ? <p className="muted">Loading meters...</p> : null}
          <IntiliGrid
            key={meterGridKey}
            checkboxSelection
            columns={meterColumns}
            rows={meters.data?.data ?? []}
            onSelectionChange={(_ids, rows) => setSelectedMeters(rows)}
          />
        </section>
      ) : null}

      <Dialog open={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{companyFormMode === "edit" ? "Edit Company" : "Add New Company"}</DialogTitle>
        <DialogContent>
          {companyError ? <p className="error">{companyError}</p> : null}
          <div className="company-form-grid">
            <TextField label="Company Name" required value={newCompany.companyName} onChange={(event) => updateNewCompany("companyName", event.target.value)} />
            <TextField label="Legal Entity Name" required value={newCompany.legalEntityName} onChange={(event) => updateNewCompany("legalEntityName", event.target.value)} />
            <TextField label="Email" type="email" value={newCompany.email} onChange={(event) => updateNewCompany("email", event.target.value)} />
            <TextField label="Phone Number" type="tel" required value={newCompany.phoneNumber} onChange={(event) => updateNewCompany("phoneNumber", event.target.value)} />
            <TextField label="Mailing Address" required value={newCompany.mailingAddress} onChange={(event) => updateNewCompany("mailingAddress", event.target.value)} />
            <TextField label="City" required value={newCompany.city} onChange={(event) => updateNewCompany("city", event.target.value)} />
            <TextField select label="State" required value={newCompany.state} onChange={(event) => updateNewCompany("state", event.target.value)}>
              <MenuItem value="">Select state</MenuItem>
              {usStates.data?.data.map((state) => (
                <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
              ))}
            </TextField>
            <TextField label="ZIP" required value={newCompany.postalCode} onChange={(event) => updateNewCompany("postalCode", event.target.value)} />
            <TextField label="URL" value={newCompany.url} onChange={(event) => updateNewCompany("url", event.target.value)} />
            <FormControlLabel control={<Checkbox checked={newCompany.isActive} onChange={(event) => updateNewCompany("isActive", event.target.checked)} />} label="Active" />
            <RichTextEditor label="Company Notes" value={newCompany.notes} onChange={(value) => updateNewCompany("notes", value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCompany} disabled={isSavingCompany || !isCompanyFormValid}>
            {isSavingCompany ? "Saving..." : companyFormMode === "edit" ? "Update Company" : "Save Company"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isBulkCompanyModalOpen} onClose={() => !isUploadingCompanies && setIsBulkCompanyModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Bulk Upload Companies</DialogTitle>
        <DialogContent>
          <p className="muted">Upload an Excel or CSV file containing up to 500 companies. Company Name is required. Organization ID defaults to 1 and Active defaults to true when omitted.</p>
          {bulkCompanyError ? <p className="error">{bulkCompanyError}</p> : null}
          {bulkCompanyResult ? (
            <Alert severity={bulkCompanyResult.failed ? "warning" : "success"}>
              Imported {bulkCompanyResult.imported} of {bulkCompanyResult.total} companies.
              {bulkCompanyResult.failed ? ` ${bulkCompanyResult.failed} row(s) failed.` : ""}
            </Alert>
          ) : null}
          {bulkCompanyResult?.errors.slice(0, 10).map((item) => (
            <p className="error" key={`${item.row}-${item.companyName}`}>Row {item.row}{item.companyName ? ` (${item.companyName})` : ""}: {item.error}</p>
          ))}
          {isUploadingCompanies ? (
            <Alert severity="info" icon={<CircularProgress size={20} />}>
              Processing companies and creating folders. Please wait...
            </Alert>
          ) : null}
          <div className="bulk-upload-controls">
            <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={isUploadingCompanies}>
              Choose File
              <input hidden type="file" accept=".xlsx,.xls,.csv" disabled={isUploadingCompanies} onChange={(event) => void selectBulkCompanyFile(event.target.files?.[0])} />
            </Button>
            <span>{bulkCompanyFileName || "No file selected"}</span>
          </div>
          {bulkCompanyRows.length ? <p className="muted">{bulkCompanyRows.length} company row(s) ready to upload.</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={downloadCompanyTemplate} disabled={isUploadingCompanies}>Download Template</Button>
          <Button onClick={() => setIsBulkCompanyModalOpen(false)} disabled={isUploadingCompanies}>Cancel</Button>
          <Button variant="contained" onClick={() => void uploadBulkCompanies(false)} disabled={!bulkCompanyRows.length || isUploadingCompanies}>
            {isUploadingCompanies ? <><CircularProgress size={18} color="inherit" /> Processing...</> : "Upload Companies"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDuplicateCompanyConfirmOpen} onClose={() => !isUploadingCompanies && setIsDuplicateCompanyConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Duplicate Company Names</DialogTitle>
        <DialogContent>
          <Alert severity="warning">Companies with the same name were found. Do you want to upload them anyway?</Alert>
          <ul>
            {duplicateCompanyNames.map((name) => <li key={name}>{name}</li>)}
          </ul>
          {isUploadingCompanies ? <Alert severity="info" icon={<CircularProgress size={20} />}>Processing companies. Please wait...</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDuplicateCompanyConfirmOpen(false)} disabled={isUploadingCompanies}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => void uploadBulkCompanies(true)} disabled={isUploadingCompanies}>
            {isUploadingCompanies ? <><CircularProgress size={18} color="inherit" /> Processing...</> : "Confirm and Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewedCompany)} onClose={() => setViewedCompany(null)} fullWidth maxWidth="xl" slotProps={{ paper: { className: "company-account-dialog" } }}>
        <DialogContent className="company-account-view">
          {viewedCompany ? (
            <>
              <div className="company-account-header">
                <div>
                  <h1><Building2 size={34} />{viewedCompany.companyName ?? "Company Account"}</h1>
                  <p>
                    Company &gt; Account
                    <span className={`status-badge company-header-status ${viewedCompany.isActive ? "active" : "inactive"}`}>
                      {viewedCompany.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="company-account-actions">
                  {!viewedCompany.isActive ? (
                    <Button
                      variant="contained"
                      onClick={() => void activateCompany(viewedCompany)}
                      disabled={activatingCompanyId === viewedCompany.id}
                    >
                      {activatingCompanyId === viewedCompany.id ? "Activating..." : "Make Active"}
                    </Button>
                  ) : null}
                  <Button onClick={() => setViewedCompany(null)}>Close</Button>
                </div>
              </div>

              <div className="company-account-layout">
                <div className="company-account-side">
                  <section className="account-card">
                    <h2>Account Information</h2>
                    <dl className="account-info-list">
                      <dt>Status</dt>
                      <dd>
                        <span className={`status-badge ${viewedCompany.isActive ? "active" : "inactive"}`}>
                          {viewedCompany.isActive ? "Active" : "Inactive"}
                        </span>
                      </dd>
                      <dt>Company ID</dt>
                      <dd>{viewedCompany.customerId ?? "-"}</dd>
                      <dt>Company Name</dt>
                      <dd>{viewedCompany.companyName ?? "-"}</dd>
                      <dt>Legal Name</dt>
                      <dd>{viewedCompany.legalEntityName ?? "-"}</dd>
                      <dt>Address</dt>
                      <dd>{viewedCompany.mailingAddress ?? "-"}</dd>
                      <dt>Phone</dt>
                      <dd>{viewedCompany.phoneNumber ?? "-"}</dd>
                      <dt>Tax ID</dt>
                      <dd>{viewedCompany.taxId ?? "-"}</dd>
                      <dt>Website</dt>
                      <dd>{viewedCompany.url ?? "-"}</dd>
                    </dl>
                  </section>

                  <section className="account-card notes-card">
                    <h2>Notes</h2>
                    {viewedCompany.notes?.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, "").trim() ? (
                      <>
                        <div
                          className="company-note-preview"
                          role="textbox"
                          aria-label="Company notes"
                          aria-readonly="true"
                        >
                          {richTextToPlainText(viewedCompany.notes)}
                        </div>
                        <Button
                          className="company-notes-more"
                          size="small"
                          onClick={() => {
                            const companyId = viewedCompany.id;
                            setViewedCompany(null);
                            navigate(`/organizations?section=notes&companyId=${encodeURIComponent(String(companyId))}`);
                          }}
                        >
                          More
                        </Button>
                      </>
                    ) : (
                      <p className="muted">No notes entered for this company.</p>
                    )}
                  </section>

                  <section className="account-card documents-card">
                    <h2>Documents</h2>
                    <div className="documents-section">
                      {companyDocuments.isLoading ? <p className="muted">Loading documents...</p> : null}
                      {companyDocuments.isError ? <p className="error">Unable to load documents.</p> : null}
                      {companyDocuments.data?.skipped ? <p className="muted">SharePoint is not configured.</p> : null}
                      {!companyDocuments.isLoading && !companyDocuments.isError && !companyDocuments.data?.skipped ? (
                        <CompanyDocumentsPreview
                          nodes={companyDocuments.data?.tree ?? []}
                          companyId={viewedCompany.id}
                        />
                      ) : null}
                    </div>
                  </section>
                </div>

                <div className="company-account-main">
                  <ContractListPanel
                    columns={contractColumns}
                    contracts={(contracts.data?.data ?? []).map((contract) => ({ ...contract, companyName: contract.companyName ?? viewedCompany.companyName ?? "" }))}
                    isLoading={contracts.isLoading}
                    isError={contracts.isError}
                    error={contractError}
                    availabilityNotice={contractAvailabilityNotice}
                    onAdd={() => void openCreateContract()}
                    addDisabled={!viewedCompany.isActive}
                  />
                  <MeterListPanel
                    columns={meterColumns}
                    meters={meters.data?.data ?? []}
                    isLoading={meters.isLoading}
                    isError={meters.isError}
                    error={meterError}
                    onAdd={openCreateMeter}
                    onAddMore={openBulkMeterUpload}
                    addDisabled={!viewedCompany.isActive}
                  />
                  {canManageMembers ? (
                    <MembersPanel companyId={viewedCompany.id} canAdd compact />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{contractFormMode === "edit" ? "Edit Contract" : "Add New Contract"}</DialogTitle>
        <DialogContent>
          {contractError ? <p className="error">{contractError}</p> : null}
          <div className="company-form-grid">
            {!viewedCompany ? (
              <TextField select required label="Company" value={contractForm.companyId} onChange={(event) => updateContractCompany(Number(event.target.value))}>
                <MenuItem value={0}>Select company</MenuItem>
                {companies.data?.data.map((company) => (
                  <MenuItem key={company.id} value={Number(company.id)}>{company.companyName}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <div className={`contract-form-row${contractFormMode === "edit" ? " contract-form-row-two" : ""}`}>
              {contractFormMode === "create" ? (
                <MeterSelect required label="Product" value={contractForm.productId} options={contractLookups.data?.products ?? []} onChange={updateContractProduct} />
              ) : null}
              <TextField select required label="Broker" value={contractForm.brokerId} onChange={(event) => updateContractForm("brokerId", Number(event.target.value))}>
                <MenuItem value={0}>Select broker</MenuItem>
                {contractLookups.data?.brokers.map((broker) => <MenuItem key={broker.id} value={Number(broker.id)}>{broker.name}</MenuItem>)}
              </TextField>
              <TextField select required label="Supplier" value={contractForm.supplierId} onChange={(event) => updateContractForm("supplierId", Number(event.target.value))}>
                <MenuItem value={0}>Select supplier</MenuItem>
                {contractLookups.data?.suppliers.map((supplier) => <MenuItem key={supplier.id} value={Number(supplier.id)}>{supplier.name}</MenuItem>)}
              </TextField>
            </div>
            <div className="contract-form-row">
              <MeterSelect required label="Swing" value={contractForm.swingId} options={contractLookups.data?.swings ?? []} onChange={(value) => updateContractForm("swingId", value)} />
              <MeterSelect required label="Pass Through" value={contractForm.passThroughId} options={contractLookups.data?.passThroughs ?? []} onChange={(value) => updateContractForm("passThroughId", value)} />
              <MeterSelect required label="Bill Type" value={contractForm.billTypeId} options={contractLookups.data?.billTypes ?? []} onChange={(value) => updateContractForm("billTypeId", value)} />
            </div>
            <div className="contract-form-row contract-form-row-five">
              <TextField required label="Rate-kWh/therms" value={contractForm.rate} onChange={(event) => updateContractCurrency("rate", event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: "decimal" } }} />
              <TextField required label="Fee-kWh/Dth" value={contractForm.fee} onChange={(event) => updateContractCurrency("fee", event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: "decimal" } }} />
              <TextField required label="Start Date" type="date" value={contractForm.startDate} onChange={(event) => updateContractForm("startDate", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField required label="End Date" type="date" value={contractForm.endDate} onChange={(event) => updateContractForm("endDate", event.target.value)} error={Boolean(contractForm.startDate && contractForm.endDate && contractMonths === null)} helperText={contractForm.startDate && contractForm.endDate && contractMonths === null ? "End date cannot be before start date." : ""} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: contractForm.startDate || undefined } }} />
              <div className="contract-months-label" aria-live="polite">
                <span>Total Months</span>
                <strong>{contractMonths ?? "-"}</strong>
              </div>
            </div>
            <div className="file-upload-field">
              <Button variant="outlined" component="label">
                Upload Contract File *
                <input type="file" hidden onChange={(event) => updateContractFile(event.target.files?.[0] ?? null)} />
              </Button>
              <Tooltip title={contractForm.cFile.length > 20 ? contractForm.cFile : ""} followCursor>
                <span>{displayedContractFileName || "No file selected"}</span>
              </Tooltip>
            </div>
            <FormControlLabel control={<Checkbox checked={contractForm.isActive} onChange={(event) => updateContractForm("isActive", event.target.checked)} />} label="Active" />
          </div>
          {contractFormMode === "create" && contractCompanyId ? (
            <section className="contract-meter-picker">
              <div className="section-heading-row">
                <h3>Meters</h3>
                <span>{contractForm.meterIds.length} selected</span>
              </div>
              {contractMeters.isLoading ? <p className="muted">Loading meters...</p> : null}
              {contractMeters.isError ? <p className="error">Unable to load meters.</p> : null}
              {!contractMeters.isLoading && !contractMeters.data?.data.length ? <p className="muted">No meters found for the selected company and product.</p> : null}
              <div className="meter-check-grid">
                {(contractMeters.data?.data ?? []).map((meter) => {
                  const meterId = Number(meter.id);
                  return (
                    <label key={meter.id} className="meter-check-row">
                      <Checkbox
                        checked={contractForm.meterIds.includes(meterId)}
                        onChange={(event) => toggleContractMeter(meterId, event.target.checked)}
                      />
                      <span>{meter.accountNumber || meter.meter || `Meter ${meter.id}`}</span>
                      <span>{meter.serviceAddress || "-"}</span>
                      <span>{meter.city || "-"}</span>
                      <span>{meter.utility || "-"}</span>
                      <span>{meter.product || "-"}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}
          <div className="contract-notes-wrap">
            <RichTextEditor label="Notes *" value={contractForm.notes} onChange={(value) => updateContractForm("notes", value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsContractModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={requestContractSubmit} disabled={savingContract || !isContractFormValid}>
            {savingContract ? "Saving..." : contractFormMode === "edit" ? "Update Contract" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isContractSubmitConfirmOpen} onClose={() => !savingContract && setIsContractSubmitConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Contract Meters</DialogTitle>
        <DialogContent>
          {contractError ? <Alert severity="error">{contractError}</Alert> : null}
          <p>Please confirm the selected meter numbers before creating this contract:</p>
          <ul className="contract-confirm-meter-list">
            {selectedContractMeterNumbers.map((meterNumber, index) => <li key={`${meterNumber}-${index}`}>{meterNumber}</li>)}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsContractSubmitConfirmOpen(false)} disabled={savingContract}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveContract()} disabled={savingContract}>
            {savingContract ? "Creating..." : "Confirm & Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewedContract)} onClose={() => setViewedContract(null)} fullWidth maxWidth="sm">
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {viewedContract ? (
            <dl className="company-detail-list">
              <dt>Contract ID</dt>
              <dd>{viewedContract.contractId ?? "-"}</dd>
              <dt>Company</dt>
              <dd>{viewedContract.companyName ?? viewedCompany?.companyName ?? "-"}</dd>
              <dt>Broker</dt>
              <dd>{viewedContract.broker ?? "-"}</dd>
              <dt>Supplier</dt>
              <dd>{viewedContract.supplier ?? "-"}</dd>
              <dt>Swing</dt>
              <dd>{viewedContract.swing ?? "-"}</dd>
              <dt>Pass Through</dt>
              <dd>{viewedContract.passThrough ?? "-"}</dd>
              <dt>Bill Type</dt>
              <dd>{viewedContract.billType ?? "-"}</dd>
              <dt>Start Date</dt>
              <dd>{formatDate(viewedContract.startDate)}</dd>
              <dt>End Date</dt>
              <dd>{formatDate(viewedContract.endDate)}</dd>
              <dt>Rate</dt>
              <dd>{viewedContract.rate ?? "-"}</dd>
              <dt>Fee</dt>
              <dd>{viewedContract.fee ?? "-"}</dd>
              <dt>Status</dt>
              <dd>{viewedContract.isActive ? "Active" : "Inactive"}</dd>
              <dt>Notes</dt>
              <dd>{viewedContract.notes ? <div dangerouslySetInnerHTML={{ __html: viewedContract.notes }} /> : "-"}</dd>
            </dl>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewedContract(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isBulkMeterModalOpen} onClose={() => !isUploadingMeters && setIsBulkMeterModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload Multiple Meters</DialogTitle>
        <DialogContent>
          {!viewedCompany ? (
            <TextField
              select
              required
              fullWidth
              margin="normal"
              label="Company"
              value={bulkMeterCompanyId}
              onChange={(event) => updateBulkMeterCompany(Number(event.target.value))}
              disabled={isUploadingMeters || companies.isLoading}
            >
              <MenuItem value={0}>Select company</MenuItem>
              {(companies.data?.data ?? []).map((company) => (
                <MenuItem key={company.id} value={Number(company.id)} disabled={!company.isActive}>
                  {company.companyName}{company.isActive ? "" : " (Inactive)"}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <p className="muted">
            Upload an Excel or CSV file containing up to 500 meters for {bulkMeterCompany?.companyName ?? "the selected company"}.
            Enter lookup names or IDs exactly as shown in the template reference sheets. Account Number or Meter is required for every row.
          </p>
          {bulkMeterError ? <p className="error">{bulkMeterError}</p> : null}
          {meterLookups.isError ? <Alert severity="error">Unable to load dropdown values for the template. Try again.</Alert> : null}
          {bulkMeterResult ? (
            <Alert severity={bulkMeterResult.failed ? "warning" : "success"}>
              Imported {bulkMeterResult.imported} of {bulkMeterResult.total} meters.
              {bulkMeterResult.failed ? ` ${bulkMeterResult.failed} row(s) failed.` : ""}
            </Alert>
          ) : null}
          {bulkMeterResult?.errors.slice(0, 10).map((item) => (
            <p className="error" key={`${item.row}-${item.meter}`}>Row {item.row}{item.meter ? ` (${item.meter})` : ""}: {item.error}</p>
          ))}
          {isUploadingMeters ? (
            <Alert severity="info" icon={<CircularProgress size={20} />}>Uploading meters. Please wait...</Alert>
          ) : null}
          <div className="bulk-upload-controls">
            <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={isUploadingMeters || !bulkMeterCompany}>
              Choose File
              <input hidden type="file" accept=".xlsx,.xls,.csv" disabled={isUploadingMeters || !bulkMeterCompany} onChange={(event) => void selectBulkMeterFile(event.target.files?.[0])} />
            </Button>
            <span>{bulkMeterFileName || "No file selected"}</span>
          </div>
          {bulkMeterRows.length ? <p className="muted">{bulkMeterRows.length} meter row(s) ready to upload.</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void downloadMeterTemplate()} disabled={isUploadingMeters || meterLookups.isLoading || meterLookups.isError}>
            {meterLookups.isLoading ? "Loading Template..." : meterLookups.isError ? "Template Unavailable" : "Download Template"}
          </Button>
          <Button onClick={() => setIsBulkMeterModalOpen(false)} disabled={isUploadingMeters}>Close</Button>
          <Button variant="contained" onClick={() => void uploadBulkMeters()} disabled={!bulkMeterCompany || !bulkMeterRows.length || isUploadingMeters}>
            {isUploadingMeters ? <><CircularProgress size={18} color="inherit" /> Uploading...</> : "Upload Meters"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isMeterModalOpen} onClose={closeMeterModal} fullWidth maxWidth="md">
        <DialogTitle>{meterFormMode === "edit" ? "Edit Meter" : "Add New Meter"}</DialogTitle>
        <DialogContent>
          {meterError ? <p className="error">{meterError}</p> : null}
          <div className="company-form-grid">
            <div className="meter-form-row meter-form-row-four">
              <TextField
                label="Zip"
                value={meterForm.zip}
                onChange={(event) => updateMeterZip(event.target.value)}
                helperText={
                  meterZipMatches.isFetching
                    ? "Finding city and state..."
                    : isMeterZipUnavailable
                      ? "ZIP not found. Enter its city and state; they will be added when you save."
                      : "Enter or select a ZIP code"
                }
                slotProps={{ htmlInput: { list: "meter-zip-options", autoComplete: "postal-code" } }}
              />
              <TextField
                label="City"
                value={meterForm.city}
                onChange={(event) => updateMeterForm("city", event.target.value)}
                required={isMeterZipUnavailable}
                slotProps={{ htmlInput: { readOnly: !isMeterZipUnavailable } }}
              />
              {isMeterZipUnavailable ? (
                <TextField
                  select
                  required
                  label="State"
                  value={meterForm.state}
                  onChange={(event) => updateMeterForm("state", event.target.value)}
                  disabled={usStates.isLoading}
                >
                  <MenuItem value="">Select state</MenuItem>
                  {usStates.data?.data.map((state) => (
                    <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField label="State" value={meterForm.state} slotProps={{ htmlInput: { readOnly: true } }} />
              )}
              <TextField label="Service Address" value={meterForm.serviceAddress} onChange={(event) => updateMeterForm("serviceAddress", event.target.value)} />
              <datalist id="meter-zip-options">
                {(meterZipMatches.data?.data ?? []).map((zip) => (
                  <option key={`${zip.id}-${zip.city}`} value={zip.code}>{zip.city}, {zip.state}</option>
                ))}
              </datalist>
            </div>
            {!viewedCompany ? (
              <TextField select label="Company" value={meterForm.companyId} onChange={(event) => updateMeterForm("companyId", Number(event.target.value))}>
                <MenuItem value={0}>Select company</MenuItem>
                {companies.data?.data.map((company) => (
                  <MenuItem key={company.id} value={Number(company.id)}>{company.companyName}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <div className="meter-form-row">
              <MeterSelect
                label="Product"
                value={meterForm.productId}
                options={meterLookups.data?.products ?? []}
                onChange={updateMeterProduct}
                placeholder="Select Product"
              />
              <MeterSelect
                label="Utility"
                value={meterForm.utilityId}
                options={meterLookups.data?.utilities ?? []}
                onChange={updateMeterUtility}
                placeholder="Select Utility"
              />
              <MeterSelect
                label="Rate"
                value={meterForm.rate}
                options={(meterLookups.data?.rates ?? []).filter((rate) => String(rate.utilityId ?? "") === String(meterForm.utilityId))}
                onChange={(value) => updateMeterForm("rate", value)}
                disabled={!meterForm.utilityId}
              />
            </div>

            <div className="meter-form-row meter-form-row-four">
              <TextField label="Account Number" value={meterForm.accountNumber} onChange={(event) => updateMeterForm("accountNumber", event.target.value)} />
              <TextField label="Service Ref/POD" value={meterForm.serviceRefPod} onChange={(event) => updateMeterForm("serviceRefPod", event.target.value)} />
              <TextField label="Meter" value={meterForm.meter} onChange={(event) => updateMeterForm("meter", event.target.value)} />
              <TextField label="Name Key" value={meterForm.nameKey} onChange={(event) => updateMeterForm("nameKey", event.target.value)} />
            </div>
            <MeterSelect label="Tax Exempt" value={meterForm.taxExempt} options={meterLookups.data?.taxExempts ?? []} onChange={(value) => updateMeterForm("taxExempt", value)} />
            <TextField label="Cycle/Read Day" value={meterForm.cycleReadDay} onChange={(event) => updateMeterForm("cycleReadDay", event.target.value)} />
            <div className="meter-form-row">
              <TextField label="Demand" value={meterForm.demand} onChange={(event) => updateMeterForm("demand", event.target.value)} />
              <TextField label="Ann. Usage-Dth/kWh" value={meterForm.annualUsage} onChange={(event) => updateMeterForm("annualUsage", event.target.value)} />
              <TextField label="Load Profile" value={meterLoadProfile} slotProps={{ htmlInput: { readOnly: true } }} />
            </div>
            <div className="meter-form-row meter-form-row-five">
              <MeterSelect label="iEnergyBill" value={meterForm.iEnergyBillId} options={meterLookups.data?.iEnergyBills ?? []} onChange={(value) => updateMeterForm("iEnergyBillId", value)} />
              <MeterSelect label="EnergyDashboard" value={meterForm.energyDashboardId} options={meterLookups.data?.energyDashboards ?? []} onChange={(value) => updateMeterForm("energyDashboardId", value)} />
              <MeterSelect label="OnSiteGeneration" value={meterForm.onSiteGenerationId} options={meterLookups.data?.onSiteGenerations ?? []} onChange={(value) => updateMeterForm("onSiteGenerationId", value)} />
              <MeterSelect label="Type" value={meterForm.typeId} options={meterLookups.data?.types ?? []} onChange={(value) => updateMeterForm("typeId", value)} />
              <MeterSelect label="Status" value={meterForm.statusId} options={meterLookups.data?.statuses ?? []} onChange={(value) => updateMeterForm("statusId", value)} />
            </div>
            <FormControlLabel control={<Checkbox checked={meterForm.isActive} onChange={(event) => updateMeterForm("isActive", event.target.checked)} />} label="Active" />
            <RichTextEditor label="Notes" value={meterForm.notes} onChange={(value) => updateMeterForm("notes", value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMeterModal} disabled={savingMeter}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveMeter()} disabled={savingMeter}>
            {savingMeter ? "Saving..." : meterFormMode === "edit" ? "Update Meter" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewedMeter)} onClose={() => setViewedMeter(null)} fullWidth maxWidth="sm">
        <DialogTitle>Meter Details</DialogTitle>
        <DialogContent>
          {viewedMeter ? (
            <dl className="company-detail-list">
              <dt>Account Number</dt>
              <dd>{viewedMeter.accountNumber ?? "-"}</dd>
              <dt>Service Ref/POD</dt>
              <dd>{viewedMeter.serviceRefPod ?? "-"}</dd>
              <dt>Name Key</dt>
              <dd>{viewedMeter.nameKey ?? "-"}</dd>
              <dt>Meter</dt>
              <dd>{viewedMeter.meter ?? "-"}</dd>
              <dt>Service Address</dt>
              <dd>{viewedMeter.serviceAddress ?? "-"}</dd>
              <dt>City / State / Zip</dt>
              <dd>{[viewedMeter.city, viewedMeter.state, viewedMeter.zip].filter(Boolean).join(", ") || "-"}</dd>
              <dt>Status</dt>
              <dd>{viewedMeter.status ?? "-"}</dd>
              <dt>Type</dt>
              <dd>{viewedMeter.type ?? "-"}</dd>
              <dt>Product</dt>
              <dd>{viewedMeter.product ?? "-"}</dd>
              <dt>Utility</dt>
              <dd>{viewedMeter.utility ?? "-"}</dd>
              <dt>Active</dt>
              <dd>{viewedMeter.isActive ? "Active" : "Inactive"}</dd>
              <dt>Notes</dt>
              <dd>{viewedMeter.notes ? <div dangerouslySetInnerHTML={{ __html: viewedMeter.notes }} /> : "-"}</dd>
            </dl>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewedMeter(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {isDashboardView ? (
      <div className="content-grid">
        <section className="panel">
          <h2>Pipeline by stage</h2>
          {pipeline.isLoading ? <p>Loading pipeline...</p> : null}
          {pipeline.isError ? <p className="muted">Connect the API and seed data to load live reporting.</p> : null}
          {pipeline.data?.data?.map((item: { stage: string; _count: { id: number }; _sum: { amount: string } }) => (
            <div className="report-row" key={item.stage}>
              <span>{item.stage}</span>
              <strong>{item._count.id} deals</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          <p className="muted">Audit log events will appear here as CRM actions are recorded.</p>
        </section>
      </div>
      ) : null}
    </section>
  );
}

interface ContractListPanelProps {
  columns: GridColumn<ContractRow>[];
  contracts: ContractRow[];
  isLoading: boolean;
  isError: boolean;
  error: string;
  availabilityNotice?: string;
  onAdd: () => void;
  addDisabled?: boolean;
}

export function CompanyDocumentsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFileId = searchParams.get("fileId") ?? "";
  const selectedFileName = searchParams.get("fileName") ?? "";
  const [pdfUrl, setPdfUrl] = useState("");
  const companyDocuments = useQuery({
    queryKey: ["company-documents", companyId],
    queryFn: async () => (await api.get(`/reports/tbl-companies/${companyId}/documents`)).data as CompanyDocumentsResponse,
    enabled: Boolean(companyId),
    retry: false
  });
  const selectedFile = useQuery({
    queryKey: ["sharepoint-file-content", selectedFileId],
    queryFn: async () => (await api.get(`/reports/sharepoint-files/${encodeURIComponent(selectedFileId)}/content`, { responseType: "blob" })).data as Blob,
    enabled: Boolean(selectedFileId),
    retry: false
  });

  useEffect(() => {
    if (!selectedFile.data) {
      setPdfUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile.data);
    setPdfUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile.data]);

  function selectFile(node: DocumentNode) {
    setSearchParams({ fileId: node.id, fileName: node.name });
  }

  return (
    <section className="page document-viewer-page">
      <div className="document-viewer-shell">
        <aside className="document-viewer-tree">
          <div className="document-viewer-title">
            <h2>Documents</h2>
            <Tooltip title={selectedFileName.length > 20 ? selectedFileName : ""} followCursor>
              <span>{shortenFileName(selectedFileName) || "Select a PDF"}</span>
            </Tooltip>
          </div>
          {companyDocuments.isLoading ? <p className="muted">Loading documents...</p> : null}
          {companyDocuments.isError ? <p className="error">Unable to load documents.</p> : null}
          {companyDocuments.data?.skipped ? <p className="muted">SharePoint is not configured.</p> : null}
          {!companyDocuments.isLoading && !companyDocuments.isError && !companyDocuments.data?.skipped ? (
            <DocumentTree nodes={companyDocuments.data?.tree ?? []} onFileClick={selectFile} selectedFileId={selectedFileId} />
          ) : null}
        </aside>
        <main className="document-pdf-panel">
          {selectedFile.isLoading ? <p className="muted document-viewer-message">Loading PDF...</p> : null}
          {selectedFile.isError ? <p className="error document-viewer-message">Unable to load PDF.</p> : null}
          {pdfUrl ? (
            <iframe title={selectedFileName || "PDF viewer"} src={pdfUrl} />
          ) : !selectedFile.isLoading && !selectedFile.isError ? (
            <div className="document-empty-viewer">
              <FileText size={40} />
              <p>Select a PDF from the document tree.</p>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}

function CompanyDocumentsPreview({ nodes, companyId }: { nodes: DocumentNode[]; companyId: string | number }) {
  const navigate = useNavigate();
  const previewTree = limitDocumentTree(nodes, 2);

  function openDocumentViewer() {
    navigate(`/companies/${encodeURIComponent(String(companyId))}/documents`);
  }

  if (!previewTree.length) return <p className="muted">No documents found.</p>;

  return (
    <div className="company-documents-preview">
      <DocumentTree nodes={previewTree} companyId={companyId} expandAll />
      <Button className="company-documents-more" size="small" onClick={() => openDocumentViewer()}>
        More
      </Button>
    </div>
  );
}

function limitDocumentTree(nodes: DocumentNode[], maximumFiles: number): DocumentNode[] {
  let remainingFiles = maximumFiles;

  function visit(items: DocumentNode[]): DocumentNode[] {
    const result: DocumentNode[] = [];
    for (const node of items) {
      if (remainingFiles <= 0) break;
      if (node.type === "file") {
        result.push(node);
        remainingFiles -= 1;
        continue;
      }

      const children = visit(node.children ?? []);
      if (children.length) result.push({ ...node, children });
    }
    return result;
  }

  return visit(nodes);
}

function DocumentTree({
  nodes,
  level = 0,
  companyId,
  onFileClick,
  selectedFileId,
  expandAll = false
}: {
  nodes: DocumentNode[];
  level?: number;
  companyId?: string | number;
  onFileClick?: (node: DocumentNode) => void;
  selectedFileId?: string;
  expandAll?: boolean;
}) {
  if (!nodes.length) return <p className="muted">No documents found.</p>;

  return (
    <ul className="document-tree">
      {nodes.map((node) => (
        <DocumentTreeNode key={node.id} node={node} level={level} companyId={companyId} onFileClick={onFileClick} selectedFileId={selectedFileId} expandAll={expandAll} />
      ))}
    </ul>
  );
}

function DocumentTreeNode({
  node,
  level,
  companyId,
  onFileClick,
  selectedFileId,
  expandAll
}: {
  node: DocumentNode;
  level: number;
  companyId?: string | number;
  onFileClick?: (node: DocumentNode) => void;
  selectedFileId?: string;
  expandAll: boolean;
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(expandAll || level === 0);
  const isFolder = node.type === "folder";
  const fileExtension = node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() ?? "" : "";
  const displayedFileName = shortenFileName(node.name);
  const openFile = () => {
    if (onFileClick) {
      onFileClick(node);
      return;
    }

    if (companyId) {
      navigate(`/companies/${companyId}/documents?fileId=${encodeURIComponent(node.id)}&fileName=${encodeURIComponent(node.name)}`);
    }
  };
  const isSelected = Boolean(selectedFileId && selectedFileId === node.id);

  return (
    <li>
      <div className={`document-node ${isFolder ? "folder" : "file"}`}>
        {isFolder ? (
          <button
            type="button"
            className="document-folder-button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
          >
            {isOpen ? <FolderOpen size={15} /> : <Folder size={15} />}
            <span>{node.name}</span>
          </button>
        ) : (
          <Tooltip title={node.name.length > 20 ? node.name : ""} followCursor>
            <button type="button" className={`document-file-button ${isSelected ? "selected" : ""} ${fileExtension ? `file-${fileExtension}` : ""}`} onClick={openFile}>
              <FileText size={14} />
              <span>{displayedFileName}</span>
            </button>
          </Tooltip>
        )}
      </div>
      {isFolder && isOpen && node.children?.length ? (
        <DocumentTree nodes={node.children} level={level + 1} companyId={companyId} onFileClick={onFileClick} selectedFileId={selectedFileId} expandAll={expandAll} />
      ) : null}
    </li>
  );
}

function ContractListPanel({ columns, contracts, isLoading, isError, error, availabilityNotice, onAdd, addDisabled = false }: ContractListPanelProps) {
  return (
    <section className="account-data-panel">
      <div className="account-data-title">
        <h2>Contract List</h2>
        <div className="account-data-actions">
          {/*  <IconButton size="small" aria-label="Search contracts">
            <Search size={17} />
          </IconButton> */}
          <Tooltip title={addDisabled ? "Make company active to add contracts" : "Add new contract"}>
            <span>
              <Button size="small" variant="contained" onClick={onAdd} startIcon={<Plus size={16} />} disabled={addDisabled}>Add New Contract</Button>
            </span>
          </Tooltip>
          {/*  <IconButton size="small" aria-label="Choose contract columns">
            <Columns3 size={17} />
          </IconButton>
          <span>Columns</span> */}
        </div>
      </div>
      {availabilityNotice ? <Alert severity="error" className="contract-panel-message">{availabilityNotice}</Alert> : null}
      {error ? <p className="error contract-panel-message">{error}</p> : null}
      {isError ? <p className="error contract-panel-message">Unable to load contracts.</p> : null}
      {isLoading ? <p className="muted contract-panel-message">Loading contracts...</p> : null}
      <div className="contract-grid-wrap">

        <IntiliGrid checkboxSelection columns={columns} rows={contracts} />

      </div>
    </section>
  );
}

interface MeterListPanelProps {
  columns: GridColumn<MeterRow>[];
  meters: MeterRow[];
  isLoading: boolean;
  isError: boolean;
  error: string;
  onAdd: () => void;
  onAddMore: () => void;
  addDisabled?: boolean;
}

function MeterListPanel({ columns, meters, isLoading, isError, error, onAdd, onAddMore, addDisabled = false }: MeterListPanelProps) {
  return (
    <section className="account-data-panel">
      <div className="account-data-title">
        <h2>Meter List</h2>
        <div className="account-data-actions">
          {/*  <IconButton size="small" aria-label="Search meters">
            <Search size={17} />
          </IconButton> */}
          <Tooltip title={addDisabled ? "Make company active to add meters" : "Add new meter"}>
            <span>
              <Button size="small" variant="contained" onClick={onAdd} startIcon={<Plus size={16} />} disabled={addDisabled}>Add New Meter</Button>
            </span>
          </Tooltip>
          <Tooltip title={addDisabled ? "Make company active to add meters" : "Add multiple meters to this company"}>
            <span>
              <Button size="small" variant="outlined" onClick={onAddMore} startIcon={<Upload size={16} />} disabled={addDisabled}>Add More Meters</Button>
            </span>
          </Tooltip>
          {/* <IconButton size="small" aria-label="Choose meter columns">
            <Columns3 size={17} />
          </IconButton>
          <span>Columns</span> */}
        </div>
      </div>
      {error ? <p className="error contract-panel-message">{error}</p> : null}
      {isError ? <p className="error contract-panel-message">Unable to load meters.</p> : null}
      {isLoading ? <p className="muted contract-panel-message">Loading meters...</p> : null}
      <div className="contract-grid-wrap">
        <IntiliGrid checkboxSelection columns={columns} rows={meters} />
      </div>
    </section>
  );
}

interface MeterSelectProps {
  label: string;
  value: number;
  options: LookupOption[];
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

function MeterSelect({ label, value, options, onChange, disabled = false, placeholder, required = false }: MeterSelectProps) {
  return (
    <TextField select required={required} label={label} value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled}>
      <MenuItem value={0}>{placeholder ?? `Select ${label}`}</MenuItem>
      {options.map((option) => <MenuItem key={option.id} value={Number(option.id)}>{option.name}</MenuItem>)}
    </TextField>
  );
}

interface ContractForm {
  companyId: number;
  brokerId: number;
  supplierId: number;
  swingId: number;
  passThroughId: number;
  billTypeId: number;
  productId: number;
  meterIds: number[];
  rate: string;
  fee: string;
  startDate: string;
  endDate: string;
  cFile: string;
  contractFile: ContractFilePayload | null;
  notes: string;
  isActive: boolean;
}

interface ContractFilePayload {
  name: string;
  contentType: string;
  contentBase64: string;
}

function emptyContractForm(): ContractForm {
  return {
    companyId: 0,
    brokerId: 0,
    supplierId: 0,
    swingId: 0,
    passThroughId: 0,
    billTypeId: 0,
    productId: 0,
    meterIds: [],
    rate: "",
    fee: "",
    startDate: "",
    endDate: "",
    cFile: "",
    contractFile: null,
    notes: "",
    isActive: true
  };
}

function contractToForm(contract: ContractRow): ContractForm {
  return {
    companyId: Number(contract.companyId ?? 0),
    brokerId: Number(contract.brokerId ?? 0),
    supplierId: Number(contract.supplierId ?? 0),
    swingId: Number(contract.swingId ?? 0),
    passThroughId: Number(contract.passThroughId ?? 0),
    billTypeId: Number(contract.billTypeId ?? 0),
    productId: 0,
    meterIds: [],
    rate: contract.rate === null || contract.rate === undefined ? "" : String(contract.rate),
    fee: contract.fee === null || contract.fee === undefined ? "" : String(contract.fee),
    startDate: dateInputValue(contract.startDate),
    endDate: dateInputValue(contract.endDate),
    cFile: contract.cFile ?? "",
    contractFile: null,
    notes: contract.notes ?? "",
    isActive: Boolean(contract.isActive)
  };
}

interface MeterForm {
  companyId: number;
  accountNumber: string;
  serviceRefPod: string;
  nameKey: string;
  meter: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  taxExempt: number;
  cycleReadDay: string;
  rate: number;
  demand: string;
  annualUsage: string;
  loadProfile: string;
  iEnergyBillId: number;
  energyDashboardId: number;
  onSiteGenerationId: number;
  typeId: number;
  productId: number;
  utilityId: number;
  statusId: number;
  notes: string;
  isActive: boolean;
}

function emptyMeterForm(): MeterForm {
  return {
    companyId: 0,
    accountNumber: "",
    serviceRefPod: "",
    nameKey: "",
    meter: "",
    serviceAddress: "",
    city: "",
    state: "",
    zip: "",
    taxExempt: 0,
    cycleReadDay: "",
    rate: 0,
    demand: "",
    annualUsage: "",
    loadProfile: "",
    iEnergyBillId: 0,
    energyDashboardId: 0,
    onSiteGenerationId: 0,
    typeId: 0,
    productId: 0,
    utilityId: 0,
    statusId: 0,
    notes: "",
    isActive: true
  };
}

function meterToForm(meter: MeterRow): MeterForm {
  return {
    companyId: Number(meter.companyId ?? 0),
    accountNumber: meter.accountNumber ?? "",
    serviceRefPod: meter.serviceRefPod ?? "",
    nameKey: meter.nameKey ?? "",
    meter: meter.meter ?? "",
    serviceAddress: meter.serviceAddress ?? "",
    city: meter.city ?? "",
    state: meter.state ?? "",
    zip: meter.zip ?? "",
    taxExempt: Number(meter.taxExempt ?? 0),
    cycleReadDay: meter.cycleReadDay ?? "",
    rate: Number(meter.rate ?? 0),
    demand: meter.demand ?? "",
    annualUsage: meter.annualUsage ?? "",
    loadProfile: meter.loadProfile ?? "",
    iEnergyBillId: Number(meter.iEnergyBill ?? 0),
    energyDashboardId: Number(meter.energyDashboard ?? 0),
    onSiteGenerationId: Number(meter.onSiteGeneration ?? 0),
    typeId: Number(meter.typeId ?? 0),
    productId: Number(meter.productId ?? 0),
    utilityId: Number(meter.utilityId ?? 0),
    statusId: Number(meter.statusId ?? 0),
    notes: meter.notes ?? "",
    isActive: Boolean(meter.isActive)
  };
}

function dateInputValue(value: unknown) {
  if (!value) return "";
  return new Date(String(value)).toISOString().slice(0, 10);
}

function calculateContractMonths(startValue: string, endValue: string) {
  if (!startValue || !endValue) return null;
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function calculateMeterLoadProfile(demandValue: string, annualUsageValue: string) {
  const demandText = demandValue.trim().replace(/,/g, "");
  const annualUsageText = annualUsageValue.trim().replace(/,/g, "");
  if (!demandText && !annualUsageText) return "";
  const demand = demandText ? Number(demandText) : 0;
  const annualUsage = annualUsageText ? Number(annualUsageText) : 0;
  if (!Number.isFinite(demand) || !Number.isFinite(annualUsage)) return "";
  return String(Number((demand + annualUsage).toFixed(6)));
}

function formatDate(value: unknown) {
  if (!value) return "-";
  return new Date(String(value)).toLocaleDateString();
}

interface NewCompanyForm {
  organizationId: number;
  companyName: string;
  legalEntityName: string;
  mailingAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  email: string;
  phoneNumber: string;
  taxId: string;
  url: string;
  notes: string;
  isActive: boolean;
}

interface BulkCompanyResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; companyName: string; error: string }>;
}

interface BulkMeterResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; meter: string; error: string }>;
}

function parseBulkCompanies(worksheet: XLSX.WorkSheet): NewCompanyForm[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  return rows.map((source) => {
    const row = new Map(Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value]));
    const value = (...keys: string[]) => keys.map((key) => row.get(key)).find((item) => item !== undefined);
    const text = (...keys: string[]) => String(value(...keys) ?? "").trim();
    const activeValue = text("active", "isactive").toLowerCase();
    const organizationValue = Number(value("organizationid", "orgid"));

    return {
      organizationId: Number.isInteger(organizationValue) && organizationValue > 0 ? organizationValue : 1,
      companyName: text("companyname", "company"),
      legalEntityName: text("legalentityname", "legalname"),
      mailingAddress: text("mailingaddress", "address"),
      city: text("city"),
      state: text("state"),
      country: text("country"),
      postalCode: text("postalcode", "zipcode", "zip"),
      email: text("email"),
      phoneNumber: text("phonenumber", "phone"),
      taxId: text("taxid"),
      url: text("url", "website"),
      notes: text("notes"),
      isActive: activeValue ? !["false", "no", "0", "inactive"].includes(activeValue) : true
    };
  });
}

function parseBulkMeters(worksheet: XLSX.WorkSheet, companyId: number, lookups?: MeterLookups): MeterForm[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  return rows.map((source, index) => {
    const rowNumber = index + 2;
    const row = new Map(Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value]));
    const value = (...keys: string[]) => keys.map((key) => row.get(key)).find((item) => item !== undefined);
    const text = (...keys: string[]) => String(value(...keys) ?? "").trim();
    const lookupId = (label: string, options: LookupOption[] | undefined, ...keys: string[]) => {
      const rawValue = text(...keys);
      if (!rawValue) return 0;
      const numericValue = Number(rawValue);
      if (Number.isInteger(numericValue) && numericValue > 0) {
        if (!options || options.some((option) => Number(option.id) === numericValue)) return numericValue;
        throw new Error(`Row ${rowNumber}: Unknown ${label} ID "${rawValue}". Use a value from the template reference sheets.`);
      }
      const normalizedValue = rawValue.toLowerCase();
      const match = options?.find((option) => String(option.name ?? "").trim().toLowerCase() === normalizedValue);
      if (match) return Number(match.id);
      throw new Error(`Row ${rowNumber}: Unknown ${label} "${rawValue}". Use a name or ID from the template reference sheets.`);
    };
    const accountNumber = text("accountnumber", "account");
    const meter = text("meter", "meternumber");
    if (!accountNumber && !meter) {
      throw new Error(`Row ${rowNumber}: Account Number or Meter is required.`);
    }
    const demand = text("demand");
    const annualUsage = text("annualusage", "annusagedthkwh", "usage");
    const activeValue = text("active", "isactive").toLowerCase();
    const utilityId = lookupId("Utility", lookups?.utilities, "utility", "utilityid");
    const utilityRates = lookups?.rates.filter((rate) => String(rate.utilityId ?? "") === String(utilityId));
    const rate = lookupId("Rate for the selected Utility", utilityRates, "rate", "rateid");

    return {
      companyId,
      accountNumber,
      serviceRefPod: text("servicerefpod", "serviceref", "pod"),
      nameKey: text("namekey"),
      meter,
      serviceAddress: text("serviceaddress", "address"),
      city: text("city"),
      state: text("state"),
      zip: text("zip", "zipcode", "postalcode"),
      taxExempt: lookupId("Tax Exempt", lookups?.taxExempts, "taxexempt", "taxexemptid"),
      cycleReadDay: text("cyclereadday", "cycleday", "readday"),
      rate,
      demand,
      annualUsage,
      loadProfile: text("loadprofile") || calculateMeterLoadProfile(demand, annualUsage),
      iEnergyBillId: lookupId("iEnergyBill", lookups?.iEnergyBills, "ienergybill", "ienergybillid"),
      energyDashboardId: lookupId("EnergyDashboard", lookups?.energyDashboards, "energydashboard", "energydashboardid"),
      onSiteGenerationId: lookupId("OnSiteGeneration", lookups?.onSiteGenerations, "onsitegeneration", "onsitegenerationid"),
      typeId: lookupId("Type", lookups?.types, "type", "typeid"),
      productId: lookupId("Product", lookups?.products, "product", "productid"),
      utilityId,
      statusId: lookupId("Status", lookups?.statuses, "status", "statusid"),
      notes: text("notes", "note"),
      isActive: activeValue ? !["false", "no", "0", "inactive"].includes(activeValue) : true
    };
  });
}

function emptyCompanyForm(): NewCompanyForm {
  return {
    organizationId: 1,
    companyName: "",
    legalEntityName: "",
    mailingAddress: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    email: "",
    phoneNumber: "",
    taxId: "",
    url: "",
    notes: "",
    isActive: true
  };
}

function companyToForm(company: TblCompanyRow): NewCompanyForm {
  return {
    organizationId: Number(company.organizationId ?? 1),
    companyName: company.companyName ?? "",
    legalEntityName: company.legalEntityName ?? "",
    mailingAddress: company.mailingAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    country: company.country ?? "",
    postalCode: company.postalCode ?? "",
    email: company.email ?? "",
    phoneNumber: company.phoneNumber ?? "",
    taxId: company.taxId ?? "",
    url: company.url ?? "",
    notes: company.notes ?? "",
    isActive: Boolean(company.isActive)
  };
}

function companyApiError(error: unknown) {
  return isAxiosError<{ error?: string; details?: { issues?: { message: string }[] } }>(error)
    ? error.response?.data.details?.issues?.[0]?.message ?? error.response?.data.error
    : undefined;
}

interface TblCompanyRow {
  id: string | number;
  organizationId?: string | number;
  customerId?: string;
  companyName?: string;
  legalEntityName?: string;
  mailingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email?: string;
  phoneNumber?: string;
  taxId?: string;
  url?: string;
  notes?: string;
  companyFolderId?: string | null;
  contractFolderId?: string | null;
  utilityBillsFolderId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function richTextToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .trim();
}

function RichTextEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value && document.activeElement !== editor) editor.innerHTML = value;
  }, [value]);

  function applyFormat(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <div className="company-notes-editor">
      <label>{label}</label>
      <div className="rich-text-toolbar" aria-label="Text formatting">
        <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("bold")}><strong>B</strong></Button>
        <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("italic")}><em>I</em></Button>
        <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("underline")}><u>U</u></Button>
        <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("insertUnorderedList")}>List</Button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-input"
        contentEditable
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

interface LookupOption {
  id: string | number;
  name?: string;
}

function lookupName(value: unknown, options?: LookupOption[]) {
  if (value === null || value === undefined || value === "") return "";
  return options?.find((option) => String(option.id) === String(value))?.name ?? String(value);
}

interface ZipDetailOption {
  id: string | number;
  code: string;
  city: string;
  state: string;
  stateName: string;
}

function shortenFileName(fileName: string, maximumLength = 20) {
  if (fileName.length <= maximumLength) return fileName;
  return `${fileName.slice(0, maximumLength - 3)}...`;
}

interface USStateOption {
  id: string | number;
  name: string;
  code: string;
}

interface MeterLookups {
  iEnergyBills: LookupOption[];
  energyDashboards: LookupOption[];
  onSiteGenerations: LookupOption[];
  types: LookupOption[];
  products: LookupOption[];
  utilities: LookupOption[];
  statuses: LookupOption[];
  taxExempts: LookupOption[];
  rates: Array<LookupOption & { utilityId?: string | number | null }>;
}

interface CompanyDocumentsResponse {
  skipped: boolean;
  tree: DocumentNode[];
}

interface DocumentNode {
  id: string;
  name: string;
  type: "folder" | "file";
  webUrl?: string;
  downloadUrl?: string;
  children?: DocumentNode[];
}

interface ContractRow {
  id: string | number;
  contractId?: string;
  name?: string;
  companyId?: string | number | null;
  companyName?: string | null;
  brokerId?: string | number | null;
  broker?: string | null;
  supplierId?: string | number | null;
  supplier?: string | null;
  swingId?: string | number | null;
  swing?: string | null;
  passThroughId?: string | number | null;
  passThrough?: string | null;
  billTypeId?: string | number | null;
  billType?: string | null;
  rate?: string | number | null;
  fee?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  months?: string | number | null;
  cFile?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  onDate?: string | null;
  notes?: string | null;
}

interface MeterRow {
  id: string | number;
  companyId?: string | number | null;
  companyName?: string | null;
  accountNumber?: string | null;
  serviceRefPod?: string | null;
  nameKey?: string | null;
  meter?: string | null;
  serviceAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  taxExempt?: string | number | null;
  cycleReadDay?: string | null;
  rate?: string | number | null;
  demand?: string | null;
  annualUsage?: string | null;
  loadProfile?: string | null;
  iEnergyBill?: string | number | null;
  energyDashboard?: string | number | null;
  onSiteGeneration?: string | null;
  statusId?: string | number | null;
  status?: string | null;
  notes?: string | null;
  typeId?: string | number | null;
  type?: string | null;
  productId?: string | number | null;
  product?: string | null;
  utilityId?: string | number | null;
  utility?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
