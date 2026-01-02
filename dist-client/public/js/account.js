// Account page client script (moved from inline to comply with CSP)
(function(){
  const OFFICIAL_HOSTS = ['vhr-dashboard-site.onrender.com', 'www.vhr-dashboard-site.com', 'vhr-dashboard-site.com'];
  const BILLING_URL = 'https://www.vhr-dashboard-site.com/pricing.html#checkout';
  const API_BASE = OFFICIAL_HOSTS.includes(window.location.hostname) ? '' : 'https://www.vhr-dashboard-site.com';

  function isOfficialHost() {
    return OFFICIAL_HOSTS.includes(window.location.hostname);
  }
  // Toggle password visibility
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.togglePassword');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '👁️‍🗨️';
          btn.style.opacity = '0.6';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
          btn.style.opacity = '1';
        }
      });
    });
  });

  async function api(path, opts = {}) {
    opts = Object.assign({ credentials: 'include' }, opts);
    try { 
      const url = API_BASE + path;
      const res = await fetch(url, opts); 
      if (!res.ok) {
        console.warn(`[API ${url}] Response status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`[API ${url}] Response:`, data);
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
      loadSubscription();
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
      loginMessage.textContent = 'Compte créé ✓ Vous êtes connecté(e).'; 
      await loadMe(); 
      // Pour les admins éventuels, rediriger vers l’admin; sinon rester dans l’espace compte sécurisé
      const role = (res.user && res.user.role) || res.role || res.userRole || 'user';
      setTimeout(() => {
        if (role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/account.html?action=welcome';
        }
      }, 1200);
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
      // Si hors domaine officiel, proposer un lien vers la page billing officielle plutôt que d'appeler l'API locale
      if (!isOfficialHost()) {
        const box = document.getElementById('billingBox');
        box.innerHTML = `
          <h3>💳 Factures & Paiements</h3>
          <p>Pour consulter vos factures et gérer vos moyens de paiement, rendez-vous sur la page sécurisée :</p>
          <p><a class="cta" href="${BILLING_URL}" target="_blank" rel="noopener">Gérer ma facturation</a></p>
        `;
        return;
      }

      const r = await api('/api/billing/invoices');
      const invoices = (r && r.invoices) || [];
      const box = document.getElementById('billingBox');
      
      let html = '<h3>💳 Factures</h3>';
      
      if (invoices.length === 0) {
        html += '<p>Aucune facture pour le moment.</p>';
      } else {
        html += '<ul style="list-style: none; padding: 0;">';
        invoices.forEach(inv => {
          const date = new Date(inv.created * 1000).toLocaleDateString('fr-FR');
          const amount = inv.amount_paid ? (inv.amount_paid / 100) : (inv.amount_due / 100);
          const currency = inv.currency ? inv.currency.toUpperCase() : 'EUR';
          const status = inv.status || 'unknown';
          const statusColor = status === 'paid' ? '#4CAF50' : '#ff9800';
          
          html += `<li style="padding: 12px; margin: 8px 0; background: white; border-left: 4px solid ${statusColor}; border-radius: 4px;">
            <strong>Facture #${inv.number || inv.id}</strong> - ${date}<br>
            Montant: ${amount} ${currency} <span style="color: ${statusColor}; font-weight: bold;">(${status})</span>
            ${inv.hosted_invoice_url ? `<br><a href="${inv.hosted_invoice_url}" target="_blank" style="color: #2196F3; text-decoration: none;">Voir la facture →</a>` : ''}
          </li>`;
        });
        html += '</ul>';
      }

      // Ajouter un bouton vers le portail de facturation (Stripe Customer Portal)
      html += `<p><button id="billingPortalBtn" class="cta-secondary">Gérer paiements / moyens de paiement</button></p>`;
      
      box.innerHTML = html;

      const portalBtn = document.getElementById('billingPortalBtn');
      if (portalBtn) {
        portalBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          portalBtn.disabled = true;
          portalBtn.textContent = 'Ouverture du portail...';
          const res = await api('/api/billing/portal', { method: 'POST' });
          portalBtn.disabled = false;
          portalBtn.textContent = 'Gérer paiements / moyens de paiement';
          if (res && res.ok && res.url) {
            window.open(res.url, '_blank');
          } else {
            alert('Erreur lors de l\'ouverture du portail de facturation');
          }
        });
      }
    } catch(e) {
      console.error('[Billing] Error loading invoices:', e);
      const box = document.getElementById('billingBox');
      box.innerHTML = '<h3>💳 Factures</h3><p>Erreur lors du chargement des factures</p>';
    }
  }

  // Load subscription info
  async function loadSubscription() {
    try {
      // Si hors domaine officiel, rediriger l'utilisateur vers la page billing du site vitrine
      if (!isOfficialHost()) {
        document.getElementById('subscriptionContent').innerHTML = `
          <p>Pour gérer votre abonnement, annuler ou mettre à jour vos moyens de paiement, utilisez la page sécurisée :</n>
          <p><a class="cta" href="${BILLING_URL}" target="_blank" rel="noopener">Gérer mon abonnement</a></p>
        `;
        return;
      }

      const res = await api('/api/subscriptions/my-subscription');
      if (!res || !res.ok) {
        document.getElementById('subscriptionContent').innerHTML = '<p>Pas d\'abonnement actif actuellement.</p>';
        return;
      }
      
      const sub = res.subscription;
      if (!sub.isActive) {
        document.getElementById('subscriptionContent').innerHTML = '<p>Pas d\'abonnement actif actuellement.</p>';
        return;
      }
      
      const planName = sub.currentPlan ? sub.currentPlan.name : 'Plan inconnu';
      const startDate = sub.startDate ? new Date(sub.startDate).toLocaleDateString('fr-FR') : 'N/A';
      const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : 'N/A';
      const daysLeft = sub.daysUntilRenewal || 0;
      const statusColor = daysLeft > 14 ? '#4CAF50' : daysLeft > 0 ? '#ff9800' : '#d32f2f';
      
      let html = `
        <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <p><strong>Plan actuel:</strong> ${planName}</p>
          <p><strong>Début:</strong> ${startDate}</p>
          <p><strong>Renouvellement:</strong> ${endDate}</p>
          <p><strong>Jours restants:</strong> <span style="color: ${statusColor}; font-weight: bold;">${daysLeft} jours</span></p>
        </div>
        <div id="cancelSubscriptionBox" style="margin-top: 12px;">
          <button id="cancelSubscriptionBtn" class="cta-secondary" style="background-color: #ff9800; color: white; padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer;">Annuler mon abonnement</button>
          <div id="cancelSubscriptionMessage" style="margin-top: 12px;"></div>
        </div>
      `;
      document.getElementById('subscriptionContent').innerHTML = html;
      
      // Attach cancel button handler
      const cancelBtn = document.getElementById('cancelSubscriptionBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          
          if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement?\n\nVous conserverez l\'accès jusqu\'à la date de renouvellement.')) {
            return;
          }
          
          const msgDiv = document.getElementById('cancelSubscriptionMessage');
          msgDiv.textContent = 'Annulation en cours...';
          msgDiv.style.color = '#ff9800';
          
          try {
            const cancelRes = await api('/api/subscriptions/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            
            if (cancelRes && cancelRes.ok) {
              msgDiv.textContent = '✓ Abonnement annulé avec succès.';
              msgDiv.style.color = '#4CAF50';
              document.getElementById('cancelSubscriptionBtn').disabled = true;
              document.getElementById('cancelSubscriptionBtn').style.opacity = '0.5';
              setTimeout(() => { loadSubscription(); }, 2000);
            } else {
              msgDiv.textContent = '❌ Erreur: ' + (cancelRes && cancelRes.error ? cancelRes.error : 'Impossible d\'annuler l\'abonnement');
              msgDiv.style.color = '#d32f2f';
            }
          } catch (err) {
            msgDiv.textContent = '❌ Erreur: ' + err.message;
            msgDiv.style.color = '#d32f2f';
          }
        });
      }
    } catch (e) {
      console.error('[loadSubscription] error:', e);
      document.getElementById('subscriptionContent').innerHTML = '<p>Erreur lors du chargement de l\'abonnement.</p>';
    }
  }

  // Delete account handler
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Confirmation dialog
      if (!confirm('⚠️ ATTENTION: Êtes-vous sûr de vouloir supprimer votre compte?\n\nCette action est IRRÉVERSIBLE et toutes vos données seront perdues.')) {
        return;
      }
      
      // Second confirmation with typing
      const confirmPassword = prompt('Pour confirmer, veuillez entrer votre mot de passe:');
      if (!confirmPassword) {
        return;
      }
      
      const msg = document.getElementById('deleteAccountMessage');
      msg.textContent = 'Suppression en cours...';
      msg.style.color = '#ff6b6b';
      
      try {
        const res = await api('/api/users/self', { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: confirmPassword })
        });
        
        if (res && res.ok) {
          msg.textContent = '✓ Compte supprimé. Redirection...';
          msg.style.color = '#4CAF50';
          setTimeout(() => {
            window.location.href = '/account.html';
          }, 2000);
        } else {
          msg.textContent = '❌ Erreur: ' + (res && res.error ? res.error : 'Impossible de supprimer le compte');
          msg.style.color = '#d32f2f';
        }
      } catch (err) {
        msg.textContent = '❌ Erreur: ' + err.message;
        msg.style.color = '#d32f2f';
      }
    });
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
