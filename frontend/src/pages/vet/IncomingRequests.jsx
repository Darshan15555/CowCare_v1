import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Stethoscope, ArrowRight, User, Phone, Filter } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { requestApi } from '../../api/requestApi';
import { SkeletonList } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import AiAssistant from '../../components/common/AiAssistant';

const FILTERS = [
  { key: 'ALL', label: 'All Cases' },
  { key: 'REQUESTED', label: 'Pending Triage' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ON_THE_WAY', label: 'On The Way' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'IN_PROGRESS', label: 'In Examination' },
  { key: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_RANK = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };

export default function IncomingRequests() {
  const [searchParams] = useSearchParams();
  const priorityFilter = searchParams.get('priority');
  const searchQuery = searchParams.get('search') || '';

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    requestApi
      .getAll()
      .then((res) => setRequests(res.data.requests || []))
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load requests. Pull to refresh.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-44 rounded-xl" />
        <SkeletonList count={5} />
      </div>
    );
  }

  let filtered = requests;

  // Filter by status tab
  if (filter !== 'ALL') {
    filtered = filtered.filter((r) => r.status === filter);
  }

  // Filter by priority param if passed in URL
  if (priorityFilter) {
    filtered = filtered.filter((r) => r.priority === priorityFilter);
  }

  // Filter by search query if passed in URL
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.cattleNameSnapshot?.toLowerCase().includes(q) ||
        r.cattleIdSnapshot?.toLowerCase().includes(q) ||
        r.farmerId?.name?.toLowerCase().includes(q) ||
        r.problemDescription?.toLowerCase().includes(q)
    );
  }

  filtered = filtered.sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Patient Cases
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Clinical visit requests and ongoing treatment cases from local farmers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-mist-100 text-ink-700 border border-mist-200">
            {filtered.length} {filtered.length === 1 ? 'case' : 'cases'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => {
          const count =
            f.key === 'ALL'
              ? requests.length
              : requests.filter((r) => r.status === f.key).length;
          const isActive = filter === f.key;

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-xs ${
                isActive
                  ? 'bg-pasture-700 text-white'
                  : 'bg-white border border-mist-200 text-ink-600 hover:bg-mist-100'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-mist-100 text-ink-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Case List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-mist-100 text-ink-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-ink-900">No cases found</h3>
          <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto">
            No clinical requests match the selected status filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((r) => (
            <Link
              key={r._id}
              to={`/vet/requests/${r._id}`}
              className="group block rounded-2xl border border-mist-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-pasture-400 hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-data text-xs font-bold bg-mist-100 text-ink-800 px-2.5 py-0.5 rounded-lg border border-mist-200">
                      {r.cattleIdSnapshot}
                    </span>
                    <span className="font-display text-base sm:text-lg font-bold text-ink-900 group-hover:text-pasture-800 transition-colors">
                      {r.cattleNameSnapshot}
                    </span>
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>

                  <p className="text-sm text-ink-700 font-medium leading-relaxed">
                    {r.problemDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500 pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-ink-400" />
                      Farmer: {r.farmerId?.name || 'Farmer'}
                    </span>
                    {r.farmerId?.phone && (
                      <span className="flex items-center gap-1 font-data text-ink-500">
                        <Phone className="w-3 h-3 text-ink-400" />
                        {r.farmerId.phone}
                      </span>
                    )}
                    {r.preferredDate && (
                      <span className="text-serum-700 font-medium">
                        Visit Date: {new Date(r.preferredDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:self-center shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-mist-100 group-hover:bg-pasture-700 text-ink-700 group-hover:text-white font-semibold text-xs transition-colors shadow-xs">
                    <span>Examine Case</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Clinical AI Co-Pilot */}
      <AiAssistant mode="veterinarian" />
    </div>
  );
}
