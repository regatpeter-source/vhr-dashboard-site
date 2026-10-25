'use strict';

function configureRuntime(env = process.env, platform = process.platform) {
  const hosted = env.RENDER === 'true' || env.VHR_RUNTIME === 'web' ||
    (env.NODE_ENV === 'production' && env.LOCAL_APP !== '1');
  if (hosted) env.NO_ADB = '1';
  return {
    hosted,
    setupAndroid: !hosted && platform === 'win32' && env.NODE_ENV !== 'production',
    smtpDebug: !hosted && env.SMTP_DEBUG === '1'
  };
}

module.exports = { configureRuntime };
