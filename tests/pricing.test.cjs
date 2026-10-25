'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const pricing = require('../config/pricing');

test('desktop and website share the exact TTC catalogue and subscription plans', () => {
  assert.deepEqual(require('../dist-client/config/pricing').OFFERS, pricing.OFFERS);
  assert.deepEqual(require('../dist-client/config/subscription.config'), require('../config/subscription.config'));
  assert.equal(pricing.OFFERS.monthly.amount, 1990);
  assert.equal(pricing.OFFERS.annual.amount, 19900);
  assert.equal(pricing.OFFERS.perpetual.amount, 49900);
  assert.equal(12 * pricing.OFFERS.monthly.amount - pricing.OFFERS.annual.amount, 3980);
  assert.equal(require('../config/subscription.config').PLANS.ANNUAL.price, 199);
  assert.equal(require('../config/subscription.config').PLANS.ANNUAL.billingPeriod, 'year');
});

test('checkout price validation rejects stale, exclusive-tax and wrong-interval prices', () => {
  for (const offer of Object.values(pricing.OFFERS)) {
    const price = {
      id: offer.stripePriceId, active: true, unit_amount: offer.amount,
      currency: 'eur', tax_behavior: 'inclusive',
      recurring: offer.interval ? { interval: offer.interval, interval_count: 1 } : null
    };
    const mode = offer.interval ? 'subscription' : 'payment';
    assert.doesNotThrow(() => pricing.validatePrice(price, mode));
    for (const change of [
      { id: 'price_legacy' }, { active: false }, { unit_amount: 2900 },
      { currency: 'usd' }, { tax_behavior: 'exclusive' }, { tax_behavior: 'unspecified' },
      { recurring: { interval: 'week', interval_count: 1 } },
      ...(offer.interval ? [{ recurring: { interval: offer.interval, interval_count: 2 } }] : [])
    ]) assert.throws(() => pricing.validatePrice({ ...price, ...change }, mode));
    assert.throws(() => pricing.validatePrice(price, mode === 'payment' ? 'subscription' : 'payment'));
  }
});

test('subscription emails derive renewal amount and interval from Stripe, not first invoice totals', () => {
  for (const [key, amount, period] of [['monthly', '19.90', 'month'], ['annual', '199.00', 'year']]) {
    const offer = pricing.OFFERS[key];
    const result = pricing.subscriptionEmailData({
      items: { data: [{ quantity: 1, price: { unit_amount: offer.amount, recurring: { interval: offer.interval, interval_count: 1 } } }] }
    });
    assert.deepEqual(result, { price: amount, billingPeriod: period, intervalCount: 1 });
  }
  assert.throws(() => pricing.subscriptionEmailData({ items: { data: [] } }));
});

test('marketing buttons use the TTC catalogue and expose the annual purchase path', () => {
  for (const file of ['pricing.html', path.join('site-vitrine', 'pricing.html')]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const offer of Object.values(pricing.OFFERS)) assert.ok(html.includes(offer.stripePriceId));
    assert.match(html, /19,90 €<span>TTC\/mois/);
    assert.match(html, /199 €<span>TTC\/an/);
    assert.match(html, /499 €<span>TTC/);
    assert.doesNotMatch(html, /29€|>HT</);
  }
});

for (const scope of ['', 'dist-client']) {
  test(`${scope || 'website'} email rendering includes correct monthly and annual TTC renewals without SMTP`, async () => {
    const sent = [];
    const filename = path.join(root, scope, 'services', 'emailService.js');
    const config = require(path.join(root, scope, 'config', 'purchase.config.js'));
    const context = {
      module: { exports: {} }, exports: {}, console,
      process: { env: { NODE_ENV: 'test' } },
      require(name) {
        if (name === 'nodemailer') return {
          createTransport: () => ({
            verify(callback) { if (callback) callback(null, true); return Promise.resolve(true); },
            async sendMail(mail) { sent.push(mail); return { messageId: 'local-only' }; }
          })
        };
        if (name === '../config/purchase.config') return {
          ...config, EMAIL: { ...config.EMAIL, ENABLED: true, SMTP_USER: 'test', SMTP_PASS: 'test' }
        };
        return require(name);
      }
    };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    for (const [price, period, label, billing] of [
      ['19.90', 'month', '19,90 € TTC / mois', 'Mensuelle'],
      ['199.00', 'year', '199,00 € TTC / an', 'Annuelle']
    ]) {
      const result = await context.module.exports.sendSubscriptionSuccessEmail(
        { username: 'fixture', email: 'fixture@example.invalid' },
        { planName: 'Plan fixture', price, billingPeriod: period, intervalCount: 1, subscriptionId: 'sub_fixture' }
      );
      assert.equal(result.success, true);
      const html = sent.at(-1).html;
      assert.ok(html.includes(label));
      assert.ok(html.includes(billing));
      assert.doesNotMatch(html, /29€|29 €|499.*HT/);
      assert.equal(html.split(label).length - 1, 2);
    }
  });
}
