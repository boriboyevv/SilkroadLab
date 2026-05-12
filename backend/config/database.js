// ============================================
//   SILKROADLAB — MySQL Database Config
// ============================================

const mysql = require('mysql2');

const pool = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  port              : process.env.DB_PORT     || 3306,
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASSWORD || '',
  database          : process.env.DB_NAME     || 'silkroadlab',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
  charset           : 'utf8mb4',
  timezone          : '+05:00', // Toshkent vaqt zonasi
});

// Promise wrapper — async/await bilan ishlash uchun
const promisePool = pool.promise();

module.exports = promisePool;
