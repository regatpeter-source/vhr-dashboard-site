#!/usr/bin/env node
// fix-encodings.js
// Script de réparation des encodages pour les fichiers HTML/JS contenant des caractères garblés.
const fs = require('fs');
const path = require('path');

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else if (/\.html?$/.test(p) || /\.js$/.test(p) || /\.css$/.test(p)) files.push(p);
  }
};
walk(path.join(__dirname, '..'));

function detectGarbled(content) {
  // Simple heuristics: lots of sequences like '├', 'Ô', 'ÔÇ', '┬', 'Ôé', '├®', etc.
  return /[├Ô┬Â]/.test(content);
}

function isLikelyUtf16LE(buf) {
  if (buf.length < 4) return false;
  // BOM check for UTF-16 LE
  if (buf[0] === 0xFF && buf[1] === 0xFE) return true;
  // Heuristic: many NUL bytes at odd or even positions
  let nulEven = 0, nulOdd = 0, total = Math.min(buf.length, 200);
  for (let i = 0; i < total; i++) {
    if (buf[i] === 0x00) {
      if (i % 2 === 0) nulEven++; else nulOdd++;
    }
  }
  // if over 20 NULs concentrated on every other byte, it's likely UTF-16 LE
  return (nulOdd > 15 && nulEven < 5) || (nulOdd < 5 && nulEven > 15);
}

function tryFix(filePath) {
  const buf = fs.readFileSync(filePath);
  const asUtf8 = buf.toString('utf8');
  if (!detectGarbled(asUtf8) && !isLikelyUtf16LE(buf)) return false;
  // If the file appears to be UTF-16LE, decode accordingly
  if (isLikelyUtf16LE(buf)) {
    const asUtf16 = buf.toString('utf16le');
    if (!detectGarbled(asUtf16)) {
      fs.copyFileSync(filePath, filePath + '.utf16.bak');
      fs.writeFileSync(filePath, asUtf16, 'utf8');
      console.log(`Converted UTF-16LE to UTF-8: ${filePath}`);
      return true;
    }
  }

  // Attempt re-interpretation: treat buffer as latin1 and convert to utf8
  const asLatin1 = buf.toString('latin1');
  const recovered = Buffer.from(asLatin1, 'latin1').toString('utf8');
  if (!detectGarbled(recovered)) {
    // backup and write
    fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, recovered, 'utf8');
    console.log(`Fixed encoding: ${filePath}`);
    return true;
  }

  // Fallback: try to map some common replacements
  let replaced = asUtf8
    .replace(/├®/g, 'é')
    .replace(/├á/g, 'à')
    .replace(/├£/g, 'ç')
    .replace(/├ê/g, 'ê')
    .replace(/├®/g, 'é')
    .replace(/ÔÇ»/g, '»')
    .replace(/ÔÇÖ/g, "'")
    .replace(/Ôé¼/g, '€')
    .replace(/Ô¼å/g, '↑')
    .replace(/┬½/g, '«')
    .replace(/┬╗/g, '»')
    .replace(/┬£/g, '•')
    .replace(/├┤/g, 'ô')
    .replace(/ÔÇÖ/g, "'")
    .replace(/ÔÇ»/g, '»')
    .replace(/┬½/g, '«')
    .replace(/┬╗/g, '»')
    .replace(/\uFFFD/g, '')
    .replace(/├┬/g, 'œ')
    ;
  if (!detectGarbled(replaced)) {
    fs.copyFileSync(filePath, filePath + '.bak2');
    fs.writeFileSync(filePath, replaced, 'utf8');
    console.log(`Replaced common sequences: ${filePath}`);
    return true;
  }
  return false;
}

let fixed = 0;
for (const f of files) {
  try {
    if (tryFix(f)) fixed++;
  } catch (e) {
    console.error('Error processing', f, e.message || e);
  }
}
console.log(`Total fixed: ${fixed}/${files.length}`);

if (fixed === 0) console.log('No changes done; if you still see garbled text, inspect files manually.');

// Exit code
process.exit(0);
