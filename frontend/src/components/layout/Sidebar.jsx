import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  ShoppingBag,
  PlusCircle,
  ClipboardList,
  Bell,
  ArrowRightLeft,
  Settings,
  ScanLine,
  ShieldCheck,
  Headphones,
  X,
  Stethoscope,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestApi } from '../../api/requestApi';
import { notificationApi } from '../../api/notificationApi';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (user) {
      requestApi
        .getAll()
        .then((res) => {
          const reqs = res.data?.requests || [];
          const active = reqs.filter(
            (r) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status)
          ).length;
          setActiveRequestsCount(active);
        })
        .catch(() => {});

      notificationApi
        .getMine()
        .then((res) => {
          const notifs = res.data?.notifications || [];
          const unread = notifs.filter((n) => !n.isRead).length;
          setUnreadAlertsCount(unread);
        })
        .catch(() => {});
    }
  }, [user]);

  const isVet = user?.role === 'VETERINARIAN';

  // Farmer Navigation: Clean & streamlined without redundant items
  const farmerNavItems = [
    { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/farmer/cattle', label: 'My Cattle', icon: ListChecks },
    { to: '/farmer/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { to: '/farmer/cattle/add', label: 'Add Cow', icon: PlusCircle },
    {
      to: '/farmer/requests',
      label: 'Requests',
      icon: ClipboardList,
      badge: activeRequestsCount > 0 ? activeRequestsCount : null,
    },
    {
      to: '/farmer/notifications',
      label: 'Alerts',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
      badgeVariant: 'alert',
    },
    { to: '/farmer/transfers', label: 'Transfers', icon: ArrowRightLeft },
    { to: '/farmer/profile', label: 'Settings', icon: Settings },
  ];

  // Veterinarian Navigation: Strictly clinical without marketplace
  const vetNavItems = [
    { to: '/vet', label: 'Dashboard', icon: LayoutDashboard },
    {
      to: '/vet/requests',
      label: 'Incoming Cases',
      icon: Stethoscope,
      badge: activeRequestsCount > 0 ? activeRequestsCount : null,
    },
    { to: '/vet/scan', label: 'Scan Cattle QR', icon: ScanLine },
    {
      to: '/vet/notifications',
      label: 'Alerts',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
      badgeVariant: 'alert',
    },
    { to: '/vet/profile', label: 'Settings', icon: Settings },
  ];

  const items = isVet ? vetNavItems : farmerNavItems;

  // Exact matching to prevent multiple items (like Dashboard, My Cattle, Add Cow) from highlighting together
  const isItemActive = (to) => {
    const current = location.pathname;
    if (to === '/farmer/cattle/add') {
      return current === '/farmer/cattle/add';
    }
    if (to === '/farmer/cattle') {
      return current === '/farmer/cattle' || (current.startsWith('/farmer/cattle/') && current !== '/farmer/cattle/add');
    }
    if (to === '/farmer') {
      return current === '/farmer';
    }
    if (to === '/vet') {
      return current === '/vet';
    }
    if (to === '/farmer/marketplace') {
      return current.startsWith('/farmer/marketplace');
    }
    if (to === '/farmer/requests') {
      return current.startsWith('/farmer/requests');
    }
    if (to === '/vet/requests') {
      return current.startsWith('/vet/requests');
    }
    return current === to;
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-mist-200 bg-white md:flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
        {/* Navigation list */}
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon, badge, badgeVariant }) => {
            const active = isItemActive(to);
            return (
              <NavLink
                key={to + label}
                to={to}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-pasture-700 text-white font-semibold shadow-sm'
                    : 'text-ink-600 hover:bg-mist-100 hover:text-ink-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      badgeVariant === 'alert'
                        ? 'bg-vital-100 text-vital-700'
                        : active
                        ? 'bg-white/20 text-white'
                        : 'bg-pasture-100 text-pasture-800'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Support Card & Verified Platform/Doctor Badge */}
        <div className="pt-6 space-y-3 border-t border-mist-200 mt-4">
          {/* Help Card */}
          <div className="rounded-2xl p-3.5 bg-mist-50 border border-mist-200 space-y-2">
            <div>
              <p className="text-xs font-display font-bold text-ink-900">
                {isVet ? 'Clinical Support' : 'Need Help?'}
              </p>
              <p className="text-[11px] text-ink-500">
                {isVet
                  ? 'Connect with veterinary lab & coordinators'
                  : 'Talk to our veterinary support team'}
              </p>
            </div>
            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full py-1.5 px-3 rounded-xl bg-white text-ink-700 border border-mist-300 text-xs font-medium hover:bg-mist-100 transition-colors shadow-xs"
            >
              Contact Support
            </button>
          </div>

          {/* Verified Badge — Tailored for Doctor vs Farmer */}
          {isVet ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-serum-50 border border-serum-200 text-serum-800">
              <Award className="w-4 h-4 shrink-0 text-serum-700" />
              <div className="text-left">
                <p className="text-[11px] font-semibold leading-tight">Licensed Veterinarian</p>
                <p className="text-[10px] text-ink-500 leading-none mt-0.5">
                  Verified Clinical Practitioner
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pasture-50 border border-pasture-200 text-pasture-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-pasture-700" />
              <div className="text-left">
                <p className="text-[11px] font-semibold leading-tight">Verified Platform</p>
                <p className="text-[10px] text-ink-500 leading-none mt-0.5">
                  All cattle verified & secure
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Real Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-mist-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pasture-100 text-pasture-800 flex items-center justify-center">
                  <Headphones className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-ink-900">
                  CowCare Support
                </h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-lg text-ink-400 hover:text-ink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              Our veterinary care coordinators and technical team are available to help with cattle registrations, health record verification, or marketplace listings.
            </p>

            <div className="space-y-2 text-xs">
              <a
                href="tel:18002692273"
                className="flex items-center justify-between p-3 rounded-xl bg-mist-50 border border-mist-200 text-pasture-800 font-semibold"
              >
                <span>Toll-Free Helpline</span>
                <span>1800-COW-CARE</span>
              </a>
              <a
                href="mailto:support@cowcare.in"
                className="flex items-center justify-between p-3 rounded-xl bg-mist-50 border border-mist-200 text-ink-700"
              >
                <span>Email Support</span>
                <span>support@cowcare.in</span>
              </a>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2 rounded-xl bg-pasture-700 text-white text-xs font-medium hover:bg-pasture-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
