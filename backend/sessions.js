// ============================================
//   SILKROADLAB — Sessions Routes
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

// POST /api/sessions — Sessiya yaratish (VR/Desktop amaliyotdan keyin)
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      scenario, category, mode = 'desktop',
      durationMin, score,
      pronunciation, fluency, vocabulary, confidence,
      aiFeedback, aiGrade
    } = req.body;

    if (!scenario || score === undefined) {
      return res.status(400).json({ success: false, message: 'Ssenariy va ball kiritilishi shart.' });
    }

    const [result] = await db.query(
      `INSERT INTO sessions
       (user_id, scenario, category, mode, duration_min, score, pronunciation, fluency, vocabulary, confidence, ai_feedback, ai_grade)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, scenario, category, mode, durationMin, score,
       pronunciation, fluency, vocabulary, confidence, aiFeedback, aiGrade]
    );

    res.status(201).json({ success: true, message: 'Sessiya saqlandi!', sessionId: result.insertId });
  } catch (err) { next(err); }
});

// GET /api/sessions/my — Mening sessiyalarim
router.get('/my', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total, AVG(score) as avg FROM sessions WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success  : true,
      sessions : rows,
      total    : countResult[0].total,
      avgScore : Math.round(countResult[0].avg || 0),
    });
  } catch (err) { next(err); }
});

// GET /api/sessions/my/progress — Ko'nikma dinamikasi
router.get('/my/progress', protect, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
         AVG(pronunciation) as pronunciation,
         AVG(fluency)       as fluency,
         AVG(vocabulary)    as vocabulary,
         AVG(confidence)    as confidence,
         AVG(score)         as overall,
         COUNT(*)           as sessions_count
       FROM sessions WHERE user_id = ?`,
      [req.user.id]
    );

    const p = rows[0];
    res.json({
      success : true,
      progress: {
        pronunciation  : Math.round(p.pronunciation || 0),
        fluency        : Math.round(p.fluency       || 0),
        vocabulary     : Math.round(p.vocabulary    || 0),
        confidence     : Math.round(p.confidence    || 0),
        overall        : Math.round(p.overall       || 0),
        sessionsCount  : p.sessions_count,
      }
    });
  } catch (err) { next(err); }
});

// GET /api/sessions — Admin: barcha sessiyalar
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email
       FROM sessions s JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT 100`
    );
    res.json({ success: true, sessions: rows });
  } catch (err) { next(err); }
});

module.exports = router;
