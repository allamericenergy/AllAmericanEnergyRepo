import { Alert, Box, Chip, Paper, Tab, Tabs, Typography } from "@mui/material";
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
  const permissions = useQuery({ queryKey: ["permissions"], queryFn: async () => (await api.get("/rbac/permissions")).data.data as PermissionRecord[] });
  const roles = useQuery({ queryKey: ["roles"], queryFn: async () => (await api.get("/rbac/roles")).data.data as RoleRecord[] });
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => (await api.get("/rbac/audit-logs")).data.data as Record<string, string>[] });
  const history = useQuery({ queryKey: ["login-history"], queryFn: async () => (await api.get("/rbac/login-history")).data.data as Record<string, string>[] });

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
          <Tab label="Permissions" />
          <Tab label="Audit logs" />
          <Tab label="Login history" />
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
          <Box className="chip-row">
            {permissions.data?.map((permission) => <Chip key={permission.id} label={`${permission.module}.${permission.action}`} />)}
          </Box>
        )}

        {tab === 2 && <pre className="json-panel">{JSON.stringify(audit.data ?? [], null, 2)}</pre>}
        {tab === 3 && <pre className="json-panel">{JSON.stringify(history.data ?? [], null, 2)}</pre>}
      </Paper>
    </section>
  );
}
