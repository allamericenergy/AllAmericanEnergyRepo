import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface CrmPageProps {
  entity: "companies" | "contacts" | "deals" | "tasks";
}

const titles = {
  companies: "Companies",
  contacts: "Contacts",
  deals: "Deals",
  tasks: "Tasks"
};

interface CrmRecord {
  id: string;
  name?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  stage?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function CrmPage({ entity }: CrmPageProps) {
  const records = useQuery({
    queryKey: [entity],
    queryFn: async () => (await api.get(`/${entity}`)).data,
    retry: false
  });

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>{titles[entity]}</h1>
        </div>
        <button>New {titles[entity].slice(0, -1)}</button>
      </div>

      <section className="panel">
        <div className="table-header">
          <strong>Name</strong>
          <strong>Status</strong>
          <strong>Updated</strong>
        </div>
        {records.isLoading ? <p>Loading...</p> : null}
        {records.isError ? <p className="muted">No API data yet. Start the backend and seed the database.</p> : null}
        {records.data?.data?.map((record: CrmRecord) => (
          <div className="table-row" key={record.id}>
            <span>{record.name ?? record.title ?? `${record.firstName} ${record.lastName}`}</span>
            <span>{record.stage ?? record.status ?? "active"}</span>
            <span>{record.updatedAt || record.createdAt ? new Date(record.updatedAt ?? record.createdAt!).toLocaleDateString() : "Not synced"}</span>
          </div>
        ))}
      </section>
    </section>
  );
}
