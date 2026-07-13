import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { CompanyDocumentsPage, DashboardPage } from "../features/dashboard/DashboardPage";
import { OrganizationsPage } from "../features/organizations/OrganizationsPage";
import { AdminPages } from "../features/admin/AdminPages";
import { AppShell } from "./AppShell";
import { MembersPage } from "../features/members/MembersPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/companies" element={<DashboardPage view="companies" />} />
        <Route path="/companies/:companyId/documents" element={<CompanyDocumentsPage />} />
        <Route path="/contracts" element={<DashboardPage view="contracts" />} />
        <Route path="/meters" element={<DashboardPage view="meters" />} />
        <Route path="/members" element={<MembersPage />} />
       {/*  <Route path="/deals" element={<CrmPage entity="deals" />} />
        <Route path="/tasks" element={<CrmPage entity="tasks" />} />
        <Route path="/reports" element={<DashboardPage view="reports" />} /> */}
        <Route path="/admin" element={<AdminPages />} />
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
