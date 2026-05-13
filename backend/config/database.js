// ============================================
//   SILKROADLAB — MySQL Database Config
// ============================================

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,     // process.env.DB_HOST emas
  user: process.env.MYSQL_ADDON_USER,     // process.env.DB_USER emas
  password: process.env.MYSQL_ADDON_PASSWORD, 
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promise wrapper — async/await bilan ishlash uchun
const promisePool = pool.promise();

module.exports = promisePool;
