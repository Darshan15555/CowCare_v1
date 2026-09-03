import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
import PasswordInput from '../../components/common/PasswordInput';

const ROLE_HOME = { FARMER: '/farmer', VETERINARIAN: '/vet', ADMIN: '/admin' };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(form.phone, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(ROLE_HOME[user.role] || '/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pasture-100 text-lg">🐄</span>
          <span className="font-display text-xl font-semibold text-pasture-800">CowCare</span>
        </div>
      </div>

      <h1 className="font-display text-2xl font-medium text-ink-900">Welcome back</h1>
      <p className="mb-6 text-sm text-ink-500">Sign in to your CowCare account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Phone number</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input font-data"
            placeholder="9876543210"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Password</label>
          <PasswordInput
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-pop py-2.5 text-sm disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-pasture-700 hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
