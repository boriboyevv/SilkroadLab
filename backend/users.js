// ============================================
//   SILKROADLAB — Users Routes
// ============================================

const express  = require('express');
const router   = express.Router();
const db       = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

// GET /api/users/profile — Profil ma'lumotlari
router.get('/profile', protect, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, phone, avatar, city, level, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/users/profile — Profilni yangilash
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, city } = req.body;
    await db.query(
      'UPDATE users SET first_name=?, last_name=?, phone=?, city=?, updated_at=NOW() WHERE id=?',
      [firstName, lastName, phone, city, req.user.id]
    );
    res.json({ success: true, message: 'Profil yangilandi.' });
  } catch (err) { next(err); }
});

// GET /api/users/stats — Foydalanuvchi statistikasi
router.get('/stats', protect, async (req, res, next) => {
  try {
    const [sessions] = await db.query(
      'SELECT COUNT(*) as total, AVG(score) as avg_score, SUM(duration_min) as total_minutes FROM sessions WHERE user_id=?',
      [req.user.id]
    );
    const [enrollments] = await db.query(
      'SELECT COUNT(*) as total FROM enrollments WHERE user_id=?',
      [req.user.id]
    );
    const [certs] = await db.query(
      'SELECT COUNT(*) as total FROM certificates WHERE user_id=?',
      [req.user.id]
    );

    res.json({
      success: true,
      stats: {
        totalSessions   : sessions[0].total,
        avgScore        : Math.round(sessions[0].avg_score || 0),
        totalMinutes    : sessions[0].total_minutes || 0,
        enrolledCourses : enrollments[0].total,
        certificates    : certs[0].total,
      }
    });
  } catch (err) { next(err); }
});

// GET /api/users — Admin: barcha foydalanuvchilar
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, first_name, last_name, email, phone, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status === 'active')   { query += ' AND is_active = 1'; }
    if (status === 'inactive') { query += ' AND is_active = 0'; }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM users');

    res.json({ success: true, users: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — Admin: foydalanuvchi o'chirish
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi.' });
  } catch (err) { next(err); }
});

module.exports = router;
