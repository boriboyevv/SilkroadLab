// ============================================
//   SILKROADLAB — Contact Routes
// ============================================

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const db      = require('./config/database');
const { protect, adminOnly } = require('./middleware/auth');

// POST /api/contact
router.post('/', [
  body('firstName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 10 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success:false, errors:errors.array() });

    const { firstName, lastName, email, phone, subject, message } = req.body;
    await db.query(
      'INSERT INTO contact_messages (first_name,last_name,email,phone,subject,message) VALUES (?,?,?,?,?,?)',
      [firstName, lastName||'', email, phone||'', subject||'', message]
    );
    console.log(`📩 Yangi xabar: ${firstName} <${email}> — ${subject}`);
    res.status(201).json({ success:true, message:'Xabaringiz yuborildi! 24 soat ichida javob beramiz.' });
  } catch(err){next(err);}
});

// GET /api/contact — Admin only
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100');
    res.json({ success:true, messages:rows });
  } catch(err){next(err);}
});

module.exports = router;
