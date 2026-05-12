-- ============================================
--   SILKROADLAB — MySQL Database Schema
--   Ishga tushirish: mysql -u root -p < schema.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS silkroadlab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE silkroadlab;

-- ── USERS ────────────────────────────────────
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
);

-- ── COURSES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  title_en     VARCHAR(255),
  description  TEXT,
  description_en TEXT,
  category     VARCHAR(100),
  level        ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
  price        DECIMAL(12,2) NOT NULL DEFAULT 0,
  duration_months TINYINT DEFAULT 1,
  total_lessons INT DEFAULT 0,
  total_hours   INT DEFAULT 0,
  vr_scenarios  INT DEFAULT 0,
  has_certificate TINYINT(1) DEFAULT 1,
  image        VARCHAR(255),
  is_active    TINYINT(1) DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── ENROLLMENTS ──────────────────────────────
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
);

-- ── SESSIONS ─────────────────────────────────
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
);

-- ── PAYMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  course_id       INT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  method          ENUM('payme','click','uzcard','humo','cash') NOT NULL,
  transaction_id  VARCHAR(255),
  status          ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  paid_at         TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ── CERTIFICATES ─────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  course_id    INT NOT NULL,
  cert_number  VARCHAR(100) UNIQUE,
  issued_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ── CONTACT MESSAGES ─────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100),
  email        VARCHAR(191) NOT NULL,
  phone        VARCHAR(20),
  subject      VARCHAR(255),
  message      TEXT NOT NULL,
  is_read      TINYINT(1) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SAMPLE DATA ───────────────────────────────

-- Admin user (parol: admin123)
INSERT IGNORE INTO users (first_name, last_name, email, phone, password, role, is_verified, is_active)
VALUES (
  'Admin', 'SilkroadLab',
  'admin@silkroadlab.uz',
  '+998901234567',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', 1, 1
);

-- Demo user (parol: demo123)
INSERT IGNORE INTO users (first_name, last_name, email, phone, password, role, is_verified, is_active)
VALUES (
  'Demo', 'Foydalanuvchi',
  'demo@silkroadlab.uz',
  '+998901112233',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'user', 1, 1
);

-- Courses
INSERT IGNORE INTO courses
  (title, title_en, description, description_en, category, level, price, duration_months, total_lessons, total_hours, vr_scenarios)
VALUES
  ('Ekskursovodlik Asoslari', 'Guide Basics', 'Yangi boshlovchi gidlar uchun asosiy bilimlar.', 'Basic knowledge for beginner guides.', 'guide', 'beginner', 650000, 1, 10, 36, 5),
  ('Tarixiy Obidalar Ekskursiyasi', 'Historical Monuments Tour', 'O\'zbekiston tarixiy obidalarini chuqur o\'rganish.', 'In-depth study of Uzbekistan historical monuments.', 'history', 'intermediate', 850000, 2, 15, 48, 8),
  ('Professional Gid Amaliyoti', 'Professional Guide Practice', 'Registon, Buxoro, Xivada ekskursiyalar.', 'Tours at Registan, Bukhara and Khiva.', 'guide', 'advanced', 1100000, 2, 30, 64, 12),
  ('Hotel Servis Mutaxassisi', 'Hotel Service Professional', 'Professional mehmonxona resepshn ko\'nikmalari.', 'Professional hotel reception skills.', 'hotel', 'intermediate', 750000, 1, 12, 40, 6),
  ('Aeroport Xizmati Assistenti', 'Airport Service Assistant', 'Aeroport muhitida professional yordam.', 'Professional assistance in airport environment.', 'airport', 'beginner', 550000, 1, 8, 28, 4),
  ('Turizm Ingliz Tili', 'Tourism English', 'Turizm sohasi uchun professional ingliz tili.', 'Professional English for tourism industry.', 'language', 'intermediate', 700000, 2, 18, 54, 0),
  ('Turizm Menejeri', 'Tourism Manager', 'Turizm menejment va jamoani boshqarish.', 'Tourism management and team leadership.', 'management', 'advanced', 950000, 2, 20, 72, 0);