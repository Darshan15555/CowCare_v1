import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';

const STATUS_FILTERS = ['ALL', 'REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const PRIORITY_FILTERS = ['ALL', 'EMERGENCY', 'URGENT', 'ROUTINE'];

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const load = (status, priority) => {
    setIsLoading(true);
    const params = {};
    if (status !== 'ALL') params.status = status;
    if (priority !== 'ALL') params.priority = priority;

    adminApi
      .getAllRequests(params)
      .then((res) => setRequests(res.data.requests))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => load(statusFilter, priorityFilter), [statusFilter, priorityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-medium text-ink-900">All Requests</h1>

      {/* Status filters */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-500">Status</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                statusFilter === s
                  ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                  : 'border-mist-300 text-ink-600'
              }`}
            >
              {s.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Priority filters */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-500">Priority</p>
        <div className="flex gap-2">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                priorityFilter === p
                  ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                  : 'border-mist-300 text-ink-600'
              }`}
            >
              {p.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading requests..." />
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
          No requests match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div
              key={r._id}
              className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">
                    {r.cattleId?.name || r.cattleNameSnapshot}{' '}
                    <span className="font-data text-ink-500">
                      · {r.cattleId?.cattleId || r.cattleIdSnapshot}
                    </span>
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{r.problemDescription}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
                    <span>Farmer: {r.farmerId?.name || '—'}</span>
                    {r.veterinarianId && <span>Vet: Dr. {r.veterinarianId.name}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <PriorityBadge priority={r.priority} size="sm" />
                  <StatusBadge status={r.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
