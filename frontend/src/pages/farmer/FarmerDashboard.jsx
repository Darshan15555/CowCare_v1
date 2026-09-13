import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import {
  PlusCircle,
  Stethoscope,
  Bell,
  ShoppingBag,
  ArrowRightLeft,
  Heart,
  Activity,
  Eye,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import { requestApi } from '../../api/requestApi';
import { SkeletonDashboard } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import RemindersSection from '../../components/common/RemindersSection';
import { useCountUp } from '../../hooks/useCountUp';
import { useAuth } from '../../context/AuthContext';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const STATUS_ICONS = {
  HEALTHY: Heart,
  UNDER_OBSERVATION: Eye,
  CRITICAL: AlertTriangle,
  RECOVERING: Activity,
};

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [cattle, setCattle] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cattleRes, requestsRes] = await Promise.all([
          cattleApi.getMine(),
          requestApi.getAll(),
        ]);
        setCattle(cattleRes.data.cattle);
        setRequests(requestsRes.data.requests);
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't load your dashboard. Pull to refresh or try again."));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) return <SkeletonDashboard />;

  const activeRequests = requests.filter(
    (r) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status)
  );
  const followUps = requests.filter((r) => r.status === 'COMPLETED');

  // Health status breakdown
  const statusCounts = {};
  cattle.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-pasture-800 via-pasture-700 to-pasture-600 rounded-2xl p-5 sm:p-6 text-white shadow-md">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-pasture-200 mt-1">Here&apos;s what&apos;s happening with your cattle today.</p>
      </div>

      {/* Cattle health status breakdown */}
      <div className="rounded-2xl border border-mist-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
            My Cattle ({cattle.length})
          </h2>
          <Link to="/farmer/cattle" className="text-xs font-semibold text-pasture-700 hover:text-pasture-800 hover:underline transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(CATTLE_STATUS).map(([key, cfg]) => {
            const StatusIcon = STATUS_ICONS[key] || Heart;
            const count = statusCounts[key] || 0;
            return (
              <div
                key={key}
                className={`rounded-xl p-3 sm:p-4 text-center ${cfg.badgeClass} transition-all hover:scale-[1.02] hover:shadow-sm`}
              >
                <div className="flex items-center justify-center mb-1.5">
                  <StatusIcon className="w-4 h-4 opacity-70" />
                </div>
                <p className="font-display text-2xl font-bold animate-count-in">{count}</p>
                <p className="text-xs font-semibold mt-0.5">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Active Requests"
          value={activeRequests.length}
          icon={Sparkles}
          gradient="from-amber-alert-50 to-amber-alert-100"
          iconColor="text-amber-alert-600"
          borderColor="border-amber-alert-200"
        />
        <StatCard
          label="Completed Visits"
          value={followUps.length}
          icon={Stethoscope}
          gradient="from-pasture-50 to-pasture-100"
          iconColor="text-pasture-600"
          borderColor="border-pasture-200"
        />
      </div>

      {/* Quick actions — redesigned with distinct colors & prominent Book Vet Visit */}
      <div className="space-y-3">
        {/* Book Vet Visit — Featured / Highlighted CTA */}
        <Link
          to="/farmer/book"
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-serum-600 to-serum-500 p-4 sm:p-5 text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01] group"
        >
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base sm:text-lg font-display font-bold tracking-tight">🩺 Book Vet Visit</p>
            <p className="text-xs text-serum-100 mt-0.5">
              Schedule a veterinary consultation or health checkup for your cattle
            </p>
          </div>
          <div className="text-white/60 group-hover:text-white/90 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Other Quick Actions — Compact Grid */}
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            to="/farmer/cattle/add"
            icon={PlusCircle}
            label="Add Cattle"
            subtitle="Register new"
            gradient="from-pasture-50 to-pasture-100"
            iconBg="bg-pasture-200"
            iconColor="text-pasture-700"
            borderColor="border-pasture-200"
          />
          <QuickAction
            to="/farmer/marketplace"
            icon={ShoppingBag}
            label="Marketplace"
            subtitle="Buy & sell"
            gradient="from-amber-alert-50 to-hide-100"
            iconBg="bg-amber-alert-200"
            iconColor="text-amber-alert-700"
            borderColor="border-amber-alert-200"
          />
          <QuickAction
            to="/farmer/notifications"
            icon={Bell}
            label="Notifications"
            subtitle="Check alerts"
            gradient="from-vital-50 to-mist-100"
            iconBg="bg-vital-200"
            iconColor="text-vital-600"
            borderColor="border-vital-200"
          />
        </div>

        {/* Transfers quick link */}
        <Link
          to="/farmer/transfers"
          className="flex items-center gap-3 rounded-xl border border-mist-200 bg-white p-3.5 hover-lift shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-mist-100 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-4 h-4 text-ink-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">Cattle Transfers</p>
            <p className="text-xs text-ink-400">View incoming & outgoing ownership transfers</p>
          </div>
        </Link>
      </div>

      {/* Reminders */}
      <RemindersSection title="Upcoming Reminders" />

      {/* Active requests */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Active Requests</h2>
          <Link to="/farmer/requests" className="text-sm font-medium text-pasture-700 hover:underline">
            View all
          </Link>
        </div>

        {activeRequests.length === 0 ? (
          <EmptyState text="No active veterinary requests." />
        ) : (
          <div className="space-y-3">
            {activeRequests.slice(0, 5).map((r) => (
              <Link
                key={r._id}
                to={`/farmer/requests/${r._id}`}
                className="flex items-center justify-between rounded-xl border border-mist-200 bg-white p-4 hover-lift shadow-sm"
              >
                <div>
                  <p className="font-medium text-ink-900">
                    {r.cattleNameSnapshot} · <span className="font-data">{r.cattleIdSnapshot}</span>
                  </p>
                  <p className="line-clamp-1 text-sm text-ink-500">{r.problemDescription}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <PriorityBadge priority={r.priority} size="sm" />
                  <StatusBadge status={r.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My cattle preview */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">My Cattle</h2>
          <Link to="/farmer/cattle" className="text-sm font-medium text-pasture-700 hover:underline">
            View all
          </Link>
        </div>
        {cattle.length === 0 ? (
          <EmptyState text="You haven't added any cattle yet." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cattle.slice(0, 6).map((c) => (
              <Link
                key={c._id}
                to={`/farmer/cattle/${c._id}`}
                className="rounded-xl border border-mist-200 bg-white p-3 hover-lift shadow-sm"
              >
                <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-pasture-50">
                  {resolveImageUrl(c.photoUrl) ? (
                    <img src={resolveImageUrl(c.photoUrl)} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🐄</span>
                  )}
                </div>
                <p className="truncate text-sm font-semibold text-ink-900">{c.name}</p>
                <p className="truncate font-data text-xs text-ink-500">{c.cattleId}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient, iconColor, borderColor }) {
  const displayValue = useCountUp(value);
  return (
    <div className={`hover-lift rounded-xl border ${borderColor} bg-gradient-to-br ${gradient} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-ink-900 animate-count-in">{displayValue}</p>
      <p className="text-xs font-medium text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, subtitle, gradient, iconBg, iconColor, borderColor }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border ${borderColor} bg-gradient-to-br ${gradient} py-4 px-3 text-center hover-lift shadow-sm transition-all`}
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`${iconColor}`} size={20} />
      </div>
      <div>
        <span className="text-xs font-bold text-ink-800 block">{label}</span>
        <span className="text-[10px] text-ink-400 block mt-0.5">{subtitle}</span>
      </div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
      {text}
    </div>
  );
}
