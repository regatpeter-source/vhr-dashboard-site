#!/usr/bin/env node
/**
 * Initialize admin users directly via database connection
 * Usage: node init-users-direct.js [DATABASE_URL]
 */

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found');
  console.error('Usage: DATABASE_URL=<url> node init-users-direct.js');
  process.exit(1);
}

console.log('Initializing admin users...');
console.log('Database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initUsers() {
  const client = await pool.connect();
  try {
    // Create users table if not exists
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
    console.log('✓ Users table ready');

    // Check if admin exists
    const adminCheck = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['vhr']);
    
    if (adminCheck.rowCount === 0) {
      console.log('Creating admin user (vhr)...');
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
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Check if demo user exists
    const demoCheck = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['VhrDashboard']);
    
    if (demoCheck.rowCount === 0) {
      console.log('Creating demo user (VhrDashboard)...');
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
      console.log('✓ Demo user created');
    } else {
      console.log('✓ Demo user already exists');
    }

    // List all users
    console.log('\nAll users in database:');
    const allUsers = await client.query('SELECT id, username, email, role FROM users');
    allUsers.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) | ${user.email}`);
    });

    console.log('\n✓ Initialization complete!');
    console.log('\nLogin credentials:');
    console.log('  Username: vhr');
    console.log('  Password: [REDACTED]');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

initUsers();
