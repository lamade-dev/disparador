import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';

// Master pages
import MasterInstancesPage from './pages/master/InstancesPage';
import MasterReportPage from './pages/master/ReportPage';
import MasterDispatchConfigPage from './pages/master/DispatchConfigPage';
import GestorsPage from './pages/master/GestorsPage';

// Gestor pages
import DashboardPage from './pages/gestor/DashboardPage';
import ContactsPage from './pages/gestor/ContactsPage';
import CampaignListPage from './pages/gestor/CampaignListPage';
import CampaignNewPage from './pages/gestor/CampaignNewPage';
import CampaignDetailPage from './pages/gestor/CampaignDetailPage';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'MASTER' ? '/report' : '/dashboard'} replace />;
}

export default function App() {
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
          <Route index element={<RoleRedirect />} />

          {/* Master routes */}
          <Route path="report" element={<ProtectedRoute allowedRoles={['MASTER']}><MasterReportPage /></ProtectedRoute>} />
          <Route path="instances" element={<ProtectedRoute allowedRoles={['MASTER']}><MasterInstancesPage /></ProtectedRoute>} />
          <Route path="dispatch-config" element={<ProtectedRoute allowedRoles={['MASTER']}><MasterDispatchConfigPage /></ProtectedRoute>} />
          <Route path="gestors" element={<ProtectedRoute allowedRoles={['MASTER']}><GestorsPage /></ProtectedRoute>} />

          {/* Gestor routes */}
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['GESTOR']}><DashboardPage /></ProtectedRoute>} />
          <Route path="contacts" element={<ProtectedRoute allowedRoles={['GESTOR']}><ContactsPage /></ProtectedRoute>} />
          <Route path="sessions" element={<ProtectedRoute allowedRoles={['GESTOR']}><CampaignListPage /></ProtectedRoute>} />
          <Route path="sessions/new" element={<ProtectedRoute allowedRoles={['GESTOR']}><CampaignNewPage /></ProtectedRoute>} />
          <Route path="sessions/:id" element={<ProtectedRoute allowedRoles={['GESTOR']}><CampaignDetailPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
