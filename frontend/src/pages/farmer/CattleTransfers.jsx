import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Check, X, Ban } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import { getErrorMessage } from '../../utils/errorMessage';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_LABEL = {
  PENDING: { label: 'Pending', className: 'bg-amber-alert-50 text-amber-alert-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-pasture-50 text-pasture-700' },
  REJECTED: { label: 'Declined', className: 'bg-vital-50 text-vital-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-mist-100 text-ink-500' },
};

export default function CattleTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = () => {
    cattleApi
      .getMyTransfers()
      .then((res) => setTransfers(res.data.transfers))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleRespond = async (transferId, action) => {
    setActingId(transferId);
    try {
      await cattleApi.respondToTransfer(transferId, action);
      const verb = { ACCEPT: 'accepted', REJECT: 'declined', CANCEL: 'cancelled' }[action];
      toast.success(`Transfer ${verb}.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the transfer.'));
    } finally {
      setActingId(null);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading transfers..." />;

  const incoming = transfers.filter((t) => t.toOwnerId?._id === user._id);
  const outgoing = transfers.filter((t) => t.fromOwnerId?._id === user._id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-medium text-ink-900">Cattle Transfers</h1>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Incoming</h2>
        {incoming.length === 0 ? (
          <EmptyState text="No incoming transfer requests." />
        ) : (
          <div className="space-y-3">
            {incoming.map((t) => (
              <div key={t._id} className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {t.cattleNameSnapshot} · <span className="font-data">{t.cattleIdSnapshot}</span>
                    </p>
                    <p className="text-xs text-ink-500">From {t.fromOwnerId?.name} · {t.fromOwnerId?.phone}</p>
                  </div>
                  <StatusPill status={t.status} />
                </div>
                {t.status === 'PENDING' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleRespond(t._id, 'ACCEPT')}
                      disabled={actingId === t._id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pasture-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Check size={15} /> Accept
                    </button>
                    <button
                      onClick={() => handleRespond(t._id, 'REJECT')}
                      disabled={actingId === t._id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-vital-300 py-2 text-sm font-medium text-vital-600 disabled:opacity-60"
                    >
                      <X size={15} /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Outgoing</h2>
        {outgoing.length === 0 ? (
          <EmptyState text="You haven't started any transfers." />
        ) : (
          <div className="space-y-3">
            {outgoing.map((t) => (
              <div key={t._id} className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {t.cattleNameSnapshot} · <span className="font-data">{t.cattleIdSnapshot}</span>
                    </p>
                    <p className="text-xs text-ink-500">To {t.toOwnerId?.name} · {t.toOwnerId?.phone}</p>
                  </div>
                  <StatusPill status={t.status} />
                </div>
                {t.status === 'PENDING' && (
                  <button
                    onClick={() => handleRespond(t._id, 'CANCEL')}
                    disabled={actingId === t._id}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-mist-300 py-2 text-sm font-medium text-ink-600 disabled:opacity-60"
                  >
                    <Ban size={15} /> Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }) {
  const config = STATUS_LABEL[status] || STATUS_LABEL.PENDING;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>{config.label}</span>;
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
      <ArrowRightLeft className="mx-auto mb-2 text-mist-300" size={22} />
      {text}
    </div>
  );
}
