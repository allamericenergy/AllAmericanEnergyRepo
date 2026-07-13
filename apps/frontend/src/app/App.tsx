import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CrmPage } from "../features/crm/CrmPage";
import { AdminPages } from "../features/admin/AdminPages";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/companies" element={<CrmPage entity="companies" />} />
        <Route path="/contacts" element={<CrmPage entity="contacts" />} />
        <Route path="/deals" element={<CrmPage entity="deals" />} />
        <Route path="/tasks" element={<CrmPage entity="tasks" />} />
        <Route path="/reports" element={<DashboardPage view="reports" />} />
        <Route path="/admin" element={<AdminPages />} />
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
