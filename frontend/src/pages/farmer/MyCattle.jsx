import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, ArrowRightLeft } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { cattleApi } from '../../api/cattleApi';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

export default function MyCattle() {
  const [cattle, setCattle] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cattleApi
      .getMine()
      .then((res) => setCattle(res.data.cattle))
      .catch((err) => toast.error(getErrorMessage(err, "Couldn't load your cattle. Pull to refresh.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-7 w-32 rounded" />
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-medium text-ink-900">My Cattle</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/farmer/transfers"
            className="flex items-center gap-1.5 rounded-lg border border-mist-300 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-mist-50"
          >
            <ArrowRightLeft size={16} />
          </Link>
          <Link
            to="/farmer/cattle/add"
            className="flex items-center gap-1.5 rounded-lg bg-pasture-600 px-3 py-2 text-sm font-medium text-white hover:bg-pasture-700"
          >
            <PlusCircle size={16} /> Add Cow
          </Link>
        </div>
      </div>

      {cattle.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-10 text-center">
          <p className="mb-3 text-4xl">🐄</p>
          <p className="text-sm text-ink-500">No cattle registered yet.</p>
          <Link
            to="/farmer/cattle/add"
            className="mt-3 inline-block text-sm font-medium text-pasture-700 hover:underline"
          >
            Add your first cow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {cattle.map((c) => {
            const statusConfig = CATTLE_STATUS[c.status] || CATTLE_STATUS.HEALTHY;
            return (
              <Link
                key={c._id}
                to={`/farmer/cattle/${c._id}`}
                className="overflow-hidden rounded-xl border border-mist-200 bg-white hover-lift shadow-sm"
              >
                <div className="flex h-28 items-center justify-center bg-pasture-50">
                  {resolveImageUrl(c.photoUrl) ? (
                    <img src={resolveImageUrl(c.photoUrl)} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">🐄</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate font-semibold text-ink-900">{c.name}</p>
                    {c.sale?.status === 'OPEN_FOR_SALE' && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                        For Sale
                      </span>
                    )}
                    {c.sale?.status === 'SALE_PENDING' && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="truncate font-data text-xs text-ink-500">{c.cattleId}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
