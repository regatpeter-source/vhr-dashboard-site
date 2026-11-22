'use strict';
const { createHash, timingSafeEqual } = require('node:crypto');
const digest = s => createHash('sha256').update(s).digest();

function configuredSyncSecret(value) {
  const secret = (value || '').trim();
  // Reject the retired renderer credential even on installations still configured with it.
  return secret.length >= 32 && digest(secret).toString('hex') !==
    'b10cb83816a73af754b4d8e067318f8ff298447949960320d1a633226bff2c6e' ? secret : '';
}

function requireSyncSecret(secret) {
  return (req, res, next) => {
    if (!secret) return res.status(503).json({ ok: false, error: 'Synchronisation serveur non configurée' });
    const supplied = req.get('x-sync-secret');
    if (!supplied || !timingSafeEqual(digest(secret), digest(supplied))) {
      return res.status(403).json({ ok: false, error: 'Synchronisation non autorisée' });
    }
    next();
  };
}

function signedStripeWebhook(stripe, env) {
  const secret = env.STRIPE_WEBHOOK_SECRET || (env.NODE_ENV !== 'production' && env.VHR_RUNTIME !== 'web' && env.RENDER !== 'true' && env.STRIPE_WEBHOOK_SECRET_DEV);
  return (req, res, next) => {
    if (!secret) return res.status(503).send('Webhook Stripe non configuré');
    try {
      req.stripeEvent = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), secret);
    } catch {
      return res.status(400).send('Signature Stripe invalide');
    }
    next();
  };
}

module.exports = { configuredSyncSecret, requireSyncSecret, signedStripeWebhook };
