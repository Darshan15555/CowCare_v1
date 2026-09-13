const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

function initSocket(httpServer) {
  const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, '') : null;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://cow-care-v1.vercel.app',
    clientUrl,
  ].filter(Boolean);

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
    },
    // Detect broken proxy/client connections promptly; the browser client
    // automatically reconnects if the API is restarted during development.
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Authenticate every socket connection with the same access token used by the REST API.
  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token missing.'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket authentication token.'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // Personal room for direct user notifications.
    socket.join(`user:${socket.userId}`);

    socket.on('joinRequestRoom', (requestId) => {
      socket.join(`request:${requestId}`);
    });

    socket.on('leaveRequestRoom', (requestId) => {
      socket.leave(`request:${requestId}`);
    });

    socket.on('disconnect', () => {
      // no-op: room membership is cleaned up automatically by socket.io
    });
  });

  console.log('[Socket.IO] Initialized');
  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };
