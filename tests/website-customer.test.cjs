'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const policy = require('../services/customer-policy');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const sqliteSource = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
const postgresSource = fs.readFileSync(path.join(__dirname, '..', 'db-postgres.js'), 'utf8');

const purchases = {
  PERPETUAL: {
    id: 'perpetual_pro',
    billingPeriod: 'once',
    stripePriceId: 'price_perpetual'
  },
  MONTHLY: {
    id: 'monthly_pro',
    billingPeriod: 'month',
    stripePriceId: 'price_monthly'
  }
};

test('email validation normalizes case and rejects malformed or oversized addresses', () => {
  assert.equal(policy.normalizeEmail('  USER@Example.COM '), 'user@example.com');
  assert.equal(policy.isValidEmail('user@example.com'), true);
  assert.equal(policy.isValidEmail('user+tag@sub.example.com'), true);
  assert.equal(policy.isValidEmail('user@@example.com'), false);
  assert.equal(policy.isValidEmail('user@localhost'), false);
  assert.equal(policy.isValidEmail(`${'a'.repeat(250)}@example.com`), false);
});

test('password validation matches bcrypt byte limits', () => {
  assert.equal(policy.isValidPassword('short7!'), false);
  assert.equal(policy.isValidPassword('long-enough-password'), true);
  assert.equal(policy.isValidPassword('é'.repeat(36)), true);
  assert.equal(policy.isValidPassword('é'.repeat(37)), false);
  assert.equal(policy.isValidPassword('x'.repeat(73)), false);
  assert.equal(policy.isValidPassword(12345678), false);
});

test('usernames are normalized and restricted to a stable identifier alphabet', () => {
  assert.equal(policy.normalizeUsername('  vr_user-1.0  '), 'vr_user-1.0');
  assert.equal(policy.isValidUsername('vr_user-1.0'), true);
  assert.equal(policy.isValidUsername('ab'), false);
  assert.equal(policy.isValidUsername('user name'), false);
});

test('purchase aliases resolve to the canonical configured key', () => {
  assert.equal(policy.normalizePurchaseId('perpetual_pro', purchases), 'PERPETUAL');
  assert.equal(policy.normalizePurchaseId('perpetual', purchases), 'PERPETUAL');
  assert.equal(policy.normalizePurchaseId('unknown', purchases), null);
  assert.equal(policy.resolvePurchaseIdForPrice('price_perpetual', purchases), 'PERPETUAL');
  assert.equal(
    policy.resolvePurchaseIdForPrice('price_override', purchases, { PERPETUAL: 'price_override' }),
    'PERPETUAL'
  );
  assert.equal(policy.resolvePurchaseIdForPrice('price_unknown', purchases), null);
});

test('only paid one-time checkout sessions resolve to a deliverable purchase', () => {
  const session = {
    id: 'cs_test_local',
    mode: 'payment',
    payment_status: 'paid',
    metadata: { purchaseId: 'perpetual_pro' }
  };
  assert.deepEqual(policy.resolvePaidPurchaseSession(session, purchases), {
    purchaseId: 'PERPETUAL',
    purchase: purchases.PERPETUAL
  });
  assert.equal(
    policy.resolvePaidPurchaseSession({ ...session, payment_status: 'unpaid' }, purchases),
    null
  );
  assert.equal(
    policy.resolvePaidPurchaseSession({ ...session, mode: 'subscription' }, purchases),
    null
  );
  assert.equal(
    policy.resolvePaidPurchaseSession({
      ...session,
      metadata: { purchaseId: 'monthly_pro' }
    }, purchases),
    null
  );
  assert.equal(
    policy.resolvePaidPurchaseSession({
      ...session,
      metadata: { purchaseId: 'unknown' }
    }, purchases),
    null
  );
});

test('subscription access requires active or trialing status; no delinquency grace applies', () => {
  for (const status of ['active', 'trialing', ' ACTIVE ']) {
    assert.equal(policy.hasSubscriptionAccess(status), true);
  }
  for (const status of ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled', 'none']) {
    assert.equal(policy.hasSubscriptionAccess(status), false);
  }
});

