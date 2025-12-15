const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database and create tables
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    console.log('[DB] Initializing PostgreSQL database...');
    
    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        response TEXT,
        respondedBy VARCHAR(255),
        respondedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Messages table ready');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        stripeCustomerId VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Users table ready');
    
    // Create subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        userId VARCHAR(255) REFERENCES users(id),
        plan VARCHAR(50),
        status VARCHAR(50),
        stripeSubscriptionId VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiresAt TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Subscriptions table ready');
    
    client.release();
    console.log('[DB] PostgreSQL initialized successfully');
    return true;
  } catch (err) {
    console.error('[DB] Initialization error:', err.message);
    return false;
  }
}

// Messages functions
async function getMessages() {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY createdAt DESC');
    return result.rows;
  } catch (err) {
    console.error('[DB] Error getting messages:', err);
    return [];
  }
}

async function createMessage(name, email, subject, message) {
  try {
    const result = await pool.query(
      'INSERT INTO messages (name, email, subject, message, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, subject, message, 'unread']
    );
    return result.rows[0];
  } catch (err) {
    console.error('[DB] Error creating message:', err);
    return null;
  }
}

async function updateMessage(id, updates) {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });
    
    values.push(id);
    
    const query = `UPDATE messages SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('[DB] Error updating message:', err);
    return null;
  }
}

async function deleteMessage(id) {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.error('[DB] Error deleting message:', err);
    return false;
  }
}

// Users functions
async function getUsers() {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY createdAt DESC');
    return result.rows;
  } catch (err) {
    console.error('[DB] Error getting users:', err);
    return [];
  }
}

async function getUserByUsername(username) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  } catch (err) {
    console.error('[DB] Error getting user:', err);
    return null;
  }
}

async function createUser(id, username, passwordHash, email, role = 'user') {
  try {
    const result = await pool.query(
      'INSERT INTO users (id, username, passwordHash, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, username, passwordHash, email, role]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[DB] Error creating user:', err);
    return null;
  }
}

async function updateUser(id, updates) {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });
    
    values.push(id);
    
    const query = `UPDATE users SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('[DB] Error updating user:', err);
    return null;
  }
}

module.exports = {
  pool,
  initDatabase,
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getUsers,
  getUserByUsername,
  createUser,
  updateUser
};
