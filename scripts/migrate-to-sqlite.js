#!/usr/bin/env node
// Migration helper to move data/users.json into SQLite DB if better-sqlite3 is installed.
const path = require('path');
const fs = require('fs');

const appRoot = path.join(__dirname, '..');
const usersFile = path.join(appRoot, 'data', 'users.json');

function loadUsers() {
  if (!fs.existsSync(usersFile)) return [];
  let raw = fs.readFileSync(usersFile, 'utf8');
  raw = raw.replace(/^\uFEFF/, '').trim();
  try { return JSON.parse(raw || '[]'); } catch (e) { console.error('Invalid JSON users file', e && e.message); return []; }
}

async function main() {
  console.log('Starting migration to SQLite...');
  try {
    require('dotenv').config();
    const dbModule = require(path.join(appRoot, 'db'));
    const dbFile = process.env.DB_SQLITE_FILE || path.join(appRoot, 'data', 'vhr.db');
    const enabled = dbModule.initSqlite(dbFile);
    if (!enabled) {
      console.error('SQLite adapter not enabled: ensure better-sqlite3 is installed');
      process.exit(1);
    }
    const users = loadUsers();
    if (!users.length) {
      console.log('No users to migrate.');
      process.exit(0);
    }
    users.forEach(u => {
      console.log('Migrating user', u.username);
      dbModule.addOrUpdateUser(u);
    });
    console.log('Migration completed.');
    const all = dbModule.getAllUsers();
    console.log('DB users:', all.length);
  } catch (e) {
    console.error('Migration failed:', e && e.message);
    process.exit(1);
  }
}

main();
