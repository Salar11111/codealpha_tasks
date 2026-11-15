import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@fontsource-variable/playfair-display';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        gap={10}
        toastOptions={{
          style: {
            background: '#1c1a16',
            color: '#f5f1e8',
            border: '1px solid #38332c',
            borderRadius: 0,
            fontFamily: '"Geist Sans", system-ui, sans-serif',
            fontSize: '13px',
            letterSpacing: '0.01em',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);
