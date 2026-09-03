import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PRIORITY_ICON = { EMERGENCY: '🔴', URGENT: '🟡', ROUTINE: '🟢', INFO: '🔔' };
const REQUEST_PATH = { FARMER: '/farmer/requests', VETERINARIAN: '/vet/requests' };
const CATTLE_PATH = { FARMER: '/farmer/cattle', VETERINARIAN: '/vet/cattle' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    notificationApi
      .getMine()
      .then((res) => setNotifications(res.data.notifications))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    load();
  };

  const handleClick = async (n) => {
    if (!n.isRead) {
      await notificationApi.markAsRead(n._id);
    }
    // Take the farmer/vet straight to what the notification is about,
    // rather than leaving them to hunt for it themselves.
    if (n.relatedRequestId && REQUEST_PATH[user.role]) {
      navigate(`${REQUEST_PATH[user.role]}/${n.relatedRequestId}`);
    } else if (n.relatedCattleId && CATTLE_PATH[user.role]) {
      navigate(`${CATTLE_PATH[user.role]}/${n.relatedCattleId}`);
    } else {
      load();
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading notifications..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-medium text-ink-900">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1 text-sm font-medium text-pasture-700 hover:underline"
        >
          <CheckCheck size={15} /> Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-300 bg-white p-10 text-center text-sm text-ink-500">
          <Bell className="mx-auto mb-2 text-mist-300" size={28} />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left shadow-sm ${
                n.isRead ? 'border-mist-200 bg-white' : 'border-pasture-200 bg-pasture-50'
              }`}
            >
              <span className="text-lg">{PRIORITY_ICON[n.priority] || '🔔'}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                <p className="text-sm text-ink-500">{n.message}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
