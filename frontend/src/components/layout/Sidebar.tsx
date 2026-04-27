import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, MessageSquare, LogOut, UserCog, BarChart3, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';

const masterNav = [
  { to: '/report', icon: BarChart3, label: 'Relatório' },
  { to: '/instances', icon: Smartphone, label: 'Instâncias' },
  { to: '/dispatch-config', icon: Settings2, label: 'Config. Disparo' },
  { to: '/gestors', icon: UserCog, label: 'Gestores' },
];

const gestorNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sessions', icon: MessageSquare, label: 'Sessões' },
  { to: '/contacts', icon: Users, label: 'Contatos' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const navItems = user?.role === 'MASTER' ? masterNav : gestorNav;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-64 bg-card border-r flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">WA Disparador</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
