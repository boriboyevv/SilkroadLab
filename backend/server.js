// ============================================
//   SILKROADLAB — Main Server
//   Node.js + Express + MySQL
// ============================================

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const app = express();

// Serverga HTML, CSS va JS fayllaringiz bir pog'ona tepada ekanligini aytamiz
app.use(express.static(path.join(__dirname, '../')));

// Bosh sahifaga kirilganda index.html faylini yuboramiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ── Config ──────────────────────────────────
const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Security middleware ──────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiter — max 100 req/15 min per IP
const limiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 100,
  message  : { success: false, message: 'Juda ko\'p so\'rov. 15 daqiqadan keyin qayta urinib ko\'ring.' }
});
app.use('/api/', limiter);

// Auth routes — stricter limit (5 req/15 min)
const authLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 5,
  message  : { success: false, message: 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring.' }
});

// ── CORS ────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'https://silkroadlab.uz',
  'https://www.silkroadlab.uz',
];

app.use(cors({
  origin      : (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy: bu manzilga ruxsat yo\'q.'));
  },
  credentials : true,
  methods     : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logger ───────────────────────────────────
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static files ─────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DB connection test ───────────────────────
const db = require('./config/database');
db.getConnection().then(conn => {
  console.log('✅ MySQL ga muvaffaqiyatli ulandi');
  conn.release();
}).catch(err => {
  console.error('❌ MySQL ulanishda xatolik:', err.message);
});

// ── Routes ───────────────────────────────────
const authRoutes        = require('./auth');
const userRoutes        = require('./users');
const courseRoutes      = require('./courses');
const sessionRoutes     = require('./sessions');
const paymentRoutes     = require('./payments');
const adminRoutes       = require('./admin');
const contactRoutes     = require('./contact');

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/courses',  courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/contact',  contactRoutes);

// ── Health check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success   : true,
    status    : 'OK',
    message   : 'SilkroadLab API ishlayapti',
    version   : '1.0.0',
    timestamp : new Date().toISOString(),
    env       : NODE_ENV,
  });
});

// ── API docs redirect ─────────────────────────
app.get('/api', (req, res) => {
  res.json({
    success  : true,
    message  : 'SilkroadLab API v1.0.0',
    endpoints: {
      auth    : '/api/auth',
      users   : '/api/users',
      courses : '/api/courses',
      sessions: '/api/sessions',
      payments: '/api/payments',
      admin   : '/api/admin',
      contact : '/api/contact',
      health  : '/api/health',
    }
  });
});

// ── 404 handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success : false,
    message : `Route topilmadi: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ─────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Server xatoligi:', err.stack || err.message);

  // CORS error
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Validation error (express-validator)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON format noto\'g\'ri.' });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token noto\'g\'ri.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token muddati tugagan.' });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success : false,
    message : NODE_ENV === 'production'
      ? 'Server xatoligi yuz berdi.'
      : err.message || 'Noma\'lum xatolik.',
  });
});

// ── Start server ─────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       SILKROADLAB BACKEND API        ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  🚀 Server: http://localhost:${PORT}     ║`);
  console.log(`║  🌍 Muhit : ${NODE_ENV.padEnd(26)}║`);
  console.log(`║  📅 Vaqt  : ${new Date().toLocaleString('uz').padEnd(26)}║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
