import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { IntiliGrid, type GridColumn } from "@intiligrid";
import { api } from "../../lib/api";
import { useAuthStore } from "../auth/authStore";

interface MembersPageProps {
  companyId?: string | number;
  canAdd?: boolean;
  compact?: boolean;
}

interface MemberRow {
  id: string | number;
  fullName?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | number | null;
  company?: string | null;
  department?: string | null;
  designation?: string | null;
  role?: string | null;
  roleName?: string | null;
  isActive?: boolean | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  department: string;
  designation: string;
  password: string;
}

const columns: GridColumn<MemberRow>[] = [
  {
    field: "fullName",
    headerName: "Name",
    minWidth: 190,
    flex: 1
  },
  { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
  { field: "phone", headerName: "Phone", width: 150 },
  { field: "company", headerName: "Company", minWidth: 180 },
  { field: "roleName", headerName: "Role", width: 130 },
  { field: "department", headerName: "Department", minWidth: 160 },
  { field: "designation", headerName: "Designation", minWidth: 160 },
  {
    field: "isActive",
    headerName: "Status",
    width: 120,
    renderCell: ({ value }) => <span className={`status-badge ${value ? "active" : "inactive"}`}>{value ? "Active" : "Inactive"}</span>
  }
];

function emptyMemberForm(): MemberForm {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    department: "",
    designation: "",
    password: ""
  };
}

export function MembersPage(props: MembersPageProps) {
  const user = useAuthStore((state) => state.user);
  const canAdd = props.canAdd ?? (user?.role === "superadmin" || user?.role === "admin");

  return (
    <section className="page">
      <MembersPanel {...props} canAdd={canAdd} />
    </section>
  );
}

export function MembersPanel({ companyId, canAdd = false, compact = false }: MembersPageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<MemberForm>(emptyMemberForm());
  const members = useQuery({
    queryKey: ["members", companyId ?? "all"],
    queryFn: async () => (
      await api.get("/reports/members", {
        params: { companyId: companyId || undefined }
      })
    ).data as { total: number; data: MemberRow[] },
    retry: false
  });

  function updateMember<K extends keyof MemberForm>(field: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setError("");
    setForm(emptyMemberForm());
    setIsOpen(true);
  }

  async function saveMember() {
    setError("");
    setIsSaving(true);
    try {
      await api.post("/reports/members", {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyId: companyId ? Number(companyId) : undefined,
        company: form.company.trim(),
        department: form.department.trim(),
        designation: form.designation.trim()
      });
      await members.refetch();
      setIsOpen(false);
      setForm(emptyMemberForm());
    } catch (saveError) {
      setError(memberError(saveError) ?? "Unable to save member. Check required fields and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className={compact ? "account-data-panel" : "panel companies-panel"}>
        <div className={compact ? "account-data-title" : "panel-title-row"}>
          <h2>{compact ? "Members" : "Members"}</h2>
          {canAdd ? (
            <Button variant="contained" size={compact ? "small" : "medium"} onClick={openCreate} startIcon={<Plus size={16} />}>
              Add New Member
            </Button>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
        {members.isError ? <p className="error">{memberError(members.error) ?? "Unable to load members."}</p> : null}
        {members.isLoading ? <p className="muted">Loading members...</p> : null}
        <div className={compact ? "contract-grid-wrap members-grid-wrap" : "members-grid-wrap"}>
          <IntiliGrid checkboxSelection columns={columns} rows={(members.data?.data ?? []).map(memberRow)} />
        </div>
      </section>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            <TextField label="First name" required value={form.firstName} onChange={(event) => updateMember("firstName", event.target.value)} />
            <TextField label="Last name" required value={form.lastName} onChange={(event) => updateMember("lastName", event.target.value)} />
            <TextField label="Email" required value={form.email} onChange={(event) => updateMember("email", event.target.value)} />
            <TextField label="Phone" value={form.phone} onChange={(event) => updateMember("phone", event.target.value)} />
            {!companyId ? <TextField label="Company" value={form.company} onChange={(event) => updateMember("company", event.target.value)} /> : null}
            <TextField label="Department" value={form.department} onChange={(event) => updateMember("department", event.target.value)} />
            <TextField label="Designation" value={form.designation} onChange={(event) => updateMember("designation", event.target.value)} />
            <TextField label="Password" type="password" required value={form.password} helperText="Minimum 12 characters." onChange={(event) => updateMember("password", event.target.value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveMember} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Member"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function memberRow(member: MemberRow, index: number): MemberRow {
  return {
    ...member,
    id: member.id ?? member.email ?? `member-${index}`,
    fullName: [member.firstName, member.lastName].filter(Boolean).join(" ") || "-",
    roleName: member.roleName ?? (member.role === "member" ? "Member" : "User")
  };
}

function memberError(error: unknown) {
  return isAxiosError<{ error?: string; details?: { issues?: { message: string }[] } }>(error)
    ? error.response?.data.details?.issues?.[0]?.message ?? error.response?.data.error
    : undefined;
}
