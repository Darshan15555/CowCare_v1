import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/navConfig';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const items = (NAV_ITEMS[user?.role] || []).slice(0, 5);

  const isItemActive = (to) => {
    const current = location.pathname;
    if (to === '/farmer/cattle/add') return current === '/farmer/cattle/add';
    if (to === '/farmer/cattle') {
      return current === '/farmer/cattle' || (current.startsWith('/farmer/cattle/') && current !== '/farmer/cattle/add');
    }
    if (to === '/farmer') return current === '/farmer';
    if (to === '/vet') return current === '/vet';
    if (to === '/farmer/marketplace') return current.startsWith('/farmer/marketplace');
    if (to === '/farmer/requests') return current.startsWith('/farmer/requests');
    if (to === '/vet/requests') return current.startsWith('/vet/requests');
    return current === to;
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-mist-200 bg-white md:hidden">
      {items.map(({ to, label, icon: Icon }) => {
        const active = isItemActive(to);
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? 'text-pasture-700 font-bold' : 'text-ink-500'
            }`}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
