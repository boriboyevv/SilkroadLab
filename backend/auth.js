// ============================================
//   SILKROADLAB — Auth Routes
// ============================================

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('./config/database');
const { protect } = require('./middleware/auth');

// ── Token yaratish ───────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register ──────────────────
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('Ism kiritilishi shart'),
  body('lastName').trim().notEmpty().withMessage('Familiya kiritilishi shart'),
  body('email').isEmail().normalizeEmail().withMessage('Email noto\'g\'ri'),
  body('password').isLength({ min: 8 }).withMessage('Parol kamida 8 belgi bo\'lishi kerak'),
  body('phone').optional().isMobilePhone(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Email mavjudmi?
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
    }

    // Parol hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Foydalanuvchi yaratish
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, password, phone) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, hashedPassword, phone || null]
    );

    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!',
      token,
      user: {
        id        : result.insertId,
        name      : `${firstName} ${lastName}`,
        email,
        phone,
        role      : 'user',
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
    }
    next(err);
  }
});

// ── POST /api/auth/login ─────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email noto\'g\'ri'),
  body('password').notEmpty().withMessage('Parol kiritilishi shart'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Foydalanuvchi topish
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    const user = rows[0];

    // Parol tekshirish
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri.' });
    }

    // So'nggi kirish vaqtini yangilash
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz!',
      token,
      user: {
        id   : user.id,
        name : `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone,
        role : user.role,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ─────────────────────────
router.get('/me', protect, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
              u.avatar, u.city, u.level, u.created_at,
              COUNT(DISTINCT e.id) AS enrolled_courses,
              COUNT(DISTINCT s.id) AS total_sessions,
              COUNT(DISTINCT c.id) AS certificates
       FROM users u
       LEFT JOIN enrollments e ON e.user_id = u.id
       LEFT JOIN sessions    s ON s.user_id = u.id
       LEFT JOIN certificates c ON c.user_id = u.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/forgot-password ──────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    // Xavfsizlik uchun har doim 200 qaytaramiz
    res.json({
      success : true,
      message : 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, tiklash havolasi yuborildi.',
    });

    if (!rows.length) return;

    // Real proyektda bu yerda email yuboriladi (Nodemailer)
    const resetToken = jwt.sign({ id: rows[0].id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`🔑 Reset token (${email}):`, resetToken);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/change-password ──────────
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Joriy parol noto\'g\'ri.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
