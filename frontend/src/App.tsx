import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/gestor/DashboardPage';
import InstancesPage from './pages/gestor/InstancesPage';
import ContactsPage from './pages/gestor/ContactsPage';
import CampaignListPage from './pages/gestor/CampaignListPage';
import CampaignNewPage from './pages/gestor/CampaignNewPage';
import CampaignDetailPage from './pages/gestor/CampaignDetailPage';
import GestorsPage from './pages/master/GestorsPage';
import Layout from './components/layout/Layout';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="instances" element={<InstancesPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="campaigns" element={<CampaignListPage />} />
          <Route path="campaigns/new" element={<CampaignNewPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route
            path="gestors"
            element={
              <ProtectedRoute allowedRoles={['MASTER']}>
                <GestorsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
