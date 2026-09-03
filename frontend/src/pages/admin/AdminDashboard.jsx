import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, Beef, Activity, CheckCircle2, Siren, AlertTriangle, ArrowRight, BarChart3 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useCountUp } from '../../hooks/useCountUp';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CATTLE_STATUS, PRIORITY, STATUS } from '../../utils/constants';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [escalated, setEscalated] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.getEscalatedRequests(),
      adminApi.getAnalytics().catch(() => ({ data: { analytics: null } })),
    ])
      .then(([statsRes, escalatedRes, analyticsRes]) => {
        setStats(statsRes.data.stats);
        setEscalated(escalatedRes.data.requests);
        setAnalytics(analyticsRes.data.analytics);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading platform data..." />;

  const cards = [
    { label: 'Total Farmers', value: stats.totalFarmers, icon: Users, color: 'text-pasture-700' },
    { label: 'Total Veterinarians', value: stats.totalVeterinarians, icon: Stethoscope, color: 'text-serum-700' },
    { label: 'Total Cattle', value: stats.totalCattle, icon: Beef, color: 'text-amber-alert-700' },
    { label: 'Active Cases', value: stats.activeCases, icon: Activity, color: 'text-serum-700' },
    { label: 'Completed Visits', value: stats.completedVisits, icon: CheckCircle2, color: 'text-pasture-700' },
    { label: 'Emergency Cases', value: stats.emergencyCases, icon: Siren, color: 'text-vital-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="font-display text-2xl font-medium text-ink-900">Platform Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-mist-50 shadow-sm"
          >
            <Users size={14} /> Users
          </Link>
          <Link
            to="/admin/cattle"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-mist-50 shadow-sm"
          >
            <Beef size={14} /> Cattle
          </Link>
          <Link
            to="/admin/requests"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-mist-50 shadow-sm"
          >
            <Activity size={14} /> Requests
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <AdminStatCard key={label} label={label} value={value} icon={Icon} color={color} />
        ))}
      </div>

      {escalated.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-vital-700">
            <AlertTriangle size={17} /> Escalated Emergencies Still Unaccepted ({escalated.length})
          </h2>
          <div className="space-y-2">
            {escalated.map((r) => (
              <div
                key={r._id}
                className="animate-count-in hover-lift rounded-xl border border-l-4 border-vital-200 border-l-vital-600 bg-vital-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-vital-800">
                    {r.cattleNameSnapshot} · <span className="font-data">{r.cattleIdSnapshot}</span>
                  </p>
                  <span className="text-xs font-medium text-vital-600">
                    {r.escalationNotifiedCount} vet{r.escalationNotifiedCount === 1 ? '' : 's'} notified
                  </span>
                </div>
                <p className="mt-1 text-sm text-vital-700">{r.problemDescription}</p>
                <p className="mt-1 text-xs text-vital-500">
                  Farmer: {r.farmerId?.name} · {r.farmerId?.phone} · Escalated{' '}
                  {new Date(r.escalatedAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analytics Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cattle Health Status Distribution */}
          <div className="rounded-xl border border-mist-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-pasture-700" /> Cattle Health Status
              </h2>
              <Link to="/admin/cattle" className="text-xs text-pasture-700 hover:underline flex items-center gap-0.5">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATTLE_STATUS).map(([key, cfg]) => {
                const item = analytics.cattleStatusDistribution?.find((d) => d._id === key);
                const count = item ? item.count : 0;
                return (
                  <div key={key} className={`rounded-lg p-3 ${cfg.badgeClass}`}>
                    <p className="text-xs font-medium">{cfg.label}</p>
                    <p className="font-display text-xl font-bold mt-1">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Requests Priority Distribution */}
          <div className="rounded-xl border border-mist-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-serum-700" /> Requests by Urgency
              </h2>
              <Link to="/admin/requests" className="text-xs text-pasture-700 hover:underline flex items-center gap-0.5">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {Object.entries(PRIORITY).map(([key, cfg]) => {
                const item = analytics.requestsByPriority?.find((d) => d._id === key);
                const count = item ? item.count : 0;
                const totalReqs = stats.activeCases + stats.completedVisits || 1;
                const pct = Math.round((count / totalReqs) * 100);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-700 flex items-center gap-1">
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="font-data text-ink-500 font-semibold">{count} case{count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-mist-100 overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.dotClass}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStatCard({ label, value, icon: Icon, color }) {
  const displayValue = useCountUp(value);
  return (
    <div className="hover-lift rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
      <Icon className={color} size={20} />
      <p className={`mt-2 font-display text-2xl font-semibold ${color}`}>{displayValue}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
