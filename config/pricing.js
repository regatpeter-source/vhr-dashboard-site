'use strict';

const OFFERS = {
  monthly: { price: 19.90, amount: 1990, interval: 'month', stripePriceId: 'price_1UUYXa7g8FcyfmlJa2P4Criu' },
  annual: { price: 199, amount: 19900, interval: 'year', stripePriceId: 'price_1UUYXb7g8FcyfmlJkYEnHk0h' },
  perpetual: { price: 499, amount: 49900, interval: null, stripePriceId: 'price_1UUYXb7g8FcyfmlJKu60E4Km' }
};

function validatePrice(price, mode) {
  const offer = Object.values(OFFERS).find(item => item.stripePriceId === price.id);
  if (!offer || !price.active || price.currency !== 'eur' || price.unit_amount !== offer.amount
    || price.tax_behavior !== 'inclusive'
    || (price.recurring?.interval || null) !== offer.interval
    || (offer.interval && price.recurring.interval_count !== 1)
    || mode !== (offer.interval ? 'subscription' : 'payment')) {
    throw new Error('Tarif Stripe incompatible avec les offres TTC actuelles. Rechargez la page des tarifs.');
  }
}

function subscriptionEmailData(subscription) {
  const item = subscription?.items?.data?.[0];
  const price = item?.price;
  if (!price || !Number.isInteger(price.unit_amount) || !['month', 'year'].includes(price.recurring?.interval)) {
    throw new Error('Abonnement Stripe sans montant ou période de facturation exploitable');
  }
  return {
    price: ((price.unit_amount * (item.quantity || 1)) / 100).toFixed(2),
    billingPeriod: price.recurring.interval,
    intervalCount: price.recurring.interval_count || 1
  };
}

module.exports = { OFFERS, validatePrice, subscriptionEmailData };
