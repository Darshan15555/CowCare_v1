import { useEffect, useState } from 'react';
import { Users, Stethoscope, Beef, Activity, CheckCircle2, Siren, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useCountUp } from '../../hooks/useCountUp';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [escalated, setEscalated] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getDashboardStats(), adminApi.getEscalatedRequests()])
      .then(([statsRes, escalatedRes]) => {
        setStats(statsRes.data.stats);
        setEscalated(escalatedRes.data.requests);
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
      <h1 className="font-display text-2xl font-medium text-ink-900">Platform Overview</h1>
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
