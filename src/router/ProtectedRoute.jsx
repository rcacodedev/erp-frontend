import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { user, org, loading } = useAuth();
  if (loading) return null;
  if (!user || !org) return <Navigate to="/login" replace />;
  return children;
}
