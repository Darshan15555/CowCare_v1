import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorMessage';
import { MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { requestApi } from '../api/requestApi';
import StarRating from '../components/common/StarRating';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SCHEDULE = DAY_LABELS.map((_, dayOfWeek) => ({
  dayOfWeek,
  isWorking: dayOfWeek >= 1 && dayOfWeek <= 5, // Mon-Fri on by default, weekend off
  startTime: '09:00',
  endTime: '18:00',
}));

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const isFarmer = user?.role === 'FARMER';
  const [isSaving, setIsSaving] = useState(false);
  const [myRating, setMyRating] = useState(null);

  useEffect(() => {
    if (!isFarmer && user?._id) {
      requestApi.getVetRating(user._id).then((res) => setMyRating(res.data));
    }
  }, [isFarmer, user?._id]);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    farmName: user?.farmName || '',
    farmAddress: user?.defaultLocation?.address || '',
    specialization: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
    yearsOfExperience: user?.yearsOfExperience ?? '',
    serviceAreaRadiusKm: user?.serviceAreaRadiusKm ?? '',
  });
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? true);
  const [acceptsEmergencyOverride, setAcceptsEmergencyOverride] = useState(
    user?.acceptsEmergencyOverride ?? false
  );
  const [weeklySchedule, setWeeklySchedule] = useState(
    user?.weeklySchedule?.length ? user.weeklySchedule : DEFAULT_SCHEDULE
  );
  const [farmCoords, setFarmCoords] = useState(
    user?.defaultLocation?.lat ? { lat: user.defaultLocation.lat, lng: user.defaultLocation.lng } : null
  );

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const captureFarmLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFarmCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Location captured. Save to apply.');
      },
      () => toast.error('Could not access your location.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { name: form.name, email: form.email || undefined };
      if (isFarmer) {
        payload.farmName = form.farmName;
        if (farmCoords) {
          payload.defaultLocation = { ...farmCoords, address: form.farmAddress || undefined };
        }
      } else {
        payload.specialization = form.specialization;
        payload.licenseNumber = form.licenseNumber;
        payload.yearsOfExperience = form.yearsOfExperience || 0;
        payload.serviceAreaRadiusKm = form.serviceAreaRadiusKm || 25;
        payload.isAvailable = isAvailable;
        payload.weeklySchedule = weeklySchedule;
        payload.acceptsEmergencyOverride = acceptsEmergencyOverride;
      }

      const { data } = await authApi.updateMe(payload);
      setUser(data.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="font-display text-xl font-medium text-ink-900">Profile Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-mist-200 bg-white p-5 shadow-sm">
        <Field label="Full name">
          <input value={form.name} onChange={update('name')} className="input" />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={update('email')} className="input" />
        </Field>

        {isFarmer ? (
          <>
            <Field label="Farm name">
              <input value={form.farmName} onChange={update('farmName')} className="input" />
            </Field>
            <Field label="Farm address (label)">
              <input value={form.farmAddress} onChange={update('farmAddress')} className="input" />
            </Field>
            <button
              type="button"
              onClick={captureFarmLocation}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium ${
                farmCoords ? 'border-pasture-600 bg-pasture-50 text-pasture-700' : 'border-mist-300 text-ink-600'
              }`}
            >
              <MapPin size={16} />
              {farmCoords ? 'Location set ✓ (tap to update)' : 'Set Default Farm Location'}
            </button>
          </>
        ) : (
          <>
            {myRating?.totalRatings > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-alert-50 p-3">
                <StarRating value={Math.round(myRating.averageStars)} size={16} />
                <span className="text-sm text-ink-700">
                  {myRating.averageStars} average from {myRating.totalRatings} rated visit
                  {myRating.totalRatings === 1 ? '' : 's'}
                </span>
              </div>
            )}
            <Field label="Specialization">
              <input value={form.specialization} onChange={update('specialization')} className="input" />
            </Field>
            <Field label="License number">
              <input value={form.licenseNumber} onChange={update('licenseNumber')} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Years of experience">
                <input
                  type="number"
                  min="0"
                  value={form.yearsOfExperience}
                  onChange={update('yearsOfExperience')}
                  className="input"
                />
              </Field>
              <Field label="Service radius (km)">
                <input
                  type="number"
                  min="1"
                  value={form.serviceAreaRadiusKm}
                  onChange={update('serviceAreaRadiusKm')}
                  className="input"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-mist-200 p-3">
              <div>
                <p className="text-sm font-medium text-ink-800">On Duty Now</p>
                <p className="text-xs text-ink-500">
                  Quick override — switch off anytime (e.g. a break), even during scheduled hours below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`h-7 w-12 shrink-0 rounded-full transition-colors ${
                  isAvailable ? 'bg-pasture-600' : 'bg-mist-300'
                }`}
              >
                <span
                  className={`block h-5 w-5 translate-y-1 rounded-full bg-white shadow transition-transform ${
                    isAvailable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-ink-800">Weekly Schedule</p>
              <p className="mb-2 text-xs text-ink-500">
                New requests are sent to you automatically during these hours, on top of the toggle above.
              </p>
              <div className="space-y-1.5">
                {weeklySchedule.map((day) => (
                  <div key={day.dayOfWeek} className="flex items-center gap-2 rounded-lg border border-mist-200 p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setWeeklySchedule((prev) =>
                          prev.map((d) =>
                            d.dayOfWeek === day.dayOfWeek ? { ...d, isWorking: !d.isWorking } : d
                          )
                        )
                      }
                      className={`w-10 shrink-0 rounded-md py-1 text-xs font-semibold ${
                        day.isWorking ? 'bg-pasture-100 text-pasture-700' : 'bg-mist-100 text-ink-400'
                      }`}
                    >
                      {DAY_LABELS[day.dayOfWeek]}
                    </button>
                    {day.isWorking ? (
                      <>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            setWeeklySchedule((prev) =>
                              prev.map((d) =>
                                d.dayOfWeek === day.dayOfWeek ? { ...d, startTime: e.target.value } : d
                              )
                            )
                          }
                          className="input min-w-0 flex-1 px-2 py-1 text-sm"
                        />
                        <span className="shrink-0 text-xs text-ink-400">–</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            setWeeklySchedule((prev) =>
                              prev.map((d) =>
                                d.dayOfWeek === day.dayOfWeek ? { ...d, endTime: e.target.value } : d
                              )
                            )
                          }
                          className="input min-w-0 flex-1 px-2 py-1 text-sm"
                        />
                      </>
                    ) : (
                      <span className="flex-1 text-xs text-ink-400">Off</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-vital-200 bg-vital-50 p-3">
              <div>
                <p className="text-sm font-medium text-vital-700">Alert me for emergencies off-duty</p>
                <p className="text-xs text-vital-600">
                  If an emergency case sits unaccepted too long, you&apos;ll be notified even outside your
                  scheduled hours. Off by default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAcceptsEmergencyOverride(!acceptsEmergencyOverride)}
                className={`h-7 w-12 shrink-0 rounded-full transition-colors ${
                  acceptsEmergencyOverride ? 'bg-vital-600' : 'bg-mist-300'
                }`}
              >
                <span
                  className={`block h-5 w-5 translate-y-1 rounded-full bg-white shadow transition-transform ${
                    acceptsEmergencyOverride ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full btn-pop py-2.5 text-sm disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
