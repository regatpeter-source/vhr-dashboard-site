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

    // Si le modal n'est pas disponible (erreur de chargement), on garde l'overlay
    // et on affiche un message + un bouton de recharge plutôt que de finir en écran noir.
    const ov = document.getElementById('authOverlay');
    if (ov) {
      ov.style.display = 'flex';
      ov.innerHTML = `
        <div style="text-align:center; color:#fff; max-width:480px;">
          <div style="font-size:48px; margin-bottom:18px;">⚠️</div>
          <h2 style="margin:0 0 12px 0;">Chargement bloqué</h2>
          <p style="color:#bbb; margin:0 0 16px 0;">Impossible d'afficher la page de login. Cliquez pour réessayer.</p>
          <button id="authForceReload" style="padding:10px 18px;border:none;border-radius:8px;background:#2ecc71;color:#000;font-weight:bold;cursor:pointer;">🔄 Recharger</button>
        </div>
      `;
      const reloadBtn = document.getElementById('authForceReload');
      if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
    }
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
