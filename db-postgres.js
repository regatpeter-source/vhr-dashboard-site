"use strict";

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Render Postgres typically requires SSL.
// If you run Postgres locally without SSL, set PGSSLMODE=disable (or set DATABASE_SSL=false).
const shouldUseSsl = (() => {
  const v = (process.env.DATABASE_SSL || process.env.PGSSL || '').toString().trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'disable' || v === 'disabled') return false;
  // Default: enable SSL when DATABASE_URL is present (production), otherwise rely on pg defaults.
  return !!process.env.DATABASE_URL;
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (err) => {
  // Prevent the process from crashing on an idle client error.
  console.error('[DB] PostgreSQL pool error:', err && err.message ? err.message : err);
});

let initPromise = null;

async function initDatabase() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const client = await pool.connect();
    try {
      // Messages (aligned with JSON fallback format used in server.js)
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          name TEXT,
          email TEXT,
          subject TEXT,
          message TEXT,
          status TEXT DEFAULT 'unread',
          createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          readat TIMESTAMPTZ,
          respondedat TIMESTAMPTZ,
          response TEXT,
          respondedby TEXT
        )
      `);
      console.log('[DB] [32m[1m✓[0m Messages table ready');

      // Users
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          passwordhash VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          stripecustomerid VARCHAR(255),
          latestinvoiceid VARCHAR(255),
          lastinvoicepaidat TIMESTAMPTZ,
          subscriptionstatus VARCHAR(50),
          subscriptionid VARCHAR(255),
          createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('[DB] [32m[1m✓[0m Users table ready');
      // Ensure all required columns exist (migration for older tables)
      const columnChecks = [
        { name: 'stripecustomerid', type: 'VARCHAR(255)' },
        { name: 'latestinvoiceid', type: 'VARCHAR(255)' },
        { name: 'lastinvoicepaidat', type: 'TIMESTAMPTZ' },
        { name: 'subscriptionstatus', type: 'VARCHAR(50)' },
        { name: 'subscriptionid', type: 'VARCHAR(255)' }
      ];

      for (const col of columnChecks) {
        try {
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
          `);
          console.log(`[DB] Column ${col.name} ensured`);
        } catch (colErr) {
          if (colErr.message && colErr.message.includes('already exists')) {
            // Column already exists, that's fine
          } else {
            console.log(`[DB] Note: Could not add column ${col.name}:`, colErr && colErr.message);
          }
        }
      }
      // Subscriptions (currently not heavily used from Postgres in server.js, but keep schema for completeness)
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          userid VARCHAR(255) REFERENCES users(id),
          plan VARCHAR(50),
          status VARCHAR(50),
          stripesubscriptionid VARCHAR(255),
          createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          expiresat TIMESTAMPTZ,
          updatedat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('[DB] [32m[1m✓[0m Subscriptions table ready');

      await importMessagesIfNeeded(client);
      await ensureDefaultUsers(client);

      return true;
    } catch (err) {
      console.error('[DB] Initialization error:', err && err.message ? err.message : err);
      // Allow retry on next call if init failed.
      initPromise = null;
      throw err;  // Re-throw to reject the promise so errors are caught upstream
    } finally {
      client.release();
    }
  })();
  return initPromise;
}

