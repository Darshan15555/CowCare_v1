import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { Camera, ChevronLeft, ChevronRight, MapPin, Navigation, Edit3, Mic, Square, Trash2, PlusCircle } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import { requestApi } from '../../api/requestApi';
import { useAuth } from '../../context/AuthContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import PriorityBadge from '../../components/common/PriorityBadge';
import { PRIORITY } from '../../utils/constants';

const STEPS = ['Select Cow', 'Describe Problem', 'Priority', 'Location', 'Date & Time', 'Review'];

export default function BookVisit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [myCattle, setMyCattle] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCattleId, setSelectedCattleId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [priority, setPriority] = useState('');
  const [locationSource, setLocationSource] = useState(() =>
    user?.defaultLocation ? 'DEFAULT_FARM' : 'CURRENT_LOCATION'
  );
  const [location, setLocation] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const recorder = useAudioRecorder({ maxDurationSec: 60 });

  useEffect(() => {
    cattleApi.getMine().then((res) => setMyCattle(res.data.cattle));
  }, []);

  useEffect(() => {
    if (locationSource === 'DEFAULT_FARM' && user?.defaultLocation) {
      setLocation({ ...user.defaultLocation, source: 'DEFAULT_FARM' });
    }
  }, [locationSource, user]);

  // An emergency shouldn't require picking a date and time — that's exactly
  // the wrong moment to make a farmer stop and use a calendar widget.
  // Default to "right now" and let the review step make that explicit.
  useEffect(() => {
    if (priority === 'EMERGENCY') {
      const now = new Date();
      setPreferredDate(now.toISOString().split('T')[0]);
      setPreferredTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
  }, [priority]);

  const selectedCattle = myCattle.find((c) => c._id === selectedCattleId);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Current device location',
          source: 'CURRENT_LOCATION',
        });
        toast.success('Location captured.');
      },
      () => toast.error('Could not access your location. Please allow permission.')
    );
  };

  // If the farmer never set a default farm location, don't make them tap an
  // extra button on top of everything else - request it automatically the
  // moment they reach this step. Only tries once so a denied permission
  // doesn't re-prompt on every render.
  const autoLocationAttempted = useRef(false);
  useEffect(() => {
    if (
      step === 3 &&
      locationSource === 'CURRENT_LOCATION' &&
      !location &&
      !autoLocationAttempted.current
    ) {
      autoLocationAttempted.current = true;
      useCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, locationSource]);

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!selectedCattleId;
      case 1:
        return problemDescription.trim().length > 0 || !!recorder.audioBlob;
      case 2:
        return !!priority;
      case 3:
        return !!location?.lat || locationSource === 'MANUAL';
      case 4:
        return !!preferredDate && !!preferredTime;
      default:
        return true;
    }
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setPhotos(files);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalLocation =
        locationSource === 'MANUAL' ? { ...location, address: manualAddress, source: 'MANUAL' } : location;

      const formData = new FormData();
      formData.append('cattleId', selectedCattleId);
      formData.append('priority', priority);
      formData.append(
        'problemDescription',
        problemDescription.trim() || 'See attached voice message.'
      );
      formData.append('location', JSON.stringify(finalLocation));
      formData.append('preferredDate', preferredDate);
      formData.append('preferredTime', preferredTime);
      photos.forEach((file) => formData.append('photos', file));
      if (recorder.audioBlob) {
        formData.append('voiceNote', recorder.audioBlob, 'voice-message.webm');
      }

      const { data } = await requestApi.create(formData);
      const vetCount = data.notifiedVeterinarianCount ?? 0;

      if (vetCount === 0) {
        toast(
          'No veterinarians are on duty right now. Your request is saved and will notify the next vet who comes online.',
          { icon: '⚠️', duration: 7000 }
        );
      } else {
        toast.success(
          `Request sent — ${vetCount} veterinarian${vetCount === 1 ? '' : 's'} notified.`
        );
      }
      navigate(`/farmer/requests/${data.request._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit request.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="font-display text-2xl font-medium text-ink-900">Book Veterinary Visit</h1>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i === step
                  ? 'bg-pasture-600 text-white'
                  : i < step
                  ? 'bg-pasture-100 text-pasture-700'
                  : 'bg-mist-100 text-ink-400'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 w-4 bg-mist-200" />}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-ink-600">
        Step {step + 1}: {STEPS[step]}
      </p>

      <div className="rounded-xl border border-mist-200 bg-white p-5 shadow-sm">
        {step === 0 && (
          <div className="space-y-2">
            {myCattle.length === 0 ? (
              <div className="rounded-lg border border-dashed border-mist-300 p-4 text-center">
                <p className="mb-3 text-sm text-ink-500">You need to add a cow before booking a visit.</p>
                <Link
                  to="/farmer/cattle/add"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pasture-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pasture-700"
                >
                  <PlusCircle size={16} /> Add Cattle Now
                </Link>
              </div>
            ) : (
              myCattle.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCattleId(c._id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                    selectedCattleId === c._id
                      ? 'border-pasture-600 bg-pasture-50'
                      : 'border-mist-200'
                  }`}
                >
                  <span className="text-2xl">🐄</span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                    <p className="font-data text-xs text-ink-500">{c.cattleId}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder='e.g. "Cow has stopped eating since yesterday and appears weak."'
              className="input min-h-[110px]"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-mist-300 p-3 text-sm text-ink-500">
              <Camera size={18} /> Attach photos (optional)
              <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
            </label>
            {photos.length > 0 && <p className="text-xs text-pasture-700">{photos.length} photo(s) selected</p>}

            {/* Voice message to the vet — often faster than typing, and lets
                the vet hear tone/urgency a text description can't convey. */}
            {recorder.isSupported ? (
              recorder.audioUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-serum-200 bg-serum-50 p-3">
                  <audio controls src={recorder.audioUrl} className="h-9 flex-1" />
                  <button
                    type="button"
                    onClick={recorder.reset}
                    className="shrink-0 rounded p-1.5 text-vital-500 hover:bg-vital-50"
                    aria-label="Remove voice message"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={recorder.isRecording ? recorder.stop : recorder.start}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium ${
                    recorder.isRecording
                      ? 'border-vital-300 bg-vital-50 text-vital-700'
                      : 'border-dashed border-mist-300 text-ink-500'
                  }`}
                >
                  {recorder.isRecording ? (
                    <>
                      <Square size={16} className="fill-current" /> Stop recording ({recorder.durationSec}s)
                    </>
                  ) : (
                    <>
                      <Mic size={18} /> Record a voice message for the vet (optional)
                    </>
                  )}
                </button>
              )
            ) : (
              <p className="text-xs text-ink-400">
                Voice messages aren&apos;t supported on this browser — text and photos still work fine.
              </p>
            )}
            {recorder.error && <p className="text-xs text-vital-600">{recorder.error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {Object.entries(PRIORITY).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setPriority(key)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                  priority === key ? 'border-pasture-600 bg-pasture-50' : 'border-mist-200'
                }`}
              >
                <PriorityBadge priority={key} />
                <span className="text-xs text-ink-400">
                  {key === 'EMERGENCY'
                    ? 'Severe injury / urgent condition'
                    : key === 'URGENT'
                    ? 'Needs attention soon'
                    : 'Checkup / preventive care'}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <LocationOption
              icon={MapPin}
              label="Use Default Farm Location"
              active={locationSource === 'DEFAULT_FARM'}
              onClick={() => setLocationSource('DEFAULT_FARM')}
              disabled={!user?.defaultLocation}
            />
            <LocationOption
              icon={Navigation}
              label="Use Current Location"
              active={locationSource === 'CURRENT_LOCATION'}
              onClick={() => {
                setLocationSource('CURRENT_LOCATION');
                useCurrentLocation();
              }}
            />
            <LocationOption
              icon={Edit3}
              label="Choose Location Manually"
              active={locationSource === 'MANUAL'}
              onClick={() => setLocationSource('MANUAL')}
            />
            {locationSource === 'MANUAL' && (
              <input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Enter address or landmark"
                className="input mt-2"
              />
            )}
            {location?.address && locationSource !== 'MANUAL' && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-serum-50 px-3 py-2">
                <span className="text-xs text-ink-600">📍 {location.address}</span>
                {location.lat && (
                  <span className="ml-auto font-data text-[11px] text-serum-700">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 &&
          (priority === 'EMERGENCY' ? (
            <div className="flex items-start gap-3 rounded-lg bg-vital-50 p-4">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="text-sm font-semibold text-vital-700">Requesting immediate attention</p>
                <p className="mt-1 text-sm text-vital-600">
                  Marked as Emergency — we won&apos;t make you pick a date and time. This request goes
                  out to nearby veterinarians right now, marked urgent.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink-700">Preferred date</span>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink-700">Preferred time</span>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="input"
                />
              </label>
            </div>
          ))}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <ReviewRow label="Cow" value={`${selectedCattle?.name} (${selectedCattle?.cattleId})`} />
            <ReviewRow
              label="Problem"
              value={problemDescription.trim() || (recorder.audioBlob ? '(described by voice message)' : '—')}
            />
            {recorder.audioBlob && <ReviewRow label="Voice message" value="🎙️ Recorded, ready to send" />}
            <ReviewRow label="Priority" value={<PriorityBadge priority={priority} size="sm" />} />
            <ReviewRow
              label="Location"
              value={locationSource === 'MANUAL' ? manualAddress : location?.address || '—'}
            />
            <ReviewRow
              label="Date & Time"
              value={priority === 'EMERGENCY' ? 'As soon as possible' : `${preferredDate} at ${preferredTime}`}
            />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg border border-mist-300 px-4 py-2 text-sm font-medium text-ink-600 disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1 rounded-lg bg-pasture-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-pop px-5 py-2 text-sm disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        )}
      </div>
    </div>
  );
}

function LocationOption({ icon: Icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium disabled:opacity-40 ${
        active ? 'border-pasture-600 bg-pasture-50 text-pasture-700' : 'border-mist-200 text-ink-600'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-mist-100 pb-2">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}
