'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { pipeline } = require('node:stream/promises');

const APK_TYPE = 'application/vnd.android.package-archive';
const MAX_BYTES = 1024 ** 3;
function mountHeadsetApk(app, authenticate, checkAccess, adb) {
  const busy = new Set();
  function handler(upload) {
    return async (req, res) => {
      if (process.env.NO_ADB === '1') return res.status(503).json({ ok: false, error: 'ADB désactivé' });
      const serial = upload ? req.query.serial : req.body?.serial;
      if (typeof serial !== 'string' || !/^[a-zA-Z0-9_.:[\]-]{1,128}$/.test(serial) || serial.startsWith('-')) {
        return res.status(400).json({ ok: false, error: 'Casque non valide' });
      }
      const size = Number(req.get('content-length'));
      if (upload && !req.is(APK_TYPE)) return res.status(415).json({ ok: false, error: 'Fichier APK attendu' });
      if (upload && (!Number.isSafeInteger(size) || size < 4)) return res.status(400).json({ ok: false, error: 'Taille APK invalide' });
      if (upload && size > MAX_BYTES) return res.status(413).json({ ok: false, error: 'APK limité à 1 Gio' });
      const key = createHash('sha256').update(JSON.stringify([req.user.username, serial])).digest('hex');
      if (busy.has(key) || busy.size >= 8) return res.status(409).json({ ok: false, error: 'Transfert déjà en cours, veuillez réessayer' });
      busy.add(key);
      const remote = `/data/local/tmp/vhr-${key}.apk`;
      let tmp, partial;
      try {
        const { stdout } = await adb(null, ['devices'], 10000);
        if (!stdout.split(/\r?\n/).some(line => {
          const [id, state] = line.trim().split(/\s+/);
          return id === serial && state === 'device';
        })) return res.status(409).json({ ok: false, error: 'Casque non connecté ou non autorisé' });
        if (upload) {
          tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vhr-apk-'));
          const local = path.join(tmp, 'upload.apk');
          await pipeline(req, fs.createWriteStream(local, { flags: 'wx', mode: 0o600 }));
          const f = await fs.promises.open(local, 'r');
          const magic = Buffer.alloc(4);
          try { await f.read(magic, 0, 4, 0); } finally { await f.close(); }
          if ((await fs.promises.stat(local)).size !== size || magic.readUInt32LE() !== 0x04034b50) {
            return res.status(400).json({ ok: false, error: 'Fichier incomplet ou format APK invalide' });
          }
          partial = `${remote}.${randomUUID()}.part`;
          await adb(serial, ['push', local, partial], 240000);
          await adb(serial, ['shell', 'mv', partial, remote], 15000);
          partial = null;
          return res.json({ ok: true, bytes: size });
        }
        const listing = await adb(serial, ['shell', 'ls', '/data/local/tmp'], 15000);
        if (!listing.stdout.split(/\s+/).includes(path.posix.basename(remote))) {
          return res.status(409).json({ ok: false, error: 'Envoyez d’abord un APK sur ce casque' });
        }
        const result = await adb(serial, ['shell', 'pm', 'install', '-r', remote], 240000);
        if (!/^Success\s*$/m.test(result.stdout)) throw new Error(result.stdout.trim() || 'Installation refusée');
        await adb(serial, ['shell', 'rm', '-f', remote], 15000);
        return res.json({ ok: true });
      } catch (err) {
        console.warn('[headset-apk]', err.message);
        if (!res.destroyed) res.status(502).json({ ok: false, error: upload ? 'Transfert APK interrompu' : 'Installation APK refusée ou casque indisponible' });
      } finally {
        try {
          if (partial) await adb(serial, ['shell', 'rm', '-f', partial], 10000);
        } catch (err) { console.warn('[headset-apk] nettoyage casque:', err.message); }
        if (tmp) await fs.promises.rm(tmp, { recursive: true, force: true }).catch(err => console.warn('[headset-apk] nettoyage PC:', err.message));
        busy.delete(key);
      }
    };
  }
  app.post('/api/upload-dev-game', authenticate, checkAccess, handler(true));
  app.post('/api/install-dev-game', authenticate, checkAccess, handler(false));
}
module.exports = { mountHeadsetApk, APK_TYPE };