async function importMessagesIfNeeded(client) {
  try {
    const countRes = await client.query('SELECT COUNT(*)::int AS count FROM messages');
    const count = countRes.rows?.[0]?.count ?? 0;
    if (count > 0) return;

    const messagesPath = path.join(__dirname, 'data', 'messages.json');
    if (!fs.existsSync(messagesPath)) {
      console.warn('[DB] messages.json not found, no messages imported');
      return;
    }

    const raw = fs.readFileSync(messagesPath, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    for (const m of parsed) {
      // JSON fallback uses: id, name, email, subject, message, status, createdAt, readAt, respondedAt, response, respondedBy
      await client.query(
        `INSERT INTO messages (id, name, email, subject, message, status, createdat, readat, respondedat, response, respondedby)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          typeof m.id === 'number' ? m.id : null,
          m.name ?? null,
          m.email ?? null,
          m.subject ?? null,
          m.message ?? null,
          m.status ?? 'unread',
          m.createdAt ? new Date(m.createdAt) : new Date(),
          m.readAt ? new Date(m.readAt) : null,
          m.respondedAt ? new Date(m.respondedAt) : null,
          m.response ?? null,
          m.respondedBy ?? null
        ]
      );
    }

    console.log(`[DB] Imported ${parsed.length} messages from messages.json`);
  } catch (e) {
    console.error('[DB] Failed to import messages from JSON:', e && e.message ? e.message : e);
  }
}

async function ensureDefaultUsers(client) {
  // Match the JSON fallback default users used in server.js
  const hasAdmin = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['vhr']);
  if (hasAdmin.rowCount === 0) {
    await client.query(
      'INSERT INTO users (id, username, passwordhash, email, role) VALUES ($1, $2, $3, $4, $5)',
      [
        'admin_vhr',
        'vhr',
        '$2b$10$ov9F32cIWWXhvNumETtB1urvsdD5Y4Wl6wXlSHoCy.f4f03kRGcf2',
        'admin@example.local',
        'admin'
      ]
    );
    console.log('[DB] [32m[1m✓[0m Admin user created');
  }

  const hasDemo = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['VhrDashboard']);
  if (hasDemo.rowCount === 0) {
    await client.query(
      'INSERT INTO users (id, username, passwordhash, email, role) VALUES ($1, $2, $3, $4, $5)',
      [
        'user_demo',
        'VhrDashboard',
        '$2b$10$XtU3hKSETcFgyx9w.KfL5unRFQ7H2Q26vBKXXjQ05Kz47mZbvrdQS',
        'regatpeter@hotmail.fr',
        'user'
      ]
    );
    console.log('[DB] [32m[1m✓[0m Demo user created');
  }
}

// ===== Messages =====
async function getMessages() {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY createdat DESC');
    return result.rows || [];
  } catch (err) {
    console.error('[DB] Error getting messages:', err && err.message ? err.message : err);
    return [];
  }
}

async function createMessage(name, email, subject, message) {
  try {
    const result = await pool.query(
      'INSERT INTO messages (name, email, subject, message, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, subject, message, 'unread']
    );
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error creating message:', err && err.message ? err.message : err);
    return null;
  }
}

async function updateMessage(id, updates) {
  try {
    if (!updates || typeof updates !== 'object') return null;
    const allowed = new Set(['status', 'readat', 'respondedat', 'response', 'respondedby']);

    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(updates)) {
      const key = String(k).toLowerCase();
      if (!allowed.has(key)) continue;
      fields.push(`${key} = $${i}`);
      values.push(v);
      i++;
    }
    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE messages SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error updating message:', err && err.message ? err.message : err);
    return null;
  }
}

async function deleteMessage(id) {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('[DB] Error deleting message:', err && err.message ? err.message : err);
    return false;
  }
}

// ===== Users =====
async function getUsers() {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, createdat, updatedat, subscriptionstatus, subscriptionid, stripecustomerid FROM users ORDER BY createdat DESC'
    );
    return result.rows || [];
  } catch (err) {
    console.error('[DB] Error getting users:', err && err.message ? err.message : err);
    return [];
  }
}

async function getUserByUsername(username) {
  try {
    // Try simple query with only essential columns first
    let result = await pool.query(
      `SELECT
         id,
         username,
         passwordhash,
         email,
         role
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    );
    
    if (!result.rows || !result.rows[0]) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Try to get optional columns if they exist
    let optionalFields = {};
    try {
      const optResult = await pool.query(
        `SELECT
           stripecustomerid,
           latestinvoiceid,
           lastinvoicepaidat,
           subscriptionstatus,
           subscriptionid,
           createdat,
           updatedat
         FROM users
         WHERE username = $1
         LIMIT 1`,
        [username]
      );
      if (optResult.rows && optResult.rows[0]) {
        optionalFields = optResult.rows[0];
      }
    } catch (optErr) {
      console.log('[DB] Optional columns not available (this is ok):', optErr && optErr.message);
    }
    
    // Return combined result
    return {
      id: row.id,
      username: row.username,
      passwordhash: row.passwordhash,
      passwordHash: row.passwordhash,
      email: row.email,
      role: row.role,
      stripecustomerid: optionalFields.stripecustomerid || null,
      stripeCustomerId: optionalFields.stripecustomerid || null,
      latestinvoiceid: optionalFields.latestinvoiceid || null,
      latestInvoiceId: optionalFields.latestinvoiceid || null,
      lastinvoicepaidat: optionalFields.lastinvoicepaidat || null,
      lastInvoicePaidAt: optionalFields.lastinvoicepaidat || null,
      subscriptionstatus: optionalFields.subscriptionstatus || null,
      subscriptionStatus: optionalFields.subscriptionstatus || null,
      subscriptionid: optionalFields.subscriptionid || null,
      subscriptionId: optionalFields.subscriptionid || null,
      createdat: optionalFields.createdat || null,
      createdAt: optionalFields.createdat || null,
      updatedat: optionalFields.updatedat || null,
      updatedAt: optionalFields.updatedat || null
    };
  } catch (err) {
    console.error('[DB] Error getting user:', err && err.message ? err.message : err);
    return null;
  }
}

async function createUser(id, username, passwordHash, email, role = 'user') {
  try {
    const result = await pool.query(
      'INSERT INTO users (id, username, passwordhash, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role',
      [id, username, passwordHash, email || null, role]
    );
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error creating user:', err && err.message ? err.message : err);
    return null;
  }
}

async function updateUser(id, updates) {
  try {
    if (!updates || typeof updates !== 'object') return null;
    const allowed = new Set([
      'username',
      'passwordhash',
      'email',
      'role',
      'stripecustomerid',
      'latestinvoiceid',
      'lastinvoicepaidat',
      'subscriptionstatus',
      'subscriptionid'
    ]);

    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(updates)) {
      const key = String(k).toLowerCase();
      if (!allowed.has(key)) continue;
      fields.push(`${key} = $${i}`);
      values.push(v);
      i++;
    }
    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, username, email, role`;
    const result = await pool.query(query, values);
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error updating user:', err && err.message ? err.message : err);
    return null;
  }
}

async function deleteUser(id) {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows?.[0]?.id || null;
  } catch (err) {
    console.error('[DB] Error deleting user:', err && err.message ? err.message : err);
    return null;
  }
}

// ===== Subscriptions =====
async function addSubscription(subscriptionData) {
  try {
    if (!subscriptionData || typeof subscriptionData !== 'object') return null;
    const {
      id,
      username,
      userId,
      email,
      stripeSubscriptionId,
      stripePriceId,
      status,
      planName,
      startDate,
      endDate,
      cancelledAt,
      totalPaid
    } = subscriptionData;

    const result = await pool.query(
      `INSERT INTO subscriptions (
         id,
         username,
         userid,
         email,
         stripesubscriptionid,
         stripepriceid,
         status,
         planname,
         startdate,
         enddate,
         cancelledat,
         totalpaid,
         createdat,
         updatedat
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id || null,
        username || null,
        userId || null,
        email || null,
        stripeSubscriptionId || null,
        stripePriceId || null,
        status || 'active',
        planName || null,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null,
        cancelledAt ? new Date(cancelledAt) : null,
        totalPaid || 0
      ]
    );
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error adding subscription:', err && err.message ? err.message : err);
    return null;
  }
}

