import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Stethoscope, Syringe, Pill, CalendarClock } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AiAssistant from '../../components/common/AiAssistant';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const EVENT_ICON = { VISIT: Stethoscope, VACCINATION: Syringe, TREATMENT: Pill, FOLLOW_UP: CalendarClock };
const EVENT_ICON_BG = {
  VISIT: 'bg-serum-600',
  VACCINATION: 'bg-pasture-600',
  TREATMENT: 'bg-hide-600',
  FOLLOW_UP: 'bg-amber-alert-600',
};

export default function CattleHistoryView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const requestId = searchParams.get('requestId');

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
            {resolveImageUrl(cattle.photoUrl) ? (
              <img src={resolveImageUrl(cattle.photoUrl)} alt={cattle.name} className="h-full w-full object-cover" />
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
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                        {event.eventType.replace('_', ' ')}
                      </p>
                      <p className="font-data text-xs text-ink-400">
                        {new Date(event.eventDate).toLocaleDateString(undefined, {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {/* Farmer-reported symptoms */}
                      {event.farmerReportedSymptoms && (
                        <div className="border-l-2 border-mist-300 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Farmer reported</p>
                          <p className="text-sm text-ink-600">{event.farmerReportedSymptoms}</p>
                        </div>
                      )}

                      {/* Examination */}
                      {(event.examination?.observedSymptoms || event.examination?.physicalFindings) && (
                        <div className="border-l-2 border-mist-400 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">🩺 Examination</p>
                          {event.examination.observedSymptoms && (
                            <p className="text-sm text-ink-600"><span className="font-medium">Observed:</span> {event.examination.observedSymptoms}</p>
                          )}
                          {event.examination.physicalFindings && (
                            <p className="text-sm text-ink-600"><span className="font-medium">Findings:</span> {event.examination.physicalFindings}</p>
                          )}
                          {event.examination.notes && (
                            <p className="text-sm text-ink-500">{event.examination.notes}</p>
                          )}
                        </div>
                      )}

                      {/* Vitals */}
                      {(event.examination?.vitals?.temperatureC || event.examination?.vitals?.heartRateBpm || event.examination?.vitals?.respirationRate) && (
                        <div className="flex flex-wrap gap-3 rounded-lg bg-mist-50 p-2 font-data text-xs text-ink-600">
                          {event.examination.vitals.temperatureC && <span>🌡️ {event.examination.vitals.temperatureC}°C</span>}
                          {event.examination.vitals.heartRateBpm && <span>❤️ {event.examination.vitals.heartRateBpm} bpm</span>}
                          {event.examination.vitals.respirationRate && <span>🫁 {event.examination.vitals.respirationRate} /min</span>}
                        </div>
                      )}

                      {/* Clinical assessment */}
                      {event.clinicalAssessment && (
                        <div className="border-l-2 border-serum-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-serum-700">Clinical decision</p>
                          <p className="text-sm text-ink-700">{event.clinicalAssessment}</p>
                        </div>
                      )}

                      {/* Treatment */}
                      {event.treatment?.performed && (
                        <div className="border-l-2 border-hide-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-hide-700">💊 Treatment</p>
                          <p className="text-sm text-ink-700">{event.treatment.performed}</p>
                        </div>
                      )}

                      {/* Individual medicines */}
                      {event.treatment?.medicines?.length > 0 && (
                        <div className="space-y-1.5 rounded-lg bg-serum-50/50 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-serum-700">Medicines</p>
                          {event.treatment.medicines.map((med, i) => (
                            <div key={i} className="text-xs text-ink-600">
                              <span className="font-medium text-ink-800">Rx {String(i + 1).padStart(2, '0')}: {med.name}</span>
                              {med.dosage && <span> · {med.dosage}</span>}
                              {med.frequency && <span> · {med.frequency}</span>}
                              {med.duration && <span> · {med.duration}</span>}
                              {med.route && <span> · {med.route}</span>}
                              {med.instructions && <p className="mt-0.5 text-ink-500">{med.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Vaccination */}
                      {event.vaccination?.vaccineName && (
                        <div className="border-l-2 border-pasture-500 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-pasture-700">💉 Vaccine</p>
                          <p className="text-sm text-ink-700">{event.vaccination.vaccineName}</p>
                          {event.vaccination.nextDueDate && (
                            <p className="text-xs font-medium text-amber-alert-600">
                              Next due: {new Date(event.vaccination.nextDueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {event.veterinarianId?.name && (
                      <p className="mt-3 text-xs text-ink-400">
                        Dr. {event.veterinarianId.name}
                        {event.veterinarianId.specialization ? ` · ${event.veterinarianId.specialization}` : ''}
                      </p>
                    )}
                    {event.treatment?.followUpDate && (
                      <p className="mt-1 text-xs font-medium text-amber-alert-600">
                        📅 Follow-up: {new Date(event.treatment.followUpDate).toLocaleDateString()}
                      </p>
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

      {/* Floating Clinical Co-Pilot for Veterinarian */}
      <AiAssistant
        cattleId={cattle.cattleId}
        cattleName={cattle.name}
        mode="veterinarian"
        requestId={requestId}
        initialOpen={false}
      />
    </div>
  );
}
