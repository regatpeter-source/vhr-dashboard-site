// ========== IMPORTS & INIT ========== 

require('dotenv').config();
const express = require('express');
const http = require('http');
const { spawn } = require('child_process');
const util = require('util');
const execp = util.promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs');
const { Server: SocketIOServer } = require('socket.io');
const WebSocket = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
// Helmet with custom CSP: allow own scripts and the botpress CDN. Do not enable 'unsafe-inline'.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com'],
      // CSP Level 3: script/style element-specific directives
      scriptSrcElem: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://www.gstatic.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://www.gstatic.com'],
      // Allow loading remote fonts (Google Fonts)
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn-icons-png.flaticon.com', 'https://cdn.botpress.cloud'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://messaging.botpress.cloud', 'https://cdn.botpress.cloud'],
      frameSrc: ["'self'", 'https://messaging.botpress.cloud', 'https://checkout.stripe.com', 'https://js.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
// Set a friendlier referrer policy so third-party services (like Google Translate)
// can load resources if they rely on an origin referrer. This avoids noisy logs
// indicating Referrer Policy 'no-referrer' while keeping a modern default.
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(cors({ origin: true, credentials: true }));
// Ensure webhook route receives raw body for Stripe signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Serve downloads folder (demo APK/ZIP). Force attachment on ZIP/APK to prompt download.
app.use('/downloads', express.static(path.join(__dirname, 'downloads'), {
  setHeaders: (res, filePath) => {
    try {
      if (filePath.endsWith('.zip') || filePath.endsWith('.apk')) {
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      }
    } catch (e) { /* ignore */ }
  }
}));
// Serve style and script root assets from public root as well (so /style.css and /script.js work)
app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'public', 'script.js')));
// Expose site-vitrine directory too for local tests
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine')));

// Health check endpoint for local debugging
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
// Expose site-vitrine and top-level HTML files so they can be accessed via http://localhost:PORT/
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine')));
// Serve top-level HTML files that are not in public
const exposedTopFiles = ['index.html', 'pricing.html', 'features.html', 'contact.html', 'account.html'];
exposedTopFiles.forEach(f => {
  app.get(`/${f}`, (req, res) => res.sendFile(path.join(__dirname, f)));
});

// Serve the index on root so PaaS/load balancers that request '/' get the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Optional catch-all for known client-side routes or health probes that may access non-existent paths
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'site-vitrine', 'favicon.ico')));
// Simple ping route for health checks
app.get('/ping', (req, res) => res.json({ ok: true, message: 'pong' }));

// Ensure HTML responses have charset set to UTF-8 so browsers render accents correctly
app.use((req, res, next) => {
  const accept = (req.headers['accept'] || '').toLowerCase();
  if (req.path.endsWith('.html') || accept.includes('text/html') || req.path === '/') {
    // Only set charset for HTML responses
    try {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } catch (e) { /* ignore */ }
  }
  next();
});

// Middleware to block ADB/streaming endpoints on PaaS or hosts where ADB is disabled
function requireADB(req, res, next) {
  if (process.env.NO_ADB === '1') {
    return res.status(501).json({ ok: false, error: 'ADB disabled on this host via NO_ADB=1' });
  }
  next();
}
// Apply to common ADB & streaming endpoints to make it obvious in logs that the feature is disabled
app.use(['/api/adb', '/api/adb/*', '/api/stream', '/api/stream/*', '/api/apps', '/api/apps/*', '/api/battery', '/api/battery/*'], requireADB);

