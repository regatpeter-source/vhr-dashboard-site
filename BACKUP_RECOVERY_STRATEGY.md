
# PostgreSQL 18 Backup & Recovery Strategy

## Backup Targets

### 1. Users Table (CRITICAL)
- Contains all registered user accounts
- Backup frequency: Every 6 hours (automatic)
- Retention: 30 days rolling backup
- Recovery time: < 15 minutes

### 2. Messages Table (IMPORTANT)
- Contains all customer contact form submissions
- Backup frequency: Daily
- Retention: 90 days
- Recovery time: < 30 minutes

### 3. Subscriptions Table (IMPORTANT)
- Contains Stripe subscription references
- Backup frequency: Every 12 hours
- Retention: 30 days + 1 year archive
- Recovery time: < 15 minutes

## Backup Methods

### Method 1: PostgreSQL pg_dump (Render.com Built-in)
**Frequency**: Weekly (automated by Render)
**Location**: Render managed backups
**Retention**: Automatic (7 days)
**Cost**: Included in Render plan

**How to access:**
1. Go to Render.com Dashboard
2. Select "vhr-manager" service
3. Go to "Backups" section
4. Download latest backup
5. Restore via: psql -d DATABASE_URL < backup.sql

### Method 2: Manual Application-Level Backup
**Frequency**: After major updates or new user registrations
**Location**: Local `backups/` directory + cloud storage
**Method**: JSON export of all tables

**Implementation**:
```javascript
// In verify-postgresql.js
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
// Contains: users, messages, subscriptions tables
```

### Method 3: Cloud Storage Backup (Recommended)
**Frequency**: Every 24 hours
**Location**: AWS S3 / Google Drive / Dropbox
**Retention**: 90 days rolling + yearly archive
**Cost**: Low (~$1-5/month)

**Implementation Steps**:
1. Set up AWS S3 bucket:
   - Create bucket: `vhr-manager-backups`
   - Enable versioning
   - Configure lifecycle: Delete after 90 days
   
2. Add environment variables to Render:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_BUCKET_NAME

