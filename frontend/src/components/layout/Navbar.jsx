import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Search, SlidersHorizontal, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/notificationApi';

const PROFILE_PATH = { FARMER: '/farmer/profile', VETERINARIAN: '/vet/profile', ADMIN: '/admin' };
const NOTIFICATIONS_PATH = { FARMER: '/farmer/notifications', VETERINARIAN: '/vet/notifications', ADMIN: '/admin' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationApi
        .getMine()
        .then((res) => {
          const notifications = res.data?.notifications || [];
          const unread = notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread || 0);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (user?.role === 'VETERINARIAN') {
      navigate(`/vet/requests?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/farmer/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isVet = user?.role === 'VETERINARIAN';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-mist-200 bg-white/95 px-4 backdrop-blur md:px-6 shadow-xs">
      {/* Left: Brand Logo */}
      <Link to="/" className="flex items-center gap-3 group shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pasture-700 text-white shadow-sm group-hover:scale-105 transition-transform">
          <span className="text-base" role="img" aria-label="Cow">
            🐄
          </span>
        </div>
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-pasture-950 block leading-tight">
            CowCare
          </span>
        </div>
      </Link>

      {/* Center: Global Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center relative max-w-md w-full mx-6"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isVet
              ? 'Search cases by cow ID, symptoms, farmer...'
              : 'Search cattle by ID, breed, location...'
          }
          className={`w-full pl-10 ${
            isVet ? 'pr-3' : 'pr-9'
          } py-2 text-xs rounded-xl bg-mist-50 border border-mist-300 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-pasture-600 transition-all`}
        />
        {!isVet && (
          <button
            type="button"
            onClick={() => navigate('/farmer/marketplace')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-pasture-700 transition-colors"
            title="Marketplace filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        <Link
          to={PROFILE_PATH[user?.role] || '/'}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-mist-100 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pasture-100 text-pasture-800 font-display font-bold text-sm border border-pasture-200 shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left pr-1">
            <p className="text-xs font-semibold text-ink-900 leading-tight">
              {user?.name}
            </p>
            <p className="text-[11px] text-pasture-700 font-sans capitalize leading-none mt-0.5">
              {user?.role?.toLowerCase()}
            </p>
          </div>
          <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-ink-400" />
        </Link>

        {/* Notifications Icon with Badge */}
        <Link
          to={NOTIFICATIONS_PATH[user?.role] || '/'}
          className="relative p-2 text-ink-500 hover:text-pasture-800 hover:bg-mist-100 rounded-xl transition-colors"
          title="Alerts & Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vital-600 text-[10px] font-bold text-white px-1 border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 text-ink-400 hover:text-vital-600 hover:bg-vital-50 rounded-xl transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
