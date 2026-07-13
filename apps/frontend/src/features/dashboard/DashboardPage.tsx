import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Building2, Eye, FileText, Folder, FolderOpen, Pencil, Plus, Power } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractFormMode, setContractFormMode] = useState<"create" | "edit">("create");
  const [viewedContract, setViewedContract] = useState<ContractRow | null>(null);
  const [editingContractId, setEditingContractId] = useState<ContractRow["id"] | null>(null);
  const [savingContract, setSavingContract] = useState(false);
  const [togglingContractId, setTogglingContractId] = useState<ContractRow["id"] | null>(null);
  const [contractError, setContractError] = useState("");
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContractForm());
  const contractCompanyId = viewedCompany?.id ? Number(viewedCompany.id) : contractForm.companyId;
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [meterFormMode, setMeterFormMode] = useState<"create" | "edit">("create");
  const [viewedMeter, setViewedMeter] = useState<MeterRow | null>(null);
  const [editingMeterId, setEditingMeterId] = useState<MeterRow["id"] | null>(null);
  const [savingMeter, setSavingMeter] = useState(false);
  const [togglingMeterId, setTogglingMeterId] = useState<MeterRow["id"] | null>(null);
  const [meterError, setMeterError] = useState("");
  const [meterForm, setMeterForm] = useState<MeterForm>(emptyMeterForm());
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
    queryFn: async () => (await api.get("/reports/contract-lookups")).data as { brokers: LookupOption[]; suppliers: LookupOption[] },
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
  const meterCities = useQuery({
    queryKey: ["meter-cities", meterForm.state],
    queryFn: async () => (await api.get("/reports/us-cities", { params: { state: meterForm.state } })).data as { data: CityOption[] },
    enabled: Boolean(isMeterModalOpen && meterForm.state),
    retry: false
  });
  const meterZipCodes = useQuery({
    queryKey: ["meter-zips", meterForm.state, meterForm.city],
    queryFn: async () => (await api.get("/reports/zip-codes", { params: { state: meterForm.state, city: meterForm.city } })).data as { data: ZipCodeOption[] },
    enabled: Boolean(isMeterModalOpen && meterForm.state && meterForm.city),
    retry: false
  });
  const meterStateProductUtilities = useQuery({
    queryKey: ["meter-state-product-utilities", meterForm.state, meterForm.productId],
    queryFn: async () => (
      await api.get("/reports/meter-state-product-utilities", {
        params: {
          state: meterForm.state,
          productId: meterForm.productId || undefined
        }
      })
    ).data as MeterStateProductUtilities,
    enabled: Boolean(isMeterModalOpen && meterForm.state),
    retry: false
  });
  const contractStateProductUtilities = useQuery({
    queryKey: ["contract-state-product-utilities", contractForm.state, contractForm.utilityId],
    queryFn: async () => (
      await api.get("/reports/meter-state-product-utilities", {
        params: {
          state: contractForm.state,
          utilityId: contractForm.utilityId || undefined
        }
      })
    ).data as MeterStateProductUtilities,
    enabled: Boolean(isContractModalOpen && contractForm.state),
    retry: false
  });
  const contractMeters = useQuery({
    queryKey: ["contract-meters", contractCompanyId, contractForm.state, contractForm.utilityId, contractForm.productId],
    queryFn: async () => (
      await api.get("/reports/meters", {
        params: {
          companyId: contractCompanyId || undefined,
          state: contractForm.state || undefined,
          utilityId: contractForm.utilityId || undefined,
          productId: contractForm.productId || undefined
        }
      })
    ).data as { total: number; data: MeterRow[] },
    enabled: Boolean(isContractModalOpen && contractCompanyId && contractForm.state && contractForm.utilityId && contractForm.productId),
    retry: false
  });
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
      width: 150,
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

  function updateContractCompany(value: number) {
    setContractForm((current) => ({ ...current, companyId: value, meterIds: [] }));
  }

  function updateContractState(value: string) {
    setContractForm((current) => ({ ...current, state: value, utilityId: 0, productId: 0, meterIds: [] }));
  }

  function updateContractUtility(value: number) {
    setContractForm((current) => ({ ...current, utilityId: value, productId: 0, meterIds: [] }));
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

  function updateMeterState(value: string) {
    setMeterForm((current) => ({ ...current, state: value, city: "", zip: "", productId: 0, utilityId: 0 }));
  }

  function updateMeterCity(value: string) {
    setMeterForm((current) => ({ ...current, city: value, zip: "" }));
  }

  function updateMeterProduct(value: number) {
    setMeterForm((current) => ({ ...current, productId: value, utilityId: 0 }));
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

  function openCreateContract() {
    if (viewedCompany && !viewedCompany.isActive) {
      setContractError("Make company active to add contracts.");
      return;
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

  async function saveContract() {
    setContractError("");
    if (!viewedCompany && !contractForm.companyId) {
      setContractError("Company is required.");
      return;
    }

    setSavingContract(true);
    try {
      const payload = {
        companyId: viewedCompany?.id ? Number(viewedCompany.id) : contractForm.companyId || undefined,
        brokerId: contractForm.brokerId || undefined,
        supplierId: contractForm.supplierId || undefined,
        meterIds: contractForm.meterIds,
        rate: contractForm.rate.trim(),
        fee: contractForm.fee.trim(),
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        cFile: contractForm.cFile.trim(),
        contractFile: contractForm.contractFile ?? undefined,
        isActive: contractForm.isActive
      };

      if (contractFormMode === "edit" && editingContractId !== null) {
        await api.patch(`/reports/contracts/${editingContractId}`, payload);
      } else {
        await api.post("/reports/contracts", payload);
      }

      await contracts.refetch();
      setIsContractModalOpen(false);
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
    if (!newCompany.companyName.trim()) {
      setCompanyError("Company name is required.");
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
        url: newCompany.url.trim()
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
            <Button variant="contained" onClick={openCreateCompany}>Add New Company</Button>
          </div>
          {/*  <p className="muted">Detailed company list from SQL Server table tblCompany.</p> */}
          {companies.isError ? <p className="error">Unable to load tblCompany records.</p> : null}
          <IntiliGrid checkboxSelection columns={companyColumns} rows={companies.data?.data ?? []} onRowClick={viewCompany} />
        </section>
      ) : null}

      {isContractsView ? (
        <section className="panel companies-panel">
          <div className="panel-title-row">
            <h2>Contracts</h2>
            <Button variant="contained" onClick={openCreateContract}>Add New Contract</Button>
          </div>
          {contractError ? <p className="error">{contractError}</p> : null}
          {contracts.isError ? <p className="error">Unable to load contracts.</p> : null}
          {contracts.isLoading ? <p className="muted">Loading contracts...</p> : null}
          <IntiliGrid checkboxSelection columns={contractColumns} rows={contracts.data?.data ?? []} />
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
            <TextField label="Organization ID" type="number" value={newCompany.organizationId} onChange={(event) => updateNewCompany("organizationId", Number(event.target.value))} />
            <TextField label="Company Name" required value={newCompany.companyName} onChange={(event) => updateNewCompany("companyName", event.target.value)} />
            <TextField label="Legal Entity Name" value={newCompany.legalEntityName} onChange={(event) => updateNewCompany("legalEntityName", event.target.value)} />
            <TextField label="Email" value={newCompany.email} onChange={(event) => updateNewCompany("email", event.target.value)} />
            <TextField label="Phone Number" value={newCompany.phoneNumber} onChange={(event) => updateNewCompany("phoneNumber", event.target.value)} />
            <TextField label="Mailing Address" value={newCompany.mailingAddress} onChange={(event) => updateNewCompany("mailingAddress", event.target.value)} />
            <TextField label="City" value={newCompany.city} onChange={(event) => updateNewCompany("city", event.target.value)} />
            <TextField select label="State" value={newCompany.state} onChange={(event) => updateNewCompany("state", event.target.value)}>
              <MenuItem value="">Select state</MenuItem>
              {usStates.data?.data.map((state) => (
                <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
              ))}
            </TextField>
            <TextField label="Country" value={newCompany.country} onChange={(event) => updateNewCompany("country", event.target.value)} />
            <TextField label="Postal Code" value={newCompany.postalCode} onChange={(event) => updateNewCompany("postalCode", event.target.value)} />
            <TextField label="Tax ID" value={newCompany.taxId} onChange={(event) => updateNewCompany("taxId", event.target.value)} />
            <TextField label="URL" value={newCompany.url} onChange={(event) => updateNewCompany("url", event.target.value)} />
            <FormControlLabel control={<Checkbox checked={newCompany.isActive} onChange={(event) => updateNewCompany("isActive", event.target.checked)} />} label="Active" />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCompany} disabled={isSavingCompany}>
            {isSavingCompany ? "Saving..." : companyFormMode === "edit" ? "Update Company" : "Save Company"}
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
                    <div className="note-tile">
                      <strong>Status</strong>
                      <span>{viewedCompany.isActive ? "Active company account" : "Inactive company account"}</span>
                    </div>
                    <div className="note-tile">
                      <strong>Location</strong>
                      <span>{[viewedCompany.city, viewedCompany.state, viewedCompany.country].filter(Boolean).join(", ") || "No location entered"}</span>
                    </div>
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
                    onAdd={openCreateContract}
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
              <TextField select label="Company" value={contractForm.companyId} onChange={(event) => updateContractCompany(Number(event.target.value))}>
                <MenuItem value={0}>Select company</MenuItem>
                {companies.data?.data.map((company) => (
                  <MenuItem key={company.id} value={Number(company.id)}>{company.companyName}</MenuItem>
                ))}
              </TextField>
            ) : null}
            {contractFormMode === "create" ? (
              <>
                <TextField select label="State" value={contractForm.state} onChange={(event) => updateContractState(event.target.value)}>
                  <MenuItem value="">Select state</MenuItem>
                  {usStates.data?.data.map((state) => (
                    <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
                  ))}
                </TextField>
                <MeterSelect
                  label="Utility"
                  value={contractForm.utilityId}
                  options={contractStateProductUtilities.data?.utilities ?? []}
                  onChange={updateContractUtility}
                  disabled={!contractForm.state || contractStateProductUtilities.isLoading}
                  placeholder={contractForm.state ? "Select Utility" : "Select state first"}
                />
                <MeterSelect
                  label="Product"
                  value={contractForm.productId}
                  options={contractStateProductUtilities.data?.products ?? []}
                  onChange={updateContractProduct}
                  disabled={!contractForm.utilityId || contractStateProductUtilities.isLoading}
                  placeholder={contractForm.utilityId ? "Select Product" : "Select utility first"}
                />
              </>
            ) : null}
            <TextField select label="Broker" value={contractForm.brokerId} onChange={(event) => updateContractForm("brokerId", Number(event.target.value))}>
              <MenuItem value={0}>Select broker</MenuItem>
              {contractLookups.data?.brokers.map((broker) => <MenuItem key={broker.id} value={Number(broker.id)}>{broker.name}</MenuItem>)}
            </TextField>
            <TextField select label="Supplier" value={contractForm.supplierId} onChange={(event) => updateContractForm("supplierId", Number(event.target.value))}>
              <MenuItem value={0}>Select supplier</MenuItem>
              {contractLookups.data?.suppliers.map((supplier) => <MenuItem key={supplier.id} value={Number(supplier.id)}>{supplier.name}</MenuItem>)}
            </TextField>
            <TextField label="Rate-kWh/therms" type="number" value={contractForm.rate} onChange={(event) => updateContractForm("rate", event.target.value)} />
            <TextField label="Fee-kWh/Dth" type="number" value={contractForm.fee} onChange={(event) => updateContractForm("fee", event.target.value)} />
            <TextField label="Start Date" type="date" value={contractForm.startDate} onChange={(event) => updateContractForm("startDate", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="End Date" type="date" value={contractForm.endDate} onChange={(event) => updateContractForm("endDate", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <div className="file-upload-field">
              <Button variant="outlined" component="label">
                Upload Contract File
                <input type="file" hidden onChange={(event) => updateContractFile(event.target.files?.[0] ?? null)} />
              </Button>
              <span>{contractForm.cFile || "No file selected"}</span>
            </div>
            <FormControlLabel control={<Checkbox checked={contractForm.isActive} onChange={(event) => updateContractForm("isActive", event.target.checked)} />} label="Active" />
          </div>
          {contractFormMode === "create" && contractForm.productId ? (
            <section className="contract-meter-picker">
              <div className="section-heading-row">
                <h3>Meters</h3>
                <span>{contractForm.meterIds.length} selected</span>
              </div>
              {contractMeters.isLoading ? <p className="muted">Loading meters...</p> : null}
              {contractMeters.isError ? <p className="error">Unable to load meters.</p> : null}
              {!contractMeters.isLoading && !contractMeters.data?.data.length ? <p className="muted">No meters found for selected state, utility, and product.</p> : null}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsContractModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveContract} disabled={savingContract}>
            {savingContract ? "Saving..." : contractFormMode === "edit" ? "Update Contract" : "Submit"}
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
            {!viewedCompany ? (
              <TextField select label="Company" value={meterForm.companyId} onChange={(event) => updateMeterForm("companyId", Number(event.target.value))}>
                <MenuItem value={0}>Select company</MenuItem>
                {companies.data?.data.map((company) => (
                  <MenuItem key={company.id} value={Number(company.id)}>{company.companyName}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField select label="State" value={meterForm.state} onChange={(event) => updateMeterState(event.target.value)}>
              <MenuItem value="">Select state</MenuItem>
              {usStates.data?.data.map((state) => (
                <MenuItem key={state.id} value={state.code}>{state.name} ({state.code})</MenuItem>
              ))}
            </TextField>
            <TextField select label="City" value={meterForm.city} onChange={(event) => updateMeterCity(event.target.value)} disabled={!meterForm.state || meterCities.isLoading}>
              <MenuItem value="">{meterForm.state ? "Select city" : "Select state first"}</MenuItem>
              {meterCities.data?.data.map((city) => (
                <MenuItem key={city.id} value={city.name}>{city.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Zip" value={meterForm.zip} onChange={(event) => updateMeterForm("zip", event.target.value)} disabled={!meterForm.city || meterZipCodes.isLoading}>
              <MenuItem value="">{meterForm.city ? "Select zip" : "Select city first"}</MenuItem>
              {meterZipCodes.data?.data.map((zip) => (
                <MenuItem key={zip.id} value={zip.code}>{zip.code}</MenuItem>
              ))}
            </TextField>
            <MeterSelect
              label="Product"
              value={meterForm.productId}
              options={meterStateProductUtilities.data?.products ?? []}
              onChange={updateMeterProduct}
              disabled={!meterForm.state || meterStateProductUtilities.isLoading}
              placeholder={meterForm.state ? "Select Product" : "Select state first"}
            />
            <MeterSelect
              label="Utility"
              value={meterForm.utilityId}
              options={meterStateProductUtilities.data?.utilities ?? []}
              onChange={(value) => updateMeterForm("utilityId", value)}
              disabled={!meterForm.state || !meterForm.productId || meterStateProductUtilities.isLoading}
              placeholder={meterForm.productId ? "Select Utility" : "Select product first"}
            />

            <TextField label="Account Number" value={meterForm.accountNumber} onChange={(event) => updateMeterForm("accountNumber", event.target.value)} />
            <TextField label="Service Ref/POD" value={meterForm.serviceRefPod} onChange={(event) => updateMeterForm("serviceRefPod", event.target.value)} />
            <TextField label="Name Key" value={meterForm.nameKey} onChange={(event) => updateMeterForm("nameKey", event.target.value)} />
            <TextField label="Meter" value={meterForm.meter} onChange={(event) => updateMeterForm("meter", event.target.value)} />
            <TextField label="Service Address" value={meterForm.serviceAddress} onChange={(event) => updateMeterForm("serviceAddress", event.target.value)} />
            <TextField label="Tax Exempt" value={meterForm.taxExempt} onChange={(event) => updateMeterForm("taxExempt", event.target.value)} />
            <TextField label="Cycle/Read Day" value={meterForm.cycleReadDay} onChange={(event) => updateMeterForm("cycleReadDay", event.target.value)} />
            <TextField label="Rate" value={meterForm.rate} onChange={(event) => updateMeterForm("rate", event.target.value)} />
            <TextField label="Demand" value={meterForm.demand} onChange={(event) => updateMeterForm("demand", event.target.value)} />
            <TextField label="Ann. Usage-Dth/kWh" value={meterForm.annualUsage} onChange={(event) => updateMeterForm("annualUsage", event.target.value)} />
            <TextField label="Load Profile" value={meterForm.loadProfile} onChange={(event) => updateMeterForm("loadProfile", event.target.value)} />
            <MeterSelect label="iEnergyBill" value={meterForm.iEnergyBillId} options={meterLookups.data?.iEnergyBills ?? []} onChange={(value) => updateMeterForm("iEnergyBillId", value)} />
            <MeterSelect label="EnergyDashboard" value={meterForm.energyDashboardId} options={meterLookups.data?.energyDashboards ?? []} onChange={(value) => updateMeterForm("energyDashboardId", value)} />
            <MeterSelect label="OnSiteGeneration" value={meterForm.onSiteGenerationId} options={meterLookups.data?.onSiteGenerations ?? []} onChange={(value) => updateMeterForm("onSiteGenerationId", value)} />
            <MeterSelect label="Type" value={meterForm.typeId} options={meterLookups.data?.types ?? []} onChange={(value) => updateMeterForm("typeId", value)} />


            <MeterSelect label="Status" value={meterForm.statusId} options={meterLookups.data?.statuses ?? []} onChange={(value) => updateMeterForm("statusId", value)} />
            <FormControlLabel control={<Checkbox checked={meterForm.isActive} onChange={(event) => updateMeterForm("isActive", event.target.checked)} />} label="Active" />
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
            <span>{selectedFileName || "Select a PDF"}</span>
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
          <button type="button" className={`document-file-button ${isSelected ? "selected" : ""} ${fileExtension ? `file-${fileExtension}` : ""}`} onClick={openFile}>
            <FileText size={14} />
            {node.name}
          </button>
        )}
      </div>
      {isFolder && isOpen && node.children?.length ? (
        <DocumentTree nodes={node.children} level={level + 1} companyId={companyId} onFileClick={onFileClick} selectedFileId={selectedFileId} />
      ) : null}
    </li>
  );
}

function ContractListPanel({ columns, contracts, isLoading, isError, error, onAdd, addDisabled = false }: ContractListPanelProps) {
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
}

function MeterSelect({ label, value, options, onChange, disabled = false, placeholder }: MeterSelectProps) {
  return (
    <TextField select label={label} value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled}>
      <MenuItem value={0}>{placeholder ?? `Select ${label}`}</MenuItem>
      {options.map((option) => <MenuItem key={option.id} value={Number(option.id)}>{option.name}</MenuItem>)}
    </TextField>
  );
}

interface ContractForm {
  companyId: number;
  brokerId: number;
  supplierId: number;
  state: string;
  utilityId: number;
  productId: number;
  meterIds: number[];
  rate: string;
  fee: string;
  startDate: string;
  endDate: string;
  cFile: string;
  contractFile: ContractFilePayload | null;
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
    state: "",
    utilityId: 0,
    productId: 0,
    meterIds: [],
    rate: "",
    fee: "",
    startDate: "",
    endDate: "",
    cFile: "",
    contractFile: null,
    isActive: true
  };
}

function contractToForm(contract: ContractRow): ContractForm {
  return {
    companyId: Number(contract.companyId ?? 0),
    brokerId: Number(contract.brokerId ?? 0),
    supplierId: Number(contract.supplierId ?? 0),
    state: "",
    utilityId: 0,
    productId: 0,
    meterIds: [],
    rate: contract.rate === null || contract.rate === undefined ? "" : String(contract.rate),
    fee: contract.fee === null || contract.fee === undefined ? "" : String(contract.fee),
    startDate: dateInputValue(contract.startDate),
    endDate: dateInputValue(contract.endDate),
    cFile: contract.cFile ?? "",
    contractFile: null,
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
  taxExempt: string;
  cycleReadDay: string;
  rate: string;
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
    taxExempt: "",
    cycleReadDay: "",
    rate: "",
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
    taxExempt: meter.taxExempt ?? "",
    cycleReadDay: meter.cycleReadDay ?? "",
    rate: meter.rate ?? "",
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
    isActive: Boolean(meter.isActive)
  };
}

function dateInputValue(value: unknown) {
  if (!value) return "";
  return new Date(String(value)).toISOString().slice(0, 10);
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
  isActive: boolean;
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
  companyFolderId?: string | null;
  contractFolderId?: string | null;
  utilityBillsFolderId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LookupOption {
  id: string | number;
  name?: string;
}

interface USStateOption {
  id: string | number;
  name: string;
  code: string;
}

interface CityOption {
  id: string | number;
  name: string;
}

interface ZipCodeOption {
  id: string | number;
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
}

interface MeterStateProductUtilities {
  products: LookupOption[];
  utilities: LookupOption[];
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
  taxExempt?: string | null;
  cycleReadDay?: string | null;
  rate?: string | null;
  demand?: string | null;
  annualUsage?: string | null;
  loadProfile?: string | null;
  iEnergyBill?: string | number | null;
  energyDashboard?: string | number | null;
  onSiteGeneration?: string | null;
  statusId?: string | number | null;
  status?: string | null;
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
