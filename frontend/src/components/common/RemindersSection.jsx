import { useEffect, useState } from 'react';
import { CalendarClock, Syringe } from 'lucide-react';
import { medicalApi } from '../../api/medicalApi';

export default function RemindersSection({ title = 'Upcoming Reminders' }) {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    medicalApi
      .getReminders(30)
      .then((res) => setReminders(res.data.reminders))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || reminders.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-ink-900">{title}</h2>
      <div className="space-y-2">
        {reminders.map((r) => {
          const isVaccination = !!r.vaccination?.nextDueDate;
          const date = isVaccination ? r.vaccination.nextDueDate : r.treatment?.followUpDate;
          const Icon = isVaccination ? Syringe : CalendarClock;
          return (
            <div
              key={r._id}
              className="flex items-center gap-3 rounded-xl border border-amber-alert-200 bg-amber-alert-50 p-3"
            >
              <Icon className="shrink-0 text-amber-alert-600" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-800">
                  {r.cattleId?.name} · {r.cattleId?.cattleId}
                </p>
                <p className="text-xs text-ink-500">
                  {isVaccination ? `Vaccination due: ${r.vaccination.vaccineName}` : 'Follow-up visit due'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-alert-700">
                {new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
