import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { celebrate } from '../../utils/celebrate';
import { MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import PasswordInput from '../../components/common/PasswordInput';

const ROLE_HOME = { FARMER: '/farmer', VETERINARIAN: '/vet' };

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('FARMER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    farmName: '',
    farmAddress: '',
    specialization: '',
    licenseNumber: '',
  });
  const [farmCoords, setFarmCoords] = useState(null);

  const captureFarmLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFarmCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Farm location captured.');
      },
      () => toast.error('Could not access your location. You can still register and set this later.')
    );
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        role,
      };
      if (role === 'FARMER') {
        payload.farmName = form.farmName;
        if (farmCoords) {
          payload.defaultLocation = { ...farmCoords, address: form.farmAddress || undefined };
        }
      } else {
        payload.specialization = form.specialization;
        payload.licenseNumber = form.licenseNumber;
      }

      const user = await register(payload);
      toast.success(`Welcome to CowCare, ${user.name}!`);
      celebrate();
      navigate(ROLE_HOME[user.role] || '/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pasture-100 text-lg">🐄</span>
          <span className="font-display text-xl font-semibold text-pasture-800">CowCare</span>
        </div>
      </div>
      <h1 className="font-display text-2xl font-medium text-ink-900">Create your account</h1>
      <p className="mb-5 text-sm text-ink-500">Join as a farmer or a veterinarian.</p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {['FARMER', 'VETERINARIAN'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
              role === r
                ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                : 'border-mist-300 text-ink-600'
            }`}
          >
            {r === 'FARMER' ? '👨‍🌾 Farmer' : '👩‍⚕️ Veterinarian'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={update('name')}
          className="input"
        />
        <input
          required
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={update('phone')}
          className="input font-data"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={form.email}
          onChange={update('email')}
          className="input"
        />
        <PasswordInput
          required
          minLength={6}
          placeholder="Password (min. 6 characters)"
          value={form.password}
          onChange={update('password')}
        />

        {role === 'FARMER' ? (
          <>
            <input
              placeholder="Farm name"
              value={form.farmName}
              onChange={update('farmName')}
              className="input"
            />
            <input
              placeholder="Farm address (optional label)"
              value={form.farmAddress}
              onChange={update('farmAddress')}
              className="input"
            />
            <button
              type="button"
              onClick={captureFarmLocation}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium ${
                farmCoords ? 'border-pasture-600 bg-pasture-50 text-pasture-700' : 'border-mist-300 text-ink-600'
              }`}
            >
              <MapPin size={16} />
              {farmCoords ? 'Farm location captured ✓' : 'Set Default Farm Location'}
            </button>
            <p className="text-xs text-ink-400">
              This becomes your default location for veterinary bookings — you can still choose a different location per booking.
            </p>
          </>
        ) : (
          <>
            <input
              placeholder="Specialization (e.g. Large Animal Medicine)"
              value={form.specialization}
              onChange={update('specialization')}
              className="input"
            />
            <input
              placeholder="License number"
              value={form.licenseNumber}
              onChange={update('licenseNumber')}
              className="input"
            />
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-pop py-2.5 text-sm disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-pasture-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
