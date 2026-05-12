// ============================================
//   SILKROADLAB — Courses Routes
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

// GET /api/courses — Barcha kurslar
router.get('/', async (req, res, next) => {
  try {
    const { level, category } = req.query;
    let query  = 'SELECT * FROM courses WHERE is_active = 1';
    const params = [];

    if (level)    { query += ' AND level = ?';    params.push(level); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, courses: rows });
  } catch (err) { next(err); }
});

// GET /api/courses/my/enrolled — Mening kurslarim ✅ /:id dan OLDIN bo'lishi shart
router.get('/my/enrolled', protect, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, e.progress, e.lessons_done, e.status as enrollment_status, e.enrolled_at
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, enrollments: rows });
  } catch (err) { next(err); }
});

// GET /api/courses/:id — Kurs tafsiloti
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM courses WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kurs topilmadi.' });
    res.json({ success: true, course: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/courses/:id/enroll — Kursga yozilish
router.post('/:id/enroll', protect, async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId   = req.user.id;

    const [course] = await db.query('SELECT * FROM courses WHERE id = ? AND is_active = 1', [courseId]);
    if (!course.length) return res.status(404).json({ success: false, message: 'Kurs topilmadi.' });

    const [existing] = await db.query('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [userId, courseId]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Siz allaqachon bu kursga yozilgansiz.' });

    await db.query('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [userId, courseId]);
    res.status(201).json({ success: true, message: 'Kursga muvaffaqiyatli yozildingiz!' });
  } catch (err) { next(err); }
});

module.exports = router;