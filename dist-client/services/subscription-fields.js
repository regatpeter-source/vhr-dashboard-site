'use strict';

function readSubscriptionField(user, camelCase, postgres) {
  return Object.prototype.hasOwnProperty.call(user, camelCase)
    ? user[camelCase]
    : user[postgres] ?? null;
}

function subscriptionUpdate(user) {
  const updates = {};
  for (const [camelCase, postgres] of [
    ['subscriptionId', 'subscriptionid'],
    ['subscriptionStatus', 'subscriptionstatus']
  ]) {
    if (Object.prototype.hasOwnProperty.call(user, camelCase)
      || Object.prototype.hasOwnProperty.call(user, postgres)) {
      updates[postgres] = readSubscriptionField(user, camelCase, postgres);
    }
  }
  return updates;
}

module.exports = { readSubscriptionField, subscriptionUpdate };
