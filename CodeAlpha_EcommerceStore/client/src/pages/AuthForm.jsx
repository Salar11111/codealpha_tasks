import { Navigate } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel';
import { useAuth } from '../context/AuthContext';

export default function AuthForm({ mode }) {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-[calc(100vh-160px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-paper-deep lg:block">
        <img
          src="/products/hero-3.jpg"
          alt="Atelier & Oak clothing"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
        <blockquote className="absolute bottom-10 left-10 right-10 max-w-md text-paper">
          <p className="font-serif text-[1.7rem] leading-[1.25]">
            “Buy fewer things. Choose them carefully, then keep them for a very long time.”
          </p>
          <footer className="mt-4 text-[10px] uppercase tracking-[0.22em] text-paper/60">
            The Atelier &amp; Oak rule
          </footer>
        </blockquote>
      </div>
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <AuthPanel mode={mode} />
        </div>
      </div>
    </div>
  );
}
