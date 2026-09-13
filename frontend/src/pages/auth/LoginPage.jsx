import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import VetEmblem from '../../components/common/VetEmblem';

const ROLE_HOME = { FARMER: '/farmer', VETERINARIAN: '/vet', ADMIN: '/admin' };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(form.phone, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      const returnTo = location.state?.from;
      navigate(returnTo || ROLE_HOME[user.role] || '/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        {/* Top Veterinary Cross Emblem */}
        <div className="flex justify-center mb-4">
          <VetEmblem size={56} />
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center mb-7">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#14281a] tracking-tight flex items-center justify-center gap-1.5">
            Welcome back <span className="text-lg">🌿</span>
          </h2>
          <p className="mt-1.5 text-sm text-[#5f6c5d]">
            Sign in to your CowCare account
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Number Field */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Phone number
            </label>
            <div className="relative rounded-xl border border-[#d8d3c5] bg-white shadow-xs transition-all focus-within:border-[#1d3d26] focus-within:ring-1 focus-within:ring-[#1d3d26]/20">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7a8877]">
                <Phone size={17} />
              </div>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl bg-transparent py-3 pl-10 pr-4 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:outline-none font-data"
                placeholder="9876543210"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3d493a]">
              Password
            </label>
            <div className="relative rounded-xl border border-[#d8d3c5] bg-white shadow-xs transition-all focus-within:border-[#1d3d26] focus-within:ring-1 focus-within:ring-[#1d3d26]/20">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7a8877]">
                <Lock size={17} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl bg-transparent py-3 pl-10 pr-10 text-sm text-[#14281a] placeholder:text-[#9ea89b] focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7a8877] hover:text-[#2c4733] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#1b3823] to-[#25472e] hover:from-[#152e1c] hover:to-[#1e3b26] text-white font-semibold py-3.5 px-6 shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99]"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Register Prompt */}
        <p className="mt-6 text-center text-sm text-[#5f6c5d]">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-[#1d3d26] hover:text-[#112316] underline underline-offset-4 decoration-[#1d3d26]/40 hover:decoration-[#1d3d26] transition-colors"
          >
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
