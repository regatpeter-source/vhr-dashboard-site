#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DIR = __dirname;

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  let filePath = path.join(DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Sécurité: éviter les traversées de répertoires
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`
✅ VHR Dashboard Démo - Serveur lancé`);
  console.log(`
📱 Ouvrez votre navigateur: http://localhost:${PORT}`);
  console.log(`
💡 Appuyez sur Ctrl+C pour arrêter le serveur\n`);
});
