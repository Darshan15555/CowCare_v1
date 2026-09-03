import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, ArrowRight } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { celebrate } from '../../utils/celebrate';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import PasswordInput from '../../components/common/PasswordInput';
import VetEmblem from '../../components/common/VetEmblem';

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
      <div className="w-full">
        {/* Top Veterinary Emblem */}
        <div className="flex justify-center mb-4">
          <VetEmblem size={56} />
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#14281a] tracking-tight flex items-center justify-center gap-1.5">
            Create your account <span className="text-lg">🌿</span>
          </h2>
          <p className="mt-1.5 text-sm text-[#5f6c5d]">
            Join as a cattle farmer or veterinary expert
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-[#d8d3c5] bg-white p-1 shadow-xs">
          {['FARMER', 'VETERINARIAN'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg py-2.5 text-xs font-semibold capitalize transition-all ${
                role === r
                  ? 'bg-gradient-to-r from-[#1b3823] to-[#25472e] text-white shadow-xs'
                  : 'text-[#5a6857] hover:text-[#183220] hover:bg-[#faf8f3]'
              }`}
            >
              {r === 'FARMER' ? '👨‍🌾 Farmer' : '👩‍⚕️ Veterinarian'}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Full Name
            </label>
            <input
              required
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={update('name')}
              className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Phone Number
            </label>
            <input
              required
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={update('phone')}
              className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20 font-data"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="ramesh@example.com"
              value={form.email}
              onChange={update('email')}
              className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Password
            </label>
            <PasswordInput
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={form.password}
              onChange={update('password')}
            />
          </div>

          {role === 'FARMER' ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
                  Farm Name (Optional)
                </label>
                <input
                  placeholder="e.g. Green Pastures Dairy"
                  value={form.farmName}
                  onChange={update('farmName')}
                  className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
                  Farm Address
                </label>
                <input
                  placeholder="Village / Town / Landmark"
                  value={form.farmAddress}
                  onChange={update('farmAddress')}
                  className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20"
                />
              </div>

              <button
                type="button"
                onClick={captureFarmLocation}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                  farmCoords
                    ? 'border-[#24472e] bg-[#eef4ee] text-[#1d3d26]'
                    : 'border-[#d8d3c5] bg-white text-[#4a5847] hover:bg-[#faf8f3]'
                }`}
              >
                <MapPin size={15} />
                {farmCoords ? 'Farm GPS location captured ✓' : 'Capture Current Farm Location (GPS)'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
                  Veterinary Specialization
                </label>
                <input
                  placeholder="e.g. Large Animal Medicine, Bovine Surgery"
                  value={form.specialization}
                  onChange={update('specialization')}
                  className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
                  Veterinary License Number
                </label>
                <input
                  placeholder="e.g. VET-KA-2024-0089"
                  value={form.licenseNumber}
                  onChange={update('licenseNumber')}
                  className="w-full rounded-xl border border-[#d8d3c5] bg-white px-4 py-2.5 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:border-[#1d3d26] focus:outline-none focus:ring-1 focus:ring-[#1d3d26]/20 font-data"
                />
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 rounded-xl bg-gradient-to-r from-[#1b3823] to-[#25472e] hover:from-[#152e1c] hover:to-[#1e3b26] text-white font-semibold py-3.5 px-6 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#5f6c5d]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#1d3d26] hover:text-[#112316] underline underline-offset-4 decoration-[#1d3d26]/40 hover:decoration-[#1d3d26] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
