import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./authStore";

interface ProtectedRouteProps {
  permission?: string;
}

export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const { accessToken, user, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!accessToken) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }
  if (!user?.mustChangePassword && location.pathname === "/reset-password") {
    return <Navigate to="/dashboard" replace />;
  }
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;

  return <Outlet />;
}
