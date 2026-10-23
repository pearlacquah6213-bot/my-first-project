// Clean server implementation supporting JSON file storage or MySQL (XAMPP)
const express = require('express');
const path = require('path');
const bodyParser = require('express').json;
const basicAuth = require('basic-auth');
const fs = require('fs').promises;
const { stringify } = require('csv-stringify/sync');
let mysqlDB;
try { mysqlDB = require('./mysql_db'); } catch(e) { mysqlDB = null; }

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'registrations.json');

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (e) {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readRegistrations() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeRegistrations(arr) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

// storage mode: 'file' or 'mysql'
const STORAGE = (process.env.DB_TYPE === 'mysql' || process.env.USE_MYSQL === '1') ? 'mysql' : 'file';
if (STORAGE === 'mysql') {
  if (!mysqlDB) {
    console.error('MySQL storage requested but mysql_db helper not found.');
    process.exit(1);
  }
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'huni_portal'
  };
  mysqlDB.init(cfg).catch(err=>{
    console.error('MySQL init failed:', err.message || err);
    process.exit(1);
  });
}

function authMiddleware(req, res, next) {
  const cred = basicAuth(req) || {};
  if (cred.name === ADMIN_USER && cred.pass === ADMIN_PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="admin"');
  return res.status(401).send('Unauthorized');
}

const app = express();
app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/registrations', async (req, res) => {
  try {
    if (STORAGE === 'mysql') {
      const rows = await mysqlDB.getAll();
      return res.json(rows);
    }
    const rows = await readRegistrations();
    rows.sort((a,b)=> (b.id||0) - (a.id||0));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'read error' }); }
});

app.post('/api/register', async (req, res) => {
  const body = req.body || {};
  if (!body.firstName || !body.lastName) return res.status(400).json({ error: 'firstName and lastName required' });
  try {
    if (STORAGE === 'mysql') {
      const inserted = await mysqlDB.insert(body);
      return res.status(201).json({ success: true, entry: inserted });
    }
    const regs = await readRegistrations();
    const id = regs.length ? (regs[regs.length-1].id || regs.length) + 1 : 1;
    const entry = Object.assign({ id, createdAt: new Date().toISOString() }, body);
    regs.push(entry);
    await writeRegistrations(regs);
    res.status(201).json({ success: true, entry });
  } catch (err) { res.status(500).json({ error: 'failed to save' }); }
});

// admin routes
app.get('/admin', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.delete('/api/registrations/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (STORAGE === 'mysql') {
      await mysqlDB.deleteById(id);
      return res.json({ success: true });
    }
    let regs = await readRegistrations();
    const before = regs.length;
    regs = regs.filter(r => Number(r.id) !== id);
    if (regs.length === before) return res.status(404).json({ error: 'not found' });
    await writeRegistrations(regs);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'delete failed' }); }
});

app.get('/api/export', authMiddleware, async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  try {
    const rows = await (STORAGE === 'mysql' ? mysqlDB.getAll() : readRegistrations());
    if (format === 'json') {
      res.setHeader('Content-Disposition','attachment; filename=registrations.json');
      return res.json(rows);
    }
    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename=registrations.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: 'export failed' }); }
});

app.post('/api/import', authMiddleware, async (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) return res.status(400).json({ error: 'expected array of registrations' });
  try {
    if (STORAGE === 'mysql') {
      await mysqlDB.importMany(payload);
      return res.json({ success: true });
    }
    const regs = await readRegistrations();
    for (const r of payload) {
      const id = regs.length ? (regs[regs.length-1].id || regs.length) + 1 : 1;
      regs.push({ id, firstName: r.firstName||'', lastName: r.lastName||'', gender: r.gender||'', dob: r.dob||'', form: r.form||'', studentId: r.studentId||'', guardianContact: r.guardianContact||'', address: r.address||'', email: r.email||'', phone: r.phone||'', createdAt: r.createdAt||new Date().toISOString() });
    }
    await writeRegistrations(regs);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'import failed' }); }
});

app.listen(PORT, () => console.log(`HUNI VALLEY SHS portal running on http://localhost:${PORT}`));
