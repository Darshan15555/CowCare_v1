import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { PlusCircle, Stethoscope, Bell } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import { requestApi } from '../../api/requestApi';
import { SkeletonDashboard } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import RemindersSection from '../../components/common/RemindersSection';
import { useCountUp } from '../../hooks/useCountUp';
import { useAuth } from '../../context/AuthContext';
import { CATTLE_STATUS } from '../../utils/constants';

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
      <div>
        <h1 className="font-display text-2xl font-medium text-ink-900">
          Welcome, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-ink-500">Here&apos;s what&apos;s happening with your cattle.</p>
      </div>

      {/* Cattle health status breakdown */}
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">My Cattle ({cattle.length})</h2>
          <Link to="/farmer/cattle" className="text-xs font-medium text-pasture-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(CATTLE_STATUS).map(([key, cfg]) => (
            <div key={key} className={`rounded-lg p-3 text-center ${cfg.badgeClass}`}>
              <p className="font-display text-xl font-semibold">{statusCounts[key] || 0}</p>
              <p className="text-xs font-medium">{cfg.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active Requests" value={activeRequests.length} />
        <StatCard label="Completed Visits" value={followUps.length} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickAction to="/farmer/cattle/add" icon={PlusCircle} label="Add Cattle" />
        <QuickAction to="/farmer/book" icon={Stethoscope} label="Book Vet Visit" />
        <QuickAction to="/farmer/notifications" icon={Bell} label="Notifications" />
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
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
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

function StatCard({ label, value }) {
  const displayValue = useCountUp(value);
  return (
    <div className="hover-lift rounded-xl border border-mist-200 bg-white p-4 text-center shadow-sm">
      <p className="font-display text-2xl font-semibold text-pasture-700">{displayValue}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-mist-200 bg-white py-4 text-center hover-lift shadow-sm"
    >
      <Icon className="text-pasture-600" size={22} />
      <span className="text-xs font-medium text-ink-700">{label}</span>
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
