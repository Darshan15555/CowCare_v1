import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/navConfig';

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-mist-200 bg-white md:block">
      <nav className="flex flex-col gap-1 p-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-pasture-50 text-pasture-700'
                  : 'text-ink-600 hover:bg-mist-50 hover:text-ink-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
