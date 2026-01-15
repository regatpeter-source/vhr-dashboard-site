// Super-fallback : enlève l'overlay et force le login si check-auth reste bloqué
(function() {
  const forceLogin = () => {
    try {
      if (typeof hideDashboardContent === 'function') hideDashboardContent();
      if (typeof showAuthModal === 'function') {
        showAuthModal('login');
        return;
      }
    } catch (e) { /* ignore */ }
    const ov = document.getElementById('authOverlay');
    if (ov) ov.style.display = 'none';
  };

  const btn = document.getElementById('forceLoginButton');
  if (btn) {
    btn.addEventListener('click', forceLogin);
  }

  setTimeout(() => {
    const ov = document.getElementById('authOverlay');
    if (ov && ov.style.display !== 'none') {
      console.warn('[auth] Super fallback: forcing login modal');
      forceLogin();
    }
  }, 10000);
})();
