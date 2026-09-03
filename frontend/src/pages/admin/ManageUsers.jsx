import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { adminApi } from '../../api/adminApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ROLE_FILTERS = ['ALL', 'FARMER', 'VETERINARIAN', 'ADMIN'];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');

  const load = (role) => {
    setIsLoading(true);
    adminApi
      .getUsers(role === 'ALL' ? undefined : role)
      .then((res) => setUsers(res.data.users))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => load(roleFilter), [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = async (user) => {
    try {
      await adminApi.setUserActiveStatus(user._id, !user.isActive);
      toast.success(`${user.name} ${!user.isActive ? 'activated' : 'deactivated'}.`);
      load(roleFilter);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update user.'));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-medium text-ink-900">Manage Users</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
              roleFilter === r
                ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                : 'border-mist-300 text-ink-600'
            }`}
          >
            {r.toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading users..." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-mist-200 bg-white shadow-sm">
          {users.map((u) => (
            <div key={u._id} className="flex items-center justify-between border-b border-mist-100 p-4 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink-900">{u.name}</p>
                <p className="text-xs text-ink-500">
                  <span className="font-data">{u.phone}</span> · <span className="capitalize">{u.role.toLowerCase()}</span>
                </p>
              </div>
              <button
                onClick={() => toggleStatus(u)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  u.isActive ? 'bg-pasture-100 text-pasture-700' : 'bg-mist-100 text-ink-500'
                }`}
              >
                {u.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="p-6 text-center text-sm text-ink-500">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}
