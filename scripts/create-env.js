#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const example = path.join(process.cwd(), '.env.example');
const dest = path.join(process.cwd(), '.env');

if (!fs.existsSync(example)) {
  console.error('.env.example not found in repository root.');
  process.exit(1);
}

if (fs.existsSync(dest)) {
  console.log('.env already exists; leaving it unchanged.');
  console.log('If you need to re-create it, remove .env and run this script again.');
  process.exit(0);
}

try {
  fs.copyFileSync(example, dest, fs.constants.COPYFILE_EXCL);
  console.log('.env created from .env.example. Edit .env and replace placeholder values with your real keys.');
  console.log('Do NOT commit .env (it is listed in .gitignore).');
  process.exit(0);
} catch (e) {
  console.error('Failed to create .env:', e && e.message);
  process.exit(1);
}
