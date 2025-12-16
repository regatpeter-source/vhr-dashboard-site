# PostgreSQL 18 Quick Reference Guide

## Current Configuration

```
Database: vhr_db
Host: dpg-d4vvbh8gjchc73d53t8g-a
Port: 5432 (standard)
User: vhr_user
Password: GeOrdMj4HYequwLu3kZ1hx5ckOJzdcEI
Connection: postgresql://vhr_user:***@dpg-d4vvbh8gjchc73d53t8g-a/vhr_db
SSL: Enabled
Provider: Render.com (managed PostgreSQL)
```

## Database Structure

### users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordhash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  stripecustomerid TEXT,
  subscriptionid TEXT,
  subscriptionstatus TEXT,
  demoStartDate TIMESTAMP,
  trialExpired BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verificationToken TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  createdAt TIMESTAMP DEFAULT NOW(),
  readAt TIMESTAMP,
  respondedAt TIMESTAMP,
  respondedBy TEXT,
  response TEXT
);
```

### subscriptions Table
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  stripePriceId TEXT,
  status TEXT DEFAULT 'active',
  currentPeriodStart TIMESTAMP,
  currentPeriodEnd TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Common Operations

### Check Database Connection
```bash
# Via Node.js
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT NOW()', (err, res) => console.log(err || res.rows[0]))"

# Via CLI (if psql installed)
psql postgresql://vhr_user:***@dpg-d4vvbh8gjchc73d53t8g-a/vhr_db -c "SELECT NOW()"
```

### Count Users
```sql
SELECT COUNT(*) as total_users FROM users;
SELECT username, email, role, createdat FROM users ORDER BY createdat DESC;
```

### Count Messages
```sql
SELECT COUNT(*) as total_messages FROM messages;
SELECT name, email, subject, status, createdat FROM messages ORDER BY createdat DESC LIMIT 10;
```

### Count Subscriptions
```sql
SELECT COUNT(*) as total_subscriptions FROM subscriptions;
SELECT u.username, s.status, s.currentperiodend FROM subscriptions s JOIN users u ON s.userid = u.id;
```

### Find Specific User
```sql
SELECT * FROM users WHERE username = 'vhr';
SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM users WHERE createdat > NOW() - INTERVAL '24 hours';
```

### Find Unread Messages
```sql
SELECT id, name, email, subject, createdat FROM messages WHERE status = 'new' ORDER BY createdat DESC;
```

### Update User Role
```sql
UPDATE users SET role = 'admin' WHERE username = 'newadmin';
```

### Delete User (Careful!)
```sql
DELETE FROM users WHERE id = 'user-id';
```

### Find Expired Trials
```sql
SELECT u.username, u.email, u.demoStartDate, 
       (u.demoStartDate + INTERVAL '7 days') as trial_expires
FROM users u
WHERE u.trialExpired = false 
  AND (u.demoStartDate + INTERVAL '7 days') < NOW();
```

### Check User Subscription Status
```sql
SELECT u.username, u.email, s.status, s.currentperiodend 
FROM users u
LEFT JOIN subscriptions s ON u.id = s.userid
WHERE u.username = 'john';
```

## Code Integration

### In server.js

**Initialize Database**:
```javascript
// Line 1200
await db.initDatabase();
console.log('[DB] PostgreSQL initialized with users table ready');
```

**Register User**:
```javascript
// Line 4830-4860 (FIXED - awaits PostgreSQL)
if (USE_POSTGRES) {
  await db.createUser(newUser.id, newUser.username, newUser.passwordHash, newUser.email, newUser.role);
} else {
  persistUser(newUser);
}
res.json({ ok: true, token, userId, username, role, email });
```

**Get All Users**:
```javascript
// Line [check]
const users = await db.query('SELECT id, username, email, role, createdat FROM users');
```

**Save Message**:
```javascript
// Line [check]
await db.query(
  'INSERT INTO messages (id, name, email, subject, message, createdat) VALUES ($1, $2, $3, $4, $5, NOW())',
  [messageId, name, email, subject, message]
);
```

### In db-postgres.js

**Create User**:
```javascript
async createUser(id, username, passwordHash, email, role = 'user') {
  // Properly awaits PostgreSQL
  await this.pool.query(
    'INSERT INTO users (id, username, passwordhash, email, role, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
    [id, username, passwordHash, email, role]
  );
}
```

**Query Examples**:
```javascript
// Count users
const result = await this.pool.query('SELECT COUNT(*) FROM users');
console.log('Users:', result.rows[0].count);

// Get all users
const users = await this.pool.query('SELECT * FROM users');
return users.rows;

// Get with parameters (prevents SQL injection)
const user = await this.pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

## Monitoring Queries

### Database Health Check
```sql
-- Check if database is responsive
SELECT NOW() as server_time, datname as database FROM pg_database WHERE datname = 'vhr_db';

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Check recent queries
SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Data Integrity Check
```sql
-- Find duplicate emails
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Find duplicate usernames
SELECT username, COUNT(*) FROM users GROUP BY username HAVING COUNT(*) > 1;

