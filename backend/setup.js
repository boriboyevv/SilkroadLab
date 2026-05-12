// ============================================
//   SILKROADLAB — DB Setup & Seed Script
//   Ishlatish: node setup.js
// ============================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

async function setup() {
  console.log('🚀 SilkroadLab — Database sozlanmoqda...\n');

  const db = await mysql.createConnection({
    host    : process.env.DB_HOST     || 'localhost',
    user    : process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  // 1. Database yaratish
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'silkroadlab'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await db.query(`USE \`${process.env.DB_NAME || 'silkroadlab'}\``);
  console.log('✅ Database yaratildi:', process.env.DB_NAME || 'silkroadlab');

  // 2. Jadvallar yaratish
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      first_name   VARCHAR(100) NOT NULL,
      last_name    VARCHAR(100) NOT NULL,
      email        VARCHAR(191) NOT NULL UNIQUE,
      phone        VARCHAR(20),
      password     VARCHAR(255) NOT NULL,
      role         ENUM('user','admin') DEFAULT 'user',
      avatar       VARCHAR(255),
      city         VARCHAR(100),
      level        ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
      is_verified  TINYINT(1) DEFAULT 0,
      is_active    TINYINT(1) DEFAULT 1,
      last_login   TIMESTAMP NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      title           VARCHAR(255) NOT NULL,
      title_en        VARCHAR(255),
      description     TEXT,
      category        VARCHAR(100),
      level           ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
      price           DECIMAL(12,2) NOT NULL DEFAULT 0,
      duration_months TINYINT DEFAULT 1,
      total_lessons   INT DEFAULT 0,
      total_hours     INT DEFAULT 0,
      vr_scenarios    INT DEFAULT 0,
      has_certificate TINYINT(1) DEFAULT 1,
      image           VARCHAR(255),
      is_active       TINYINT(1) DEFAULT 1,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      course_id    INT NOT NULL,
      status       ENUM('active','completed','paused','cancelled') DEFAULT 'active',
      progress     TINYINT DEFAULT 0,
      lessons_done INT DEFAULT 0,
      enrolled_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE KEY unique_enrollment (user_id, course_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      scenario     VARCHAR(255) NOT NULL,
      category     VARCHAR(100),
      mode         ENUM('vr','desktop') DEFAULT 'desktop',
      duration_min INT DEFAULT 0,
      score        TINYINT DEFAULT 0,
      pronunciation TINYINT DEFAULT 0,
      fluency      TINYINT DEFAULT 0,
      vocabulary   TINYINT DEFAULT 0,
      confidence   TINYINT DEFAULT 0,
      ai_feedback  TEXT,
      ai_grade     VARCHAR(50),
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      user_id        INT NOT NULL,
      course_id      INT NOT NULL,
      amount         DECIMAL(12,2) NOT NULL,
      method         ENUM('payme','click','uzcard','humo','cash') NOT NULL,
      transaction_id VARCHAR(255),
      status         ENUM('pending','success','failed','refunded') DEFAULT 'pending',
      paid_at        TIMESTAMP NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      course_id   INT NOT NULL,
      cert_number VARCHAR(100) UNIQUE,
      issued_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name  VARCHAR(100),
      email      VARCHAR(191) NOT NULL,
      phone      VARCHAR(20),
      subject    VARCHAR(255),
      message    TEXT NOT NULL,
      is_read    TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Jadvallar yaratildi\n');

  // 3. Parollar hash qilish
  const adminHash = await bcrypt.hash('admin123', 10);
  const demoHash  = await bcrypt.hash('demo123',  10);
  console.log('✅ Parollar hash qilindi');

  // 4. Admin user
  await db.query(`
    INSERT IGNORE INTO users (first_name, last_name, email, phone, password, role, is_verified, is_active)
    VALUES ('Admin', 'SilkroadLab', 'admin@silkroadlab.uz', '+998901234567', ?, 'admin', 1, 1)
  `, [adminHash]);

  // 5. Demo user
  await db.query(`
    INSERT IGNORE INTO users (first_name, last_name, email, phone, password, role, is_verified, is_active)
    VALUES ('Demo', 'Foydalanuvchi', 'demo@silkroadlab.uz', '+998901112233', ?, 'user', 1, 1)
  `, [demoHash]);

  console.log('✅ Admin: admin@silkroadlab.uz / admin123');
  console.log('✅ Demo:  demo@silkroadlab.uz  / demo123\n');

  // 6. Kurslar
  await db.query(`
    INSERT IGNORE INTO courses (id, title, title_en, description, category, level, price, duration_months, total_lessons, total_hours, vr_scenarios)
    VALUES
    (1,'English for Hotel Staff','English for Hotel Staff','Mehmonxona xodimlarini chuqur ingliz tili','hotel','intermediate',750000,1,24,15,6),
    (2,'English for Airport Staff','English for Airport Staff','Aeroport xodimlari uchun ingliz tili','airport','beginner',650000,1,20,12,4),
    (3,'English for Tour Guides','English for Tour Guides','Turist-gidlar uchun ingliz tili','guide','intermediate',850000,1,18,10,8),
    (4,'Customer Service in Tourism','Customer Service in Tourism','Turizmda mijozlarga xizmat','service','beginner',550000,1,16,9,3),
    (5,'Business English for Tourism','Business English for Tourism','Turizm uchun biznes ingliz tili','language','advanced',950000,2,22,14,0),
    (6,'Uzbekistan: Culture & Communication','Uzbekistan Culture','O''zbekistonda madaniyat va muloqot','culture','beginner',450000,1,15,8,5)
  `);
  console.log('✅ Kurslar qo\'shildi');

  // 7. Demo user uchun namuna sessiyalar
  const [[demoUser]] = await db.query("SELECT id FROM users WHERE email='demo@silkroadlab.uz'");
  if (demoUser) {
    const uid = demoUser.id;
    await db.query(`
      INSERT IGNORE INTO sessions (user_id, scenario, category, mode, duration_min, score, pronunciation, fluency, vocabulary, confidence, ai_feedback, ai_grade)
      VALUES
      (?, 'Hotel Check-in: Greetings', 'hotel', 'desktop', 32, 92, 88, 95, 85, 96, 'Zo''r natija! Talaffuz va ravonlik juda yuqori.', 'A'),
      (?, 'Airport Assistance', 'airport', 'desktop', 45, 85, 82, 88, 80, 90, 'Yaxshi! So''z boyligini oshiring.', 'B+'),
      (?, 'City Tour — Registon', 'tour', 'vr', 50, 90, 85, 92, 88, 94, 'Ekskursiya nutqi ajoyib!', 'A'),
      (?, 'Handling Complaints', 'hotel', 'desktop', 60, 74, 70, 78, 72, 76, 'Murakkab vaziyatlarda ishonchni oshiring.', 'B'),
      (?, 'Hotel Check-out', 'hotel', 'desktop', 28, 88, 86, 90, 84, 92, 'Zo''r taraqqiyot!', 'A-'),
      (?, 'Info Desk Practice', 'airport', 'desktop', 35, 62, 60, 65, 58, 66, 'Ko''proq mashq qiling.', 'C+')
    `, [uid,uid,uid,uid,uid,uid]);

    // Enrollment
    await db.query(`
      INSERT IGNORE INTO enrollments (user_id, course_id, status, progress, lessons_done)
      VALUES (?,1,'active',70,17), (?,3,'active',33,6), (?,6,'active',9,1)
    `, [uid,uid,uid]);

    console.log('✅ Demo user uchun sessiyalar va enrollment qo\'shildi');
  }

  // 8. Demo payment
  const [[demoCourse]] = await db.query("SELECT id FROM courses LIMIT 1");
  const [[demoU]] = await db.query("SELECT id FROM users WHERE email='demo@silkroadlab.uz'");
  if (demoU && demoCourse) {
    await db.query(`
      INSERT IGNORE INTO payments (user_id, course_id, amount, method, status, paid_at)
      VALUES (?, ?, 750000, 'payme', 'success', NOW())
    `, [demoU.id, demoCourse.id]);
    console.log('✅ Demo to\'lov qo\'shildi');
  }

  await db.end();

  console.log('\n🎉 Setup muvaffaqiyatli tugadi!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Endi serverni ishga tushiring:');
  console.log('  npm run dev\n');
  console.log('Admin kirish:');
  console.log('  Email:  admin@silkroadlab.uz');
  console.log('  Parol:  admin123\n');
  console.log('Demo kirish:');
  console.log('  Email:  demo@silkroadlab.uz');
  console.log('  Parol:  demo123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

setup().catch(err => {
  console.error('❌ Setup xatosi:', err.message);
  console.error('\nYechim:');
  console.error('1. MySQL ishlayaptimi tekshiring: sudo systemctl start mysql');
  console.error('2. .env faylida DB_PASSWORD to\'g\'riligini tekshiring');
  process.exit(1);
});
