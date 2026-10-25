'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const access = require('../dist-client/services/account-access');

test('website and packaged desktop use identical customer validation and payment policies', () => {
  assert.equal(
    fs.readFileSync(path.join(__dirname, '..', 'dist-client', 'services', 'customer-policy.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '..', 'services', 'customer-policy.js'), 'utf8')
  );
});

test('desktop subscriptions accept only current active or trialing entitlements', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  for (const subscriptionStatus of ['active', 'trialing']) {
    assert.equal(access.subscriptionGrantsAccess({ subscriptionStatus }, now), true);
    assert.equal(access.subscriptionGrantsAccess({ subscriptionStatus, subscriptionExpiresAt: '2026-10-26' }, now), true);
    assert.equal(access.subscriptionGrantsAccess({ subscriptionStatus, subscriptionExpiresAt: '2026-10-24' }, now), false);
    assert.equal(access.subscriptionGrantsAccess({ subscriptionStatus, subscriptionExpiresAt: 'invalid' }, now), false);
  }
  for (const subscriptionStatus of ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled', 'cancelled', 'none']) {
    assert.equal(access.subscriptionGrantsAccess({ subscriptionStatus }, now), false);
  }
});

test('disabled desktop identities are recognized independently of token claims', () => {
  for (const user of [{ status: 'DISABLED' }, { status: 'deleted' }, { isDeleted: true },
    { isDisabled: true }, { disabledAt: '2026-10-25' }, { deletedAt: '2026-10-25' }]) {
    assert.equal(access.isDisabled(user), true);
  }
  assert.equal(access.isDisabled({ status: 'active' }), false);
});

test('installed SQLite adapter preserves credentials, identity, metadata and subscription references', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vhr-desktop-regression-'));
  const electron = path.resolve(__dirname, '..', 'dist-client', 'node_modules', 'electron', 'dist', 'electron.exe');
  try {
    const script = `
      const assert = require('node:assert/strict');
      const path = require('node:path');
      const adapter = require(${JSON.stringify(path.resolve(__dirname, '..', 'dist-client', 'db.js'))});
      const file = path.join(${JSON.stringify(dir)}, 'users.db');
      assert.equal(adapter.initSqlite(file), true);
      adapter.addOrUpdateUser({ username: 'Original', email: 'Mixed@Example.invalid',
        passwordHash: 'preserved-hash', role: 'user', isPrimary: true, status: 'disabled',
        emailVerified: false, demoStartDate: '2026-10-01', subscriptionExpiresAt: '2026-11-01' });
      const original = adapter.findUserByUsername('original');
      assert.equal(adapter.findUserByEmail('  mixed@example.INVALID ').id, original.id);
      adapter.addSubscription({ username: 'Original', stripeSubscriptionId: 'sub_fixture', status: 'active' });
      assert.equal(adapter.updateUserFields('Original', { username: 'Renamed', emailVerified: true }), true);
      const renamed = adapter.findUserByUsername('RENAMED');
      assert.equal(adapter.findUserByUsername('Original'), null);
      assert.equal(renamed.id, original.id);
      assert.equal(renamed.passwordHash, 'preserved-hash');
      assert.equal(renamed.status, 'disabled');
      assert.equal(renamed.isPrimary, true);
      assert.equal(renamed.emailVerified, 1);
      assert.equal(renamed.subscriptionExpiresAt, '2026-11-01');
      assert.equal(adapter.getAllUsers().length, 1);
      assert.equal(adapter.getAllSubscriptions()[0].username, 'Renamed');
      adapter.addOrUpdateUser({ username: 'Other', email: 'other@example.invalid' });
      assert.throws(() => adapter.updateUserFields('Renamed', { username: 'Other' }), /already exists/);
      assert.equal(adapter.findUserByUsername('Renamed').id, original.id);
      assert.equal(adapter.getAllSubscriptions()[0].username, 'Renamed');
      adapter.addOrUpdateUser({ username: 'Renamed', role: 'user' });
      assert.equal(adapter.findUserByUsername('Renamed').passwordHash, 'preserved-hash');
    `;
    const result = spawnSync(electron, ['-e', script], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 20000, windowsHide: true
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
