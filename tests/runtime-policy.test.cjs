'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { configureRuntime } = require('../services/runtime-policy');

test('hosted runtime disables ADB and SMTP debug even with stale environment settings', () => {
  for (const settings of [{ RENDER: 'true' }, { VHR_RUNTIME: 'web' }, { NODE_ENV: 'production' }]) {
    const env = { ...settings, NO_ADB: '0', SMTP_DEBUG: '1' };
    const policy = configureRuntime(env, 'linux');
    assert.equal(env.NO_ADB, '1');
    assert.equal(policy.hosted, true);
    assert.equal(policy.setupAndroid, false);
    assert.equal(policy.smtpDebug, false);
  }
});

test('desktop runtime preserves ADB and restricts Android setup to Windows development', () => {
  const env = { NODE_ENV: 'production', LOCAL_APP: '1', NO_ADB: '0' };
  assert.equal(configureRuntime(env, 'win32').hosted, false);
  assert.equal(env.NO_ADB, '0');
  assert.equal(configureRuntime({}, 'win32').setupAndroid, true);
  assert.equal(configureRuntime({}, 'linux').setupAndroid, false);
});
