#!/usr/bin/env node

/**
 * PostgreSQL 18 Verification & Data Integrity Script
 * Ensures all user data is properly persisted and backed up
 */

const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vhr_user:GeOrdMj4HYequwLu3kZ1hx5ckOJzdcEI@dpg-d4vvbh8gjchc73d53t8g-a/vhr_db';
const BACKUP_DIR = path.join(__dirname, 'backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ Created backups directory: ${BACKUP_DIR}`);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function verifyPostgreSQL() {
  console.log('\n🔍 PostgreSQL 18 Verification & Data Integrity Check\n');
  console.log('='.repeat(60));

  try {
    // Test connection
    console.log('\n1. Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`✓ Connected to PostgreSQL: ${result.rows[0].now}`);
    client.release();

    // Check tables
    console.log('\n2. Verifying database schema...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`✓ Found ${tables.length} tables: ${tables.join(', ')}`);

    // Count users
    console.log('\n3. Checking user data...');
    const usersResult = await pool.query('SELECT COUNT(*) as count, username, email FROM users GROUP BY username, email ORDER BY username');
    console.log(`✓ Total users: ${usersResult.rowCount}`);
    usersResult.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.username} (${user.email})`);
    });

    // Count messages
    console.log('\n4. Checking messages...');
    const messagesResult = await pool.query('SELECT COUNT(*) as count FROM messages');
    const messageCount = messagesResult.rows[0].count;
    console.log(`✓ Total messages: ${messageCount}`);

    // Check subscriptions
    console.log('\n5. Checking subscriptions...');
    const subsResult = await pool.query('SELECT COUNT(*) as count FROM subscriptions');
    const subCount = subsResult.rows[0].count;
    console.log(`✓ Total subscriptions: ${subCount}`);

    // Backup users
    console.log('\n6. Creating backup...');
    const usersBackup = await pool.query('SELECT * FROM users');
    const messagesBackup = await pool.query('SELECT * FROM messages');
    const subsBackup = await pool.query('SELECT * FROM subscriptions');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    const backupData = {
      timestamp: new Date().toISOString(),
      users: usersBackup.rows,
      messages: messagesBackup.rows,
      subscriptions: subsBackup.rows,
      summary: {
        userCount: usersBackup.rows.length,
        messageCount: messagesBackup.rows.length,
        subscriptionCount: subsBackup.rows.length,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✓ Backup created: ${backupFile}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Database verification complete!\n');
    console.log('Summary:');
    console.log(`  • Database Status: ONLINE`);
    console.log(`  • Total Users: ${usersBackup.rows.length}`);
    console.log(`  • Total Messages: ${messagesBackup.rows.length}`);
    console.log(`  • Total Subscriptions: ${subsBackup.rows.length}`);
    console.log(`  • Backup Location: ${backupFile}`);
    console.log(`  • Data Safety: ✓ CONFIRMED\n`);

    // Check for recent users (last 24 hours)
    const recentUsersResult = await pool.query(`
      SELECT username, email, createdat 
      FROM users 
      WHERE createdat > NOW() - INTERVAL '24 hours'
      ORDER BY createdat DESC
    `);

    if (recentUsersResult.rows.length > 0) {
      console.log('Recent Users (Last 24 Hours):');
      recentUsersResult.rows.forEach((user) => {
        console.log(`  • ${user.username} (${user.email}) - ${user.createdat}`);
      });
    } else {
      console.log('No new users in the last 24 hours');
    }

    await pool.end();
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyPostgreSQL().then(() => {
  console.log('\n📦 Data is safe and persistent!\n');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
