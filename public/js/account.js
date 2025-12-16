// Account page client script (moved from inline to comply with CSP)
(function(){
  async function api(path, opts = {}) {
    opts = Object.assign({ credentials: 'include' }, opts);
    try { 
      const res = await fetch(path, opts); 
      if (!res.ok) {
        console.warn(`[API ${path}] Response status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`[API ${path}] Response:`, data);
      return data;
    } catch(e){ 
      console.error(`[API ${path}] Error:`, e);
      return { ok: false, error: e.message }; 
    }
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
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
      loginMessage.textContent = 'Erreur: Veuillez remplir tous les champs';
      return;
    }
    
    loginMessage.textContent = 'Connexion en cours...';
    console.log('[LOGIN] Attempting login for:', username);
    
    try {
      const res = await api('/api/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, password }) 
      });
      
      console.log('[LOGIN] Response:', res);
      
      if (res && res.ok) { 
        loginMessage.textContent = 'Connexion réussie ✓'; 
        await new Promise(r => setTimeout(r, 500));
        await loadMe(); 
      } else { 
        const errorMsg = res && res.error ? res.error : 'Erreur inconnue';
        console.error('[LOGIN] Error:', errorMsg);
        loginMessage.textContent = 'Erreur: ' + errorMsg; 
      }
    } catch (err) {
      console.error('[LOGIN] Exception:', err);
      loginMessage.textContent = 'Erreur: ' + err.message;
    }
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
    if (res && res.ok) { 
      loginMessage.textContent = 'Compte créé ✓ Redirection vers le dashboard...'; 
      await loadMe(); 
      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        window.location.href = '/admin-dashboard.html';
      }, 1500);
    }
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

  // Billing section
  async function loadBilling(){
    try {
      const r = await api('/api/billing/invoices');
      const invoices = (r && r.invoices) || [];
      const box = document.getElementById('billingBox');
      box.innerHTML = '<h3>Factures</h3>' + (invoices.length ? '<ul>' + invoices.map(i=>`<li>Invoice ${i.id} - ${i.amount_due/100} ${i.currency}</li>`).join('') + '</ul>' : '<p>Aucune facture</p>');
    } catch(e) {}
  }

  // Check URL parameters for specific actions
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');

  // Load user information on start
  document.addEventListener('DOMContentLoaded', () => {
    loadMe();
    
    // Show message based on action parameter
    if (action === 'demo_required') {
      const msg = document.getElementById('loginMessage');
      msg.innerHTML = '<div style="background: #e3f2fd; border: 1px solid #2196F3; color: #0d47a1; padding: 12px; border-radius: 4px; margin-bottom: 16px;"><strong>📥 Créez un compte pour accéder à la démo</strong><br>Vous pouvez vous inscrire gratuitement et accéder à une démo gratuite de 7 jours !</div>';
    } else if (action === 'subscription_required') {
      const msg = document.getElementById('loginMessage');
      msg.innerHTML = '<div style="background: #e8f5e9; border: 1px solid #4CAF50; color: #1b5e20; padding: 12px; border-radius: 4px; margin-bottom: 16px;"><strong>🔒 Créez un compte pour gérer vos abonnements</strong><br>Connexion sécurisée requise pour accéder à votre espace client.</div>';
    }
  });

})();
