// Minimal DB adapter using better-sqlite3 if available. Falls back to no-op if not installed.
const fs = require('fs');
const path = require('path');

let db = null;
let enabled = false;

function initSqlite(dbFile) {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const fullPath = path.resolve(dbFile || path.join(__dirname, 'data', 'vhr.db'));
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new BetterSqlite3(fullPath);
    // Create users table if not exists
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      passwordHash TEXT,
      role TEXT,
      email TEXT,
      stripeCustomerId TEXT,
      latestInvoiceId TEXT,
      lastInvoicePaidAt TEXT,
      subscriptionStatus TEXT,
      subscriptionId TEXT,
      createdAt TEXT
    )`).run();
    enabled = true;
    return true;
  } catch (e) {
    console.warn('[db] SQLite disabled: better-sqlite3 not installed or error', e && e.message);
    return false;
  }
}

function isEnabled() { return enabled; }

function addOrUpdateUser(user) {
  if (!enabled) return false;
  // Upsert by username
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username);
  if (existing) {
    db.prepare(`UPDATE users SET passwordHash = ?, role = ?, email = ?, stripeCustomerId = ?, latestInvoiceId = ?, lastInvoicePaidAt = ?, subscriptionStatus = ?, subscriptionId = ? WHERE username = ?`).run(user.passwordHash || null, user.role || null, user.email || null, user.stripeCustomerId || null, user.latestInvoiceId || null, user.lastInvoicePaidAt || null, user.subscriptionStatus || null, user.subscriptionId || null, user.username);
  } else {
    db.prepare(`INSERT INTO users (username, passwordHash, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(user.username, user.passwordHash || null, user.role || null, user.email || null, user.stripeCustomerId || null, user.latestInvoiceId || null, user.lastInvoicePaidAt || null, user.subscriptionStatus || null, user.subscriptionId || null, new Date().toISOString());
  }
  return true;
}

function getAllUsers() {
  if (!enabled) return [];
  return db.prepare('SELECT username, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId FROM users').all();
}

function findUserByUsername(username) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findUserByStripeCustomerId(customerId) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM users WHERE stripeCustomerId = ?').get(customerId);
}

function updateUserFields(username, fields) {
  if (!enabled) return false;
  const allowed = ['username', 'passwordHash', 'role', 'email', 'stripeCustomerId', 'latestInvoiceId', 'lastInvoicePaidAt', 'subscriptionStatus', 'subscriptionId'];
  const updates = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`);
  if (updates.length === 0) return false;
  const setSql = updates.join(', ');
  const stmt = db.prepare(`UPDATE users SET ${setSql} WHERE username = @username`);
  const params = Object.assign({}, fields, { username });
  stmt.run(params);
  return true;
}

function deleteUserByUsername(username) {
  if (!enabled) return false;
  db.prepare('DELETE FROM users WHERE username = ?').run(username);
  return true;
}

module.exports = { initSqlite, isEnabled, addOrUpdateUser, getAllUsers, findUserByUsername, updateUserFields, deleteUserByUsername };
