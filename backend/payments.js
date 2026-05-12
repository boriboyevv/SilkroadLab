// ============================================
//   SILKROADLAB — Payments Routes
//   Payme + Click integratsiyasi
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

// POST /api/payments/initiate — To'lovni boshlash
router.post('/initiate', protect, async (req, res, next) => {
  try {
    const { courseId, method } = req.body;

    if (!courseId || !method) {
      return res.status(400).json({ success: false, message: 'Kurs ID va to\'lov usuli kiritilishi shart.' });
    }

    const validMethods = ['payme', 'click', 'uzcard', 'humo'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri to\'lov usuli.' });
    }

    const [course] = await db.query('SELECT * FROM courses WHERE id = ? AND is_active = 1', [courseId]);
    if (!course.length) return res.status(404).json({ success: false, message: 'Kurs topilmadi.' });

    // To'lov yozuvi yaratish
    const [result] = await db.query(
      'INSERT INTO payments (user_id, course_id, amount, method) VALUES (?, ?, ?, ?)',
      [req.user.id, courseId, course[0].price, method]
    );

    const paymentId = result.insertId;

    // To'lov URL yaratish (real integratsiyada bu yerda Payme/Click API chaqiriladi)
    let paymentUrl = '';

    if (method === 'payme') {
      const merchantId = process.env.PAYME_MERCHANT_ID || 'demo_merchant';
      const amount     = course[0].price * 100; // tiyinlarda
      paymentUrl = `https://checkout.paycom.uz/${Buffer.from(
        `m=${merchantId};ac.payment_id=${paymentId};a=${amount};l=uz`
      ).toString('base64')}`;
    } else if (method === 'click') {
  const merchantId  = process.env.CLICK_MERCHANT_ID || 'demo';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  paymentUrl = `https://my.click.uz/services/pay?service_id=${merchantId}&merchant_id=${merchantId}&amount=${course[0].price}&transaction_param=${paymentId}&return_url=${frontendUrl}/courses.html`;
} else {
  // Uzcard / Humo — bank orqali
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  paymentUrl = `${frontendUrl}/courses.html?payment=${paymentId}&method=${method}`;
}

    res.json({
      success    : true,
      paymentId,
      amount     : course[0].price,
      method,
      paymentUrl,
      message    : 'To\'lov sahifasiga o\'ting.',
    });
  } catch (err) { next(err); }
});

// POST /api/payments/callback/payme — Payme callback
router.post('/callback/payme', async (req, res) => {
  try {
    const { method, params } = req.body;

    if (method === 'CheckPerformTransaction') {
      return res.json({ result: { allow: true } });
    }

    if (method === 'CreateTransaction') {
      await db.query(
        'UPDATE payments SET transaction_id = ?, status = ? WHERE id = ?',
        [params.id, 'pending', params.account?.payment_id]
      );
      return res.json({ result: { create_time: Date.now(), transaction: params.id, state: 1 } });
    }

    if (method === 'PerformTransaction') {
      const paymentId = params.account?.payment_id;
      await db.query('UPDATE payments SET status = ?, paid_at = NOW() WHERE id = ?', ['success', paymentId]);

      // Kursga yozish
      const [payment] = await db.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
      if (payment.length) {
        await db.query(
          'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)',
          [payment[0].user_id, payment[0].course_id]
        );
      }

      return res.json({ result: { transaction: params.id, perform_time: Date.now(), state: 2 } });
    }

    res.json({ error: { code: -32601, message: 'Method not found' } });
  } catch (err) {
    res.status(500).json({ error: { code: -31008, message: 'Server error' } });
  }
});

// POST /api/payments/callback/click — Click callback
router.post('/callback/click', async (req, res) => {
  try {
    const { payment_id, error } = req.body;

    if (error === 0) {
      await db.query('UPDATE payments SET status = ?, paid_at = NOW() WHERE id = ?', ['success', payment_id]);
      const [payment] = await db.query('SELECT * FROM payments WHERE id = ?', [payment_id]);
      if (payment.length) {
        await db.query(
          'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)',
          [payment[0].user_id, payment[0].course_id]
        );
      }
    } else {
      await db.query('UPDATE payments SET status = ? WHERE id = ?', ['failed', payment_id]);
    }

    res.json({ error: 0, error_note: 'Success' });
  } catch (err) {
    res.status(500).json({ error: 1, error_note: 'Server error' });
  }
});

// GET /api/payments/my — Mening to'lovlarim
router.get('/my', protect, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.title as course_title
       FROM payments p JOIN courses c ON c.id = p.course_id
       WHERE p.user_id = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, payments: rows });
  } catch (err) { next(err); }
});

// GET /api/payments — Admin: barcha to'lovlar
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, c.title as course_title
       FROM payments p
       JOIN users   u ON u.id = p.user_id
       JOIN courses c ON c.id = p.course_id
       ORDER BY p.created_at DESC LIMIT 100`
    );
    const [revenue] = await db.query(
      "SELECT SUM(amount) as total FROM payments WHERE status = 'success'"
    );
    res.json({ success: true, payments: rows, totalRevenue: revenue[0].total || 0 });
  } catch (err) { next(err); }
});

module.exports = router;
