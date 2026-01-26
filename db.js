// Minimal DB adapter using better-sqlite3 if available. Falls back to no-op if not installed.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
      lastLogin TEXT,
      lastActivity TEXT,
      emailVerified INTEGER DEFAULT 0,
      emailVerificationToken TEXT,
      emailVerificationExpiresAt TEXT,
      emailVerificationSentAt TEXT,
      emailVerifiedAt TEXT,
      status TEXT,
      deletedAt TEXT,
      disabledAt TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`).run();

    // Migrations for legacy DBs
    const alterStatements = [
      "ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN emailVerificationToken TEXT",
      "ALTER TABLE users ADD COLUMN emailVerificationExpiresAt TEXT",
      "ALTER TABLE users ADD COLUMN emailVerificationSentAt TEXT",
      "ALTER TABLE users ADD COLUMN emailVerifiedAt TEXT",
      "ALTER TABLE users ADD COLUMN lastLogin TEXT",
      "ALTER TABLE users ADD COLUMN lastActivity TEXT",
      "ALTER TABLE users ADD COLUMN updatedAt TEXT",
      "ALTER TABLE users ADD COLUMN status TEXT",
      "ALTER TABLE users ADD COLUMN deletedAt TEXT",
      "ALTER TABLE users ADD COLUMN disabledAt TEXT"
    ];
    alterStatements.forEach(stmt => { try { db.prepare(stmt).run(); } catch (e) {} });
    // Create subscriptions table
    db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      username TEXT,
      email TEXT,
      stripeSubscriptionId TEXT UNIQUE,
      stripePriceId TEXT,
      status TEXT,
      planName TEXT,
      startDate TEXT,
      endDate TEXT,
      cancelledAt TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`).run();
    // Create messages table
    db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      status TEXT,
      createdAt TEXT,
      readAt TEXT,
      respondedAt TEXT,
      response TEXT,
      respondedBy TEXT
    )`).run();
    // Create installations table
    db.prepare(`CREATE TABLE IF NOT EXISTS installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installationId TEXT UNIQUE,
      fingerprint TEXT UNIQUE,
      metadata TEXT,
      createdAt TEXT,
      lastSeenAt TEXT
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
    db.prepare(`UPDATE users SET passwordHash = ?, role = ?, email = ?, stripeCustomerId = ?, latestInvoiceId = ?, lastInvoicePaidAt = ?, subscriptionStatus = ?, subscriptionId = ?, lastLogin = ?, lastActivity = ?, emailVerified = ?, emailVerificationToken = ?, emailVerificationExpiresAt = ?, emailVerificationSentAt = ?, emailVerifiedAt = ?, status = ?, deletedAt = ?, disabledAt = ?, updatedAt = ? WHERE username = ?`).run(
      user.passwordHash || null,
      user.role || null,
      user.email || null,
      user.stripeCustomerId || null,
      user.latestInvoiceId || null,
      user.lastInvoicePaidAt || null,
      user.subscriptionStatus || null,
      user.subscriptionId || null,
      user.lastLogin || null,
      user.lastActivity || null,
      user.emailVerified ? 1 : 0,
      user.emailVerificationToken || null,
      user.emailVerificationExpiresAt || null,
      user.emailVerificationSentAt || null,
      user.emailVerifiedAt || null,
      user.status || null,
      user.deletedAt || null,
      user.disabledAt || null,
      user.updatedAt || new Date().toISOString(),
      user.username
    );
  } else {
    db.prepare(`INSERT INTO users (username, passwordHash, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId, lastLogin, lastActivity, emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerificationSentAt, emailVerifiedAt, status, deletedAt, disabledAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
      .run(
        user.username,
        user.passwordHash || null,
        user.role || null,
        user.email || null,
        user.stripeCustomerId || null,
        user.latestInvoiceId || null,
        user.lastInvoicePaidAt || null,
        user.subscriptionStatus || null,
        user.subscriptionId || null,
        user.lastLogin || null,
        user.lastActivity || null,
        user.emailVerified ? 1 : 0,
        user.emailVerificationToken || null,
        user.emailVerificationExpiresAt || null,
        user.emailVerificationSentAt || null,
        user.emailVerifiedAt || null,
        user.status || null,
        user.deletedAt || null,
        user.disabledAt || null,
        new Date().toISOString(),
        user.updatedAt || new Date().toISOString()
      );
  }
  return true;
}

function getAllUsers() {
  if (!enabled) return [];
  return db.prepare('SELECT username, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId, lastLogin, lastActivity, emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerificationSentAt, emailVerifiedAt, status, deletedAt, disabledAt, createdAt, updatedAt FROM users').all();
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
  const allowed = ['username', 'passwordHash', 'role', 'email', 'stripeCustomerId', 'latestInvoiceId', 'lastInvoicePaidAt', 'subscriptionStatus', 'subscriptionId', 'lastLogin', 'lastActivity', 'emailVerified', 'emailVerificationToken', 'emailVerificationExpiresAt', 'emailVerificationSentAt', 'emailVerifiedAt', 'status', 'deletedAt', 'disabledAt', 'updatedAt'];
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

// ===== Messages =====
function addMessage(messageData) {
  if (!enabled) return null;
  const { name, email, subject, message } = messageData;
  const stmt = db.prepare(`INSERT INTO messages (name, email, subject, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)`);
  const result = stmt.run(name, email, subject, message, 'unread', new Date().toISOString());
  return result.lastInsertRowid;
}

function getAllMessages() {
  if (!enabled) return [];
  return db.prepare('SELECT * FROM messages ORDER BY createdAt DESC').all();
}

function getUnreadMessages() {
  if (!enabled) return [];
  return db.prepare('SELECT * FROM messages WHERE status = ? ORDER BY createdAt DESC', ['unread']).all();
}

function updateMessage(messageId, updates) {
  if (!enabled) return false;
  const allowed = ['status', 'readAt', 'respondedAt', 'response', 'respondedBy'];
  const updateFields = Object.keys(updates).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`);
  if (updateFields.length === 0) return false;
  const setSql = updateFields.join(', ');
  const stmt = db.prepare(`UPDATE messages SET ${setSql} WHERE id = @id`);
  const params = Object.assign({}, updates, { id: messageId });
  stmt.run(params);
  return true;
}

