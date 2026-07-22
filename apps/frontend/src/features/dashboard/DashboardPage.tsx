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
  const canManageMembers = user?.role === "superadmin" || user?.role === "admin";
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
    newCompany.email,
    newCompany.phoneNumber,
    newCompany.mailingAddress,
    newCompany.city,
    newCompany.state,
    newCompany.postalCode
  ].every((value) => value.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCompany.email.trim());
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
  const [meterError, setMeterError] = useState("");
  const [meterForm, setMeterForm] = useState<MeterForm>(emptyMeterForm());

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
    enabled: user?.role === "superadmin" || isCompaniesView || isContractsView || isMetersView,
    retry: false
  });
  const contracts = useQuery({
    queryKey: ["contracts", isContractsView ? "all" : viewedCompany?.id],
    queryFn: async () => (
      await api.get("/reports/contracts", {
        params: { companyId: isContractsView ? undefined : viewedCompany?.id }
      })
    ).data as { total: number; data: ContractRow[] },
    enabled: Boolean(viewedCompany) || isContractsView || (user?.role === "superadmin" && isDashboardView),
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
    enabled: Boolean(viewedCompany?.id) || isMetersView || (user?.role === "superadmin" && isDashboardView),
    retry: false
  });
  const members = useQuery({
    queryKey: ["members", "dashboard"],
    queryFn: async () => (await api.get("/reports/members")).data as { total: number },
    enabled: user?.role === "superadmin" && isDashboardView,
    retry: false
  });
  const meterLookups = useQuery({
    queryKey: ["meter-lookups"],
    queryFn: async () => (await api.get("/reports/meter-lookups")).data as MeterLookups,
    enabled: Boolean(viewedCompany) || isMeterModalOpen,
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
              <Badge badgeContent={activityUnreadCounts.data?.byCompany[String(row.id)] ?? 0} color="error" max={99}>
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
    { field: "taxExempt", headerName: "Tax Exempt", minWidth: 140 },
    { field: "cycleReadDay", headerName: "Cycle/Read Day", minWidth: 150 },
    { field: "rate", headerName: "Rate", minWidth: 120 },
    { field: "demand", headerName: "Demand", minWidth: 120 },
    { field: "annualUsage", headerName: "Ann. Usage-Dth/kWh", minWidth: 190 },
    { field: "loadProfile", headerName: "Load Profile", minWidth: 150 },
    { field: "iEnergyBill", headerName: "iEnergyBill", minWidth: 130 },
    { field: "energyDashboard", headerName: "EnergyDashboard", minWidth: 170 },
    { field: "onSiteGeneration", headerName: "OnSiteGeneration", minWidth: 180 },
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

  function openCreateMeter() {
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
      setIsMeterModalOpen(false);
      setEditingMeterId(null);
      setMeterFormMode("create");
      setMeterForm(emptyMeterForm());
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
      ["Email", newCompany.email],
      ["Phone number", newCompany.phoneNumber],
      ["Mailing address", newCompany.mailingAddress],
      ["City", newCompany.city],
      ["State", newCompany.state],
      ["PIN / Postal code", newCompany.postalCode]
    ] as const;
    const missingField = requiredFields.find(([, value]) => !value.trim());
    if (missingField) {
      setCompanyError(`${missingField[0]} is required.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCompany.email.trim())) {
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
    if (selectedCompanies.length < 2) return;
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

  return (
    <section className="page">
      {isDashboardView ? (
      <div className="kpi-grid">
        {user?.role === "superadmin" ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/companies")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/companies"); }}>
            <span>Companies</span>
            <strong>{companies.isLoading ? "..." : companies.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {user?.role === "superadmin" ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/contracts")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/contracts"); }}>
            <span>Contracts</span>
            <strong>{contracts.isLoading ? "..." : contracts.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {user?.role === "superadmin" ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/meters")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/meters"); }}>
            <span>Meters</span>
            <strong>{meters.isLoading ? "..." : meters.data?.total ?? 0}</strong>
          </article>
        ) : null}
        {user?.role === "superadmin" ? (
          <article className="clickable-kpi" role="button" tabIndex={0} onClick={() => navigate("/members")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/members"); }}>
            <span>Members</span>
            <strong>{members.isLoading ? "..." : members.data?.total ?? 0}</strong>
          </article>
        ) : null}
      </div>
      ) : null}

      {(user?.role === "superadmin" && isDashboardView) || isCompaniesView ? (
        <section className="panel companies-panel">
          <div className="panel-title-row">
            <h2>Companies</h2>
            <div className="panel-title-actions">
              {selectedCompanies.length > 1 ? (
                <>
                  <Button variant="outlined" color="success" onClick={() => void updateSelectedCompanyStatus(true)} disabled={isUpdatingCompanyStatus}>
                    {isUpdatingCompanyStatus ? "Updating..." : "Make Active"}
                  </Button>
                  <Button variant="outlined" color="warning" onClick={() => void updateSelectedCompanyStatus(false)} disabled={isUpdatingCompanyStatus}>
                    {isUpdatingCompanyStatus ? "Updating..." : "Make Inactive"}
                  </Button>
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
          {contractAvailabilityNotice ? <Alert severity="error">{contractAvailabilityNotice}</Alert> : null}
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
            <Button variant="contained" onClick={openCreateMeter}>Add New Meter</Button>
          </div>
          {meterError ? <p className="error">{meterError}</p> : null}
          {meters.isError ? <p className="error">Unable to load meters.</p> : null}
          {meters.isLoading ? <p className="muted">Loading meters...</p> : null}
          <IntiliGrid checkboxSelection columns={meterColumns} rows={meters.data?.data ?? []} />
        </section>
      ) : null}

      <Dialog open={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{companyFormMode === "edit" ? "Edit Company" : "Add New Company"}</DialogTitle>
        <DialogContent>
          {companyError ? <p className="error">{companyError}</p> : null}
          <div className="company-form-grid">
            <TextField label="Company Name" required value={newCompany.companyName} onChange={(event) => updateNewCompany("companyName", event.target.value)} />
            <TextField label="Legal Entity Name" required value={newCompany.legalEntityName} onChange={(event) => updateNewCompany("legalEntityName", event.target.value)} />
            <TextField label="Email" type="email" required value={newCompany.email} onChange={(event) => updateNewCompany("email", event.target.value)} />
            <TextField label="Phone Number" type="tel" required value={newCompany.phoneNumber} onChange={(event) => updateNewCompany("phoneNumber", event.target.value)} />
            <TextField label="Mailing Address" required value={newCompany.mailingAddress} onChange={(event) => updateNewCompany("mailingAddress", event.target.value)} />
            <TextField label="City" required value={newCompany.city} onChange={(event) => updateNewCompany("city", event.target.value)} />
            <TextField select label="State" required value={newCompany.state} onChange={(event) => updateNewCompany("state", event.target.value)}>
              <MenuItem value="">Select state</MenuItem>
              {usStates.data?.data.map((state) => (
                <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
              ))}
            </TextField>
            <TextField label="PIN / Postal Code" required value={newCompany.postalCode} onChange={(event) => updateNewCompany("postalCode", event.target.value)} />
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
                      <div className="company-note-content" dangerouslySetInnerHTML={{ __html: viewedCompany.notes }} />
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
                        <DocumentTree nodes={companyDocuments.data?.tree ?? []} companyId={viewedCompany.id} />
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

      <Dialog open={isMeterModalOpen} onClose={() => setIsMeterModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{meterFormMode === "edit" ? "Edit Meter" : "Add New Meter"}</DialogTitle>
        <DialogContent>
          {meterError ? <p className="error">{meterError}</p> : null}
          <div className="company-form-grid">
            <div className="meter-form-row meter-form-row-four">
              <TextField
                label="Zip"
                value={meterForm.zip}
                onChange={(event) => updateMeterZip(event.target.value)}
                helperText={meterZipMatches.isLoading ? "Finding city and state..." : "Enter or select a ZIP code"}
                slotProps={{ htmlInput: { list: "meter-zip-options", autoComplete: "postal-code" } }}
              />
              <TextField label="City" value={meterForm.city} slotProps={{ htmlInput: { readOnly: true } }} />
              <TextField label="State" value={meterForm.state} slotProps={{ htmlInput: { readOnly: true } }} />
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
                onChange={(value) => updateMeterForm("utilityId", value)}
                placeholder="Select Utility"
              />
              <MeterSelect label="Rate" value={meterForm.rate} options={meterLookups.data?.rates ?? []} onChange={(value) => updateMeterForm("rate", value)} />
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
          <Button onClick={() => setIsMeterModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveMeter} disabled={savingMeter}>
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

function DocumentTree({
  nodes,
  level = 0,
  companyId,
  onFileClick,
  selectedFileId
}: {
  nodes: DocumentNode[];
  level?: number;
  companyId?: string | number;
  onFileClick?: (node: DocumentNode) => void;
  selectedFileId?: string;
}) {
  if (!nodes.length) return <p className="muted">No documents found.</p>;

  return (
    <ul className="document-tree">
      {nodes.map((node) => (
        <DocumentTreeNode key={node.id} node={node} level={level} companyId={companyId} onFileClick={onFileClick} selectedFileId={selectedFileId} />
      ))}
    </ul>
  );
}

function DocumentTreeNode({
  node,
  level,
  companyId,
  onFileClick,
  selectedFileId
}: {
  node: DocumentNode;
  level: number;
  companyId?: string | number;
  onFileClick?: (node: DocumentNode) => void;
  selectedFileId?: string;
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(level === 0);
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
        <DocumentTree nodes={node.children} level={level + 1} companyId={companyId} onFileClick={onFileClick} selectedFileId={selectedFileId} />
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
  addDisabled?: boolean;
}

function MeterListPanel({ columns, meters, isLoading, isError, error, onAdd, addDisabled = false }: MeterListPanelProps) {
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
  rates: LookupOption[];
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
