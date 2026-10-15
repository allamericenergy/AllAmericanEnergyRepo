import { Alert, Button, Checkbox, MenuItem, TextField } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CalendarClock, CheckCircle2, MessageSquareText, Reply } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "superadmin" | "admin" | "member" | "user";
  designation?: string | null;
}

interface ActivityReply {
  id: string;
  content: string;
  createdAt: string;
  user: TeamMember;
}

interface CompanyActivity {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: "note" | "open" | "completed";
  priority: string;
  createdAt: string;
  companyId?: string | null;
  companyName?: string | null;
  assignee?: TeamMember | null;
  createdBy?: TeamMember | null;
  replies?: ActivityReply[];
}

function teamName(member: TeamMember) {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

function requestError(error: unknown) {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data as { error?: string } | undefined;
  return data?.error ?? null;
}

function ActivityItem({
  activity,
  showCompany = false,
  onToggle,
  onReply
}: {
  activity: CompanyActivity;
  showCompany?: boolean;
  onToggle: (activity: CompanyActivity) => Promise<void>;
  onReply: (activityId: string, content: string) => Promise<boolean>;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const isNote = activity.status === "note";

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    const sent = await onReply(activity.id, reply.trim());
    if (sent) setReply("");
    setSending(false);
  }

  return (
    <article className={`company-activity-card ${activity.status} ${isNote ? "" : `priority-${activity.priority}`}`}>
      <div className="activity-card-icon">{isNote ? <MessageSquareText size={20} /> : activity.status === "completed" ? <CheckCircle2 size={20} /> : <CalendarClock size={20} />}</div>
      <div className="activity-card-content">
        <div className="activity-card-heading"><strong>{activity.title}</strong><span>{isNote ? "Note" : activity.priority}</span></div>
        {showCompany ? <div className="activity-company-name">{activity.companyName}</div> : null}
        <p>{activity.description}</p>
        <small>
          Tagged by {activity.createdBy ? `${teamName(activity.createdBy)} (${activity.createdBy.role})` : "another user"}
          {activity.assignee ? ` for ${teamName(activity.assignee)}` : ""}
          {activity.dueDate ? ` · Due ${new Date(activity.dueDate).toLocaleDateString()}` : ""}
        </small>
        {activity.replies?.length ? (
          <div className="activity-replies">
            {activity.replies.map((item) => (
              <div className="activity-reply" key={item.id}>
                <strong>{teamName(item.user)}</strong>
                <span>{item.content}</span>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : null}
        <div className="activity-reply-editor">
          <TextField size="small" label="Reply" value={reply} onChange={(event) => setReply(event.target.value)} multiline maxRows={4} />
          <Button size="small" variant="outlined" startIcon={<Reply size={15} />} disabled={sending || !reply.trim()} onClick={() => void sendReply()}>{sending ? "Sending..." : "Reply"}</Button>
        </div>
      </div>
      {!isNote ? <Checkbox checked={activity.status === "completed"} aria-label="Mark to-do completed" onChange={() => void onToggle(activity)} /> : null}
    </article>
  );
}

function ActivityFeed({
  items,
  emptyMessage,
  showCompany,
  onToggle,
  onReply
}: {
  items: CompanyActivity[];
  emptyMessage: string;
  showCompany?: boolean;
  onToggle: (activity: CompanyActivity) => Promise<void>;
  onReply: (activityId: string, content: string) => Promise<boolean>;
}) {
  if (!items.length) return <p className="muted">{emptyMessage}</p>;
  return <div className="company-activity-list">{items.map((activity) => <ActivityItem key={activity.id} activity={activity} showCompany={showCompany} onToggle={onToggle} onReply={onReply} />)}</div>;
}

export function MyActivityPage() {
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const activities = useQuery({
    queryKey: ["my-company-activities"],
    queryFn: async () => (await api.get("/reports/my-company-activities")).data as {
      data: CompanyActivity[];
      counts: { todos: number; notes: number; total: number };
    },
    retry: false
  });
  const todos = (activities.data?.data ?? []).filter((activity) => activity.status !== "note");
  const notes = (activities.data?.data ?? []).filter((activity) => activity.status === "note");

  useEffect(() => {
    void api.post("/reports/activity-notifications/read", {})
      .then(() => queryClient.invalidateQueries({ queryKey: ["activity-unread-counts"] }))
      .catch(() => undefined);
  }, [queryClient]);

  async function toggleCompleted(activity: CompanyActivity) {
    setError("");
    try {
      await api.patch(`/reports/company-activities/${activity.id}`, { status: activity.status === "completed" ? "open" : "completed" });
      await activities.refetch();
    } catch (updateError) {
      setError(requestError(updateError) ?? "Unable to update the to-do.");
    }
  }

  async function replyToActivity(activityId: string, content: string) {
    setError("");
    try {
      await api.post(`/reports/company-activities/${activityId}/replies`, { content });
      await activities.refetch();
      return true;
    } catch (replyError) {
      setError(requestError(replyError) ?? "Unable to send the reply.");
      return false;
    }
  }

  return (
    <section className="page company-activity-page">
      <div className="page-title">
        <div><span className="eyebrow">Tagged activity</span><h1>Activity</h1></div>
      </div>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {activities.isError ? <Alert severity="error">{requestError(activities.error) ?? "Unable to load your activities."}</Alert> : null}
      {activities.isLoading ? <p className="muted">Loading activities...</p> : null}
      <div className="assigned-activity-sections">
        <section className="panel activity-list-panel">
          <h2>To-do</h2>
          <ActivityFeed items={todos} emptyMessage="No to-dos have been assigned to you." showCompany onToggle={toggleCompleted} onReply={replyToActivity} />
        </section>
        <section className="panel activity-list-panel">
          <h2>Notes</h2>
          <ActivityFeed items={notes} emptyMessage="No notes have been tagged to you." showCompany onToggle={toggleCompleted} onReply={replyToActivity} />
        </section>
      </div>
    </section>
  );
}

export function CompanyActivityPage() {
  const { companyId = "" } = useParams<{ companyId: string }>();
  const [type, setType] = useState<"note" | "todo">("todo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: ["team-members"], queryFn: async () => (await api.get("/reports/team-members")).data as { data: TeamMember[] }, retry: false });
  const activities = useQuery({
    queryKey: ["company-activities", companyId],
    queryFn: async () => (await api.get(`/reports/tbl-companies/${companyId}/activities`)).data as { company: { id: string | number; companyName?: string | null }; data: CompanyActivity[] },
    enabled: Boolean(companyId),
    retry: false
  });

  useEffect(() => {
    if (!companyId) return;
    void api.post("/reports/activity-notifications/read", { companyId })
      .then(() => queryClient.invalidateQueries({ queryKey: ["activity-unread-counts"] }))
      .catch(() => undefined);
  }, [companyId, queryClient]);

  async function addActivity() {
    if (!title.trim() || !description.trim() || !assigneeId) return setError("Enter a title and details, then tag a team member.");
    setSaving(true);
    setError("");
    try {
      await api.post(`/reports/tbl-companies/${companyId}/activities`, { type, title: title.trim(), description: description.trim(), assigneeId, dueDate: type === "todo" ? dueDate || undefined : undefined, priority });
      setTitle(""); setDescription(""); setDueDate("");
      await activities.refetch();
    } catch (saveError) {
      setError(requestError(saveError) ?? "Unable to add the activity.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(activity: CompanyActivity) {
    setError("");
    try {
      await api.patch(`/reports/company-activities/${activity.id}`, { status: activity.status === "completed" ? "open" : "completed" });
      await activities.refetch();
    } catch (updateError) {
      setError(requestError(updateError) ?? "Unable to update the to-do.");
    }
  }

  async function replyToActivity(activityId: string, content: string) {
    setError("");
    try {
      await api.post(`/reports/company-activities/${activityId}/replies`, { content });
      await activities.refetch();
      return true;
    } catch (replyError) {
      setError(requestError(replyError) ?? "Unable to send the reply.");
      return false;
    }
  }

  return (
    <section className="page company-activity-page">
      <div className="page-title"><div><span className="eyebrow">Company activity</span><h1>{activities.data?.company.companyName || "Company"}</h1></div></div>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {activities.isError ? <Alert severity="error">{requestError(activities.error) ?? "Unable to load company activities."}</Alert> : null}
      <div className="company-activity-layout">
        <section className="panel activity-editor-panel">
          <h2>Add activity</h2>
          <TextField select label="Activity type" value={type} onChange={(event) => setType(event.target.value as "note" | "todo")}><MenuItem value="todo">To-do</MenuItem><MenuItem value="note">Note</MenuItem></TextField>
          <TextField label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextField select label="Tag team member" required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {(team.data?.data ?? []).map((member) => <MenuItem key={member.id} value={member.id}>{teamName(member)} ({member.role})</MenuItem>)}
          </TextField>
          {type === "todo" ? <><TextField label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)}>{["low", "medium", "high", "urgent"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField></> : null}
          <TextField label={type === "todo" ? "What needs to be done?" : "Notes"} required multiline minRows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button variant="contained" disabled={saving || team.isLoading} onClick={() => void addActivity()}>{saving ? "Saving..." : "Add activity"}</Button>
        </section>
        <section className="panel activity-list-panel">
          <h2>Activity</h2>
          {activities.isLoading ? <p className="muted">Loading activities...</p> : null}
          <ActivityFeed items={activities.data?.data ?? []} emptyMessage="No activity has been added for this company." onToggle={toggleCompleted} onReply={replyToActivity} />
        </section>
      </div>
    </section>
  );
}