// --- Stripe Checkout ---
// Trim quotes and whitespace if an operator copy/pasted the key with surrounding quotes
function cleanEnvValue(v) { if (!v) return v; return v.replace(/^['"]|['"]$/g, '').trim(); }
const stripeKeyRaw = process.env.STRIPE_SECRET_KEY || 'sk_test_votre_cle_secrete';
const stripeKey = cleanEnvValue(stripeKeyRaw);
if (!stripeKey || stripeKey === 'sk_test_votre_cle_secrete') {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set or using placeholder. Set STRIPE_SECRET_KEY=sk_test_xxx in your environment.');
} else if (stripeKey.startsWith('pk_')) {
  console.error('[Stripe] STRIPE_SECRET_KEY appears to be a publishable key (pk_). Server-side requires a secret key (sk_test_...). Aborting server start.');
  throw new Error('Stripe secret key required: STRIPE_SECRET_KEY must be an sk_ key.');
}
const stripe = require('stripe')(stripeKey);

// Verify the Stripe secret key early at startup (fail fast on invalid / publishable key)
async function verifyStripeKeyAtStartup() {
  if (!stripeKey || stripeKey === 'sk_test_votre_cle_secrete') {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured; server will still run but Stripe features will fail. Set STRIPE_SECRET_KEY to a valid sk_test_ key.');
    return;
  }
  if (stripeKey.startsWith('pk_')) {
    console.error('[Stripe] Provided STRIPE_SECRET_KEY appears to be a publishable key (pk_). Use a secret key (sk_test_...). Aborting.');
    throw new Error('Invalid STRIPE_SECRET_KEY: publishable key provided. Use a secret key (sk_test_...).');
  }
  try {
    // quick call to confirm key is valid
    await stripe.accounts.retrieve();
    console.log('[Stripe] STRIPE_SECRET_KEY validated (account retrieved).');
  } catch (e) {
    console.error('[Stripe] STRIPE_SECRET_KEY validation failed:', e && e.message);
    throw e;
  }
}

// Print masked key at server start to help debugging misconfigs (dev only when debug flag on)
if (process.env.STRIPE_DEBUG_PRICES === '1') {
  console.log('[Stripe] Stripe debug mode ON. Masked key:', maskKey(stripeKey));
}

// Helper for masked debug printing of secrets in dev
function maskKey(k) {
  if (!k || k.length < 8) return '***';
  const start = k.substring(0, 6);
  const end = k.substring(k.length - 4);
  return `${start}...${end}`;
}

app.post('/create-checkout-session', async (req, res) => {
  const { priceId, mode } = req.body || {};
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
  if (!priceId || !mode) return res.status(400).json({ error: 'priceId et mode sont requis' });
  try {
    console.log('[Stripe] create-checkout-session request:', { priceId, mode, origin });
    // Validate price exists and is compatible with mode
    let priceInfo = null;
    try {
      priceInfo = await stripe.prices.retrieve(priceId);
    } catch (pErr) {
      console.error('[Stripe] price retrieve error:', { priceId, err: pErr && pErr.message, raw: pErr && pErr.raw });
      // Provide helpful guidance if price not found or using wrong key
      const suggestion = 'Ensure the price exists in your Stripe dashboard (Test mode) and that the server is using a valid secret API key (sk_test_...).';
      const msg = (pErr && pErr.code === 'resource_missing') || (pErr && pErr.statusCode === 404)
        ? `Price not found: ${priceId}. ${suggestion}`
        : `Price retrieval failed: ${pErr && pErr.message}. ${suggestion}`;
      return res.status(400).json({ error: msg });
    }
    if (mode === 'payment' && priceInfo.type !== 'one_time') {
      return res.status(400).json({ error: `Price type mismatch: expected a one_time price for mode=payment (got: ${priceInfo.type})` });
    }
    if (mode === 'subscription' && priceInfo.type !== 'recurring') {
      return res.status(400).json({ error: `Price type mismatch: expected a recurring price for mode=subscription (got: ${priceInfo.type})` });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode, // 'subscription' ou 'payment'
      success_url: `${origin}/pricing.html?success=1`,
      cancel_url: `${origin}/pricing.html?canceled=1`,
    });
    console.log('[Stripe] session created:', { id: session.id, url: session.url });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error:', err);
    if (err && err.type === 'StripePermissionError') {
      return res.status(403).json({ error: err.raw && err.raw.message ? err.raw.message : 'Permission error with Stripe API key' });
    }
    if (err && err.raw && err.raw && err.raw.code) {
      return res.status(400).json({ error: err.raw.message || err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- Utilisateurs (simple persistence JSON: replace with a proper DB in production) ---
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function ensureDataDir() {
  try { fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true }); } catch (e) { }
}

function saveUsers() {
  try {
    ensureDataDir();
    // Sanitize users array to avoid circular references and functions in objects
    const toSave = users.map(u => ({
      username: u.username,
      passwordHash: u.passwordHash || null,
      role: u.role || null,
      email: u.email || null,
      stripeCustomerId: u.stripeCustomerId || null,
      latestInvoiceId: u.latestInvoiceId || null,
      lastInvoicePaidAt: u.lastInvoicePaidAt || null,
      subscriptionStatus: u.subscriptionStatus || null,
      subscriptionId: u.subscriptionId || null
    }));
    fs.writeFileSync(USERS_FILE, JSON.stringify(toSave, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[users] save error', e && e.message);
    return false;
  }
}

function loadUsers() {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      let raw = fs.readFileSync(USERS_FILE, 'utf8');
      // Remove BOM if present
      raw = raw.replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) return parsed;
      // If file contains a single user object, wrap it in array
      if (parsed && typeof parsed === 'object') return [parsed];
      return [];
    }
  } catch (e) {
    console.error('[users] load error', e && e.message);
  }
  // Default fallback: admin user
  return [{ username: 'vhr', passwordHash: '$2b$10$Axa5JBDt22Wc2nZtTqeMBeVjyDYEl0tMyu0NDdUYiTcocI2bvqK46', role: 'admin', email: 'admin@example.local', stripeCustomerId: null }];
}

let users = loadUsers();

// --- DB wrapper helpers (use SQLite adapter when enabled) ---
let dbEnabled = false;
try {
  const dbFile = process.env.DB_SQLITE_FILE || path.join(__dirname, 'data', 'vhr.db');
  dbEnabled = require('./db').initSqlite(dbFile);
  if (dbEnabled) {
    console.log('[db] SQLite adapter initialized, migrating JSON users into DB');
    const db = require('./db');
    // migrate existing in-memory users into DB
    users.forEach(u => db.addOrUpdateUser(u));
    // reload into memory simplified list for reads
    users = db.getAllUsers();
  }
} catch (e) {
  console.error('[db] init error:', e && e.message);
}

function getUserByUsername(username) {
  if (dbEnabled) {
    const u = require('./db').findUserByUsername(username);
    return u || null;
  }
  return users.find(u => u.username === username);
}

function getUserByStripeCustomerId(customerId) {
  if (dbEnabled) return require('./db').findUserByStripeCustomerId(customerId);
  return users.find(u => u.stripeCustomerId === customerId);
}

function persistUser(user) {
  if (dbEnabled) {
    require('./db').addOrUpdateUser(user);
    // keep in-memory list sync
    users = require('./db').getAllUsers();
    return true;
  } else {
    console.log('[users] persistUser: begin', user && user.username);
    const idx = users.findIndex(u => u.username === user.username);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    try {
      console.log('[users] persistUser: saving users file (json fallback)');
      saveUsers();
      console.log('[users] persistUser: saved users file');
    } catch (e) {
      console.error('[users] saveUsers failed:', e && e.stack || e && e.message || e);
      throw e;
    }
    console.log('[users] persistUser: end');
    return true;
  }
}

function removeUserByUsername(username) {
  if (dbEnabled) {
      const user = getUserByUsername(username);
    users = require('./db').getAllUsers();
  } else {
    const idx = users.findIndex(u => u.username === username);
    if (idx >= 0) users.splice(idx, 1);
    saveUsers();
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = '2h';

// --- Middleware de v├®rification du token ---
function authMiddleware(req, res, next) {
  // Accept token from Authorization header (Bearer) OR cookie 'vhr_token'
  let token = null;
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1]) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.vhr_token) {
    token = req.cookies.vhr_token;
  }
  if (!token) return res.status(401).json({ ok: false, error: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Token invalide' });
  }
}

// --- Route de login ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ ok: false, error: 'Utilisateur inconnu' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  // Set cookie for better protection in browsers (httpOnly)
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000 // 2h
  };
  res.cookie('vhr_token', token, cookieOptions);
  res.json({ ok: true, token, username: user.username, role: user.role, email: user.email || null });
});

// --- Route de logout (optionnelle, c├┤t├® client il suffit de supprimer le token) ---
app.post('/api/logout', (req, res) => {
  res.clearCookie('vhr_token');
  res.json({ ok: true });
});

// Return authenticated user info (uses auth middleware)
app.get('/api/me', authMiddleware, (req, res) => {
  const user = { username: req.user.username, role: req.user.role };
  res.json({ ok: true, user });
});

// Update current user profile (username/email/password)
app.patch('/api/me', authMiddleware, async (req, res) => {
  const { username, email, oldPassword, newPassword } = req.body || {};
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (username && username !== user.username) {
      // ensure unique
        if (getUserByUsername(username)) return res.status(400).json({ ok: false, error: 'Nom d\'utilisateur déjà utilisé' });
      user.username = username;
    }
    if (email) user.email = email;
    if (newPassword) {
      if (!oldPassword) return res.status(400).json({ ok: false, error: 'Ancien mot de passe requis' });
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ ok: false, error: 'Ancien mot de passe incorrect' });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    // Persist changes via DB adapter or JSON
    try { console.log('[users] about to persist user', user && user.username); persistUser(user); console.log('[users] persist successful'); } catch (e) { console.error('[users] persist error', e && (e.stack || e.message)); }
    // If username changed, reissue JWT and cookie
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('vhr_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 });
    res.json({ ok: true, token, user: { username: user.username, role: user.role, email: user.email || null } });
  } catch (e) {
    console.error('[api] me patch:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Delete self account (development/demo only)
app.delete('/api/users/self', authMiddleware, (req, res) => {
  try {
    const u = getUserByUsername(req.user.username);
    if (!u) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    removeUserByUsername(req.user.username);
    res.clearCookie('vhr_token');
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] delete self:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Note: devices should be visible to unauthenticated clients (dashboard UI)
// Keep a single public route providing devices: the public route is defined further below.

// --- Exemple de route admin only ---
app.get('/api/admin', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  res.json({ ok: true, message: 'Bienvenue admin !' });
});

// ========== SCRCPY GUI LAUNCH ========== 
app.post('/api/scrcpy-gui', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial requis' });
  try {
    // Lancer scrcpy en mode GUI natif (pas de redirection stdout)
    // Taille de fenêtre réduite (ex: 640x360)
    const proc = spawn('scrcpy', ['-s', serial, '--window-width', '640', '--window-height', '360'], {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    return res.json({ ok: true });
  } catch (e) {
    console.error('[api] scrcpy-gui:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});
// Run an adb command for a given serial, return { stdout, stderr }
const runAdbCommand = (serial, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('adb', ['-s', serial, ...args])
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })
    proc.on('close', code => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr || `adb exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}
// ---------- Helpers ----------
// Parse 'adb devices -l' output into [{ serial, model, status }]
const parseAdbDevices = stdout => {
  console.log('[DEBUG] Sortie brute adb devices -l:\n' + stdout)
  return stdout.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('List of devices'))
    .map(l => {
      const [serial, status, ...rest] = l.split(/\s+/)
      let model = ''
      for (const part of rest) {
        if (part.startsWith('model:')) model = part.replace('model:', '')
      }
      return { serial, status, model }
    })
    .filter(d => d.serial && d.status)
}

// Poll ADB, update devices array, emit update event
const refreshDevices = async () => {
  try {
    const { exec } = require('child_process')
    exec('adb devices -l', (err, stdout, stderr) => {
      if (err) {
        console.error('ÔØî Failed to list ADB devices:', err)
        return
      }
      const list = parseAdbDevices(stdout)
      // nameMap: { serial: customName }
      const fs = require('fs')
      const nameMap = fs.existsSync('names.json')
        ? JSON.parse(fs.readFileSync('names.json', 'utf8'))
        : {}
      devices = list.map(dev => ({
        serial: dev.serial,
        name: nameMap[dev.serial] || dev.serial,
        status: dev.status,
        model: dev.model
      }))
      console.log('[DEBUG] Emission devices-update:', devices)
      io.emit('devices-update', devices)
    })
  } catch (e) {
    console.error('ÔØî Error in refreshDevices:', e)
  }
}





// ---------- Persistence ----------
const NAMES_FILE = path.join(__dirname, 'names.json');
const GAMES_FILE = path.join(__dirname, 'games.json');
const FAVORITES_FILE = path.join(__dirname, 'favorites.json');
let nameMap = {};
let gamesList = [];
let favoritesList = [];

try {
  if (fs.existsSync(NAMES_FILE)) nameMap = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8') || '{}');
  else fs.writeFileSync(NAMES_FILE, JSON.stringify({}, null, 2));
  if (fs.existsSync(GAMES_FILE)) gamesList = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8') || '[]');
  else fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2));
  if (fs.existsSync(FAVORITES_FILE)) favoritesList = JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8') || '[]');
  else fs.writeFileSync(FAVORITES_FILE, JSON.stringify([], null, 2));
} catch (e) {
  console.error('[server] load files error:', e);
  nameMap = {};
  gamesList = [];
  favoritesList = [];
}

// ---------- HTTP + Socket.IO ----------
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

// ---------- State ----------

let devices = [];
let streams = new Map();

const wssMpeg1 = new WebSocket.Server({ noServer: true });

function startAdbTrack() {
  let debounceTimer = null;
  
  try {
    const track = spawn('adb', ['track-devices']);
    track.stdout.setEncoding('utf8');
    let buffer = '';
    track.stdout.on('data', data => {
      buffer += data;
      if (buffer.includes('\n')) {
        buffer = '';
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refreshDevices, 500);
      }
    });
    track.on('error', () => setInterval(refreshDevices, 2000));
    track.on('exit', () => setInterval(refreshDevices, 2000));
  } catch (e) {
    setInterval(refreshDevices, 2000);
  }
}

// ---------- Streaming Helpers ----------
function broadcastToSerial(serial, chunk) {
  const ent = streams.get(serial);
  if (!ent || !ent.clients) return;
  for (const ws of ent.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(chunk); } catch (e) { }
    }
  }
}

// ---------- ADB screenrecord ÔåÆ FFmpeg player (plus stable que scrcpy) ----------
async function startStream(serial, opts = {}) {
  // ...existing code...
    function cleanup() {
      try { if (entry.adbProc && entry.adbProc.pid) spawn('taskkill', ['/F', '/T', '/PID', entry.adbProc.pid.toString()]) } catch {}
      try { if (entry.ffplayProc && entry.ffplayProc.pid) spawn('taskkill', ['/F', '/T', '/PID', entry.ffplayProc.pid.toString()]) } catch {}
      for (const ws of entry.clients || []) { try { ws.close() } catch {} }
      streams.delete(serial)
    }
  if (streams.has(serial) && streams.get(serial).adbProc) {
    throw new Error('already streaming');
  }

  // Profils stables : r├®solution et bitrate
  let size = '854x480', bitrate = '2M';
  if (opts.profile === 'ultra-low') {
    size = '426x240'; bitrate = '800K';
  } else if (opts.profile === 'low') {
    size = '480x270'; bitrate = '1M';
  } else if (opts.profile === 'wifi') {
    size = '640x360'; bitrate = '1.5M';
  } else if (opts.profile === 'default') {
    size = '854x480'; bitrate = '2M';
  } else if (opts.profile === 'high') {
    size = '1280x720'; bitrate = '3M';
  } else if (opts.profile === 'ultra') {
    size = '1920x1080'; bitrate = '5M';
  }

  const bitrateNum = bitrate.replace(/[KM]/g, m => m === 'K' ? '000' : '000000');
  console.log(`[server] ­ƒÄ¼ ADB screenrecord stream: ${serial}`);
  console.log(`[server] ­ƒô║ ${size} @ ${bitrate}`);
  
  // Calculer la position de la fenêtre (empilement vertical)
  const streamCount = Array.from(streams.values()).filter(s => s.ffplayProc).length;
  const windowWidth = 640;
  const windowHeight = 360;
  const windowX = 0;
  const windowY = streamCount * windowHeight;

  // Récupérer le nom personnalisé du device
  const deviceName = nameMap[serial] || serial;
  const windowTitle = `Quest 2 - ${deviceName}`;

  console.log(`[server] ­ƒôØ Window: ${windowTitle} at (${windowX},${windowY})`);

  // Ô£à ADB screenrecord en continu (streaming direct vers stdout)
  const adbArgs = [
    '-s', serial,
    'exec-out',
    'screenrecord',
    '--output-format=h264',
    `--bit-rate=${bitrateNum}`,
    `--size=${size}`,
    '-'
  ];
  

  const adbProc = spawn('adb', adbArgs);

  const entry = streams.get(serial) || { clients: new Set(), mpeg1Clients: new Set() };
  entry.adbProc = adbProc;
  entry.shouldRun = true;
  entry.autoReconnect = Boolean(opts.autoReconnect);
  streams.set(serial, entry);

  // ---------- Pipeline JSMpeg (MPEG1) ultra-low-latency ----------
  // ffmpeg: H264 (adb) -> MPEG1-TS (JSMpeg) avec tous les flags de faible latence
  const ffmpegArgs = [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-probesize', '32',
    '-analyzeduration', '0',
    '-flush_packets', '1',
    '-i', 'pipe:0',
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-b:v', '2000k',
    '-vf', 'fps=25,scale=640:368',
    '-pix_fmt', 'yuv420p',
    '-bf', '0',
    '-muxdelay', '0.001',
    'pipe:1'
  ];

  const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
  entry.ffmpegProc = ffmpegProc;
  ffmpegProc.stderr && ffmpegProc.stderr.on('data', d => {
    console.error('[ffmpeg stderr]', d.toString());
  });
  adbProc.stdout.pipe(ffmpegProc.stdin);
  ffmpegProc.stdin.on('error', err => {
    if (err.code !== 'EPIPE') console.error('[ffmpeg stdin]', err)
    // EPIPE = fermeture normale, on ignore
  });

  // Gestion des viewers JSMpeg (MPEG1)
  ffmpegProc.stdout.on('data', chunk => {
    for (const ws of entry.mpeg1Clients || []) {
      if (ws.readyState === 1) {
        try { ws.send(chunk) } catch {}
      }
    }
  });

  adbProc.on('exit', code => {
    console.log(`[adb] EXIT code=${code}`);
    const ent = streams.get(serial);
    if (!ent) return cleanup();
    const stillHasViewers = (ent.clients && ent.clients.size > 0) || (ent.mpeg1Clients && ent.mpeg1Clients.size > 0);
    if (ent.shouldRun && ent.autoReconnect && stillHasViewers) {
      console.log(`[server] ­ƒöä Auto-restart in 3s...`);
      cleanup();
      setTimeout(() => {
        startStream(serial, opts).catch(err => {
          console.error('[server] auto-restart failed:', err.message);
        });
      }, 3000);
    } else {
      cleanup();
    }
  });

  ffmpegProc.on('exit', code => {
    console.log(`[ffmpeg] EXIT code=${code}`);
    cleanup();
  });

  io.emit('stream-event', { type: 'start', serial, config: { maxSize, bitrate } });
  return true;
}

function stopStream(serial) {
  const entry = streams.get(serial);
  if (!entry) return false;

  entry.shouldRun = false;
  
  if (entry.checkInterval) clearInterval(entry.checkInterval);
  
  // Forcer l'arrêt des processus avec taskkill (Windows)
  try { 
    if (entry.adbProc && entry.adbProc.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', entry.adbProc.pid.toString()]);
    }
  } catch {}
  
  try { 
    if (entry.ffplayProc && entry.ffplayProc.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', entry.ffplayProc.pid.toString()]);
    }
  } catch {}

  for (const ws of entry.clients) {
    try { ws.close(); } catch {}
  }

  try { 
    if (entry.mkvFile && fs.existsSync(entry.mkvFile)) {
      fs.unlinkSync(entry.mkvFile);
    }
  } catch {}

  streams.delete(serial);
  io.emit('stream-event', { type: 'stop', serial });
  refreshDevices().catch(() => {});
  console.log(`[server] ÔØî Stream stopped: ${serial}`);
  return true;
}

// ---------- WebSocket ----------
// ...existing code...

// ---------- API Endpoints ----------
app.get('/api/devices', (req, res) => res.json({ ok: true, devices }));

// Diagnostic endpoint for health checks and deploy status
app.get('/_status', async (req, res) => {
  try {
    const addr = server.address() || {};
    let shortCommit = null;
    try { const { stdout } = await execp('git rev-parse --short HEAD'); shortCommit = stdout.trim(); } catch (e) { /* ignore if not available */ }
    res.json({ ok: true, bind: { address: addr.address, port: addr.port }, env: { NODE_ENV: process.env.NODE_ENV || null, HOST: process.env.HOST || null, PORT: process.env.PORT || null }, commit: shortCommit });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

app.post('/api/stream/start', async (req, res) => {
  const { serial, profile, cropLeftEye } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });

  let finalProfile = profile;
  if (!finalProfile || finalProfile === 'default') {
    const isWifi = serial.includes(':') || serial.includes('.');
    finalProfile = isWifi ? 'wifi' : 'high';
    console.log(`[API] ­ƒöì Auto-detected profile: ${finalProfile} for ${serial}`);
  }

  try {
    await startStream(serial, { 
      profile: finalProfile, 
      autoReconnect: true,
      cropLeftEye: false  // Désactiver le crop par défaut
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] stream/start:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/stream/stop', (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });

  const ok = stopStream(serial);
  res.json({ ok });
});

app.get('/api/apps/:serial', async (req, res) => {
  const serial = req.params.serial;
  try {
    const out = await runAdbCommand(serial, ['shell', 'pm', 'list', 'packages', '-3']);
    const apps = (out.stdout || '').split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^package:/, ''));
    res.json({ ok: true, apps });
  } catch (e) {
    console.error('[api] apps:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/apps/:serial/launch', async (req, res) => {
  const serial = req.params.serial;
  const pkg = req.body?.package;
  if (!serial || !pkg) {
    return res.status(400).json({ ok: false, error: 'serial and package required' });
  }

  try {
    // Réveiller le casque
    await runAdbCommand(serial, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
    await new Promise(r => setTimeout(r, 500));
    
    console.log(`[launch] ­ƒÄ« Tentative de lancement: ${pkg}`);
    
    // Étape 1: Découvrir l'activité principale
    const dumpsysResult = await runAdbCommand(serial, [
      'shell', 'dumpsys', 'package', pkg
    ]);
    
    // Chercher l'activité avec android.intent.action.MAIN
    const activityMatch = dumpsysResult.stdout.match(new RegExp(`${pkg.replace(/\./g, '\\.')}/(\\S+)\\s+filter`, 'm'));
    const mainActivity = activityMatch ? activityMatch[1] : null;
    
    if (mainActivity) {
      // Lancer avec le composant complet
      console.log(`[launch] Activité trouvée: ${mainActivity}`);
      const launchResult = await runAdbCommand(serial, [
        'shell', 'am', 'start', '-n', `${pkg}/${mainActivity}`
      ]);
      
      const success = launchResult.code === 0 || 
                      launchResult.stdout.includes('Starting') || 
                      launchResult.stdout.includes('Activity');
      
      if (success) {
        console.log(`[launch] ${pkg} lancé`);
        try { io.emit('app-launch', { serial, package: pkg, method: 'am_start', success: true, startedAt: Date.now() }); } catch (e) {}
        res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
        return;
      }
    }
    
    // Fallback: M├®thode monkey
    console.log(`[launch] ­ƒöä Fallback monkey...`);
    const monkeyResult = await runAdbCommand(serial, [
      'shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'
    ]);
    
    if (monkeyResult.code === 0 || monkeyResult.stdout.includes('Events injected')) {
      console.log(`[launch] ${pkg} lancé via monkey`);
      try { io.emit('app-launch', { serial, package: pkg, method: 'monkey', success: true, startedAt: Date.now() }); } catch (e) {}
      res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
      return;
    }
    
    // Dernier recours: am start avec package seul
    const amResult = await runAdbCommand(serial, [
      'shell', 'am', 'start', pkg
    ]);
    
    const success = amResult.code === 0 || 
                    amResult.stdout.includes('Starting') || 
                    amResult.stdout.includes('Activity');
    
    if (success) {
      console.log(`[launch] ${pkg} lancé via am start`);
      try { io.emit('app-launch', { serial, package: pkg, method: 'am_start_fallback', success: true, startedAt: Date.now() }); } catch (e) {}
      res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
    } else {
      console.log(`[launch] ÔÜá´©Å ${pkg} - ├ëchec:\n${amResult.stdout}\n${amResult.stderr}`);
      try { io.emit('app-launch', { serial, package: pkg, success: false, error: (amResult.stderr || 'Unknown') }); } catch(e) {}
      res.json({ ok: false, msg: '├ëchec du lancement', details: amResult.stderr });
    }
  } catch (e) {
    console.error('[api] launch:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/devices/rename', (req, res) => {
  const { serial, name } = req.body || {};
  if (!serial || !name) {
    return res.status(400).json({ ok: false, error: 'serial and name required' });
  }

  nameMap[serial] = name;
  try {
    fs.writeFileSync(NAMES_FILE, JSON.stringify(nameMap, null, 2), 'utf8');
    refreshDevices().catch(() => { });
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] rename:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/adb/wifi-connect', async (req, res) => {
  const { serial, ip } = req.body || {};
  if (!serial) {
    return res.status(400).json({ ok: false, error: 'serial required' });
  }

  try {
    let targetIp = ip;

    // If no IP provided, try to auto-detect via adb
    if (!targetIp) {
      try {
        // Try ip route: e.g. "default via 192.168.1.1 dev wlan0  proto dhcp  src 192.168.1.42"
        const routeOut = await runAdbCommand(serial, ['shell', 'ip', 'route']);
        const routeStdout = routeOut.stdout || '';
        const match = routeStdout.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1]) targetIp = match[1];
      } catch (e) {
        // ignore and try next
      }
    }

    if (!targetIp) {
      try {
        // Try ip addr show wlan0 -> inet 192.168.x.y/24
        const addrOut = await runAdbCommand(serial, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0']);
        const addrStdout = addrOut.stdout || '';
        const match2 = addrStdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\//);
        if (match2 && match2[1]) targetIp = match2[1];
      } catch (e) {
        // ignore
      }
    }

    if (!targetIp) {
      // Fallback: try dumpsys ip route or other methods
      try {
        const routeOut2 = await runAdbCommand(serial, ['shell', 'ip', 'route']);
        const stdout2 = routeOut2.stdout || '';
        const match3 = stdout2.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match3 && match3[1]) targetIp = match3[1];
      } catch (e) {
        // ignore
      }
    }

    if (!targetIp) {
      // If we still don't have an ip, return error to caller to enter IP manually
      return res.status(400).json({ ok: false, error: 'Unable to detect device IP automatically. Please enter IP manually.' });
    }

    // Enable TCP on 5555 and connect
    await runAdbCommand(serial, ['shell', 'setprop', 'persist.adb.tcp.port', '5555']);
    await runAdbCommand(serial, ['tcpip', '5555']);
    const r = await runAdbCommand(null, ['connect', targetIp]);
    const ok = r.stdout && /connected|already connected/i.test(r.stdout);
    refreshDevices().catch(() => { });
    res.json({ ok, ip: targetIp, msg: r.stdout || r.stderr || 'done' });
  } catch (e) {
    console.error('[api] wifi-connect:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/games', (req, res) => {
  res.json({ ok: true, games: gamesList });
});

app.post('/api/games/add', (req, res) => {
  const { name, packageId, icon } = req.body || {};
  if (!name || !packageId) {
    return res.status(400).json({ ok: false, error: 'name and packageId required' });
  }

  const game = {
    id: Date.now(),
    name,
    packageId,
    icon: icon || null,
    addedAt: new Date().toISOString()
  };
  gamesList.push(game);

  try {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesList, null, 2), 'utf8');
    io.emit('games-update', gamesList);
    res.json({ ok: true, game });
  } catch (e) {
    console.error('[api] games/add:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/games/remove', (req, res) => {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  gamesList = gamesList.filter(g => g.id !== id);

  try {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesList, null, 2), 'utf8');
    io.emit('games-update', gamesList);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] games/remove:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/favorites', (req, res) => {
  res.json({ ok: true, favorites: favoritesList });
});

app.post('/api/favorites/add', (req, res) => {
  const { name, packageId, icon } = req.body || {};
  if (!name || !packageId) {
    return res.status(400).json({ ok: false, error: 'name and packageId required' });
  }

  if (favoritesList.find(f => f.packageId === packageId)) {
    return res.json({ ok: true, msg: 'already exists' });
  }

  const favorite = {
    id: Date.now(),
    name,
    packageId,
    icon: icon || null,
    addedAt: new Date().toISOString()
  };
  favoritesList.push(favorite);

  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favoritesList, null, 2), 'utf8');
    io.emit('favorites-update', favoritesList);
    res.json({ ok: true, favorite });
  } catch (e) {
    console.error('[api] favorites/add:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/favorites/remove', (req, res) => {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  favoritesList = favoritesList.filter(f => f.id !== id);

  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favoritesList, null, 2), 'utf8');
    io.emit('favorites-update', favoritesList);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] favorites/remove:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Battery level
app.get('/api/battery/:serial', async (req, res) => {
  const serial = req.params.serial;
  try {
    const out = await runAdbCommand(serial, ['shell', 'dumpsys', 'battery']);
    const match = out.stdout.match(/level:\s*(\d+)/);
    const level = match ? parseInt(match[1]) : null;
    res.json({ ok: true, level });
  } catch (e) {
    console.error('[api] battery:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Generic ADB command
app.post('/api/adb/command', async (req, res) => {
  const { serial, command } = req.body || {};
  if (!serial || !command) {
    return res.status(400).json({ ok: false, error: 'serial and command required' });
  }

  try {
    const args = Array.isArray(command) ? command : [command];
    const result = await runAdbCommand(serial, args);
    res.json({ ok: result.code === 0, stdout: result.stdout, stderr: result.stderr });
  } catch (e) {
    console.error('[api] adb/command:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---------- Socket.IO ----------
io.on('connection', socket => {
  console.log('[Socket.IO] ­ƒöî Client connected');
  socket.emit('devices-update', devices);
  socket.emit('games-update', gamesList);
  socket.emit('favorites-update', favoritesList);
  socket.on('disconnect', () => {
    console.log('[Socket.IO] ­ƒöî Client disconnected');
  });
});

// ---------- Init ----------
// Run Stripe validation at startup; in dev mode (NO_ADB=1) it will only warn and continue,
// but in production we abort if the provided key is invalid (to avoid silent failures).
(async function globalInit() {
  try {
    await verifyStripeKeyAtStartup();
  } catch (e) {
    if (process.env.NO_ADB === '1') {
      console.warn('[server] Stripe key validation failed, continuing in NO_ADB=1 (dev) mode. Fix STRIPE_SECRET_KEY for production.');
    } else {
      console.error('[server] Stripe verification failed, aborting startup.');
      process.exit(1);
      return;
    }
  }
  // Init ADB tracking only when not skipping ADB
  if (process.env.NO_ADB !== '1') {
    (async function initServer() {
      try {
        refreshDevices();
        startAdbTrack();
      } catch (e) { console.error('[server] ADB init failed', e && e.message); }
    })();
  } else {
    console.warn('[server] NO_ADB=1 set: skipping ADB device tracking & streaming features (good for dev/test).');
  }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n­ƒÜÇ VHR DASHBOARD - Optimis├® Anti-Scintillement`);
  console.log(`­ƒôí Server: http://localhost:${PORT}`);
  console.log(`\n­ƒôè Profils disponibles (ADB screenrecord - stable):`);
  console.log(`   ÔÇó ultra-low: 320p, 600K (WiFi faible)`);
  console.log(`   ÔÇó low:       480p, 1.5M`);
  console.log(`   ÔÇó wifi:      640p, 2M (WiFi optimis├®)`);
  console.log(`   ÔÇó default:   720p, 3M`);
  console.log(`   ÔÇó high:      1280p, 8M (USB)`);
  console.log(`   ÔÇó ultra:     1920p, 12M (USB uniquement)`);
  console.log(`   Ô£à Pas de scintillement avec ADB natif`);
  console.log(`\n­ƒæü´©Å  Crop ┼ôil gauche activ├® par d├®faut\n`);
});

// Handler de fermeture propre
process.on('SIGINT', () => {
  console.log('\n­ƒøæ Arr├¬t du serveur...');
  
  // Tuer tous les streams actifs
  for (const [serial, stream] of streams) {
    try {
      if (stream.adbProc) {
        console.log(`­ƒº╣ Arr├¬t adb: ${serial}`);
        spawn('taskkill', ['/F', '/T', '/PID', String(stream.adbProc.pid)]);
      }
      if (stream.ffplayProc) {
        console.log(`­ƒº╣ Arr├¬t ffplay: ${serial}`);
        spawn('taskkill', ['/F', '/T', '/PID', String(stream.ffplayProc.pid)]);
      }
    } catch (e) {}
  }
  
  // Tuer tous les processus restants
  setTimeout(() => {
    spawn('taskkill', ['/F', '/IM', 'adb.exe', '/T']);
    spawn('taskkill', ['/F', '/IM', 'ffplay.exe']);
    process.exit(0);
  }, 500);
});

process.on('SIGTERM', () => {
  spawn('taskkill', ['/F', '/IM', 'adb.exe', '/T']);
  spawn('taskkill', ['/F', '/IM', 'ffplay.exe']);
  process.exit(0);
});

// Removed /stripe-prices debug route to avoid exposing price IDs. Use /stripe-check for key validation (local-only).

// Local-only debug endpoint to verify Stripe key works without creating sessions (enabled only with STRIPE_DEBUG_PRICES=1)
app.get('/stripe-check', async (req, res) => {
  const isDebug = process.env.STRIPE_DEBUG_PRICES === '1';
  const isLocal = req.hostname === 'localhost' || req.ip === '::1' || req.ip === '127.0.0.1' || (req.headers.host && req.headers.host.startsWith('localhost'));
  if (!isDebug || !isLocal || process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'Not allowed' });
  try {
    const acc = await stripe.accounts.retrieve();
    res.json({ ok: true, account: { id: acc.id, email: acc.email, name: acc.settings && acc.settings.dashboard && acc.settings.dashboard.display_name } });
  } catch (err) {
    console.error('[Stripe] /stripe-check error:', err && err.message);
    res.status(500).json({ ok: false, error: 'Stripe key validation failed: ' + (err && err.message) });
  }
});

// ---------- Stripe Customer helpers ----------
async function ensureStripeCustomerForUser(user) {
  if (!stripe) throw new Error('Stripe not configured');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  // Create a new Stripe customer for this user
  try {
    const cust = await stripe.customers.create({ name: user.username || undefined, email: user.email || undefined, metadata: { username: user.username } });
    user.stripeCustomerId = cust.id;
    // Persist Stripe customer ID via DB adapter if present
    try { persistUser(user); } catch (e) { console.error('[users] save after stripe create failed:', e && e.message); }
    return cust.id;
  } catch (e) {
    console.error('[Stripe] create customer error', e && e.message);
    throw e;
  }
}

// Create a Portal session for the current user
app.post('/api/billing/portal', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    const customerId = await ensureStripeCustomerForUser(user);
    const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/account.html` });
    res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[Stripe] billing portal error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// List invoices for current authenticated user
app.get('/api/billing/invoices', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (!user.stripeCustomerId) return res.json({ ok: true, invoices: [] });
    const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 30 });
    res.json({ ok: true, invoices: invoices.data });
  } catch (e) {
    console.error('[Stripe] invoices error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// List subscriptions for current authenticated user
app.get('/api/billing/subscriptions', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (!user.stripeCustomerId) return res.json({ ok: true, subscriptions: [] });
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 30 });
    res.json({ ok: true, subscriptions: subs.data });
  } catch (e) {
    console.error('[Stripe] subscriptions error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stripe webhook endpoint: persist invoice and subscription events to user record
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_DEV || null;
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (stripeWebhookSecret) {
      // constructEvent expects raw body as string or Buffer
      if (Buffer.isBuffer(req.body)) event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
      else event = stripe.webhooks.constructEvent(JSON.stringify(req.body), sig, stripeWebhookSecret);
    } else {
      // If no webhook secret set (dev), prefer already-parsed body or parse raw string
      if (Buffer.isBuffer(req.body)) event = JSON.parse(req.body.toString());
      else event = req.body;
    }
  } catch (e) {
    console.error('[Stripe] webhook failed to parse/verify:', e && e.message);
    return res.status(400).send(`Webhook error: ${e && e.message}`);
  }

  // Handle a subset of events and persist changes per user
  try {
    const obj = event.data && event.data.object ? event.data.object : null;
    const type = event.type;
    if (!obj) return res.json({ received: true });
    const customerId = obj.customer || (obj.customer_id) || null;
    if (!customerId) return res.json({ received: true });
    const user = getUserByStripeCustomerId(customerId);
    if (!user) return res.json({ received: true });

    if (type === 'invoice.paid') {
      user.latestInvoiceId = obj.id;
      user.lastInvoicePaidAt = obj.status_transitions && obj.status_transitions.paid_at ? new Date(obj.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString();
    } else if (type === 'invoice.payment_failed') {
      user.lastInvoiceFailedId = obj.id;
      user.lastInvoiceFailedAt = new Date().toISOString();
    } else if (type.startsWith('customer.subscription')) {
      user.subscriptionStatus = obj.status || obj?.plan?.status || obj?.status || 'unknown';
      user.subscriptionId = obj.id;
    } else if (type === 'checkout.session.completed') {
      // session completed often delivers: session.customer
      if (obj.customer) user.stripeCustomerId = obj.customer;
    }

    saveUsers();
  } catch (e) {
    console.error('[Stripe webhook] error handling event', e && e.message);
  }

  res.json({ received: true });
});

// --- Route de register / cr├®ation de compte ---
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });
  try {
    // unique username
    if (getUserByUsername(username)) return res.status(400).json({ ok: false, error: 'Nom d\'utilisateur d├®j├á utilis├®' });
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { username, passwordHash, role: 'user', email: email || null, stripeCustomerId: null };
    // persist
    persistUser(newUser);
    // create token and set cookie
    const token = jwt.sign({ username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 };
    res.cookie('vhr_token', token, cookieOptions);
    res.json({ ok: true, token, username: newUser.username, role: newUser.role, email: newUser.email });
  } catch (e) {
    console.error('[api] register:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Public config route: returns only non-sensitive public config values for client-side use
app.get('/public-config', (req, res) => {
  res.json({
    ok: true,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    testPriceId: process.env.TEST_PRICE_ID || process.env.SMOKE_TEST_PRICE_ID || null,
  });
});

