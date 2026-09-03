const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
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
