// Force downgrade to HTTP on LAN to avoid self-signed / invalid TLS issues
(function() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    const hostname = (window.location.hostname || '').toLowerCase();
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const isLoopback = loopbackHosts.has(hostname);
    const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
    if (isLoopback || isElectron) return;
    if (window.location.protocol === 'https:') {
      const target = 'http://' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(target);
    }
  } catch (e) {
    // silent
  }
})();
