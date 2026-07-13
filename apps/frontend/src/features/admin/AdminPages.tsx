import { Alert, Box, Button, Chip, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";

interface PermissionRecord {
  id: string;
  module: string;
  action: string;
  displayName: string;
}

interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  rolePermissions: { permission: PermissionRecord }[];
}

export function AdminPages() {
  const [tab, setTab] = useState(0);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const permissions = useQuery({ queryKey: ["permissions"], queryFn: async () => (await api.get("/rbac/permissions")).data.data as PermissionRecord[] });
  const roles = useQuery({ queryKey: ["roles"], queryFn: async () => (await api.get("/rbac/roles")).data.data as RoleRecord[] });
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => (await api.get("/rbac/audit-logs")).data.data as Record<string, string>[] });
  const history = useQuery({ queryKey: ["login-history"], queryFn: async () => (await api.get("/rbac/login-history")).data.data as Record<string, string>[] });
  const adminRequests = useQuery({ queryKey: ["admin-requests"], queryFn: async () => (await api.get("/rbac/admin-requests")).data.data as Record<string, string>[] });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/rbac/notifications")).data as { data: Record<string, string>[]; unreadCount: number } });

  async function approve(id: string) {
    if (!window.confirm("Approve this Admin?")) return;
    await api.post(`/rbac/admin-requests/${id}/approve`, { notes });
    await adminRequests.refetch();
    await notifications.refetch();
  }

  async function reject(id: string) {
    if (!reason.trim()) return;
    await api.post(`/rbac/admin-requests/${id}/reject`, { reason, message });
    await adminRequests.refetch();
  }

  async function sendMessage(id: string) {
    if (!message.trim()) return;
    await api.post(`/rbac/admin-requests/${id}/message`, { message });
    setMessage("");
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Security and RBAC</h1>
        </div>
      </div>

      <Paper className="admin-panel" elevation={0}>
        <Tabs value={tab} onChange={(_, value: number) => setTab(value)}>
          <Tab label="Roles" />
          <Tab label="Pending Admin Requests" />
          <Tab label="Permissions" />
          <Tab label="Audit logs" />
          <Tab label="Login history" />
          <Tab label={`Notifications (${notifications.data?.unreadCount ?? 0})`} />
        </Tabs>

        {tab === 0 && (
          <Box className="admin-list">
            {roles.isError ? <Alert severity="warning">You do not have access to role management.</Alert> : null}
            {roles.data?.map((role) => (
              <Paper key={role.id} variant="outlined" className="admin-card">
                <Typography variant="h6">{role.name}</Typography>
                <Typography color="text.secondary">{role.description}</Typography>
                <Box className="chip-row">
                  {role.rolePermissions.slice(0, 12).map((item) => <Chip key={item.permission.id} label={`${item.permission.module}.${item.permission.action}`} size="small" />)}
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {tab === 1 && (
          <Box className="admin-list">
            {adminRequests.data?.map((request) => (
              <Paper key={request.id} variant="outlined" className="admin-card">
                <Typography variant="h6">{request.firstName} {request.lastName}</Typography>
                <Typography color="text.secondary">{request.email}</Typography>
                <Typography>Company: {request.company ?? "Not provided"}</Typography>
                <Typography>Phone: {request.phone ?? "Not provided"}</Typography>
                <Typography>Department: {request.department ?? "Not provided"}</Typography>
                <Typography>Designation: {request.designation ?? "Not provided"}</Typography>
                <Typography>Status: {request.status}</Typography>
                <Typography>Registered: {new Date(request.createdAt).toLocaleString()}</Typography>
                {request.documents ? <Typography>Documents: {request.documents}</Typography> : null}
                {request.rejectionReason ? <Alert severity="warning">Rejected: {request.rejectionReason}. {request.rejectionMessage}</Alert> : null}
                <Box className="auth-form">
                  <TextField label="Approval notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  <Button variant="contained" onClick={() => approve(request.id)}>Approve</Button>
                  <TextField label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} />
                  <TextField label="Message" value={message} onChange={(event) => setMessage(event.target.value)} />
                  <Button variant="outlined" color="error" onClick={() => reject(request.id)}>Reject</Button>
                  <Button variant="outlined" onClick={() => sendMessage(request.id)}>Send Message</Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Box className="chip-row">
            {permissions.data?.map((permission) => <Chip key={permission.id} label={`${permission.module}.${permission.action}`} />)}
          </Box>
        )}

        {tab === 3 && <pre className="json-panel">{JSON.stringify(audit.data ?? [], null, 2)}</pre>}
        {tab === 4 && <pre className="json-panel">{JSON.stringify(history.data ?? [], null, 2)}</pre>}
        {tab === 5 && <pre className="json-panel">{JSON.stringify(notifications.data?.data ?? [], null, 2)}</pre>}
      </Paper>
    </section>
  );
}
