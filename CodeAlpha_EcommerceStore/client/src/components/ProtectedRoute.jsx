import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/spinner';
import { buttonVariants } from './ui/button';
import { Link } from 'react-router-dom';

export default function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your account…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (admin && user.role !== 'admin') {
    return (
      <div className="container-page py-20 text-center">
        <p className="eyebrow">Restricted</p>
        <h1 className="mt-3 text-4xl">The studio is for staff.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          You are signed in as {user.email}, which does not have administrator access to the
          atelier.
        </p>
        <Link to="/" className={buttonVariants({ size: 'lg' }) + ' mt-7'}>
          Back to the shop
        </Link>
      </div>
    );
  }

  return children;
}