function deleteMessage(messageId) {
  if (!enabled) return false;
  db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
  return true;
}

// ===== Subscriptions =====
function addSubscription(subscriptionData) {
  if (!enabled) return null;
  const { userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate } = subscriptionData;
  const stmt = db.prepare(`INSERT INTO subscriptions (userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();
  const result = stmt.run(userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate, now, now);
  return result.lastInsertRowid;
}

function getAllSubscriptions() {
  if (!enabled) return [];
  return db.prepare('SELECT * FROM subscriptions ORDER BY createdAt DESC').all();
}

function getActiveSubscriptions() {
  if (!enabled) return [];
  return db.prepare('SELECT * FROM subscriptions WHERE status = ? ORDER BY createdAt DESC', ['active']).all();
}

function updateSubscription(subscriptionId, updates) {
  if (!enabled) return false;
  const allowed = ['status', 'planName', 'startDate', 'endDate', 'cancelledAt'];
  const updateFields = Object.keys(updates).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`);
  if (updateFields.length === 0) return false;
  const setSql = updateFields.join(', ');
  const stmt = db.prepare(`UPDATE subscriptions SET ${setSql}, updatedAt = @updatedAt WHERE id = @id`);
  const params = Object.assign({}, updates, { id: subscriptionId, updatedAt: new Date().toISOString() });
  stmt.run(params);
  return true;
}

function findSubscriptionByStripeId(stripeId) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM subscriptions WHERE stripeSubscriptionId = ?').get(stripeId);
}

function ensureInstallationRecord(installationId, fingerprint, metadata = {}) {
  if (!enabled || (!installationId && !fingerprint)) return null;
  const now = new Date().toISOString();
  const serializedMetadata = JSON.stringify(metadata || {});

  if (fingerprint) {
    const byFingerprint = db.prepare('SELECT * FROM installations WHERE fingerprint = ?').get(fingerprint);
    if (byFingerprint) {
      const updatedId = installationId || byFingerprint.installationId;
      db.prepare('UPDATE installations SET installationId = ?, fingerprint = ?, metadata = ?, lastSeenAt = ? WHERE id = ?')
        .run(updatedId, fingerprint, serializedMetadata, now, byFingerprint.id);
      return {
        ...byFingerprint,
        installationId: updatedId,
        fingerprint,
        metadata: serializedMetadata ? JSON.parse(serializedMetadata) : null,
        lastSeenAt: now
      };
    }
  }

  if (installationId) {
    const existing = db.prepare('SELECT * FROM installations WHERE installationId = ?').get(installationId);
    if (existing) {
      db.prepare('UPDATE installations SET fingerprint = ?, metadata = ?, lastSeenAt = ? WHERE installationId = ?')
        .run(fingerprint || existing.fingerprint, serializedMetadata, now, installationId);
      return {
        ...existing,
        fingerprint: fingerprint || existing.fingerprint,
        metadata: serializedMetadata ? JSON.parse(serializedMetadata) : null,
        lastSeenAt: now
      };
    }
  }

  const result = db.prepare('INSERT INTO installations (installationId, fingerprint, metadata, createdAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)')
    .run(installationId || crypto.randomUUID?.() || '', fingerprint, serializedMetadata, now, now);
  return {
    id: result.lastInsertRowid,
    installationId: installationId || crypto.randomUUID?.() || '',
    fingerprint,
    metadata: serializedMetadata ? JSON.parse(serializedMetadata) : null,
    createdAt: now,
    lastSeenAt: now
  };
}

function getInstallationRecord(installationId) {
  if (!enabled || !installationId) return null;
  const existing = db.prepare('SELECT * FROM installations WHERE installationId = ?').get(installationId);
  if (!existing) return null;
  return {
    ...existing,
    metadata: existing.metadata ? JSON.parse(existing.metadata) : null
  };
}

module.exports = { initSqlite, isEnabled, addOrUpdateUser, getAllUsers, findUserByUsername, updateUserFields, deleteUserByUsername, addMessage, getAllMessages, getUnreadMessages, updateMessage, deleteMessage, addSubscription, getAllSubscriptions, getActiveSubscriptions, updateSubscription, findSubscriptionByStripeId, findUserByStripeCustomerId, ensureInstallationRecord, getInstallationRecord };
