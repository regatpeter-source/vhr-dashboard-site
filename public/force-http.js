// Force downgrade to HTTP on LAN to avoid self-signed / invalid TLS issues
(function() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    if (window.location.protocol === 'https:') {
      const target = 'http://' + window.location.host + window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(target);
    }
  } catch (e) {
    // silent
  }
})();
