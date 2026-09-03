import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/navConfig';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const items = (NAV_ITEMS[user?.role] || []).slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-mist-200 bg-white md:hidden">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-pasture-700' : 'text-ink-500'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
