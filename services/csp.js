'use strict';

const helmet = require('helmet');
const { PUBLIC_PAGES } = require('./seo');

// SHA-256 of the inline Google Tag Manager snippet in the site-vitrine pages.
// Must be updated if that snippet changes (guarded by tests/site-maintenance.test.cjs).
const GTM_INLINE_SCRIPT_HASH = "'sha256-gUGC9d6YKYfHCmsW9x/4xLJ9d65d8895owmzyMews7I='";

const SHOWCASE_DOCUMENTS = new Set([
  '/',
  '/site-vitrine/account.html',
  ...PUBLIC_PAGES.map(page => '/site-vitrine/' + page)
]);

const BASE_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com', 'https://*.gstatic.com', 'https://cdn.jsdelivr.net'],
  scriptSrcAttr: ["'unsafe-inline'"],
  // CSP Level 3: script/style element-specific directives
  scriptSrcElem: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com', 'https://*.gstatic.com', 'https://cdn.jsdelivr.net'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
  styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
  // Allow loading remote fonts (Google Fonts)
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https://cdn-icons-png.flaticon.com', 'https://cdn.botpress.cloud'],
  mediaSrc: ["'self'", 'blob:', 'data:'],
  connectSrc: [
    "'self'",
    'https://api.stripe.com',
    'https://messaging.botpress.cloud',
    'https://cdn.botpress.cloud',
    'https://www.vhr-dashboard-site.com',
    'https://vhr-dashboard-site.com',
    'https://vhr-dashboard-site.onrender.com',
    // Autoriser toutes les cibles HTTP (LAN/clients) pour éviter les blocages CSP sur les nouveaux utilisateurs
    'http:',
    // Autoriser le WebSocket local/LAN pour l'audio
    'ws:', 'wss:',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.3:3000',
    'http://192.168.1.3',
    // Autoriser l'instance locale utilisée par titouille44 pour la voix
    'http://192.168.1.155:3000',
    'http://192.168.1.155'
  ],
  frameSrc: ["'self'", 'https://messaging.botpress.cloud', 'https://checkout.stripe.com', 'https://js.stripe.com'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  // Disable auto HTTPS upgrade to keep LAN HTTP working
  upgradeInsecureRequests: null
};

// Sources required by Tag Manager, Google Analytics and Tag Manager preview mode:
// https://developers.google.com/tag-platform/security/guides/csp
const GTM_SCRIPT_SOURCES = [GTM_INLINE_SCRIPT_HASH, 'https://www.googletagmanager.com', 'https://tagmanager.google.com'];
const GTM_STYLE_SOURCES = ['https://www.googletagmanager.com', 'https://tagmanager.google.com'];
const GTM_DIRECTIVES = {
  scriptSrc: GTM_SCRIPT_SOURCES,
  scriptSrcElem: GTM_SCRIPT_SOURCES,
  styleSrc: GTM_STYLE_SOURCES,
  styleSrcElem: GTM_STYLE_SOURCES,
  fontSrc: ['data:'],
  imgSrc: [
    'https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.google.com',
    'https://*.google.fr', 'https://*.g.doubleclick.net', 'https://ssl.gstatic.com', 'https://www.gstatic.com'
  ],
  connectSrc: [
    'https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com',
    'https://*.google.com', 'https://*.google.fr', 'https://*.g.doubleclick.net', 'https://pagead2.googlesyndication.com'
  ],
  frameSrc: ['https://www.googletagmanager.com']
};

const SHOWCASE_DIRECTIVES = { ...BASE_DIRECTIVES };
for (const [name, sources] of Object.entries(GTM_DIRECTIVES)) {
  SHOWCASE_DIRECTIVES[name] = [...BASE_DIRECTIVES[name], ...sources];
}

function contentSecurityPolicy() {
  const defaultPolicy = helmet.contentSecurityPolicy({ useDefaults: false, directives: BASE_DIRECTIVES });
  const showcasePolicy = helmet.contentSecurityPolicy({ useDefaults: false, directives: SHOWCASE_DIRECTIVES });
  return (req, res, next) => (SHOWCASE_DOCUMENTS.has(req.path) ? showcasePolicy : defaultPolicy)(req, res, next);
}

module.exports = { contentSecurityPolicy, GTM_INLINE_SCRIPT_HASH };
