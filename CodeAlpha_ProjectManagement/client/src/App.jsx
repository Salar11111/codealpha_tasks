import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
const ProjectList = lazy(() => import('./pages/ProjectList'));
const Board = lazy(() => import('./pages/Board'));
const AuthForm = lazy(() => import('./pages/AuthForm'));

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Layout>
            <Suspense fallback={<div className="state-panel">Loading…</div>}>
              <Routes>
              <Route path="/login" element={<AuthForm mode="login" />} />
              <Route path="/register" element={<AuthForm mode="register" />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProjectList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <Board />
                  </ProtectedRoute>
                }
              />
            </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
