// Minimal DB adapter using better-sqlite3 if available. Falls back to no-op if not installed.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let db = null;
let enabled = false;

function initSqlite(dbFile) {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const fullPath = dbFile === ':memory:' ? dbFile : path.resolve(dbFile || path.join(__dirname, 'data', 'vhr.db'));
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
      demoStartDate TEXT,
      demoStartSource TEXT,
      demoStartReason TEXT,
      demoStartAt TEXT,
      demoEndDate TEXT,
      demoExtensionDays INTEGER,
      lastLogin TEXT,
      lastActivity TEXT,
      emailVerified INTEGER DEFAULT 0,
      emailVerificationToken TEXT,
      emailVerificationExpiresAt TEXT,
      emailVerificationSentAt TEXT,
      emailVerifiedAt TEXT,
      subscriptionConfirmationSentAt TEXT,
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
      "ALTER TABLE users ADD COLUMN subscriptionConfirmationSentAt TEXT",
      "ALTER TABLE users ADD COLUMN demoStartDate TEXT",
      "ALTER TABLE users ADD COLUMN demoStartSource TEXT",
      "ALTER TABLE users ADD COLUMN demoStartReason TEXT",
      "ALTER TABLE users ADD COLUMN demoStartAt TEXT",
      "ALTER TABLE users ADD COLUMN demoEndDate TEXT",
      "ALTER TABLE users ADD COLUMN demoExtensionDays INTEGER",
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
      cancelAtPeriodEnd INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`).run();
    try {
      db.prepare('ALTER TABLE subscriptions ADD COLUMN cancelAtPeriodEnd INTEGER DEFAULT 0').run();
    } catch (e) {}
    try {
      db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users(LOWER(email)) WHERE email IS NOT NULL AND email <> ''").run();
    } catch (e) {}
    db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripeCheckoutSessionId TEXT NOT NULL UNIQUE,
      stripePaymentIntentId TEXT UNIQUE,
      userId TEXT,
      username TEXT NOT NULL,
      email TEXT,
      purchaseId TEXT NOT NULL,
      purchaseName TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      licenseKey TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
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
    db.prepare(`UPDATE users SET passwordHash = ?, role = ?, email = ?, stripeCustomerId = ?, latestInvoiceId = ?, lastInvoicePaidAt = ?, subscriptionStatus = ?, subscriptionId = ?, demoStartDate = ?, demoStartSource = ?, demoStartReason = ?, demoStartAt = ?, demoEndDate = ?, demoExtensionDays = ?, lastLogin = ?, lastActivity = ?, emailVerified = ?, emailVerificationToken = ?, emailVerificationExpiresAt = ?, emailVerificationSentAt = ?, emailVerifiedAt = ?, subscriptionConfirmationSentAt = ?, status = ?, deletedAt = ?, disabledAt = ?, updatedAt = ? WHERE username = ?`).run(
      user.passwordHash || null,
      user.role || null,
      user.email || null,
      user.stripeCustomerId || null,
      user.latestInvoiceId || null,
      user.lastInvoicePaidAt || null,
      user.subscriptionStatus || null,
      user.subscriptionId || null,
      user.demoStartDate || null,
      user.demoStartSource || null,
      user.demoStartReason || null,
      user.demoStartAt || null,
      user.demoEndDate || null,
      user.demoExtensionDays ?? null,
      user.lastLogin || null,
      user.lastActivity || null,
      user.emailVerified ? 1 : 0,
      user.emailVerificationToken || null,
      user.emailVerificationExpiresAt || null,
      user.emailVerificationSentAt || null,
      user.emailVerifiedAt || null,
      user.subscriptionConfirmationSentAt || null,
      user.status || null,
      user.deletedAt || null,
      user.disabledAt || null,
      user.updatedAt || new Date().toISOString(),
      user.username
    );
  } else {
    db.prepare(`INSERT INTO users (username, passwordHash, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId, demoStartDate, demoStartSource, demoStartReason, demoStartAt, demoEndDate, demoExtensionDays, lastLogin, lastActivity, emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerificationSentAt, emailVerifiedAt, subscriptionConfirmationSentAt, status, deletedAt, disabledAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
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
        user.demoStartDate || null,
        user.demoStartSource || null,
        user.demoStartReason || null,
        user.demoStartAt || null,
        user.demoEndDate || null,
        user.demoExtensionDays ?? null,
        user.lastLogin || null,
        user.lastActivity || null,
        user.emailVerified ? 1 : 0,
        user.emailVerificationToken || null,
        user.emailVerificationExpiresAt || null,
        user.emailVerificationSentAt || null,
        user.emailVerifiedAt || null,
        user.subscriptionConfirmationSentAt || null,
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
  return db.prepare('SELECT username, role, email, stripeCustomerId, latestInvoiceId, lastInvoicePaidAt, subscriptionStatus, subscriptionId, demoStartDate, demoStartSource, demoStartReason, demoStartAt, demoEndDate, demoExtensionDays, lastLogin, lastActivity, emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerificationSentAt, emailVerifiedAt, subscriptionConfirmationSentAt, status, deletedAt, disabledAt, createdAt, updatedAt FROM users').all();
}

function findUserByUsername(username) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findUserByEmail(email) {
  if (!enabled || !email) return null;
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1').get(String(email).trim());
}

function findUserByStripeCustomerId(customerId) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM users WHERE stripeCustomerId = ?').get(customerId);
}

