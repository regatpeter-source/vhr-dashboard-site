'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const { installSeoRoutes, ORIGIN, PUBLIC_PAGES } = require('../services/seo');
const fields = require('../services/subscription-fields');
const { isRevokedAdminSession, INCIDENT_CUTOFF } = require('../services/admin-sessions');
const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('canonical pages, permanent aliases, sitemap and noindex headers are consistent', async t => {
  const app = express();
  installSeoRoutes(app, root);
  app.use('/site-vitrine', express.static(path.join(root, 'site-vitrine')));
  app.use(express.static(path.join(root, 'public')));
  app.get('/account.html', (_req, res) => res.sendFile(path.join(root, 'account.html')));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = route => fetch(base + route, { redirect: 'manual' });

  const homepage = await get('/');
  assert.equal(homepage.status, 200);
  const html = await homepage.text();
  assert.match(html, /<h1>Gérez votre flotte VR/);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
  assert.ok(html.includes(`rel="canonical" href="${ORIGIN}/"`));
  for (const alias of ['/index.html', '/site-vitrine', '/site-vitrine/', '/site-vitrine/index.html']) {
    const response = await get(alias + '?source=google');
    assert.equal(response.status, 301, alias);
    assert.equal(response.headers.get('location'), '/?source=google');
  }
  const sitemap = await (await get('/sitemap.xml')).text();
  assert.equal(sitemap, fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'));
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(locations.length, PUBLIC_PAGES.length + 1);
  assert.equal(new Set(locations).size, locations.length);
  for (const location of locations) {
    const route = new URL(location).pathname;
    const response = await get(route);
    assert.equal(response.status, 200, location);
    assert.equal(response.headers.get('x-robots-tag'), null);
    const page = await response.text();
    assert.ok(page.includes(`rel="canonical" href="${location}"`), location);
    assert.doesNotMatch(page, /http-equiv="refresh"|name="robots" content="noindex/);
  }
  for (const page of PUBLIC_PAGES) {
    const response = await get('/' + page + '?success=1');
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/site-vitrine/' + page + '?success=1');
  }
  for (const route of ['/account.html', '/site-vitrine/account.html', '/site-vitrine/account.clean.html', '/vhr-dashboard-pro.html', '/api/me']) {
    const response = await get(route);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', route);
  }
  const robots = await (await get('/robots.txt')).text();
  assert.equal(robots, fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'));
  assert.ok(robots.includes(ORIGIN + '/sitemap.xml'));
  assert.doesNotMatch(robots, /github\.io|Disallow: \/account/);
  assert.equal((await get('/site-vitrine/robots.txt')).status, 301);
  for (const route of ['/site-vitrine/style.css', '/site-vitrine/assets/logo-vd.svg.png']) {
    assert.equal((await get(route)).status, 200, route);
  }
  for (const route of ['/.env', '/.git/index', '/wp-admin/install.php']) {
    assert.equal((await get(route)).status, 404, route);
  }
});

test('explicit subscription clearing survives normalization, PostgreSQL persistence and reload', async () => {
  assert.equal(
    fs.readFileSync(path.join(root, 'services/subscription-fields.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'dist-client/services/subscription-fields.js'), 'utf8')
  );
  const row = { id: 'fixture', username: 'fixture', email: 'fixture@example.invalid', subscriptionid: 'sub_placeholder_fixture', subscriptionstatus: 'active' };
  const context = {
    subscriptionFields: fields, EMAIL_OVERRIDE_MAP: {}, normalizeEmailValue: value => value || '',
    USE_POSTGRES: true, users: [], console,
    db: {
      async getUserByUsername() { return row; },
      async updateUser(id, updates) { assert.equal(id, row.id); Object.assign(row, updates); return { id }; }
    }
  };
  vm.createContext(context);
  const normalize = serverSource.slice(serverSource.indexOf('function normalizeUserRecord('), serverSource.indexOf('\nfunction saveUsers()'));
  const persist = serverSource.slice(serverSource.indexOf('function persistUser('), serverSource.indexOf('\nasync function persistUserIdentity('));
  vm.runInContext(normalize + '\n' + persist, context);
  const user = context.normalizeUserRecord(row);
  user.subscriptionId = null;
  user.subscriptionStatus = null;
  assert.equal(fields.subscriptionUpdate(user).subscriptionid, null);
  assert.notEqual(await context.persistUser(user), false);
  assert.equal(row.subscriptionid, null);
  assert.equal(row.subscriptionstatus, null);
  assert.equal(context.normalizeUserRecord(row).subscriptionId, null);
  assert.equal(context.users[0].subscriptionId, null);
  assert.deepEqual(fields.subscriptionUpdate({}), {});
  const errors = [];
  context.console = { error: (...args) => errors.push(args.join(' ')) };
  context.db.updateUser = async () => null;
  assert.equal(await context.persistUser(user), false);
  assert.match(errors.join('\n'), /PostgreSQL user update did not persist/);
});

test('old administrator sessions are revoked without revoking customer sessions', () => {
  assert.equal(isRevokedAdminSession({ username: 'vhr', iat: INCIDENT_CUTOFF - 1 }, ['vhr']), true);
  assert.equal(isRevokedAdminSession({ username: 'other', role: 'admin' }, ['vhr']), true);
  assert.equal(isRevokedAdminSession({ username: 'vhr', iat: INCIDENT_CUTOFF }, ['vhr']), false);
  assert.equal(isRevokedAdminSession({ username: 'customer', role: 'user', iat: INCIDENT_CUTOFF - 1 }, ['vhr']), false);
  assert.equal((serverSource.match(/jwt\.verify\(token, JWT_SECRET\)/g) || []).length, 1);
  assert.equal((serverSource.match(/verifySessionToken\((?:authToken|token)\)/g) || []).length, 5);
});

test('login never logs request credentials and hosted auth cannot call itself recursively', () => {
  const login = serverSource.slice(serverSource.indexOf("app.post('/api/login'"), serverSource.indexOf("app.post('/api/dashboard/register'"));
  assert.doesNotMatch(login, /console\.(?:log|warn|error)\([^\n]*(?:req\.body|JSON\.stringify\(req\.body)/);
  assert.match(serverSource, /async function attemptRemoteDashboardLogin\(identifier, password\) \{\s+if \(runtimePolicy\.hosted\) return null;/);
  assert.match(serverSource, /async function syncLocalUserWithRemoteAccess\(user, identifier, password\) \{\s+if \(runtimePolicy\.hosted\) return user;/);
  assert.ok(serverSource.indexOf("require('./services/seo').installSeoRoutes") < serverSource.indexOf("app.use(express.static(path.join(__dirname, 'public')))"));
});

test('desktop refreshes a stale local password from the central account', () => {
  const desktopServer = fs.readFileSync(path.join(root, 'dist-client/server.js'), 'utf8');
  const login = desktopServer.slice(
    desktopServer.indexOf('async function handleApiLogin('),
    desktopServer.indexOf("app.post('/api/login', handleApiLogin)")
  );
  assert.match(login, /if \(!valid && !isGuestAccount\(user\)\) \{[\s\S]*attemptRemoteAuthentication\(identifier, password\)/);
  assert.match(login, /ensureLocalUserFromRemote\(remoteAuthForSession\.payload, identifier, password\)/);
  assert.match(login, /user = syncedUser;\s+valid = true;/);
});

test('website and desktop login ignore duplicate submits, preserve password spaces and recover after errors', async () => {
  for (const prefix of ['', 'dist-client']) {
    const source = fs.readFileSync(path.join(root, prefix, 'public/js/account.js'), 'utf8');
    let submit;
    let release;
    const calls = [];
    const button = { disabled: false };
    const context = {
      document: { getElementById: id => ({ value: id === 'username' ? ' customer ' : ' password with spaces ' }) },
      loginForm: { addEventListener: (_event, handler) => { submit = handler; }, querySelector: () => button },
      loginMessage: { textContent: '' }, console: { log() {}, error() {} },
      toFriendlyError: error => error,
      api: async (_route, options) => {
        calls.push(JSON.parse(options.body));
        return new Promise(resolve => { release = resolve; });
      }
    };
    vm.runInNewContext(source.slice(source.indexOf('let loginInProgress = false;'), source.indexOf('  const signupForm')), context);
    const pending = submit({ preventDefault() {} });
    await submit({ preventDefault() {} });
    assert.equal(calls.length, 1, prefix);
    assert.equal(button.disabled, true);
    assert.equal(calls[0].username, 'customer');
    assert.equal(calls[0].password, ' password with spaces ');
    release({ ok: false, error: 'synthetic rejection' });
    await pending;
    assert.equal(button.disabled, false);
    assert.match(context.loginMessage.textContent, /synthetic rejection/);
    const retry = submit({ preventDefault() {} });
    assert.equal(calls.length, 2);
    release({ ok: false, error: 'synthetic rejection' });
    await retry;
    assert.equal(button.disabled, false);
  }
});
