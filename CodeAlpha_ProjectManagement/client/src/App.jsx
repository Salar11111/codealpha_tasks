import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ProjectList from './pages/ProjectList';
import Board from './pages/Board';
import AuthForm from './pages/AuthForm';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Layout>
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
          </Layout>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
