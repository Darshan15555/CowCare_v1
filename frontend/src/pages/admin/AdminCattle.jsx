import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const STATUS_FILTERS = ['ALL', 'HEALTHY', 'UNDER_OBSERVATION', 'CRITICAL', 'RECOVERING'];

export default function AdminCattle() {
  const [cattle, setCattle] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = (status, searchTerm) => {
    setIsLoading(true);
    const params = {};
    if (status !== 'ALL') params.status = status;
    if (searchTerm) params.search = searchTerm;

    adminApi
      .getAllCattle(params)
      .then((res) => setCattle(res.data.cattle))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => load(statusFilter, search), [statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-medium text-ink-900">All Cattle</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or ID..."
            className="input pl-9"
          />
        </div>
        <button type="submit" className="rounded-lg bg-pasture-600 px-4 text-sm font-medium text-white hover:bg-pasture-700">
          Search
        </button>
      </form>

      {/* Status filters */}
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

      {isLoading ? (
        <LoadingSpinner label="Loading cattle..." />
      ) : cattle.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
          No cattle found.
        </div>
      ) : (
        <div className="space-y-2">
          {cattle.map((c) => {
            const statusCfg = CATTLE_STATUS[c.status] || CATTLE_STATUS.HEALTHY;
            return (
              <div
                key={c._id}
                className="flex items-center justify-between rounded-xl border border-mist-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-pasture-50">
                    {resolveImageUrl(c.photoUrl) ? (
                      <img src={resolveImageUrl(c.photoUrl)} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">🐄</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{c.name}</p>
                    <p className="font-data text-xs text-ink-500">{c.cattleId}</p>
                    <p className="text-xs text-ink-400">
                      Owner: {c.ownerId?.name || 'Unknown'} · {c.ownerId?.phone || ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.badgeClass}`}>
                    {statusCfg.label}
                  </span>
                  {c.breed && <span className="text-xs text-ink-400">{c.breed}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
