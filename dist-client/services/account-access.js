'use strict';

function isDisabled(user) {
  const status = String(user?.status || user?.accountStatus || '').toLowerCase();
  return !!user && (user.isDisabled === true || user.isDeleted === true ||
    !!user.disabledAt || !!user.deletedAt || status === 'disabled' || status === 'deleted');
}

function subscriptionGrantsAccess(user, now = Date.now()) {
  const status = String(user?.subscriptionStatus || user?.subscriptionstatus || '').toLowerCase();
  if (!['active', 'trialing'].includes(status)) return false;
  const end = user.subscriptionExpiresAt || user.currentPeriodEnd;
  return !end || (Number.isFinite(new Date(end).getTime()) && new Date(end).getTime() > now);
}

module.exports = { isDisabled, subscriptionGrantsAccess };
