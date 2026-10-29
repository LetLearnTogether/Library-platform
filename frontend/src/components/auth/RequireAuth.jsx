import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="app-status" role="status">Checking your session…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    return <p className="app-status" role="alert">Your account is not permitted to access this page.</p>;
  }
  return children;
}
