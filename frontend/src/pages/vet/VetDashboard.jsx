import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Stethoscope,
  ScanLine,
  Bell,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { requestApi } from '../../api/requestApi';
import { useAuth } from '../../context/AuthContext';
import { SkeletonDashboard } from '../../components/common/Skeleton';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import RemindersSection from '../../components/common/RemindersSection';
import AiAssistant from '../../components/common/AiAssistant';
import { useCountUp } from '../../hooks/useCountUp';

export default function VetDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestApi
      .getAll()
      .then((res) => setRequests(res.data.requests || []))
      .catch((err) =>
        toast.error(getErrorMessage(err, "Couldn't load your cases. Pull to refresh."))
      )
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <SkeletonDashboard />;

  const pending = requests.filter((r) => r.status === 'REQUESTED');
  const active = requests.filter((r) =>
    ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)
  );
  const emergencyPending = pending.filter((r) => r.priority === 'EMERGENCY');
  const urgentPending = pending.filter((r) => r.priority === 'URGENT');
  const routinePending = pending.filter((r) => r.priority === 'ROUTINE');
  const sortedPending = [...emergencyPending, ...urgentPending, ...routinePending];

  // Today's visits — requests with preferredDate matching today
  const today = new Date().toISOString().split('T')[0];
  const todaysVisits = requests.filter(
    (r) =>
      !['REJECTED', 'CANCELLED'].includes(r.status) &&
      r.preferredDate &&
      new Date(r.preferredDate).toISOString().split('T')[0] === today
  );

  // Recently completed visits
  const recentlyCompleted = requests
    .filter((r) => r.status === 'COMPLETED')
    .slice(0, 5);

  const doctorName = user?.name ? `Dr. ${user.name}` : 'Doctor';

  return (
    <div className="space-y-7 pb-10">
      {/* Doctor Header Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl p-6 sm:p-7 border border-mist-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
              {doctorName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-serum-50 text-serum-800 border border-serum-200">
              <span className="w-2 h-2 rounded-full bg-serum-600 animate-pulse" />
              On Duty
            </span>
          </div>
          <p className="text-sm sm:text-base text-ink-500 mt-1">
            Clinical Practice & Case Queue · Review emergencies, today&apos;s visits, and patient health charts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/vet/scan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white font-semibold text-sm shadow-sm transition-all hover:scale-102"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Cattle QR</span>
          </Link>
          <Link
            to="/vet/requests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mist-100 hover:bg-mist-200 text-ink-800 font-semibold text-sm transition-colors"
          >
            <Stethoscope className="w-4 h-4 text-serum-700" />
            <span>View All Cases</span>
          </Link>
        </div>
      </div>

      {/* Emergency Alert Banner (Shown when emergencies are pending) */}
      {emergencyPending.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-vital-50 border-2 border-vital-500 p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-vital-600 text-white shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-vital-700 bg-vital-100 px-2 py-0.5 rounded-md">
                  High Priority
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-vital-900">
                  {emergencyPending.length} Emergency Case{emergencyPending.length > 1 ? 's' : ''} Awaiting Response
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-vital-800 mt-1">
                Patient: <span className="font-semibold">{emergencyPending[0].cattleNameSnapshot}</span> ({emergencyPending[0].cattleIdSnapshot}) · Farmer reported: &quot;{emergencyPending[0].problemDescription}&quot;
              </p>
            </div>
          </div>

          <Link
            to={`/vet/requests/${emergencyPending[0]._id}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-vital-600 hover:bg-vital-700 text-white font-bold text-sm shadow-sm transition-transform hover:scale-102 shrink-0"
          >
            <span>Respond Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 4 Large Clinical Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Emergencies"
          value={emergencyPending.length}
          subtext="Immediate action needed"
          accent="text-vital-600"
          bgIcon={<AlertTriangle className="w-8 h-8 text-vital-200" />}
          borderHighlight={emergencyPending.length > 0 ? 'border-vital-300' : 'border-mist-200'}
        />
        <MetricCard
          label="Urgent Cases"
          value={urgentPending.length}
          subtext="Within 12-24 hours"
          accent="text-amber-alert-600"
          bgIcon={<Clock className="w-8 h-8 text-amber-alert-200" />}
        />
        <MetricCard
          label="Active In-Progress"
          value={active.length}
          subtext="On the way & examining"
          accent="text-serum-700"
          bgIcon={<Stethoscope className="w-8 h-8 text-serum-200" />}
        />
        <MetricCard
          label="Completed Visits"
          value={recentlyCompleted.length}
          subtext="Recorded to health history"
          accent="text-pasture-700"
          bgIcon={<CheckCircle2 className="w-8 h-8 text-pasture-200" />}
        />
      </div>

      {/* 4 Prominent Clinical Quick Action Tiles (matching Farmer Dashboard grandeur) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <QuickActionTile
            to="/vet/requests"
            icon={Stethoscope}
            title="Incoming Cases"
            badge={pending.length > 0 ? `${pending.length} pending` : null}
            desc="Triage and accept farmer calls"
          />
          <QuickActionTile
            to="/vet/scan"
            icon={ScanLine}
            title="Scan Cattle QR"
            desc="Instant cattle profile & history"
          />
          <QuickActionTile
            to="/vet/requests?priority=EMERGENCY"
            icon={AlertTriangle}
            title="Emergency Queue"
            badge={emergencyPending.length > 0 ? `${emergencyPending.length} critical` : null}
            badgeVariant="alert"
            desc="Critical cases prioritized"
          />
          <QuickActionTile
            to="/vet/notifications"
            icon={Bell}
            title="Clinical Alerts"
            desc="Lab results and updates"
          />
        </div>
      </div>

      {/* Incoming Cases Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink-900">
              Incoming Requests
            </h2>
            <p className="text-xs text-ink-500">Sorted by clinical priority (Emergency → Urgent → Routine)</p>
          </div>
          <Link
            to="/vet/requests"
            className="text-xs sm:text-sm font-semibold text-pasture-700 hover:text-pasture-800 hover:underline flex items-center gap-1"
          >
            <span>View all cases</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {sortedPending.length === 0 ? (
          <EmptyState text="No pending requests right now. All patient requests have been attended to." />
        ) : (
          <div className="space-y-3">
            {sortedPending.slice(0, 5).map((r) => (
              <PatientCaseCard key={r._id} request={r} />
            ))}
          </div>
        )}
      </section>

      {/* Today's Visits Section */}
      {todaysVisits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-lg sm:text-xl font-bold text-ink-900">
                Today&apos;s Scheduled Visits
              </h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-serum-100 px-2 text-xs font-bold text-serum-700">
                {todaysVisits.length}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {todaysVisits.map((r) => (
              <PatientCaseCard key={r._id} request={r} />
            ))}
          </div>
        </section>
      )}

      {/* Reminders / Follow-ups Due */}
      <RemindersSection title="Follow-up Visits Due" />

      {/* Active Cases Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold text-ink-900">
            My Active Cases ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <EmptyState text="No active cases in progress. Accept an incoming request above to begin treatment." />
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <PatientCaseCard key={r._id} request={r} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Completed */}
      {recentlyCompleted.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-ink-900">
            Recently Completed Treatments
          </h2>
          <div className="space-y-3">
            {recentlyCompleted.map((r) => (
              <PatientCaseCard key={r._id} request={r} />
            ))}
          </div>
        </section>
      )}

      {/* Always-accessible Clinical AI Co-Pilot for Doctor */}
      <AiAssistant mode="veterinarian" />
    </div>
  );
}

// Full-Sized Patient Case Card
function PatientCaseCard({ request }) {
  const isEmergency = request.priority === 'EMERGENCY';

  return (
    <Link
      to={`/vet/requests/${request._id}`}
      className={`group block rounded-2xl bg-white p-5 sm:p-6 transition-all duration-200 border shadow-xs hover:shadow-md hover:scale-[1.008] ${
        isEmergency ? 'border-vital-300 bg-vital-50/20' : 'border-mist-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-data text-xs sm:text-sm font-bold bg-mist-100 text-ink-800 px-2.5 py-0.5 rounded-lg border border-mist-200">
              {request.cattleIdSnapshot}
            </span>
            <span className="font-display text-base sm:text-lg font-bold text-ink-900 group-hover:text-pasture-800 transition-colors">
              {request.cattleNameSnapshot}
            </span>
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>

          {/* Problem description */}
          <p className="text-sm text-ink-700 font-medium leading-snug line-clamp-2">
            {request.problemDescription}
          </p>

          {/* Farmer contact & location info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-ink-400" />
              Farmer: {request.farmerId?.name || 'Farmer'}
            </span>
            {request.farmerId?.phone && (
              <span className="font-data text-ink-400">
                📞 {request.farmerId.phone}
              </span>
            )}
            {request.preferredDate && (
              <span className="flex items-center gap-1 text-serum-700 font-medium">
                <CalendarCheck className="w-3.5 h-3.5" />
                {new Date(request.preferredDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
          <div className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-mist-100 group-hover:bg-pasture-700 text-ink-700 group-hover:text-white font-semibold text-xs transition-colors shadow-xs">
            <span>Examine Patient</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Large Metric Card with Count-Up and Subtitle
function MetricCard({ label, value, subtext, accent, bgIcon, borderHighlight = 'border-mist-200' }) {
  const displayValue = useCountUp(value);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 border ${borderHighlight} shadow-xs hover:shadow-md transition-shadow`}
    >
      <div className="relative z-10">
        <p className={`font-display text-3xl sm:text-4xl font-bold tracking-tight ${accent}`}>
          {displayValue}
        </p>
        <p className="text-sm font-semibold text-ink-900 mt-1">{label}</p>
        <p className="text-xs text-ink-400 mt-0.5 leading-none">{subtext}</p>
      </div>
      <div className="absolute right-3 bottom-3 opacity-30 pointer-events-none">
        {bgIcon}
      </div>
    </div>
  );
}

// Large Touch-Friendly Quick Action Tile
function QuickActionTile({ to, icon: Icon, title, desc, badge, badgeVariant }) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-mist-200 hover:border-pasture-400 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pasture-50 text-pasture-700 group-hover:bg-pasture-700 group-hover:text-white transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              badgeVariant === 'alert'
                ? 'bg-vital-100 text-vital-700 animate-pulse'
                : 'bg-pasture-100 text-pasture-800'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-ink-900 group-hover:text-pasture-800 transition-colors">
          {title}
        </p>
        <p className="text-xs text-ink-500 mt-0.5 leading-snug">{desc}</p>
      </div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-8 sm:p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-mist-100 text-ink-400 flex items-center justify-center mx-auto mb-3">
        <CheckCircle2 className="w-6 h-6 text-pasture-600" />
      </div>
      <p className="text-sm font-medium text-ink-700 max-w-sm mx-auto">{text}</p>
    </div>
  );
}
