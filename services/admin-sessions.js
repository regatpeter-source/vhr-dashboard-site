'use strict';

// Revoke administrator sessions issued before the credential exposure response.
const INCIDENT_CUTOFF = Date.parse('2026-10-27T19:46:17Z') / 1000;

function isRevokedAdminSession(decoded, allowlist) {
  const username = String(decoded.username || '').toLowerCase();
  const admin = decoded.role === 'admin' || allowlist.includes(username);
  return admin && (!Number.isFinite(decoded.iat) || decoded.iat < INCIDENT_CUTOFF);
}

module.exports = { isRevokedAdminSession, INCIDENT_CUTOFF };