function updateUserFields(username, fields) {
  if (!enabled) return false;
  const allowed = ['username', 'passwordHash', 'role', 'email', 'stripeCustomerId', 'latestInvoiceId', 'lastInvoicePaidAt', 'subscriptionStatus', 'subscriptionId', 'demoStartDate', 'demoStartSource', 'demoStartReason', 'demoStartAt', 'demoEndDate', 'demoExtensionDays', 'lastLogin', 'lastActivity', 'emailVerified', 'emailVerificationToken', 'emailVerificationExpiresAt', 'emailVerificationSentAt', 'emailVerifiedAt', 'subscriptionConfirmationSentAt', 'status', 'deletedAt', 'disabledAt', 'updatedAt'];
  const updates = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`);
  if (updates.length === 0) return false;
  const setSql = updates.join(', ');
  const stmt = db.prepare(`UPDATE users SET ${setSql} WHERE username = @username`);
  const params = Object.assign({}, fields, { username });
  stmt.run(params);
  return true;
}

function updateUserIdentity(oldUsername, user) {
  if (!enabled || !oldUsername || !user || !user.username) return false;
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)').get(oldUsername);
    if (!row) return false;
    const updates = {
      username: user.username,
      email: user.email || null,
      updatedAt: user.updatedAt || new Date().toISOString()
    };
    for (const key of [
      'passwordHash', 'emailVerified', 'emailVerificationToken',
      'emailVerificationExpiresAt', 'emailVerificationSentAt', 'emailVerifiedAt'
    ]) {
      if (Object.prototype.hasOwnProperty.call(user, key)) updates[key] = user[key];
    }
    const columns = {
      username: 'username',
      email: 'email',
      updatedAt: 'updatedAt',
      passwordHash: 'passwordHash',
      emailVerified: 'emailVerified',
      emailVerificationToken: 'emailVerificationToken',
      emailVerificationExpiresAt: 'emailVerificationExpiresAt',
      emailVerificationSentAt: 'emailVerificationSentAt',
      emailVerifiedAt: 'emailVerifiedAt'
    };
    const fields = Object.keys(updates);
    const setSql = fields.map(key => `${columns[key]} = @${key}`).join(', ');
    const params = { ...updates, id: row.id };
    if (typeof params.emailVerified === 'boolean') params.emailVerified = params.emailVerified ? 1 : 0;
    db.prepare(`UPDATE users SET ${setSql} WHERE id = @id`).run(params);
    db.prepare(`UPDATE subscriptions
      SET username = ?, email = ?, updatedAt = ?
      WHERE userId = ? OR LOWER(username) = LOWER(?)`)
      .run(user.username, user.email || null, updates.updatedAt, row.id, row.username);
    db.prepare(`UPDATE purchases SET username = ?, email = ?
      WHERE userId = ? OR LOWER(username) = LOWER(?)`)
      .run(user.username, user.email || null, String(row.id), row.username);
    return true;
  });
  return tx();
}

function deleteUserByUsername(username) {
  if (!enabled) return false;
  const row = db.prepare('SELECT id, username, email FROM users WHERE username = ?').get(username);
  if (!row) return false;
  db.prepare('DELETE FROM subscriptions WHERE userId = ? OR LOWER(username) = LOWER(?)').run(row.id, row.username);
  if (row.email) {
    db.prepare('DELETE FROM subscriptions WHERE LOWER(email) = LOWER(?)').run(row.email);
  }
  db.prepare('DELETE FROM users WHERE username = ?').run(username);
  return true;
}

function deleteSubscriptionsByUsername(username, email = null) {
  if (!enabled) return false;
  const normalizedUser = String(username || '').trim();
  const normalizedEmail = String(email || '').trim();
  if (!normalizedUser && !normalizedEmail) return false;

  if (normalizedUser && normalizedEmail) {
    db.prepare('DELETE FROM subscriptions WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').run(normalizedUser, normalizedEmail);
  } else if (normalizedUser) {
    db.prepare('DELETE FROM subscriptions WHERE LOWER(username) = LOWER(?)').run(normalizedUser);
  } else {
    db.prepare('DELETE FROM subscriptions WHERE LOWER(email) = LOWER(?)').run(normalizedEmail);
  }
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
  const { userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate, cancelAtPeriodEnd } = subscriptionData;
  const stmt = db.prepare(`INSERT INTO subscriptions (userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate, cancelAtPeriodEnd, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();
  const result = stmt.run(userId, username, email, stripeSubscriptionId, stripePriceId, status, planName, startDate, endDate, cancelAtPeriodEnd ? 1 : 0, now, now);
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
  const allowed = ['status', 'planName', 'startDate', 'endDate', 'cancelledAt', 'cancelAtPeriodEnd'];
  const updateFields = Object.keys(updates).filter(k => allowed.includes(k)).map(k => `${k} = @${k}`);
  if (updateFields.length === 0) return false;
  const setSql = updateFields.join(', ');
  const stmt = db.prepare(`UPDATE subscriptions SET ${setSql}, updatedAt = @updatedAt WHERE id = @id`);
  const params = Object.assign({}, updates, { id: subscriptionId, updatedAt: new Date().toISOString() });
  stmt.run(params);
  return true;
}

function recordPurchase(purchase) {
  if (!enabled || !purchase || !purchase.stripeCheckoutSessionId) return null;
  const tx = db.transaction(() => {
    const existing = db.prepare(`SELECT * FROM purchases
      WHERE stripeCheckoutSessionId = ? OR (? IS NOT NULL AND stripePaymentIntentId = ?)
      LIMIT 1`).get(
      purchase.stripeCheckoutSessionId,
      purchase.stripePaymentIntentId || null,
      purchase.stripePaymentIntentId || null
    );
    if (existing) return { purchase: existing, created: false };
    const result = db.prepare(`INSERT INTO purchases (
      stripeCheckoutSessionId, stripePaymentIntentId, userId, username, email,
      purchaseId, purchaseName, amount, currency, status, licenseKey, createdAt
    ) VALUES (
      @stripeCheckoutSessionId, @stripePaymentIntentId, @userId, @username, @email,
      @purchaseId, @purchaseName, @amount, @currency, @status, @licenseKey, @createdAt
    )`).run({
      stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
      stripePaymentIntentId: purchase.stripePaymentIntentId || null,
      userId: purchase.userId == null ? null : String(purchase.userId),
      username: purchase.username,
      email: purchase.email || null,
      purchaseId: purchase.purchaseId,
      purchaseName: purchase.purchaseName,
      amount: purchase.amount,
      currency: purchase.currency,
      status: 'paid',
      licenseKey: purchase.licenseKey,
      createdAt: purchase.createdAt || new Date().toISOString()
    });
    return {
      purchase: db.prepare('SELECT * FROM purchases WHERE id = ?').get(result.lastInsertRowid),
      created: true
    };
  });
  return tx();
}

function getPurchasesForUser(userId, username) {
  if (!enabled) return [];
  return db.prepare(`SELECT * FROM purchases
    WHERE (? IS NOT NULL AND userId = ?) OR LOWER(username) = LOWER(?)
    ORDER BY createdAt DESC`).all(
    userId == null ? null : String(userId),
    userId == null ? null : String(userId),
    String(username || '')
  );
}

function findSubscriptionByStripeId(stripeId) {
  if (!enabled) return null;
  return db.prepare('SELECT * FROM subscriptions WHERE stripeSubscriptionId = ?').get(stripeId);
}

function deleteSubscriptionByIdentifier(identifier) {
  if (!enabled || !identifier) return 0;
  const key = String(identifier).trim();
  if (!key) return 0;

  const deleteByTextId = db.prepare('DELETE FROM subscriptions WHERE CAST(id AS TEXT) = ?');
  const deleteByStripeId = db.prepare('DELETE FROM subscriptions WHERE stripeSubscriptionId = ?');
  const tx = db.transaction((value) => {
    const r1 = deleteByTextId.run(value);
    const r2 = deleteByStripeId.run(value);
    return (r1.changes || 0) + (r2.changes || 0);
  });

  return tx(key);
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

module.exports = { initSqlite, isEnabled, addOrUpdateUser, getAllUsers, findUserByUsername, findUserByEmail, updateUserFields, updateUserIdentity, deleteUserByUsername, deleteSubscriptionsByUsername, addMessage, getAllMessages, getUnreadMessages, updateMessage, deleteMessage, addSubscription, getAllSubscriptions, getActiveSubscriptions, updateSubscription, findSubscriptionByStripeId, deleteSubscriptionByIdentifier, findUserByStripeCustomerId, recordPurchase, getPurchasesForUser, ensureInstallationRecord, getInstallationRecord };
