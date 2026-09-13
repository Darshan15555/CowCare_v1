import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/axiosClient';

const SocketContext = createContext(null);

const ROLE_REQUEST_PATH = { FARMER: '/farmer/requests', VETERINARIAN: '/vet/requests' };

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socketServerUrl = import.meta.env.VITE_BACKEND_URL || '/';
    const socket = io(socketServerUrl, {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      // A backend restart briefly resets the proxied WebSocket. Keep retrying
      // with a bounded backoff instead of leaving the notification layer dead.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    });

    socket.on('notification', (notification) => {
      setLatestNotification(notification);
      const icon =
        notification.priority === 'EMERGENCY' ? '🔴' : notification.priority === 'URGENT' ? '🟡' : '🔔';

      const goToRequest = () => {
        if (notification.relatedRequestId) {
          const base = ROLE_REQUEST_PATH[user.role];
          if (base) navigate(`${base}/${notification.relatedRequestId}`);
        }
      };

      toast.custom(
        (t) => (
          <button
            onClick={() => {
              toast.dismiss(t.id);
              goToRequest();
            }}
            className={`flex max-w-sm items-start gap-2.5 rounded-xl border bg-white p-3 text-left shadow-lg ${
              notification.priority === 'EMERGENCY' ? 'border-vital-300' : 'border-mist-200'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span>
              <span className="block text-sm font-semibold text-ink-900">{notification.title}</span>
              <span className="block text-xs text-ink-500">{notification.message}</span>
            </span>
          </button>
        ),
        // Emergencies stay on screen until the vet actively dismisses them —
        // a 6-second auto-hide is exactly the wrong choice for an alert that
        // might mean a critically injured animal.
        { duration: notification.priority === 'EMERGENCY' ? Infinity : 6000 }
      );
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, latestNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
