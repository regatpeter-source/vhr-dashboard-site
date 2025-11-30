#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node scripts/check-apk.js <path-to-apk>');
  process.exit(2);
}

if (process.argv.length < 3) usage();
const apkPath = process.argv[2];
if (!fs.existsSync(apkPath)) {
  console.error('File not found:', apkPath);
  process.exit(3);
}

try {
  const buf = fs.readFileSync(apkPath);
  // Quick check: must start with PK\x03\x04
  if (buf[0] !== 0x50 || buf[1] !== 0x4B || buf[2] !== 0x03 || buf[3] !== 0x04) {
    console.error('Not a ZIP/APK file (missing PK header)');
    process.exit(4);
  }
  // Search for AndroidManifest.xml and classes.dex in the file
  const body = buf.toString('binary');
  const hasManifest = body.indexOf('AndroidManifest.xml') >= 0;
  const hasDex = body.indexOf('classes.dex') >= 0;
  console.log('APK quick check results:', { hasManifest, hasDex });
  if (!hasManifest || !hasDex) {
    console.error('APK appears invalid or incomplete. Please provide a real debug-signed APK.');
    process.exit(5);
  }
  console.log('APK looks like a valid Android package (contains AndroidManifest.xml and classes.dex)');
  process.exit(0);
} catch (e) {
  console.error('Error reading/parsing APK:', e && e.message);
  process.exit(6);
}