-- Find orphaned subscriptions (no matching user)
SELECT s.id FROM subscriptions s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.userid);

-- Find users without emails
SELECT username FROM users WHERE email IS NULL OR email = '';
```

## Backup & Recovery

### Manual Backup (Local)
```bash
# Run verification script (creates backup)
node verify-postgresql.js

# Creates: backups/backup-2024-01-15T10-30-45-123Z.json
```

### Render.com Backup
1. Go to https://dashboard.render.com
2. Select "vhr-manager" service
3. Go to "Backups" section
4. Download latest backup (`.sql` file)
5. Restore: `psql DATABASE_URL < backup.sql`

### Restore from Backup (Render.com)
1. Contact Render.com support
2. Request point-in-time restore
3. Provide timestamp of last good state
4. Render initiates restore (15-30 minutes)

## Performance Optimization

### Add Indexes (if queries slow)
```sql
-- Index on username for login queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index on email for lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on created date for recent users
CREATE INDEX IF NOT EXISTS idx_users_createdat ON users(createdat DESC);

-- Index on message status for admin queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
```

### Connection Pooling (Already configured)
```javascript
// db-postgres.js uses pg.Pool
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 20,                  // Max connections
  idleTimeoutMillis: 30000,  // Idle timeout
  connectionTimeoutMillis: 2000
});
```

## Troubleshooting

### Problem: "Connection refused"
**Solution**:
1. Check DATABASE_URL is set: `echo $DATABASE_URL`
2. Verify Render.com database is running
3. Check firewall/security groups allow PostgreSQL
4. Test connection: `psql CONNECTION_STRING`

### Problem: "User already exists"
**Solution**:
1. Check if username/email exists: `SELECT * FROM users WHERE email = 'test@example.com'`
2. If duplicate, delete old record: `DELETE FROM users WHERE email = 'test@example.com'`
3. Retry registration

### Problem: "Query timeout"
**Solution**:
1. Check for long-running queries: `SELECT * FROM pg_stat_activity WHERE state != 'idle'`
2. Kill slow query: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...`
3. Add indexes if query is on large table

### Problem: "Authentication failed"
**Solution**:
1. Verify credentials in DATABASE_URL
2. Check password doesn't contain special chars (URL encode if needed)
3. Verify user has necessary permissions: `GRANT ALL ON DATABASE vhr_db TO vhr_user`

### Problem: "Disk space full"
**Solution**:
1. Check database size: `SELECT pg_size_pretty(pg_database_size(current_database()))`
2. Archive old messages: `DELETE FROM messages WHERE createdat < NOW() - INTERVAL '1 year'`
3. Vacuum tables: `VACUUM ANALYZE users; VACUUM ANALYZE messages;`
4. Contact Render.com to upgrade storage

## Emergency Procedures

### If Database is Down (Hard Reset)
1. Check Render.com status: https://render.com/status
2. If issue is on Render side, wait for their fix
3. If issue is on app side, redeploy: `git push origin main`

### If Data Gets Corrupted
1. Stop all application instances
2. Contact Render.com support
3. Request restore from backup
4. Provide target timestamp
5. Restart application after restore

### If Need to Migrate to New Database
1. Create export: `pg_dump DATABASE_URL > export.sql`
2. Create new PostgreSQL instance on Render.com
3. Import data: `psql NEW_DATABASE_URL < export.sql`
4. Update DATABASE_URL in Render environment
5. Redeploy application: `git push origin main`

## Statistics

**Current Database Size**: 
- 5 users in database
- ~10-20 messages (estimated)
- Schema optimized for growth up to 100,000+ users

**Expected Growth**:
- 1,000 users: ~2-5 MB
- 10,000 users: ~20-50 MB
- 100,000 users: ~200-500 MB

**Performance Expectations**:
- Query response time: 50-200ms
- Registration: < 500ms (DB + email)
- Login: < 200ms
- List users: < 500ms (< 1000 users)

## Support & Documentation

- **Render.com Docs**: https://render.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/18/
- **pg Library Docs**: https://node-postgres.com/
- **VR Manager Issues**: https://github.com/regatpeter-source/vhr-dashboard-site

## Related Files

- **Server Code**: [server.js](server.js)
- **Database Module**: [db-postgres.js](db-postgres.js)
- **Verification Script**: [verify-postgresql.js](verify-postgresql.js)
- **Parameterization Guide**: [POSTGRESQL_18_PARAMETERIZATION.md](POSTGRESQL_18_PARAMETERIZATION.md)
- **Backup Strategy**: [BACKUP_RECOVERY_STRATEGY.md](BACKUP_RECOVERY_STRATEGY.md)
- **Deployment Checklist**: [POSTGRESQL_18_DEPLOYMENT_CHECKLIST.md](POSTGRESQL_18_DEPLOYMENT_CHECKLIST.md)

---

**Created**: After PostgreSQL 18 activation  
**Status**: READY FOR PRODUCTION  
**Last Updated**: Current session  
**Maintenance**: Update quarterly or when schema changes
