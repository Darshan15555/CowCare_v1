import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { requestApi } from '../../api/requestApi';
import { SkeletonList } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'REQUESTED', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ON_THE_WAY', label: 'On the way' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_RANK = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };

export default function IncomingRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    requestApi
      .getAll()
      .then((res) => setRequests(res.data.requests))
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load requests. Pull to refresh.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-32 rounded" />
        <SkeletonList count={5} />
      </div>
    );
  }

  const filtered = (filter === 'ALL' ? requests : requests.filter((r) => r.status === filter)).sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-medium text-ink-900">Requests</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === f.key
                ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                : 'border-mist-300 text-ink-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-10 text-center text-sm text-ink-500">
          No requests in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r._id}
              to={`/vet/requests/${r._id}`}
              className="flex items-center justify-between rounded-xl border border-mist-200 bg-white p-4 hover-lift shadow-sm"
            >
              <div>
                <p className="font-medium text-ink-900">
                  {r.cattleNameSnapshot} · <span className="font-data">{r.cattleIdSnapshot}</span>
                </p>
                <p className="line-clamp-1 text-sm text-ink-500">{r.problemDescription}</p>
                <p className="mt-1 text-xs text-ink-400">Farmer: {r.farmerId?.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <PriorityBadge priority={r.priority} size="sm" />
                <StatusBadge status={r.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
