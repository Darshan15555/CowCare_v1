import { useNavigate, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PROFILE_PATH = { FARMER: '/farmer/profile', VETERINARIAN: '/vet/profile', ADMIN: '/admin' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-mist-200 bg-mist-50/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-pasture-700 text-sm text-pasture-50"
          aria-hidden="true"
        >
          🐄
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-pasture-800">
          CowCare
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link to={PROFILE_PATH[user?.role] || '/'} className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink-800">{user?.name}</p>
            <p className="text-xs capitalize text-ink-500">{user?.role?.toLowerCase()}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pasture-100 text-sm font-semibold text-pasture-700">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-ink-500 hover:bg-vital-50 hover:text-vital-600"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