test('games and favorites routes require authentication and an active entitlement', () => {
  for (const route of [
    "app.get('/api/games', authMiddleware, requireDashboardAccess",
    "app.post('/api/games/add', authMiddleware, requireDashboardAccess",
    "app.post('/api/games/remove', authMiddleware, requireDashboardAccess",
    "app.get('/api/favorites', authMiddleware, requireDashboardAccess",
    "app.post('/api/favorites/add', authMiddleware, requireDashboardAccess",
    "app.post('/api/favorites/remove', authMiddleware, requireDashboardAccess"
  ]) {
    assert.ok(serverSource.includes(route), `missing protected route: ${route}`);
  }
});

test('paid purchase handling is wired to durable idempotent storage', () => {
  assert.match(serverSource, /resolvePurchaseIdForPrice\(priceId, purchaseOptions, priceOverrides\)/);
  assert.match(serverSource, /resolvePaidPurchaseSession\(obj, purchaseConfig\.PURCHASE_OPTIONS\)/);
  assert.match(serverSource, /obj\.payment_status !== 'paid'/);
  assert.match(serverSource, /recordPaidPerpetualPurchase\(user, purchaseKey, purchase, obj\)/);
  assert.match(serverSource, /getPurchasesForUser\(user\.id, user\.username\)/);
  assert.match(sqliteSource, /stripeCheckoutSessionId TEXT NOT NULL UNIQUE/);
  assert.match(postgresSource, /stripecheckoutsessionid VARCHAR\(255\) NOT NULL UNIQUE/);
});

test('cancellation is scheduled with Stripe and profile identity updates preserve references', () => {
  const cancelStart = serverSource.indexOf("app.post('/api/subscriptions/cancel'");
  const cancelEnd = serverSource.indexOf('// ========== LICENSE VERIFICATION', cancelStart);
  const cancelRoute = serverSource.slice(cancelStart, cancelEnd);
  assert.match(cancelRoute, /stripe\.subscriptions\.update\(stripeSubscriptionId, \{ cancel_at_period_end: true \}\)/);
  assert.match(cancelRoute, /accessUntil/);
  assert.doesNotMatch(cancelRoute, /user\.subscriptionStatus = 'cancelled'/);

  const profileStart = serverSource.indexOf("app.patch('/api/me'");
  const profileEnd = serverSource.indexOf('// Delete self account', profileStart);
  const profileRoute = serverSource.slice(profileStart, profileEnd);
  assert.match(profileRoute, /persistUserIdentity\(oldUsername, user\)/);
  assert.match(profileRoute, /forceVerification: true/);
  assert.match(sqliteSource, /UPDATE subscriptions[\s\S]*?WHERE userId = \? OR LOWER\(username\) = LOWER\(\?\)/);
  assert.match(postgresSource, /UPDATE subscriptions[\s\S]*?WHERE userid = \$3 OR LOWER\(username\) = LOWER\(\$4\)/);
  assert.match(serverSource, /updateLicenseIdentityReferences\(oldUsername, normalized\)/);
});

test('marketing pages and their scripts do not contain emoji decorations', () => {
  const root = path.join(__dirname, '..');
  const vitrine = path.join(root, 'site-vitrine');
  const files = fs.readdirSync(vitrine)
    .filter(name => /\.(html|js|css)$/.test(name))
    .map(name => path.join(vitrine, name));
  files.push(...[
    'account.html', 'launch-dashboard.html', 'public/script.js',
    'public/js/account.js', 'public/js/contact-form.js',
    'public/js/launch-dashboard.js', 'public/js/botpress-config.js',
    'public/js/pricing-stripe.js'
  ].map(name => path.join(root, name)));

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8').replace(
      /&#(?:x([0-9a-f]+)|([0-9]+));/gi,
      (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))
    );
    assert.doesNotMatch(source, /[\p{Extended_Pictographic}\uFE0F\u20E3]/u, path.relative(root, file));
  }
});
