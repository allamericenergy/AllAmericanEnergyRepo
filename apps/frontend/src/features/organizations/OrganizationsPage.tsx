import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IntiliGrid, type GridColumn } from "@intiligrid";
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

const organizationColumns: GridColumn<OrganizationRow>[] = [
  { field: "name", headerName: "Organization", minWidth: 220, flex: 1 },
  { field: "address", headerName: "Address", minWidth: 240 },
  { field: "usersCount", headerName: "Users", width: 110 },
  { field: "companiesCount", headerName: "Companies", width: 130 },
  { field: "contactsCount", headerName: "Contacts", width: 120 },
  { field: "dealsCount", headerName: "Deals", width: 110 },
  { field: "tasksCount", headerName: "Tasks", width: 110 }
];

export function OrganizationsPage() {
  const [viewedOrganization, setViewedOrganization] = useState<OrganizationRow | null>(null);
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await api.get("/reports/organizations")).data as { total: number; data: OrganizationRow[] },
    retry: false
  });

  return (
    <section className="page">
      <section className="panel companies-panel">
        <div className="panel-title-row">
          <h2>Organizations</h2>
          <span className="muted">{organizations.isLoading ? "Loading..." : `${organizations.data?.total ?? 0} total`}</span>
        </div>
        {organizations.isError ? <p className="error">Unable to load organization records.</p> : null}
        <IntiliGrid checkboxSelection columns={organizationColumns} rows={organizations.data?.data ?? []} onRowClick={setViewedOrganization} />
      </section>

      <Dialog open={Boolean(viewedOrganization)} onClose={() => setViewedOrganization(null)} fullWidth maxWidth="sm">
        <DialogTitle>Organization Details</DialogTitle>
        <DialogContent>
          {viewedOrganization ? (
            <dl className="company-detail-list">
              <dt>Name</dt>
              <dd>{viewedOrganization.name}</dd>
              <dt>Address</dt>
              <dd>{viewedOrganization.address ?? "-"}</dd>
              <dt>Billing Info</dt>
              <dd>{viewedOrganization.billingInfo ?? "-"}</dd>
              <dt>Users</dt>
              <dd>{viewedOrganization.usersCount}</dd>
              <dt>Companies</dt>
              <dd>{viewedOrganization.companiesCount}</dd>
              <dt>Contacts</dt>
              <dd>{viewedOrganization.contactsCount}</dd>
              <dt>Deals</dt>
              <dd>{viewedOrganization.dealsCount}</dd>
              <dt>Tasks</dt>
              <dd>{viewedOrganization.tasksCount}</dd>
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
