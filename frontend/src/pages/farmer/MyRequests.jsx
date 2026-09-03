import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { requestApi } from '../../api/requestApi';
import { SkeletonList } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestApi
      .getAll()
      .then((res) => setRequests(res.data.requests))
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load your requests. Pull to refresh.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-40 rounded" />
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-medium text-ink-900">My Requests</h1>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-10 text-center text-sm text-ink-500">
          No veterinary requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
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
                <p className="mt-1 text-xs text-ink-400">
                  {new Date(r.preferredDate).toLocaleDateString()} · {r.preferredTime}
                </p>
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
