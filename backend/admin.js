// ============================================
//   SILKROADLAB — Admin Routes
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

router.use(protect, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [[users]]    = await db.query("SELECT COUNT(*) as total FROM users WHERE role='user'");
    const [[active]]   = await db.query("SELECT COUNT(*) as total FROM users WHERE is_active=1 AND DATE(last_login)=CURDATE()");
    const [[sessions]] = await db.query("SELECT COUNT(*) as total, AVG(score) as avg_score FROM sessions");
    const [[revenue]]  = await db.query("SELECT SUM(amount) as total FROM payments WHERE status='success'");
    const [[certs]]    = await db.query("SELECT COUNT(*) as total FROM certificates");
    const [[courses]]  = await db.query("SELECT COUNT(*) as total FROM courses WHERE is_active=1");

    res.json({ success: true, stats: {
      totalUsers: users.total, activeToday: active.total,
      totalSessions: sessions.total, avgScore: Math.round(sessions.avg_score||0),
      totalRevenue: revenue.total||0, certificates: certs.total, activeCourses: courses.total
    }});
  } catch(err){next(err);}
});

// GET /api/admin/recent-activity
router.get('/recent-activity', async (req, res, next) => {
  try {
    const [recentUsers]    = await db.query('SELECT id,first_name,last_name,email,created_at FROM users ORDER BY created_at DESC LIMIT 10');
    const [recentSessions] = await db.query('SELECT s.*,u.first_name,u.last_name FROM sessions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 10');
    const [recentPayments] = await db.query('SELECT p.*,u.first_name,u.last_name,c.title as course_title FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id ORDER BY p.created_at DESC LIMIT 10');
    res.json({ success:true, recentUsers, recentSessions, recentPayments });
  } catch(err){next(err);}
});

// GET /api/admin/revenue/monthly
router.get('/revenue/monthly', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT MONTH(paid_at) as month, YEAR(paid_at) as year, SUM(amount) as revenue, COUNT(*) as count
       FROM payments WHERE status='success' AND paid_at>=DATE_SUB(NOW(),INTERVAL 12 MONTH)
       GROUP BY YEAR(paid_at),MONTH(paid_at) ORDER BY year,month`
    );
    res.json({ success:true, monthly:rows });
  } catch(err){next(err);}
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    await db.query('UPDATE users SET is_active=? WHERE id=?', [isActive?1:0, req.params.id]);
    res.json({ success:true, message:`Foydalanuvchi ${isActive?'faollashtirildi':'bloklandi'}.` });
  } catch(err){next(err);}
});

module.exports = router;
