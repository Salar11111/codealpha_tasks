import { createContext, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthDialog from '../components/auth/AuthDialog';

const AuthDialogContext = createContext(null);

export function AuthDialogProvider({ children }) {
  const [state, setState] = useState({ open: false, mode: 'login', next: null });
  const navigate = useNavigate();
  const location = useLocation();

  const value = useMemo(
    () => ({
      openAuth(mode = 'login', next = null) {
        setState({ open: true, mode, next });
      },
      closeAuth() {
        setState((current) => ({ ...current, open: false }));
      },
    }),
    []
  );

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <AuthDialog
        open={state.open}
        mode={state.mode}
        onModeChange={(mode) => setState((current) => ({ ...current, mode }))}
        onOpenChange={(open) =>
          setState((current) => ({ ...current, open }))
        }
        onSuccess={() => {
          const destination = state.next || (location.pathname === '/login' || location.pathname === '/register'
            ? '/'
            : location.pathname + location.search);
          setState((current) => ({ ...current, open: false }));
          if (destination) navigate(destination);
        }}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
