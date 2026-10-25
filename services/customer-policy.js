'use strict';

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain || domain.length > 253) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every(label =>
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  );
}

function isValidPassword(value) {
  if (typeof value !== 'string') return false;
  const length = Buffer.byteLength(value, 'utf8');
  return length >= 8 && length <= 72;
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function isValidUsername(value) {
  const username = normalizeUsername(value);
  return username.length >= 3 && username.length <= 32 && /^[a-z0-9_.-]+$/i.test(username);
}

function normalizePurchaseId(value, purchaseOptions = {}) {
  if (typeof value !== 'string') return null;
  const requested = value.trim().toLowerCase();
  if (!requested) return null;
  for (const [key, purchase] of Object.entries(purchaseOptions || {})) {
    if (key.toLowerCase() === requested || String(purchase?.id || '').trim().toLowerCase() === requested) {
      return key;
    }
  }
  return null;
}

function resolvePurchaseIdForPrice(priceId, purchaseOptions = {}, priceOverrides = {}) {
  if (typeof priceId !== 'string' || !priceId.trim()) return null;
  for (const [key, purchase] of Object.entries(purchaseOptions || {})) {
    const configuredPriceId = priceOverrides[key] || purchase?.stripePriceId;
    if (configuredPriceId && String(configuredPriceId).trim() === priceId.trim()) return key;
  }
  return null;
}

function resolvePaidPurchaseSession(session, purchaseOptions = {}) {
  if (!session || session.mode !== 'payment' || session.payment_status !== 'paid') return null;
  const purchaseId = normalizePurchaseId(session.metadata?.purchaseId, purchaseOptions);
  const purchase = purchaseId ? purchaseOptions[purchaseId] : null;
  if (!purchase || purchase.billingPeriod !== 'once') return null;
  return { purchaseId, purchase };
}

function hasSubscriptionAccess(status) {
  // No grace period is configured: past_due and unpaid subscriptions do not grant access.
  return ['active', 'trialing'].includes(String(status || '').trim().toLowerCase());
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeUsername,
  isValidUsername,
  normalizePurchaseId,
  resolvePurchaseIdForPrice,
  resolvePaidPurchaseSession,
  hasSubscriptionAccess
};
