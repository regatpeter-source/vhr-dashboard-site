#!/usr/bin/env node
/**
 * Simple prod smoke test for Dashboard Pro authentication.
 * Usage:
 *   PROD_USERNAME=alice PROD_PASSWORD=secret node scripts/prod-dashboard-auth-test.js
 * Optional:
 *   PROD_BASE_URL=https://www.vhr-dashboard-site.com
 *   EXPECT_BLOCKED=1            # expect login to be rejected (deleted/demo expired)
 *   EXPECT_CODE=account_deleted # optional specific rejection code to enforce
 */

const fetch = require('node-fetch');

const BASE_URL = (process.env.PROD_BASE_URL || 'https://www.vhr-dashboard-site.com').replace(/\/$/, '');
const USERNAME = process.env.PROD_USERNAME;
const PASSWORD = process.env.PROD_PASSWORD;
const EXPECT_BLOCKED = process.env.EXPECT_BLOCKED === '1' || process.env.EXPECT_DELETED === '1';
const EXPECT_CODE = process.env.EXPECT_CODE || null;

if (!USERNAME || !PASSWORD) {
  console.error('❌ Missing credentials: set PROD_USERNAME and PROD_PASSWORD environment variables.');
  process.exit(1);
}

function logStep(step, message) {
  console.log(`[${step}] ${message}`);
}

async function ping() {
  const url = `${BASE_URL}/api/ping`;
  const res = await fetch(url, { method: 'GET', timeout: 10000 }).catch(err => {
    throw new Error(`Ping failed: ${err.message}`);
  });
  if (!res.ok) {
    throw new Error(`Ping failed: HTTP ${res.status}`);
  }
  const body = await res.json().catch(() => ({}));
  if (body.ok !== true) {
    throw new Error(`Ping responded but ok=${body.ok}`);
  }
  return body;
}

async function login() {
  const url = `${BASE_URL}/api/dashboard/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    timeout: 15000
  }).catch(err => {
    throw new Error(`Login request failed: ${err.message}`);
  });

  let body = {};
  try {
    body = await res.json();
  } catch (e) {
    throw new Error(`Login JSON parse failed (HTTP ${res.status}): ${e.message}`);
  }

  return { res, body };
}

(async () => {
  try {
    logStep('1/3', `Base: ${BASE_URL}`);
    await ping();
    logStep('1/3', 'Ping OK');

    logStep('2/3', `Trying /api/dashboard/login as ${USERNAME}`);
    const { res, body } = await login();

    if (EXPECT_BLOCKED) {
      const code = body && body.code;
      const isExpectedCode = EXPECT_CODE ? code === EXPECT_CODE : (code === 'account_deleted' || code === 'demo_expired');
      if (res.status === 403 && isExpectedCode) {
        logStep('2/3', `Login correctly blocked (code=${code || 'n/a'})`);
      } else {
        console.error('❌ Expected login to be blocked but got:', {
          status: res.status,
          code: body.code,
          error: body.error,
          ok: body.ok
        });
        process.exit(2);
      }
    } else {
      if (res.ok && body && body.ok && body.token) {
        logStep('2/3', 'Login succeeded and token issued');
      } else {
        console.error('❌ Login failed unexpectedly:', {
          status: res.status,
          code: body.code,
          error: body.error,
          ok: body.ok
        });
        process.exit(2);
      }
    }

    logStep('3/3', 'Prod auth smoke test finished ✅');
    process.exit(0);
  } catch (e) {
    console.error('❌ Smoke test error:', e.message || e);
    process.exit(2);
  }
})();
