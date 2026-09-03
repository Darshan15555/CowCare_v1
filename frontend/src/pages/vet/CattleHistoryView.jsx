import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Stethoscope, Syringe, Pill, CalendarClock } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CATTLE_STATUS } from '../../utils/constants';

const EVENT_ICON = { VISIT: Stethoscope, VACCINATION: Syringe, TREATMENT: Pill, FOLLOW_UP: CalendarClock };
const EVENT_ICON_BG = {
  VISIT: 'bg-serum-600',
  VACCINATION: 'bg-pasture-600',
  TREATMENT: 'bg-hide-600',
  FOLLOW_UP: 'bg-amber-alert-600',
};

export default function CattleHistoryView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cattleApi
      .getProfile(id)
      .then((res) => setData(res.data))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpinner label="Loading cattle history..." />;
  if (!data) return <p className="text-sm text-ink-500">Cattle record not found.</p>;

  const { cattle, timeline } = data;
  const statusConfig = CATTLE_STATUS[cattle.status] || CATTLE_STATUS.HEALTHY;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-pasture-50">
            {cattle.photoUrl ? (
              <img src={cattle.photoUrl} alt={cattle.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">🐄</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-lg font-medium text-ink-900">{cattle.name}</h1>
            <p className="text-xs text-ink-500"><span className="font-data">{cattle.cattleId}</span> · {cattle.breed}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.badgeClass}`}>
            {statusConfig.label}
          </span>
        </div>
        <p className="mt-3 text-xs text-ink-400">Owner: {cattle.ownerId?.name} · {cattle.ownerId?.phone}</p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Previous History</h2>
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
            No previous medical events. This would be the first recorded visit.
          </div>
        ) : (
          <ol className="relative space-y-6 border-l-2 border-mist-100 pl-5">
            {timeline.map((event) => {
              const Icon = EVENT_ICON[event.eventType] || Stethoscope;
              return (
                <li key={event._id} className="relative animate-count-in">
                  <span className={`absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full text-white ${EVENT_ICON_BG[event.eventType] || 'bg-ink-400'}`}>
                    <Icon size={13} />
                  </span>
                  <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                        {event.eventType.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-ink-400">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                    </div>
                    {event.clinicalAssessment && (
                      <p className="mb-1 text-sm text-ink-600">
                        <span className="font-medium">Diagnosis:</span> {event.clinicalAssessment}
                      </p>
                    )}
                    {event.treatment?.performed && (
                      <p className="mb-1 text-sm text-ink-600">
                        <span className="font-medium">Treatment:</span> {event.treatment.performed}
                      </p>
                    )}
                    {event.treatment?.medicines?.length > 0 && (
                      <p className="mb-1 text-xs text-ink-500">
                        Medicines: {event.treatment.medicines.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    {event.vaccination?.vaccineName && (
                      <p className="mb-1 text-sm text-ink-600">
                        <span className="font-medium">Vaccine:</span> {event.vaccination.vaccineName}
                      </p>
                    )}
                    {event.veterinarianId?.name && (
                      <p className="mt-2 text-xs text-ink-400">Dr. {event.veterinarianId.name}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <p className="rounded-lg bg-mist-50 p-3 text-xs text-ink-500">
        This is historical context only. Previous treatment does not determine today&apos;s clinical
        decision — that judgment belongs to you as the examining veterinarian.
      </p>
    </div>
  );
}
