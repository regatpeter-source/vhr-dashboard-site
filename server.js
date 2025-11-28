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
      scriptSrc: ["'self'", 'https://cdn.botpress.cloud'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://cdn-icons-png.flaticon.com', 'https://cdn.botpress.cloud'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://messaging.botpress.cloud'],
      frameSrc: ["'self'", 'https://messaging.botpress.cloud'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Expose site-vitrine directory too for local tests
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine')));

// Health check endpoint for local debugging
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
// Expose site-vitrine and top-level HTML files so they can be accessed via http://localhost:PORT/
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine')));
// Serve top-level HTML files that are not in public
const exposedTopFiles = ['index.html', 'pricing.html', 'features.html', 'contact.html', 'developer-setup.html'];
exposedTopFiles.forEach(f => {
  app.get(`/${f}`, (req, res) => res.sendFile(path.join(__dirname, f)));
});
// Simple ping route for health checks
app.get('/ping', (req, res) => res.json({ ok: true, message: 'pong' }));

// --- Stripe Checkout ---
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_votre_cle_secrete';
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

// --- Utilisateurs (à remplacer par une vraie base de données) ---
const users = [
  // Admin user: vhr / 0409 (hash generated securely)
  {
    username: 'vhr',
    passwordHash: '$2b$10$Axa5JBDt22Wc2nZtTqeMBeVjyDYEl0tMyu0NDdUYiTcocI2bvqK46',
    role: 'admin'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = '2h';

// --- Middleware de vérification du token ---
function authMiddleware(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
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
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ ok: false, error: 'Utilisateur inconnu' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ ok: true, token, username: user.username, role: user.role });
});

// --- Route de logout (optionnelle, côté client il suffit de supprimer le token) ---
app.post('/api/logout', (req, res) => {
  res.json({ ok: true });
});

// NB: Keep /api/devices unprotected so dashboard clients can discover devices
// If you need to restrict access in production, use optionalAuth or protect specific ADB actions.

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
      stdio: 'ignore',
      windowsHide: true
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
    const cmdArgs = Array.isArray(args) ? args : (args ? [args] : []);
    const adbArgs = serial ? ['-s', serial, ...cmdArgs] : cmdArgs;
    const proc = spawn('adb', adbArgs)
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })
    proc.on('close', code => {
      resolve({ stdout, stderr, code })
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
        console.error('❌ Failed to list ADB devices:', err)
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
        , runningApp: activeApps.get(dev.serial) || null
      }))
      // detect new serials and attempt AUTO_WIFI_FROM_USB if enabled
      try {
        const currentSerials = new Set(devices.map(d => d.serial));
        for (const s of currentSerials) {
          if (!prevDeviceSerials.has(s)) {
            if (process.env.AUTO_WIFI_FROM_USB === '1') {
              const last = autoWifiAttempts.get(s) || 0;
              if (Date.now() - last > 10 * 1000) {
                autoWifiAttempts.set(s, Date.now());
                autoWifiConnectIfUsb(s).catch(err => console.error('[AUTO-WIFI] error for', s, err));
              }
            }
          }
        }
        prevDeviceSerials = currentSerials;
      } catch (e) {
        console.error('[refreshDevices] auto-wifi detection failed', e);
      }
      console.log('[DEBUG] Emission devices-update:', devices)
      io.emit('devices-update', devices)
    })
  } catch (e) {
    console.error('❌ Error in refreshDevices:', e)
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
// Track previous device serials to detect newly-connected USB devices
let prevDeviceSerials = new Set();
// Avoid repeating auto-wifi attempts too often per serial
let autoWifiAttempts = new Map();
// Track active apps per device serial
const activeApps = new Map();

const wssMpeg1 = new WebSocket.Server({ noServer: true });

// Audio stream states for real-time voice -> push and play on stream end
const audioStreams = new Map(); // streamId -> { serial, tmpFilePath, ws }

// Ensure tmp voice directory exists
const TMP_VOICE_DIR = path.join(__dirname, 'tmp', 'voice');
try { if (!fs.existsSync(TMP_VOICE_DIR)) fs.mkdirSync(TMP_VOICE_DIR, { recursive: true }); } catch (e) { console.error('[server] Error creating tmp voice dir', e); }

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

// ---------- Auto Wifi helpers (USB -> TCPIP) ----------
// Try to get the IP of a device via adb shell and return the first IPv4 found
async function getDeviceIp(serial) {
  try {
    // Try a variety of common commands to retrieve the IPv4 address
    const probes = [
      ['shell', 'ip', '-f', 'inet', 'addr', 'show', 'wlan0'],
      ['shell', 'ip', '-f', 'inet', 'addr', 'show'],
      ['shell', 'ifconfig', 'wlan0'],
      ['shell', 'ifconfig'],
      ['shell', 'getprop', 'dhcp.wlan0.ipaddress'],
      ['shell', 'getprop', 'dhcp.eth0.ipaddress']
    ];
    for (const cmd of probes) {
      try {
        const r = await runAdbCommand(serial, cmd);
        const out = (r.stdout || '') + '\n' + (r.stderr || '');
        // Try to match ip on lines like 'inet 192.168.1.23'
        const m = out.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
        if (m) {
          console.log('[AUTO-WIFI] getDeviceIp detected via', cmd.join(' '), ':', m[1]);
          return m[1];
        }
        // Some getprop return the ip directly as stdout content
        const raw = (r.stdout || '').trim();
        if (raw && raw.length && /^\d+\.\d+\.\d+\.\d+$/.test(raw)) {
          console.log('[AUTO-WIFI] getDeviceIp detected via', cmd.join(' '), ':', raw);
          return raw;
        }
      } catch (e) {
        // ignore probe error and try next
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// If a USB device is found, attempt to enable TCPIP ADB and connect automatically
async function autoWifiConnectIfUsb(serial) {
  if (/[:.]/.test(serial)) {
    console.log('[AUTO-WIFI] Serial appears to be an IP or already network: ', serial);
    return;
  }
  console.log('[AUTO-WIFI] New USB device detected:', serial);
  const ip = await getDeviceIp(serial);
  if (!ip) {
    console.log('[AUTO-WIFI] Unable to detect device IP for', serial);
    return;
  }
  console.log('[AUTO-WIFI] Detected device IP', ip, 'for', serial, ', enabling tcpip');
  try {
    const r1 = await runAdbCommand(serial, ['shell', 'setprop', 'persist.adb.tcp.port', '5555']);
    console.log('[AUTO-WIFI] setprop result:', { stdout: r1.stdout, stderr: r1.stderr });
    const r2 = await runAdbCommand(serial, ['tcpip', '5555']);
    console.log('[AUTO-WIFI] tcpip result:', { stdout: r2.stdout, stderr: r2.stderr });
    const r = await runAdbCommand(null, ['connect', ip]);
    console.log('[AUTO-WIFI] connect result for', serial, ':', r && (r.stdout || r.stderr));
    refreshDevices().catch(() => {});
  } catch (e) {
    console.error('[AUTO-WIFI] Failed to auto-connect', serial, e);
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

// ---------- ADB screenrecord → FFmpeg player (plus stable que scrcpy) ----------
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

  // Profils stables : résolution et bitrate
  let size = '854x480', bitrate = '1.5M';
  if (opts.profile === 'ultra-low') {
    size = '426x240'; bitrate = '400K';
  } else if (opts.profile === 'low') {
    size = '480x270'; bitrate = '600K';
  } else if (opts.profile === 'wifi') {
    size = '640x360'; bitrate = '1M';
  } else if (opts.profile === 'default') {
    size = '854x480'; bitrate = '1.5M';
  } else if (opts.profile === 'high') {
    size = '1280x720'; bitrate = '2M';
  } else if (opts.profile === 'ultra') {
    size = '1920x1080'; bitrate = '3M';
  }

  const bitrateNum = bitrate.replace(/[KM]/g, m => m === 'K' ? '000' : '000000');
  console.log(`[server] 🎬 ADB screenrecord stream: ${serial}`);
  console.log(`[server] 📺 ${size} @ ${bitrate}`);
  
  // Calculer la position de la fenêtre (empilement vertical)
  const streamCount = Array.from(streams.values()).filter(s => s.ffplayProc).length;
  const windowWidth = 640;
  const windowHeight = 360;
  const windowX = 0;
  const windowY = streamCount * windowHeight;

  // Récupérer le nom personnalisé du device
  const deviceName = nameMap[serial] || serial;
  const windowTitle = `Quest 2 - ${deviceName}`;

  console.log(`[server] 📝 Window: ${windowTitle} at (${windowX},${windowY})`);

  // ✅ ADB screenrecord en continu (streaming direct vers stdout)
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
  // Use dynamic size and bitrate from chosen profile
  const ffmpegArgs = [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-probesize', '32',
    '-analyzeduration', '0',
    '-flush_packets', '1',
    '-i', 'pipe:0',
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-b:v', bitrate,
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-g', '50',
    '-maxrate', bitrate,
    '-bufsize', '2M',
    '-vf', `fps=25,scale=${size.replace('x',':')}`,
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
      console.log(`[server] 🔄 Auto-restart in 3s...`);
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
  console.log(`[server] ❌ Stream stopped: ${serial}`);
  return true;
}

// ---------- WebSocket ----------
// ...existing code...

// ---------- API Endpoints ----------
app.get('/api/devices', (req, res) => res.json({ ok: true, devices }));

app.post('/api/stream/start', async (req, res) => {
  const { serial, profile, cropLeftEye } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });

  let finalProfile = profile;
  if (!finalProfile || finalProfile === 'default') {
    const isWifi = serial.includes(':') || serial.includes('.');
    finalProfile = isWifi ? 'wifi' : 'high';
    console.log(`[API] 🔍 Auto-detected profile: ${finalProfile} for ${serial}`);
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
    
    console.log(`[launch] 🎮 Tentative de lancement: ${pkg}`);
    
    // Étape 1: Découvrir l'activité principale
    const dumpsysResult = await runAdbCommand(serial, [
      'shell', 'dumpsys', 'package', pkg
    ]);
    
    // Chercher l'activité avec android.intent.action.MAIN
    const activityMatch = dumpsysResult.stdout.match(new RegExp(`${pkg.replace(/\./g, '\\.')}/(\\S+)\\s+filter`, 'm'));
    const mainActivity = activityMatch ? activityMatch[1] : null;
    
    if (mainActivity) {
      // Lancer avec le composant complet
      console.log(`[launch] 📱 Activité trouvée: ${mainActivity}`);
      const launchResult = await runAdbCommand(serial, [
        'shell', 'am', 'start', '-n', `${pkg}/${mainActivity}`
      ]);
      
      const success = launchResult.code === 0 || 
                      launchResult.stdout.includes('Starting') || 
                      launchResult.stdout.includes('Activity');
      
      if (success) {
        console.log(`[launch] ✅ ${pkg} lancé`);
        // Track running app
        activeApps.set(serial, pkg);
        // Broadcast devices update so UI shows running badge
        refreshDevices().catch(() => {});
        io.emit('app-launch', { serial, packageId: pkg });
        res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
        return;
      }
    }
    
    // Fallback: Méthode monkey
    console.log(`[launch] 🔄 Fallback monkey...`);
    const monkeyResult = await runAdbCommand(serial, [
      'shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'
    ]);
    
    if (monkeyResult.code === 0 || monkeyResult.stdout.includes('Events injected')) {
      console.log(`[launch] ✅ ${pkg} lancé via monkey`);
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
      console.log(`[launch] ✅ ${pkg} lancé via am start`);
      res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
    } else {
      console.log(`[launch] ⚠️ ${pkg} - Échec:\n${amResult.stdout}\n${amResult.stderr}`);
      res.json({ ok: false, msg: 'Échec du lancement', details: amResult.stderr });
    }
  } catch (e) {
    console.error('[api] launch:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stop an app (force-stop)
app.post('/api/apps/:serial/stop', async (req, res) => {
  const serial = req.params.serial;
  const pkg = req.body?.package;
  console.log('[api] /api/apps/:serial/stop request:', { serial, package: pkg });
  if (!serial || !pkg) return res.status(400).json({ ok: false, error: 'serial and package required' });
  try {
    const result = await runAdbCommand(serial, ['shell', 'am', 'force-stop', pkg]);
    // Remove from active apps if present
    if (activeApps.get(serial) === pkg) {
      activeApps.delete(serial);
      refreshDevices().catch(() => {});
      io.emit('app-stop', { serial, packageId: pkg });
    }
    res.json({ ok: true, result: result.stdout || result.stderr });
  } catch (e) {
    console.error('[api] stop app:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Home button - send KEYCODE_HOME
app.post('/api/adb/home', async (req, res) => {
  const { serial } = req.body || {};
  console.log('[api] /api/adb/home request:', { serial });
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });
  try {
    await runAdbCommand(serial, ['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] home:', e);
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
  if (!serial || !ip) {
    return res.status(400).json({ ok: false, error: 'serial and ip required' });
  }

  try {
    await runAdbCommand(serial, ['shell', 'setprop', 'persist.adb.tcp.port', '5555']);
    await runAdbCommand(serial, ['tcpip', '5555']);
    const r = await runAdbCommand(null, ['connect', ip]);
    const ok = r.stdout && /connected|already connected/i.test(r.stdout);
    refreshDevices().catch(() => { });
    res.json({ ok, msg: r.stdout || r.stderr || 'done' });
  } catch (e) {
    console.error('[api] wifi-connect:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ========== Audio endpoints: push/stream ==========
// Push a single audio file and play it once on device
app.post('/api/adb/audio/push', async (req, res) => {
  // Expecting { serial, filename, chunk (base64) } or raw body base64
  try {
    const { serial, filename } = req.body || {};
    let data = req.body && req.body.chunk;
    // If not JSON, raw body may contain base64 (handled by bodyParser), but ensure it's provided
    if (!data && req.headers['content-type'] && req.headers['content-type'].startsWith('text/plain')) {
      data = (req.body || '');
    }
    if (!serial || !data) return res.status(400).json({ ok: false, error: 'serial and chunk required' });

    const name = filename || `vhr-push-${Date.now()}.wav`;
    const tmpPath = path.join(TMP_VOICE_DIR, name);
    const bin = Buffer.from(data, 'base64');
    fs.writeFileSync(tmpPath, bin);
    // Convert to wav if needed (ffmpeg autodetects input format)
    const converted = tmpPath.endsWith('.wav') ? tmpPath : tmpPath + '.wav';
    if (tmpPath !== converted) {
      try {
        await execp(`ffmpeg -y -i "${tmpPath}" -ar 48000 -ac 1 "${converted}"`);
      } catch (e) {
        console.warn('[audio/push] ffmpeg conversion failed, proceeding with original file', e && e.message);
      }
    }
    // Push to device
    const remotePath = `/sdcard/VHR/${path.basename(converted)}`;
    await runAdbCommand(serial, ['push', converted, remotePath]);
    // Play once with am start (ACTION_VIEW)
    await runAdbCommand(serial, ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `file://${remotePath}`, '-t', 'audio/*']);
    res.json({ ok: true, path: remotePath });
  } catch (e) {
    console.error('[api] audio/push error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stream start: create a tmp file and return streamId
app.post('/api/adb/audio/stream/start', (req, res) => {
  try {
    const { serial } = req.body || {};
    if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });
    const streamId = `${serial}-${Date.now()}-${Math.random().toString(36).substr(2,6)}`;
    const tmpFile = path.join(TMP_VOICE_DIR, `${streamId}.wav`);
    // Create an empty file
    fs.writeFileSync(tmpFile, Buffer.alloc(0));
    audioStreams.set(streamId, { serial, tmpFile });
    res.json({ ok: true, streamId });
  } catch (e) {
    console.error('[api] audio/stream/start:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stream chunk: append base64 chunk to tmp file
app.post('/api/adb/audio/stream/chunk', async (req, res) => {
  try {
    const { streamId, chunk } = req.body || {};
    let payload = chunk || (req.body && req.body.chunk);
    if (!streamId || !payload) return res.status(400).json({ ok: false, error: 'streamId and chunk required' });
    const state = audioStreams.get(streamId);
    if (!state) return res.status(404).json({ ok: false, error: 'stream not found' });
    const bin = Buffer.from(payload, 'base64');
    fs.appendFileSync(state.tmpFile, bin);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] audio/stream/chunk:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stream end: finalize, push and play once
app.post('/api/adb/audio/stream/end', async (req, res) => {
  try {
    const { streamId } = req.body || {};
    if (!streamId) return res.status(400).json({ ok: false, error: 'streamId required' });
    const state = audioStreams.get(streamId);
    if (!state) return res.status(404).json({ ok: false, error: 'stream not found' });
    const serial = state.serial;
    let local = state.tmpFile;
    // If it's not .wav, attempt to convert
    if (!local.endsWith('.wav')) {
      const conv = local + '.wav';
      try { await execp(`ffmpeg -y -i "${local}" -ar 48000 -ac 1 "${conv}"`); local = conv; } catch (e) { console.warn('[audio/stream/end] ffmpeg convert failed', e && e.message); }
    }
    const remotePath = `/sdcard/VHR/${path.basename(local)}`;
    await runAdbCommand(serial, ['push', local, remotePath]);
    // Play once
    await runAdbCommand(serial, ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `file://${remotePath}`, '-t', 'audio/*']);
    audioStreams.delete(streamId);
    res.json({ ok: true, path: remotePath });
  } catch (e) {
    console.error('[api] audio/stream/end:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/adb/audio/streams', (req, res) => {
  const data = Array.from(audioStreams.entries()).map(([k, v]) => ({ streamId: k, serial: v.serial, tmpFile: v.tmpFile }));
  res.json({ ok: true, streams: data });
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
  console.log('[Socket.IO] 🔌 Client connected');
  socket.emit('devices-update', devices);
  socket.emit('games-update', gamesList);
  socket.emit('favorites-update', favoritesList);
  socket.on('disconnect', () => {
    console.log('[Socket.IO] 🔌 Client disconnected');
  });
});

// ---------- Init ----------
if (process.env.NO_ADB !== '1') {
  (async function initServer() {
    try {
        await verifyStripeKeyAtStartup();
      } catch (e) {
        // Do not abort server on Stripe verification failure - log warning and continue
        console.warn('[server] Stripe verification failed or not configured; continuing without Stripe features. Error:', e && e.message);
      }
    refreshDevices();
    startAdbTrack();
  })();
} else {
  console.warn('[server] NO_ADB=1 set: skipping ADB device tracking & streaming features (good for dev/test).');
}

const START_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 20;
let _portAttempts = 0;

function startServerOnPort(port) {
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[server] Port ${port} is already in use.`);
      _portAttempts++;
      if (_portAttempts <= MAX_PORT_TRIES) {
        const nextPort = port + 1;
        console.warn(`[server] Trying alternate port ${nextPort} (attempt ${_portAttempts}/${MAX_PORT_TRIES})`);
        setTimeout(() => startServerOnPort(nextPort), 200);
        return;
      }
      console.error(`[server] Failed to bind port after ${MAX_PORT_TRIES} attempts. Aborting.`);
      process.exit(1);
    } else {
      console.error('[server] listen error:', err);
      process.exit(1);
    }
  });
  // Bind explicitly to 0.0.0.0 to satisfy hosting platforms that check for open ports
  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    console.log(`\n🚀 VHR Dashboard - Optimisé Anti-Scintillement`);
    console.log(`📡 Server: http://localhost:${port}`);
  console.log(`\n📊 Profils disponibles (ADB screenrecord - stable):`);
  console.log(`   • ultra-low: 320p, 600K (WiFi faible)`);
  console.log(`   • low:       480p, 1.5M`);
  console.log(`   • wifi:      640p, 2M (WiFi optimisé)`);
  console.log(`   • default:   720p, 3M`);
  console.log(`   • high:      1280p, 8M (USB)`);
  console.log(`   • ultra:     1920p, 12M (USB uniquement)`);
  console.log(`   ✅ Pas de scintillement avec ADB natif`);
    console.log(`\n👁️  Crop œil gauche activé par défaut\n`);
  });
}

startServerOnPort(START_PORT);

// Debugging: show AUTO_WIFI status at startup
console.log('[server] AUTO_WIFI_FROM_USB =', process.env.AUTO_WIFI_FROM_USB === '1' ? 'ENABLED' : 'disabled');

// Handler de fermeture propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  // Tuer tous les streams actifs
  for (const [serial, stream] of streams) {
    try {
      if (stream.adbProc) {
        console.log(`🧹 Arrêt adb: ${serial}`);
        spawn('taskkill', ['/F', '/T', '/PID', String(stream.adbProc.pid)]);
      }
      if (stream.ffplayProc) {
        console.log(`🧹 Arrêt ffplay: ${serial}`);
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
  setTimeout(() => process.exit(0), 500);
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

// List files under /sdcard (or a subpath if provided via query 'path')
app.get('/api/storage/:serial', async (req, res) => {
  const serial = req.params.serial;
  const pathQuery = req.query.path || '/sdcard';
  try {
    const out = await runAdbCommand(serial, ['shell', 'ls', '-la', pathQuery]);
    const lines = (out.stdout || '').split(/[\r\n]+/).filter(Boolean);
    const files = lines.map(l => {
      // typical ls -la: perms links owner group size month day time name
      const parts = l.trim().split(/\s+/);
      if (parts.length < 6) return null;
      const size = parts[4];
      const name = parts.slice(8).join(' ') || parts[7] || parts[parts.length - 1];
      const perms = parts[0];
      return { raw: l, name, size, perms };
    }).filter(Boolean);
    res.json({ ok: true, files });
  } catch (e) {
    console.error('[api] storage list:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Pull file from device and stream to response (via adb exec-out cat)
app.get('/api/storage/:serial/pull', (req, res) => {
  const serial = req.params.serial;
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ ok: false, error: 'path query required' });
  try {
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const proc = spawn('adb', ['-s', serial, 'exec-out', 'cat', filePath]);
    proc.stdout.pipe(res);
    proc.on('error', err => {
      console.error('[adb pull stream] error', err);
      try { res.end(); } catch (ignore) {}
    });
    proc.on('close', code => {
      try { res.end(); } catch (ignore) {}
    });
  } catch (e) {
    console.error('[api] storage pull:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Auto WiFi connect: attempt to enable TCP/IP and connect without asking for IP helper (server will probe it)
app.post('/api/adb/wifi-connect-auto', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });
  try {
    console.log('[api] wifi-connect-auto called for', serial);
    // Call internal helper
    await autoWifiConnectIfUsb(serial);
    res.json({ ok: true, msg: 'Auto WiFi connect attempted (voir logs pour détails)' });
  } catch (e) {
    console.error('[api] wifi-connect-auto error for', serial, e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});