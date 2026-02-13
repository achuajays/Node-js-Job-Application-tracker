const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tracker.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode equivalent and foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      status TEXT DEFAULT 'applied' CHECK(status IN ('wishlist','applied','phone_screen','interview','offer','rejected','withdrawn','accepted')),
      location TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      job_type TEXT DEFAULT 'full-time' CHECK(job_type IN ('full-time','part-time','contract','internship','freelance')),
      url TEXT,
      notes TEXT,
      applied_date TEXT,
      deadline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for performance
  db.run('CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');

  // Save to file
  saveDatabase();

  console.log('✅ Database initialized successfully');
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

module.exports = { initDatabase, getDb, saveDatabase };
