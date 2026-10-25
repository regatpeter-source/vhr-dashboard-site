'use strict';

const fs = require('node:fs');
const path = require('node:path');
const env = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '..', '.env')));
const stripe = require('stripe')(env.STRIPE_SECRET_KEY);

async function main() {
  if (!process.argv.includes('--apply')) throw new Error('Explicit --apply authorization required');
  const monthly = await stripe.prices.retrieve(env.STRIPE_PRICE_ID_STANDARD);
  const perpetual = await stripe.prices.retrieve(env.STRIPE_PRICE_ID_PERPETUAL);
  const subscriptions = [];
  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    if (!['canceled', 'incomplete_expired'].includes(sub.status)) subscriptions.push(sub.id);
  }
  if (subscriptions.length) {
    throw new Error('Existing subscriptions require a reviewed renewal migration; no prices changed');
  }

  const specs = [
    { key: 'monthly', product: monthly.product, unit_amount: 1990, recurring: { interval: 'month' } },
    { key: 'annual', product: monthly.product, unit_amount: 19900, recurring: { interval: 'year' } },
    { key: 'perpetual', product: perpetual.product, unit_amount: 49900 }
  ];
  const result = { existingSubscriptions: 0, prices: {} };
  for (const spec of specs) {
    const lookup = `vhr_${spec.key}_ttc_20261025`;
    const found = await stripe.prices.list({ lookup_keys: [lookup], limit: 2 });
    const price = found.data[0] || await stripe.prices.create({
      product: spec.product,
      currency: 'eur',
      unit_amount: spec.unit_amount,
      tax_behavior: 'inclusive',
      ...(spec.recurring ? { recurring: spec.recurring } : {}),
      lookup_key: lookup,
      nickname: `VHR ${spec.key} TTC`,
      metadata: { pricing_revision: '2026-10-25-ttc' }
    }, { idempotencyKey: lookup });
    if (!price.active || price.unit_amount !== spec.unit_amount || price.currency !== 'eur'
      || price.tax_behavior !== 'inclusive' || price.recurring?.interval !== spec.recurring?.interval) {
      throw new Error(`Unexpected Stripe price for ${spec.key}`);
    }
    result.prices[spec.key] = {
      id: price.id, amount: price.unit_amount, tax: price.tax_behavior,
      interval: price.recurring?.interval || 'once'
    };
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
