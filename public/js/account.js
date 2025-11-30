// Account page client script (moved from inline to comply with CSP)
(function(){
  async function api(path, opts = {}) {
    opts = Object.assign({ credentials: 'include' }, opts);
    try { const res = await fetch(path, opts); return await res.json(); } catch(e){ return { ok: false, error: e.message }; }
  }

  const loginForm = document.getElementById('loginForm');
  const loggedInBox = document.getElementById('loggedInBox');
  const loggedOutBox = document.getElementById('loggedOutBox');
  const loginMessage = document.getElementById('loginMessage');
  const accountName = document.getElementById('accountName');
  const accountRole = document.getElementById('accountRole');
  const logoutBtn = document.getElementById('logoutBtn');

  function setToken(t) { /* no-op: httpOnly cookie is used */ }
  function getToken() { return null; }

  async function loadMe() {
    try {
      const res = await api('/api/me');
      if (!res || !res.ok) { showLoggedOut(); return; }
      showLoggedIn(res.user);
      loadBilling();
    } catch (e) { showLoggedOut(); }
  }

  function showLoggedIn(user) {
    loggedOutBox.style.display = 'none';
    loggedInBox.style.display = 'block';
    accountName.textContent = user.username || '(inconnu)';
    accountRole.textContent = user.role || '(-- )';
    // populate forms
    document.getElementById('profileUsername').value = user.username || '';
    document.getElementById('profileEmail').value = user.email || '';
  }
  function showLoggedOut() {
    loggedOutBox.style.display = 'block';
    loggedInBox.style.display = 'none';
  }

  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    loginMessage.textContent = 'Connexion...';
    const res = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (res && res.ok) { loginMessage.textContent = 'Connexion réussie'; await loadMe(); }
    else { loginMessage.textContent = 'Erreur: ' + (res && res.error ? res.error : 'Erreur inconnue'); }
  });

  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const p1 = document.getElementById('signupPassword').value;
    const p2 = document.getElementById('signupPasswordConfirm').value;
    if (!username || !p1) return alert('Nom d\'utilisateur et mot de passe requis');
    if (p1 !== p2) return alert('Les mots de passe ne correspondent pas');
    loginMessage.textContent = 'Création du compte...';
    const res = await api('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: p1, email }) });
    if (res && res.ok) { loginMessage.textContent = 'Compte créé, connexion...'; await loadMe(); }
    else { loginMessage.textContent = 'Erreur: ' + (res && res.error ? res.error : 'Erreur inconnue'); }
  });

  if (logoutBtn) logoutBtn.addEventListener('click', async () => { setToken(null); await api('/api/logout', { method: 'POST' }); showLoggedOut(); });

  // Profile update
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');
  if (profileForm) profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('profileUsername').value;
    const email = document.getElementById('profileEmail').value;
    const res = await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email }) });
    const msg = document.getElementById('profileMessage');
    if (res && res.ok) { msg.textContent = 'Profil mis à jour'; await loadMe(); } else { msg.textContent = 'Erreur: ' + (res && res.error ? res.error : 'inconnue'); }
  });
  if (passwordForm) passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const res = await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
    const msg = document.getElementById('passwordMessage');
    if (res && res.ok) { msg.textContent = 'Mot de passe changé'; } else { msg.textContent = 'Erreur: ' + (res && res.error ? res.error : 'inconnue'); }
  });

  // Billing section: list subscriptions and invoices, and show billing portal button
  async function loadBilling(){
    try {
      const invResp = await api('/api/billing/invoices');
      const subsResp = await api('/api/billing/subscriptions');
      const billingBox = document.getElementById('billingBox');
      if (!billingBox) return;
      let html = '';
      let hasBillingVisible = false;
      if (subsResp && subsResp.ok && Array.isArray(subsResp.subscriptions) && subsResp.subscriptions.length) {
        html += '<h3>Abonnements</h3>';
        hasBillingVisible = true;
        subsResp.subscriptions.forEach(s => {
          const items = (s.items && Array.isArray(s.items.data)) ? s.items.data.map(it => (it.price && (it.price.product || it.price.id)) || '').join(', ') : '';
          html += `<div>${s.id} – ${s.status} – ${items}</div>`;
        });
      } else html += '<p>Aucun abonnement.</p>';

      if (invResp && invResp.ok && Array.isArray(invResp.invoices) && invResp.invoices.length) {
        html += '<h3>Factures</h3><ul>';
        hasBillingVisible = true;
        invResp.invoices.forEach(i => {
          html += `<li>${i.id} – ${i.status} – ${Number(i.amount_paid||i.amount_due||0)/100} ${String(i.currency||'').toUpperCase()}</li>`;
        });
        html += '</ul>';
      } else html += '<p>Aucune facture.</p>';

      // If no subscriptions and no invoices, show a small hint instead of an empty box
      if (!hasBillingVisible) {
        billingBox.style.display = 'none';
      } else {
        html += '<p><button id="manageBillingBtn" class="cta-secondary">Gérer la facturation</button></p>';
        billingBox.innerHTML = html;
        billingBox.style.display = '';
      }

      const btn = document.getElementById('manageBillingBtn');
      if (btn) btn.addEventListener('click', async () => {
        const resp = await api('/api/billing/portal', { method: 'POST' });
        if (resp && resp.ok && resp.url) window.location = resp.url;
        else alert('Impossible d\'ouvrir le portail de facturation. ' + (resp && resp.error ? resp.error : ''));
      });
    } catch (e) {
      console.error('billing load', e);
    }
  }

  // Load user information on start
  document.addEventListener('DOMContentLoaded', () => {
    loadMe();
  });

})();
