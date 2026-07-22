import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Eye, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  loginEmail?: string | null;
  phone?: string | null;
  companyId?: string | number | null;
  company?: string | null;
  department?: string | null;
  designation?: string | null;
  notes?: string | null;
  role?: string | null;
  roleName?: string | null;
  isActive?: boolean | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  __actions?: never;
}

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  department: string;
  designation: string;
  notes: string;
  password: string;
}

const memberColumns: GridColumn<MemberRow>[] = [
  { field: "fullName", headerName: "Name", minWidth: 190, flex: 1 },
  { field: "email", headerName: "Personal Email", minWidth: 220, flex: 1 },
  { field: "loginEmail", headerName: "Login ID", minWidth: 250, flex: 1 },
  { field: "phone", headerName: "Phone", width: 150 },
  { field: "company", headerName: "Company", minWidth: 180 },
  { field: "roleName", headerName: "Member Type", width: 130 },
  { field: "department", headerName: "Department", minWidth: 160 },
  { field: "designation", headerName: "Role", minWidth: 160 },
  {
    field: "isActive",
    headerName: "Status",
    width: 120,
    renderCell: ({ value }) => <span className={`status-badge ${value ? "active" : "inactive"}`}>{value ? "Active" : "Inactive"}</span>
  }
];

function emptyMemberForm(): MemberForm {
  return { firstName: "", lastName: "", email: "", phone: "", company: "", department: "", designation: "", notes: "", password: "" };
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
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [viewingMember, setViewingMember] = useState<MemberRow | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<MemberRow[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdLoginEmail, setCreatedLoginEmail] = useState("");
  const [form, setForm] = useState<MemberForm>(emptyMemberForm());
  const members = useQuery({
    queryKey: ["members", companyId ?? "all"],
    queryFn: async () => (
      await api.get("/reports/members", { params: { companyId: companyId || undefined } })
    ).data as { total: number; data: MemberRow[] },
    retry: false
  });

  const rows = (members.data?.data ?? []).map(memberRow);
  const columns: GridColumn<MemberRow>[] = [
    ...memberColumns,
    {
      field: "__actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      pinned: "right",
      renderCell: ({ row }) => (
        <div className="member-row-actions" onClick={(event) => event.stopPropagation()}>
          <Tooltip title="View member"><IconButton size="small" aria-label="View member" onClick={() => setViewingMember(row)}><Eye size={17} /></IconButton></Tooltip>
          {canAdd ? (
            <>
              <Tooltip title="Edit member"><IconButton size="small" aria-label="Edit member" onClick={() => openEdit(row)}><Pencil size={17} /></IconButton></Tooltip>
              <Tooltip title="Delete member"><IconButton size="small" color="error" aria-label="Delete member" onClick={() => setDeleteTargets([row])}><Trash2 size={17} /></IconButton></Tooltip>
            </>
          ) : null}
        </div>
      )
    }
  ];

  function updateMember<K extends keyof MemberForm>(field: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setError("");
    setCreatedLoginEmail("");
    setFormMode("create");
    setEditingMember(null);
    setForm(emptyMemberForm());
    setFormOpen(true);
  }

  function openEdit(member: MemberRow) {
    setError("");
    setFormMode("edit");
    setEditingMember(member);
    setForm({
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      company: member.company ?? "",
      department: member.department ?? "",
      designation: member.designation ?? "",
      notes: member.notes ?? "",
      password: ""
    });
    setFormOpen(true);
  }

  async function saveMember() {
    setError("");
    setIsSaving(true);
    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      companyId: companyId ? Number(companyId) : undefined,
      company: form.company.trim(),
      department: form.department.trim(),
      designation: form.designation.trim()
    };
    try {
      if (formMode === "edit" && editingMember) {
        await api.patch(`/reports/members/${encodeURIComponent(String(editingMember.id))}`, payload);
      } else {
        const response = await api.post("/reports/members", payload) as { data: { loginEmail?: string } };
        setCreatedLoginEmail(response.data.loginEmail ?? "");
      }
      await refreshMembers();
      setFormOpen(false);
      setForm(emptyMemberForm());
    } catch (saveError) {
      setError(memberError(saveError) ?? "Unable to save member. Check required fields and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateSelectedStatus(isActive: boolean) {
    if (!selectedMembers.length) return;
    setError("");
    setIsSaving(true);
    try {
      await api.patch("/reports/members/bulk-status", { ids: selectedMembers.map((member) => String(member.id)), isActive });
      await refreshMembers();
    } catch (statusError) {
      setError(memberError(statusError) ?? `Unable to ${isActive ? "activate" : "inactivate"} selected members.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMembers() {
    if (!deleteTargets.length) return;
    setError("");
    setIsSaving(true);
    try {
      if (deleteTargets.length === 1) {
        await api.delete(`/reports/members/${encodeURIComponent(String(deleteTargets[0].id))}`);
      } else {
        await api.delete("/reports/members/bulk", { data: { ids: deleteTargets.map((member) => String(member.id)) } });
      }
      setDeleteTargets([]);
      await refreshMembers();
    } catch (deleteError) {
      setError(memberError(deleteError) ?? "Unable to delete selected members.");
      setDeleteTargets([]);
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshMembers() {
    await members.refetch();
    setSelectedMembers([]);
    setGridKey((current) => current + 1);
  }

  const formValid = form.firstName.trim() && form.lastName.trim() && form.email.trim()
    && (formMode === "edit" ? !form.password || form.password.length >= 12 : form.password.length >= 12);

  return (
    <>
      <section className={compact ? "account-data-panel" : "panel companies-panel"}>
        <div className={compact ? "account-data-title" : "panel-title-row"}>
          <h2>Members</h2>
          <div className={compact ? "account-data-actions member-title-actions" : "panel-title-actions member-title-actions"}>
            {canAdd && selectedMembers.length ? (
              <>
                <Button variant="outlined" color="success" size={compact ? "small" : "medium"} startIcon={<Power size={16} />} onClick={() => void updateSelectedStatus(true)} disabled={isSaving}>Activate</Button>
                <Button variant="outlined" color="warning" size={compact ? "small" : "medium"} startIcon={<PowerOff size={16} />} onClick={() => void updateSelectedStatus(false)} disabled={isSaving}>Inactivate</Button>
                <Button variant="outlined" color="error" size={compact ? "small" : "medium"} startIcon={<Trash2 size={16} />} onClick={() => setDeleteTargets(selectedMembers)} disabled={isSaving}>Delete Selected</Button>
              </>
            ) : null}
            {canAdd ? <Button variant="contained" size={compact ? "small" : "medium"} onClick={openCreate} startIcon={<Plus size={16} />}>Add New Member</Button> : null}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {createdLoginEmail ? <Alert severity="success" onClose={() => setCreatedLoginEmail("")}>Member created. Login ID: <strong>{createdLoginEmail}</strong>. A welcome email was sent to the personal email address.</Alert> : null}
        {members.isError ? <p className="error">{memberError(members.error) ?? "Unable to load members."}</p> : null}
        {members.isLoading ? <p className="muted">Loading members...</p> : null}
        <div className={compact ? "contract-grid-wrap members-grid-wrap" : "members-grid-wrap"}>
          <IntiliGrid key={gridKey} checkboxSelection columns={columns} rows={rows} onSelectionChange={(_ids, selectedRows) => setSelectedMembers(selectedRows)} />
        </div>
      </section>

      <Dialog open={formOpen} onClose={() => !isSaving && setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{formMode === "edit" ? "Edit Member" : "Add New Member"}</DialogTitle>
        <DialogContent>
          {error ? <p className="error">{error}</p> : null}
          <div className="company-form-grid">
            <TextField label="First name" required value={form.firstName} onChange={(event) => updateMember("firstName", event.target.value)} />
            <TextField label="Last name" required value={form.lastName} onChange={(event) => updateMember("lastName", event.target.value)} />
            <TextField label="Personal Email" type="email" required value={form.email} helperText={formMode === "create" ? "The generated @allamericanenergy.com login ID will be emailed here." : "Welcome and account messages are sent here."} onChange={(event) => updateMember("email", event.target.value)} />
            <TextField label="Phone" value={form.phone} onChange={(event) => updateMember("phone", event.target.value)} />
            {!companyId ? <TextField label="Company" value={form.company} onChange={(event) => updateMember("company", event.target.value)} /> : null}
            <TextField label="Department" value={form.department} onChange={(event) => updateMember("department", event.target.value)} />
            <TextField label="Role" value={form.designation} onChange={(event) => updateMember("designation", event.target.value)} />
            <TextField label={formMode === "edit" ? "New password" : "Password"} type="password" required={formMode === "create"} value={form.password} helperText={formMode === "edit" ? "Leave blank to keep the current password; minimum 12 characters when changed." : "Minimum 12 characters."} onChange={(event) => updateMember("password", event.target.value)} />
            <RichTextEditor label="Notes" value={form.notes} onChange={(value) => updateMember("notes", value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveMember()} disabled={isSaving || !formValid}>{isSaving ? "Saving..." : formMode === "edit" ? "Update Member" : "Save Member"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewingMember)} onClose={() => setViewingMember(null)} fullWidth maxWidth="sm">
        <DialogTitle>Member Details</DialogTitle>
        <DialogContent>
          {viewingMember ? (
            <dl className="company-detail-list">
              <dt>Name</dt><dd>{viewingMember.fullName ?? "-"}</dd>
              <dt>Personal Email</dt><dd>{viewingMember.email ?? "-"}</dd>
              <dt>Login ID</dt><dd>{viewingMember.loginEmail ?? "-"}</dd>
              <dt>Phone</dt><dd>{viewingMember.phone ?? "-"}</dd>
              <dt>Company</dt><dd>{viewingMember.company ?? "-"}</dd>
              <dt>Department</dt><dd>{viewingMember.department ?? "-"}</dd>
              <dt>Role</dt><dd>{viewingMember.designation ?? "-"}</dd>
              <dt>Member Type</dt><dd>{viewingMember.roleName ?? "-"}</dd>
              <dt>Status</dt><dd>{viewingMember.isActive ? "Active" : "Inactive"}</dd>
              <dt>Notes</dt><dd>{viewingMember.notes ? <div dangerouslySetInnerHTML={{ __html: viewingMember.notes }} /> : "-"}</dd>
            </dl>
          ) : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewingMember(null)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTargets.length)} onClose={() => !isSaving && setDeleteTargets([])} fullWidth maxWidth="xs">
        <DialogTitle>Delete {deleteTargets.length > 1 ? "Members" : "Member"}?</DialogTitle>
        <DialogContent>This permanently deletes {deleteTargets.length > 1 ? `${deleteTargets.length} selected members` : "the selected member"}.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargets([])} disabled={isSaving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteMembers()} disabled={isSaving}>{isSaving ? "Deleting..." : "Delete"}</Button>
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

function memberError(error: unknown) {
  return isAxiosError<{ error?: string; details?: { issues?: { message: string }[] } }>(error)
    ? error.response?.data.details?.issues?.[0]?.message ?? error.response?.data.error
    : undefined;
}
