// ============================================
//   SILKROADLAB — Auth Middleware
// ============================================

const jwt = require('jsonwebtoken');
const db  = require('../config/database');

// ── Token tekshirish ─────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token kiritilmagan. Kiring.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Foydalanuvchini DB dan tekshirish
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Hisobingiz bloklangan.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token muddati tugagan. Qayta kiring.' });
    }
    return res.status(401).json({ success: false, message: 'Token noto\'g\'ri.' });
  }
};

// ── Admin tekshirish ─────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Faqat adminlar uchun.' });
  }
  next();
};

// ── Ixtiyoriy auth ───────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows]  = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [decoded.id]);
      if (rows.length) req.user = rows[0];
    }
  } catch (_) {}
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
