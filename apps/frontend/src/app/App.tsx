import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CrmPage } from "../features/crm/CrmPage";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/companies" element={<CrmPage entity="companies" />} />
        <Route path="/contacts" element={<CrmPage entity="contacts" />} />
        <Route path="/deals" element={<CrmPage entity="deals" />} />
        <Route path="/tasks" element={<CrmPage entity="tasks" />} />
        <Route path="/reports" element={<DashboardPage view="reports" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
