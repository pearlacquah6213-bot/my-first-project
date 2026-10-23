const mysql = require('mysql2/promise');

let pool;

async function init(cfg) {
  pool = mysql.createPool({
    host: cfg.host || 'localhost',
    user: cfg.user || 'root',
    password: cfg.password || '',
    database: cfg.database || 'huni_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  // ensure table exists
  const create = `CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    gender VARCHAR(50),
    dob VARCHAR(50),
    form VARCHAR(100),
    studentId VARCHAR(100),
    guardianContact VARCHAR(255),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(100),
    createdAt VARCHAR(50)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  await pool.query(create);
}

async function getAll() {
  const [rows] = await pool.query('SELECT * FROM registrations ORDER BY id DESC');
  return rows;
}

async function insert(entry) {
  const sql = `INSERT INTO registrations (firstName,lastName,gender,dob,form,studentId,guardianContact,address,email,phone,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
  const params = [entry.firstName||'', entry.lastName||'', entry.gender||'', entry.dob||'', entry.form||'', entry.studentId||'', entry.guardianContact||'', entry.address||'', entry.email||'', entry.phone||'', entry.createdAt||new Date().toISOString()];
  const [result] = await pool.execute(sql, params);
  const [rows] = await pool.query('SELECT * FROM registrations WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function deleteById(id) {
  await pool.query('DELETE FROM registrations WHERE id = ?', [id]);
}

async function importMany(arr) {
  for (const r of arr) {
    await insert(r);
  }
}

module.exports = { init, getAll, insert, deleteById, importMany };
