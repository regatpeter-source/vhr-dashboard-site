const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const buf = fs.readFileSync(filePath);
    if (!buf || buf.length < 2) return false;

    // UTF-16LE BOM 0xFF 0xFE
    if (buf[0] === 0xFF && buf[1] === 0xFE) {
      const str = buf.toString('utf16le');
      fs.writeFileSync(filePath, Buffer.from(str, 'utf8'));
      console.log(`Converted UTF-16LE -> UTF-8: ${filePath}`);
      return true;
    }
    // UTF-8 BOM 0xEF 0xBB 0xBF
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      // strip BOM
      const sliced = buf.slice(3);
      fs.writeFileSync(filePath, sliced);
      console.log(`Stripped UTF-8 BOM: ${filePath}`);
      return true;
    }
    return false;
  } catch (e) {
    console.error('strip-bom error', filePath, e && e.message);
    return false;
  }
}

function walkAndFix(root) {
  const stat = fs.statSync(root);
  if (stat.isFile()) {
    fixFile(root);
    return;
  }
  const files = fs.readdirSync(root);
  for (const f of files) {
    const fp = path.join(root, f);
    try {
      const st = fs.statSync(fp);
      if (st.isDirectory()) {
        walkAndFix(fp);
      } else if (st.isFile()) {
        // only check .js, .html and top-level files like server.js
        if (fp.endsWith('.js') || fp.endsWith('.html') || path.basename(fp) === 'server.js') {
          fixFile(fp);
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  // Target the files we care about: server.js and the site-vitrine pages
  const targets = ['server.js', 'site-vitrine', 'public/js'];
  for (const t of targets) {
    const p = path.join(process.cwd(), t);
    if (fs.existsSync(p)) walkAndFix(p);
  }
}

module.exports = { fixFile, walkAndFix };