async function getAllSubscriptions() {
  try {
    const result = await pool.query(
      'SELECT * FROM subscriptions ORDER BY createdat DESC'
    );
    return result.rows || [];
  } catch (err) {
    console.error('[DB] Error getting subscriptions:', err && err.message ? err.message : err);
    return [];
  }
}

async function updateSubscription(id, updates) {
  try {
    if (!updates || typeof updates !== 'object') return null;
    const allowed = new Set([
      'status',
      'planname',
      'startdate',
      'enddate',
      'cancelledat',
      'totalpaid'
    ]);

    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(updates)) {
      const key = String(k).toLowerCase();
      if (!allowed.has(key)) continue;
      fields.push(`${key} = $${i}`);
      values.push(v);
      i++;
    }
    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE subscriptions SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows?.[0] || null;
  } catch (err) {
    console.error('[DB] Error updating subscription:', err && err.message ? err.message : err);
    return null;
  }
}

async function deleteSubscription(id) {
  try {
    await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('[DB] Error deleting subscription:', err && err.message ? err.message : err);
    return false;
  }
}

module.exports = {
  pool,
  initDatabase,
  // messages
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  // users
  getUsers,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  // subscriptions
  addSubscription,
  getAllSubscriptions,
  updateSubscription,
  deleteSubscription
};
