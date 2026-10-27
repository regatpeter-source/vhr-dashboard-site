'use strict';

const path = require('node:path');
const ORIGIN = 'https://www.vhr-dashboard-site.com';
const PUBLIC_PAGES = [
  'features.html', 'pricing.html', 'contact.html', 'conditions.html',
  'mentions.html', 'developer-setup.html', 'guide-gestion-casques-vr.html'
];

function installSeoRoutes(app, root) {
  app.use((req, res, next) => {
    if (/^\/(?:site-vitrine\/)?account(?:\.clean)?\.html$/.test(req.path)
      || /^\/(?:api(?:\/|$)|admin|dashboard|vhr-dashboard|launch-dashboard|audio-receiver|test-)/.test(req.path)
      || /\.(?:bak|clean\.html)$/.test(req.path)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
  });

  app.get('/robots.txt', (_req, res) => res.type('text/plain').sendFile(path.join(root, 'robots.txt')));
  app.get('/sitemap.xml', (_req, res) => res.type('application/xml').sendFile(path.join(root, 'sitemap.xml')));
  app.get('/site-vitrine/robots.txt', (_req, res) => res.redirect(301, '/robots.txt'));
  app.get(['/', '/site-vitrine/index.html', '/site-vitrine/', '/site-vitrine', '/index.html'], (req, res) => {
    if (req.path !== '/') {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(301, '/' + query);
    }
    res.type('html').sendFile(path.join(root, 'site-vitrine', 'index.html'));
  });
  for (const file of PUBLIC_PAGES) {
    app.get('/' + file, (req, res) => {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      res.redirect(301, '/site-vitrine/' + file + query);
    });
    app.get('/site-vitrine/' + file, (_req, res) => {
      res.type('html').sendFile(path.join(root, 'site-vitrine', file));
    });
  }
}

module.exports = { installSeoRoutes, PUBLIC_PAGES, ORIGIN };
