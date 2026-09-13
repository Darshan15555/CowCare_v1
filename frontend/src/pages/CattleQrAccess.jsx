import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Pill,
  CalendarClock,
  ArrowRight,
  LogIn,
  AlertCircle,
  Clock,
  User,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cattleApi } from '../api/cattleApi';
import { resolveImageUrl } from '../utils/imageUrl';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { CATTLE_STATUS } from '../utils/constants';

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

export default function CattleQrAccess() {
  const { cattleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [cattleData, setCattleData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // '403', '404', 'other'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorType(null);

    cattleApi
      .scanQr(cattleId)
      .then((res) => {
        if (!isMounted) return;
        setCattleData(res.data.cattle);
        setTimeline(res.data.timeline || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        const status = err.response?.status;
        if (status === 403) {
          setErrorType('403');
          setErrorMessage(
            err.response?.data?.message ||
              'Access restricted. Only assigned veterinarians and the cattle owner can view medical records.'
          );
        } else if (status === 404) {
          setErrorType('404');
          setErrorMessage(
            err.response?.data?.message || `No cattle found with ID: ${cattleId}`
          );
        } else {
          setErrorType('other');
          setErrorMessage(
            err.response?.data?.message || 'Failed to retrieve cattle record.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cattleId, user, authLoading]);

  // If auth is still checking
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  // If user is not logged in, prompt login to view the passport
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-2xl border border-mist-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pasture-50 text-pasture-700">
            <ShieldCheck size={36} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            CowCare Health Passport
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            You scanned QR tag for cattle ID:
          </p>
          <div className="mt-2 inline-block rounded-lg bg-mist-100 px-3 py-1 font-mono text-sm font-semibold text-ink-800">
            {cattleId}
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Cattle health history and vaccination records are protected. Please sign in to verify your access credentials.
          </p>

          <button
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pasture-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pasture-800 transition"
          >
            <LogIn size={18} /> Sign In to View Passport
          </button>
        </div>
      </div>
    );
  }

  // Loading cattle data
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <LoadingSpinner label={`Loading passport for ${cattleId}...`} />
      </div>
    );
  }

  // Error 403: Forbidden
  if (errorType === '403') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert size={36} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-ink-900">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-ink-600">{errorMessage}</p>
          <p className="mt-4 text-xs text-ink-400">
            Logged in as <span className="font-semibold">{user.name}</span> ({user.role})
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-mist-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-50 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Error 404 or other
  if (errorType || !cattleData) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle size={36} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-ink-900">
            Cattle Not Found
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            {errorMessage || `No cattle record found for ID: ${cattleId}`}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-mist-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-50 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Success: Render Cattle Health Passport
  const statusConfig = CATTLE_STATUS[cattleData.status] || CATTLE_STATUS.HEALTHY;
  const isOwner = user && (String(cattleData.ownerId?._id || cattleData.ownerId) === String(user._id));
  const isVet = user?.role === 'VETERINARIAN' || user?.role === 'ADMIN';
  const photo = resolveImageUrl(cattleData.photoUrl);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-pasture-700 font-semibold text-sm">
          <ShieldCheck size={18} />
          <span>Official CowCare Digital Passport</span>
        </div>
        <span className="font-mono text-xs text-ink-500 bg-mist-100 px-2 py-1 rounded-md">
          {cattleData.cattleId}
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-pasture-50 flex items-center justify-center border border-mist-200 shadow-inner">
            {photo ? (
              <img
                src={photo}
                alt={cattleData.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl">🐄</span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-900">
                {cattleData.name}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeClass}`}>
                {statusConfig.label}
              </span>
            </div>

            <p className="mt-1 text-sm text-ink-500">
              {cattleData.breed || 'Unknown Breed'} · {cattleData.gender} · Age:{' '}
              {cattleData.estimatedAgeYears ? `${cattleData.estimatedAgeYears} yrs` : 'N/A'}
            </p>

            {cattleData.identifyingMarks && (
              <p className="mt-1 text-xs text-ink-400 italic">
                Marks: {cattleData.identifyingMarks}
              </p>
            )}

            {/* Owner Info */}
            {cattleData.ownerId && (
              <div className="mt-3 pt-3 border-t border-mist-100 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-ink-600">
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-ink-400" />
                  Owner: {cattleData.ownerId.name}
                  {cattleData.ownerId.farmName ? ` (${cattleData.ownerId.farmName})` : ''}
                </span>
                {cattleData.ownerId.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="text-ink-400" />
                    {cattleData.ownerId.phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Link based on role */}
        <div className="mt-5 pt-4 border-t border-mist-100 flex flex-wrap items-center justify-end gap-3">
          {isOwner && (
            <Link
              to={`/farmer/cattle/${cattleData._id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-pasture-700 hover:text-pasture-800"
            >
              Manage in Farmer Portal <ArrowRight size={14} />
            </Link>
          )}
          {isVet && (
            <Link
              to={`/vet/cattle/${cattleData._id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pasture-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pasture-800 transition"
            >
              Open Full Vet Clinical Workspace <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Medical History Timeline */}
      <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">
            Verified Medical History
          </h2>
          <span className="text-xs text-ink-500">
            {timeline.length} {timeline.length === 1 ? 'event' : 'events'} recorded
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="rounded-xl bg-mist-50 p-6 text-center text-sm text-ink-500">
            No medical interventions or vaccinations logged yet for this cow.
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((event) => {
              const Icon = EVENT_ICON[event.eventType] || Stethoscope;
              const iconBg = EVENT_ICON_BG[event.eventType] || 'bg-pasture-600';
              const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={event._id}
                  className="flex gap-4 rounded-xl border border-mist-100 p-4 hover:border-mist-200 transition"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg} text-white shadow-sm`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-ink-900 text-sm">
                        {event.title || event.eventType}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-ink-400">
                        <Clock size={12} />
                        {dateStr}
                      </span>
                    </div>

                    {event.description && (
                      <p className="mt-1 text-xs text-ink-600 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {event.veterinarianId && (
                      <p className="mt-2 text-xs text-ink-400">
                        Logged by Dr. {event.veterinarianId.name}{' '}
                        {event.veterinarianId.specialization
                          ? `(${event.veterinarianId.specialization})`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
