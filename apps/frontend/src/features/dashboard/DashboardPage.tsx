import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface DashboardPageProps {
  view?: "reports";
}

export function DashboardPage({ view }: DashboardPageProps) {
  const pipeline = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => (await api.get("/reports/pipeline")).data,
    retry: false
  });

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">{view === "reports" ? "Reports" : "Dashboard"}</span>
          <h1>Energy sales command center</h1>
        </div>
        <button>Create deal</button>
      </div>

      <div className="kpi-grid">
        <article>
          <span>Open pipeline</span>
          <strong>$125K</strong>
        </article>
        <article>
          <span>Win probability</span>
          <strong>60%</strong>
        </article>
        <article>
          <span>Due tasks</span>
          <strong>8</strong>
        </article>
        <article>
          <span>Recent activity</span>
          <strong>24</strong>
        </article>
      </div>

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
    </section>
  );
}
