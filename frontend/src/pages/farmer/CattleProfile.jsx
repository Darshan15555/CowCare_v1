import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, Stethoscope, Syringe, Pill, CalendarClock, Siren, ArrowRightLeft } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { cattleApi } from '../../api/cattleApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CATTLE_STATUS } from '../../utils/constants';

const EVENT_ICON = {
  VISIT: Stethoscope,
  VACCINATION: Syringe,
  TREATMENT: Pill,
  FOLLOW_UP: CalendarClock,
};

const EVENT_ICON_BG = {
  VISIT: 'bg-serum-600',
  VACCINATION: 'bg-pasture-600',
  TREATMENT: 'bg-hide-600',
  FOLLOW_UP: 'bg-amber-alert-600',
};

export default function CattleProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferPhone, setTransferPhone] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const load = () => {
    cattleApi
      .getProfile(id)
      .then((res) => setData(res.data))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  if (isLoading) return <LoadingSpinner label="Loading cattle profile..." />;
  if (!data) return <p className="text-sm text-ink-500">Cattle not found.</p>;

  const { cattle, timeline, activeCases } = data;
  const statusConfig = CATTLE_STATUS[cattle.status] || CATTLE_STATUS.HEALTHY;

  const handleInitiateTransfer = async () => {
    if (!transferPhone.trim()) {
      toast.error('Enter the new owner\'s phone number.');
      return;
    }
    setIsTransferring(true);
    try {
      await cattleApi.initiateTransfer(cattle._id, transferPhone.trim());
      toast.success('Transfer request sent. They need to accept it before ownership changes.');
      setShowTransferForm(false);
      setTransferPhone('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the transfer.'));
    } finally {
      setIsTransferring(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(cattle.cattleId);
    toast.success('Cattle ID copied.');
  };

  return (
    <div className="space-y-6">
      {/* Health passport */}
      <div className="relative overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
        {/* Rotated status stamp — the passport's signature detail */}
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex h-16 w-16 -rotate-[14deg] items-center justify-center rounded-full border-2 border-dashed border-white/40 text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-white/80">
          {statusConfig.label}
        </div>

        <div className="flex flex-col gap-4 bg-gradient-to-br from-pasture-700 via-pasture-600 to-pasture-500 p-5 text-white sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/50 bg-white/10">
            {cattle.photoUrl ? (
              <img src={cattle.photoUrl} alt={cattle.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">🐄</span>
            )}
          </div>
          <div className="flex-1 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-pasture-100/80">
              Digital Cattle Health Passport
            </p>
            <h1 className="font-display text-2xl font-semibold leading-tight">{cattle.name}</h1>
            <p className="mt-0.5 text-sm text-pasture-50/90">
              {cattle.breed || 'Breed not recorded'} · Owner {cattle.ownerId?.name}
            </p>
          </div>
        </div>

        {/* Perforated seam between "photo page" and "details page" */}
        <div className="relative h-0 border-t-2 border-dashed border-mist-200">
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-mist-50" />
          <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-mist-50" />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={copyId}
              className="flex items-center gap-2 rounded-lg bg-mist-100 px-3 py-2 font-data text-sm font-medium text-ink-800 hover:bg-mist-200"
              title="Copy permanent cattle ID"
            >
              {cattle.cattleId} <Copy size={13} />
            </button>
            <button
              onClick={() => setShowQr(!showQr)}
              className="rounded-lg border border-pasture-600 px-3 py-2 text-xs font-medium text-pasture-700 hover:bg-pasture-50"
            >
              {showQr ? 'Hide QR' : 'Show QR Code'}
            </button>
          </div>

          <div className="flex gap-6 text-sm text-ink-600">
            <p>
              Gender <span className="ml-1 font-medium capitalize text-ink-800">{cattle.gender?.toLowerCase()}</span>
            </p>
            {cattle.estimatedAgeYears && (
              <p>
                Age <span className="ml-1 font-medium text-ink-800">{cattle.estimatedAgeYears} yrs</span>
              </p>
            )}
          </div>
        </div>

        {showQr && cattle.qrCodeDataUrl && (
          <div className="flex flex-col items-center gap-2 border-t border-mist-100 p-5">
            <img src={cattle.qrCodeDataUrl} alt="Cattle QR" className="h-40 w-40" />
            <p className="font-data text-xs text-ink-400">Scan resolves to this ID only — never raw medical data.</p>
          </div>
        )}
      </div>

      {/* Transfer ownership */}
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        {!showTransferForm ? (
          <button
            onClick={() => setShowTransferForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-mist-300 py-2.5 text-sm font-medium text-ink-600 hover:bg-mist-50"
          >
            <ArrowRightLeft size={16} /> Transfer Ownership
          </button>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-ink-900">Transfer {cattle.name} to another farmer</h2>
            <p className="text-xs text-ink-500">
              The new owner must already have a CowCare account and will need to accept before
              ownership changes. The full health history moves with the cow.
            </p>
            <input
              type="tel"
              value={transferPhone}
              onChange={(e) => setTransferPhone(e.target.value)}
              placeholder="New owner's phone number"
              className="input font-data"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferForm(false)}
                className="flex-1 rounded-lg border border-mist-300 py-2 text-sm font-medium text-ink-600"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateTransfer}
                disabled={isTransferring}
                className="flex-1 btn-pop py-2 text-sm disabled:opacity-60"
              >
                {isTransferring ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active cases */}
      {activeCases?.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-ink-900">
            <Siren size={16} className="text-vital-500" /> Current Cases
          </h2>
          <div className="space-y-2">
            {activeCases.map((c) => (
              <Link
                key={c._id}
                to={`/farmer/requests/${c._id}`}
                className="block rounded-lg border border-amber-alert-200 bg-amber-alert-50 p-3 text-sm text-amber-alert-800 hover:bg-amber-alert-100"
              >
                {c.problemDescription} — <span className="font-medium">{c.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Health timeline */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Health Timeline</h2>
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
            No medical events recorded yet.
          </div>
        ) : (
          <ol className="relative space-y-6 border-l-2 border-pasture-100 pl-5">
            {timeline.map((event) => {
              const Icon = EVENT_ICON[event.eventType] || Stethoscope;
              return (
                <li key={event._id} className="relative">
                  <span className={`absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full text-white ${EVENT_ICON_BG[event.eventType] || 'bg-ink-500'}`}>
                    <Icon size={13} />
                  </span>
                  <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-pasture-700">
                        {event.eventType.replace('_', ' ')}
                      </p>
                      <p className="font-data text-xs text-ink-400">
                        {new Date(event.eventDate).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {event.farmerReportedSymptoms && (
                        <div className="border-l-2 border-mist-300 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                            Farmer reported
                          </p>
                          <p className="text-sm text-ink-600">{event.farmerReportedSymptoms}</p>
                        </div>
                      )}
                      {event.clinicalAssessment && (
                        <div className="border-l-2 border-serum-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-serum-700">
                            Clinical decision
                          </p>
                          <p className="text-sm text-ink-700">{event.clinicalAssessment}</p>
                        </div>
                      )}
                      {event.treatment?.performed && (
                        <div className="border-l-2 border-hide-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-hide-700">
                            Treatment given
                          </p>
                          <p className="text-sm text-ink-700">{event.treatment.performed}</p>
                        </div>
                      )}
                      {event.vaccination?.vaccineName && (
                        <div className="border-l-2 border-pasture-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-pasture-700">
                            Vaccine
                          </p>
                          <p className="text-sm text-ink-700">{event.vaccination.vaccineName}</p>
                        </div>
                      )}
                    </div>

                    {event.veterinarianId?.name && (
                      <p className="mt-3 text-xs text-ink-400">Dr. {event.veterinarianId.name}</p>
                    )}
                    {event.treatment?.followUpDate && (
                      <p className="mt-1 text-xs font-medium text-amber-alert-600">
                        Follow-up: {new Date(event.treatment.followUpDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
