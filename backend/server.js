require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { initSocket, getIO } = require('./sockets/io');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { runEscalationSweep, ESCALATION_THRESHOLD_MINUTES } = require('./utils/escalation');

const authRoutes = require('./routes/authRoutes');
const cattleRoutes = require('./routes/cattleRoutes');
const requestRoutes = require('./routes/requestRoutes');
const { notifyUser } = require('./controllers/requestController');
const medicalRoutes = require('./routes/medicalRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const httpServer = http.createServer(app);

// --- Security & parsing middleware ---
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Rate limiting ---
// Global backstop: generous, just protects against blunt abuse/DoS.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Stricter limit on auth endpoints to slow credential-stuffing/brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Moderate limit on endpoints that create records or send file uploads —
// prevents spam-creation of cattle/requests/medical events.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/cattle', (req, res, next) => (req.method === 'POST' ? writeLimiter(req, res, next) : next()));
app.use('/api/requests', (req, res, next) => (req.method === 'POST' ? writeLimiter(req, res, next) : next()));
app.use('/api/medical', (req, res, next) => (req.method === 'POST' ? writeLimiter(req, res, next) : next()));

// Static file serving for uploaded photos.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ success: true, message: 'CowCare API is running.' }));
app.use('/api/auth', authRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Fail fast with a clear message rather than a cryptic error deep in a
// request handler if critical secrets were never configured.
const REQUIRED_ENV_VARS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  missingEnvVars.unshift('MONGO_URI or MONGODB_URI');
}
if (missingEnvVars.length > 0) {
  console.error(
    `[CowCare API] Missing required environment variable(s): ${missingEnvVars.join(', ')}. ` +
      'Copy .env.example to .env and fill these in before starting the server.'
  );
  process.exit(1);
}

let escalationInterval = null;

const start = async () => {
  await connectDB();
  initSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`[CowCare API] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  // Periodically check for EMERGENCY requests that have sat unaccepted too
  // long and escalate them (re-broadcast more widely, notify the farmer,
  // flag for admin). Runs every minute; threshold is configurable via
  // EMERGENCY_ESCALATION_MINUTES (default 10).
  const sweepIntervalMs = 60 * 1000;
  escalationInterval = setInterval(() => {
    runEscalationSweep({ notifyUser, getIO }).catch((err) => {
      console.error('[Escalation] Sweep failed:', err.message);
    });
  }, sweepIntervalMs);
  escalationInterval.unref(); // don't keep the process alive just for this timer

  console.log(
    `[CowCare API] Emergency escalation sweep active (threshold: ${ESCALATION_THRESHOLD_MINUTES} min).`
  );
};

start();

// Graceful shutdown — let in-flight requests finish and close the DB
// connection cleanly instead of dropping connections on deploy/restart.
const shutdown = (signal) => {
  console.log(`[CowCare API] ${signal} received. Shutting down gracefully...`);
  clearInterval(escalationInterval);
  httpServer.close(async () => {
    try {
      await mongoose.connection.close(false);
    } finally {
      console.log('[CowCare API] Closed remaining connections. Exiting.');
      process.exit(0);
    }
  });
  // Force-exit if something hangs (stuck sockets etc.) after 10s.
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
