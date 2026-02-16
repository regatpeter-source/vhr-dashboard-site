// Super-fallback : enlève l'overlay et force le login si check-auth reste bloqué
(function() {
  const overlayId = 'authOverlay';
  const reloadId = 'authForceReload';
  const MAX_WAIT_MS = 45000;
  const RETRY_INTERVAL_MS = 1500;

  let startedAt = Date.now();
  let retryTimer = null;

  const overlayElement = () => document.getElementById(overlayId);

  const renderReloadPrompt = () => {
    const ov = overlayElement();
    if (!ov) return;
    ov.style.display = 'flex';
    ov.innerHTML = `
      <div style="text-align:center; color:#fff; max-width:480px;">
        <div style="font-size:48px; margin-bottom:18px;">⚠️</div>
        <h2 style="margin:0 0 12px 0;">Chargement bloqué</h2>
        <p style="color:#bbb; margin:0 0 16px 0;">Impossible d'afficher la page de login pour le moment. Cliquez pour réessayer.</p>
        <button id="${reloadId}" style="padding:10px 18px;border:none;border-radius:8px;background:#2ecc71;color:#000;font-weight:bold;cursor:pointer;">🔄 Recharger</button>
      </div>
    `;
    const reloadBtn = document.getElementById(reloadId);
    if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
  };

  const canForceLogin = () => {
    return typeof showAuthModal === 'function';
  };

  const forceLogin = () => {
    try {
      if (typeof hideDashboardContent === 'function') hideDashboardContent();
      if (canForceLogin()) {
        showAuthModal('login');
        return;
      }
    } catch (e) {
      console.warn('[auth] forceLogin encountered an error:', e);
    }
    return false;
  };

  const stopRetry = () => {
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  };

  const tryForceLoginWithWait = () => {
    const ov = overlayElement();
    if (!ov || ov.style.display === 'none') {
      stopRetry();
      return;
    }

    const ok = forceLogin();
    if (ok !== false) {
      stopRetry();
      return;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= MAX_WAIT_MS) {
      stopRetry();
      console.warn('[auth] Super fallback timeout reached, showing reload prompt');
      renderReloadPrompt();
    }
  };

  const bindButton = () => {
    const btn = document.getElementById('forceLoginButton');
    if (btn) {
      btn.addEventListener('click', () => {
        startedAt = Date.now();
        if (forceLogin() === false) {
          if (!retryTimer) {
            retryTimer = setInterval(tryForceLoginWithWait, RETRY_INTERVAL_MS);
          }
        }
      });
    }
  };

  const scheduleFallback = () => {
    // Start retry loop quickly, but only show blocking reload prompt after MAX_WAIT_MS.
    if (!retryTimer) {
      retryTimer = setInterval(tryForceLoginWithWait, RETRY_INTERVAL_MS);
    }
  };

  bindButton();
  scheduleFallback();
})();
