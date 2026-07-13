import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./authStore";

interface ProtectedRouteProps {
  permission?: string;
}

export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const { accessToken, hasPermission } = useAuthStore();

  if (!accessToken) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;

  return <Outlet />;
}
