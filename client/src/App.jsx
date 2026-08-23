import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateOrder from './pages/customer/CreateOrder';
import CustomerOrders from './pages/customer/CustomerOrders';
import TrackOrder from './pages/customer/TrackOrder';
import Reschedule from './pages/customer/Reschedule';
import AgentDashboard from './pages/agent/AgentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ZoneManagement from './pages/admin/ZoneManagement';
import RateCards from './pages/admin/RateCards';
import AgentManagement from './pages/admin/AgentManagement';
import Layout from './components/Layout';

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex align-items-center justify-content-center" style={{minHeight:'100vh'}}><div className="spinner-border text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'agent') return <Navigate to="/agent" replace />;
    return <Navigate to="/orders" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex align-items-center justify-content-center" style={{minHeight:'100vh'}}><div className="spinner-border text-primary" /></div>;
  if (!user) return <Landing />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'agent') return <Navigate to="/agent" replace />;
  return <Navigate to="/orders" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer */}
          <Route path="/orders"     element={<RoleRoute role="customer"><Layout><CustomerOrders /></Layout></RoleRoute>} />
          <Route path="/orders/new" element={<RoleRoute role="customer"><Layout><CreateOrder /></Layout></RoleRoute>} />
          <Route path="/orders/:id" element={<RoleRoute><Layout><TrackOrder /></Layout></RoleRoute>} />
          <Route path="/orders/:id/reschedule" element={<RoleRoute role="customer"><Layout><Reschedule /></Layout></RoleRoute>} />

          {/* Agent */}
          <Route path="/agent" element={<RoleRoute role="agent"><Layout><AgentDashboard /></Layout></RoleRoute>} />

          {/* Admin */}
          <Route path="/admin"         element={<RoleRoute role="admin"><Layout><AdminDashboard /></Layout></RoleRoute>} />
          <Route path="/admin/zones"   element={<RoleRoute role="admin"><Layout><ZoneManagement /></Layout></RoleRoute>} />
          <Route path="/admin/rates"   element={<RoleRoute role="admin"><Layout><RateCards /></Layout></RoleRoute>} />
          <Route path="/admin/agents"  element={<RoleRoute role="admin"><Layout><AgentManagement /></Layout></RoleRoute>} />

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
