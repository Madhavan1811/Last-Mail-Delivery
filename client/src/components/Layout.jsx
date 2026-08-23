import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const customerNav = [
  { to: '/orders',     icon: 'bi-box-seam',    label: 'My Shipments' },
  { to: '/orders/new', icon: 'bi-plus-circle', label: 'New Order' },
];

const agentNav = [
  { to: '/agent', icon: 'bi-truck', label: 'My Deliveries' },
];

const adminNav = [
  { to: '/admin',         icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: '/admin/zones',   icon: 'bi-geo-alt',       label: 'Zones' },
  { to: '/admin/rates',   icon: 'bi-calculator',    label: 'Rate Cards' },
  { to: '/admin/agents',  icon: 'bi-person-badge',  label: 'Agents' },
];

const navByRole = { customer: customerNav, agent: agentNav, admin: adminNav };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return children;

  const navItems = navByRole[user.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h5>DeliveryTrack</h5>
          <p>Last-Mile Platform</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}

          {/* Quick order tracking link (all roles) */}
          {location.pathname.startsWith('/orders/') && !location.pathname.endsWith('/new') && (
            <div className="mt-2">
              <div className="nav-section-label">Current</div>
              <span className="sidebar-link active">
                <i className="bi bi-search" /> Tracking Order
              </span>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">
                <span className={`sidebar-role-badge ${user.role}`}>{user.role}</span>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} title="Logout">
              <i className="bi bi-box-arrow-right fs-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