3. Create backup script:
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function backupToS3() {
  const backupData = await getAllTables();
  const key = `backups/backup-${Date.now()}.json`;
  
  await s3.putObject({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(backupData),
    ContentType: 'application/json',
  }).promise();
  
  console.log(`✓ Backup uploaded to S3: ${key}`);
}
```

## Recovery Procedures

### Scenario 1: Single User Account Recovery
**Time to Recovery**: 5 minutes
**Data Loss**: 0 minutes
**Steps**:
1. Access S3/backup storage
2. Find user in latest backup
3. Re-insert user record via admin panel
4. Reset password via email
5. User can login

**SQL**:
```sql
INSERT INTO users (id, username, email, passwordhash, role, createdat)
VALUES ('user-id', 'username', 'email@test.com', '$2b$10$...', 'user', NOW());
```

### Scenario 2: Accidental Data Deletion
**Time to Recovery**: 30 minutes
**Data Loss**: Up to 1 hour

**Steps**:
1. Identify last good backup time
2. Download backup from Render.com or S3
3. Create temporary table from backup:
   ```sql
   CREATE TEMP TABLE users_backup AS SELECT * FROM users_export;
   INSERT INTO users SELECT * FROM users_backup WHERE id NOT IN (SELECT id FROM users);
   ```
4. Verify data integrity
5. Commit recovered data

### Scenario 3: Database Corruption
**Time to Recovery**: 1-2 hours
**Data Loss**: Up to 6 hours
**Steps**:
1. Contact Render.com support
2. Request restore from point-in-time backup
3. Provide backup timestamp
4. Verify all tables after restore
5. Test user login

## Monitoring Strategy

### Daily Checks (Automated)
- [ ] Database connection status
- [ ] New user registration count
- [ ] Message submission count
- [ ] Stripe webhook processing
- [ ] Backup creation success

### Weekly Reviews
- [ ] User growth trend
- [ ] Subscription status accuracy
- [ ] Failed registration attempts
- [ ] Message response time
- [ ] Backup size and retention

### Monthly Verification
- [ ] Test restore from backup (non-prod)
- [ ] Verify data integrity
- [ ] Check for orphaned records
- [ ] Review error logs
- [ ] Update runbook if needed

## Failure Scenarios & Responses

| Scenario | Impact | Recovery Time | Action |
|----------|--------|----------------|--------|
| Registration fails to save | HIGH | < 5 min | Use verify-postgresql.js to detect and fix |
| Database connection lost | CRITICAL | < 15 min | Render.com auto-failover + restore from backup |
| Backup storage full | MEDIUM | 1 hour | Delete oldest backups or upgrade storage |
| User data corrupted | HIGH | < 2 hours | Restore from backup snapshot |
| Stripe sync fails | MEDIUM | < 30 min | Re-sync via webhook replay |

## Testing Schedule

### Monthly (First Monday)
- [ ] Run verify-postgresql.js
- [ ] Test user registration
- [ ] Test user login
- [ ] Verify message persistence

### Quarterly (First day of Q)
- [ ] Download and test restore from backup
- [ ] Verify all tables after restore
- [ ] Document any issues found
- [ ] Update recovery procedures

### Annually (January 1st)
- [ ] Comprehensive data audit
- [ ] Performance review
- [ ] Archive old backups
- [ ] Update disaster recovery plan

## Contact & Escalation

**Render.com Support**:
- Website: https://dashboard.render.com/
- Support: https://render.com/support
- Status: https://render.com/status

**PostgreSQL Monitoring Tools**:
- pgAdmin: Web-based admin tool
- DataGrip: JetBrains IDE
- DBeaver: Free SQL IDE

**Team Notifications**:
- On backup failure: Send email to peter@vrapitech.com
- On database error: Create GitHub issue in repo
- On data loss: Immediate manual investigation

## Security Considerations

### Backup Security
- [x] Backups encrypted at rest (Render.com managed)
- [x] Backups in separate AWS account (recommended)
- [x] Access controlled via IAM roles
- [x] No plain-text passwords in backups
- [x] Database credentials in environment only

### Access Control
- [x] Database read/write: Application only
- [x] Admin access: Peter + team via SSH
- [x] Backup access: Encrypted, key in vault
- [x] Backup restore: Requires approval
- [x] Audit trail: Render.com logs

## Cost Analysis

| Method | Monthly Cost | Setup Time | Recovery Time |
|--------|--------------|-----------|----------------|
| Render Built-in | FREE | 0 min | < 15 min |
| Manual JSON Export | FREE | 5 min | < 30 min |
| AWS S3 Backup | $2-5 | 30 min | < 1 hour |
| Daily Snapshots | $10-20 | 1 hour | < 5 min |

**Recommendation**: Use Render built-in + AWS S3 for optimal cost/reliability

## Implementation Checklist

### Immediate (This Week)
- [ ] Verify Render.com automatic backups are enabled
- [ ] Test backup download and restore
- [ ] Document backup location and credentials
- [ ] Set up monitoring alerts

### Short-term (This Month)
- [ ] Create backup-to-S3 script
- [ ] Set up AWS S3 bucket with lifecycle
- [ ] Add environment variables to Render
- [ ] Schedule weekly backup tests

### Medium-term (This Quarter)
- [ ] Implement daily backup verification
- [ ] Create runbook for common scenarios
- [ ] Train team on recovery procedures
- [ ] Document all passwords in vault

### Long-term (This Year)
- [ ] Achieve RPO < 1 hour
- [ ] Achieve RTO < 30 minutes
- [ ] Pass annual disaster recovery test
- [ ] Update procedures based on learnings

---

**Created**: After PostgreSQL 18 activation
**Status**: READY FOR IMPLEMENTATION
**Priority**: HIGH - Data loss prevention is critical
**Next Action**: Verify Render.com backup settings
