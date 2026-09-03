import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { requestApi } from '../../api/requestApi';
import { SkeletonDashboard } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import RemindersSection from '../../components/common/RemindersSection';
import { useCountUp } from '../../hooks/useCountUp';

export default function VetDashboard() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestApi
      .getAll()
      .then((res) => setRequests(res.data.requests))
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load your cases. Pull to refresh.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <SkeletonDashboard />;

  const pending = requests.filter((r) => r.status === 'REQUESTED');
  const active = requests.filter((r) =>
    ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)
  );
  const emergencyPending = pending.filter((r) => r.priority === 'EMERGENCY');
  const urgentPending = pending.filter((r) => r.priority === 'URGENT');
  const routinePending = pending.filter((r) => r.priority === 'ROUTINE');
  const sortedPending = [...emergencyPending, ...urgentPending, ...routinePending];

  // Today's visits — requests with preferredDate matching today
  const today = new Date().toISOString().split('T')[0];
  const todaysVisits = requests.filter(
    (r) =>
      !['REJECTED', 'CANCELLED'].includes(r.status) &&
      r.preferredDate &&
      new Date(r.preferredDate).toISOString().split('T')[0] === today
  );

  // Recently completed visits (last 10)
  const recentlyCompleted = requests
    .filter((r) => r.status === 'COMPLETED')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink-900">
          Which cases need your attention first?
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pending" value={pending.length} accent="text-ink-700" />
        <StatCard label="Active Cases" value={active.length} accent="text-serum-700" />
        <StatCard label="Emergencies" value={emergencyPending.length} accent="text-vital-600" />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Incoming Requests</h2>
        {sortedPending.length === 0 ? (
          <EmptyState text="No pending requests right now." />
        ) : (
          <div className="space-y-3">
            {sortedPending.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </div>
        )}
      </section>

      {/* Today's visits */}
      {todaysVisits.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">
            Today&apos;s Visits
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-serum-100 px-1.5 text-xs font-bold text-serum-700">
              {todaysVisits.length}
            </span>
          </h2>
          <div className="space-y-3">
            {todaysVisits.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </div>
        </section>
      )}

      <RemindersSection title="Follow-ups Due" />

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">My Active Cases</h2>
        {active.length === 0 ? (
          <EmptyState text="No active cases in progress." />
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </div>
        )}
      </section>

      {/* Recently completed */}
      {recentlyCompleted.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Recently Completed</h2>
          <div className="space-y-3">
            {recentlyCompleted.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RequestCard({ request }) {
  return (
    <Link
      to={`/vet/requests/${request._id}`}
      className="flex items-center justify-between rounded-xl border border-mist-200 bg-white p-4 hover-lift shadow-sm"
    >
      <div>
        <p className="font-medium text-ink-900">
          {request.cattleNameSnapshot} · <span className="font-data">{request.cattleIdSnapshot}</span>
        </p>
        <p className="line-clamp-1 text-sm text-ink-500">{request.problemDescription}</p>
        <p className="mt-1 text-xs text-ink-400">Farmer: {request.farmerId?.name}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <PriorityBadge priority={request.priority} size="sm" />
        <StatusBadge status={request.status} size="sm" />
      </div>
    </Link>
  );
}

function StatCard({ label, value, accent }) {
  const displayValue = useCountUp(value);
  return (
    <div className="hover-lift rounded-xl border border-mist-200 bg-white p-4 text-center shadow-sm">
      <p className={`font-display text-2xl font-semibold ${accent}`}>{displayValue}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
      {text}
    </div>
  );
}
