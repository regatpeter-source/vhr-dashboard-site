/* Minimal client code to create a Stripe Checkout session via server endpoint /create-checkout-session */
(function() {
  const OFFICIAL_HOSTS = ['www.vhr-dashboard-site.com', 'vhr-dashboard-site.com'];
  const PRICING_URL = 'https://www.vhr-dashboard-site.com/pricing.html';

  function shouldRedirectExternally() {
    return !OFFICIAL_HOSTS.includes(window.location.hostname);
  }

  function redirectToExternalPricing(mode) {
    const plan = mode === 'subscription' ? 'subscription' : 'payment';
    const url = `${PRICING_URL}?plan=${encodeURIComponent(plan)}#checkout`;
    window.location.href = url;
  }
  // Show registration modal before proceeding to Stripe
  function showRegistrationModal(priceId, mode, button) {
    const modal = document.createElement('div');
    modal.id = 'registration-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const form = document.createElement('form');
    form.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 90%;
    `;
    
    form.innerHTML = `
      <h2 style="margin-top: 0; color: #333;">Créer votre compte</h2>
      <p style="color: #666; font-size: 14px;">Remplissez ces champs pour accéder à votre compte après paiement</p>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Nom d'utilisateur</label>
        <input type="text" name="username" placeholder="Mon_nom_d_utilisateur" required 
          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
        <small style="color: #999;">Lettres, chiffres, tirets et traits d'union</small>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Email</label>
        <input type="email" name="email" placeholder="votre@email.com" required 
          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Mot de passe</label>
        <input type="password" name="password" placeholder="Au moins 8 caractères" required 
          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
        <small style="color: #999;">Min. 8 caractères avec majuscule, chiffre et caractère spécial</small>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button type="submit" style="flex: 1; padding: 10px; background: #2ecc71; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
          Continuer vers le paiement
        </button>
        <button type="button" id="cancel-btn" style="flex: 1; padding: 10px; background: #ccc; color: #333; border: none; border-radius: 5px; cursor: pointer;">
          Annuler
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cancel button closes modal
    form.querySelector('#cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = form.querySelector('input[name="username"]').value.trim();
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;
      
      // Basic validation
      if (!username || !email || !password) {
        alert('Tous les champs sont requis');
        return;
      }
      
      if (password.length < 8) {
        alert('Le mot de passe doit faire au moins 8 caractères');
        return;
      }
      
      console.log('[pricing-stripe] User registration data:', { username, email, mode });
      
      // Proceed to checkout with user data
      proceedToCheckout(priceId, mode, { username, email, password });
      modal.remove();
    });
    
    modal.appendChild(form);
    form.querySelector('input[name="username"]').focus();
  }
  
  // Proceed to Stripe checkout
  function proceedToCheckout(priceId, mode, userData = {}) {
    console.log('[pricing-stripe] Creating checkout session:', { priceId, mode, hasUser: !!userData.username });
    
    const payload = { priceId, mode };
    if (userData.username) {
      payload.userEmail = userData.email;
      payload.username = userData.username;
      payload.password = userData.password;
    }
    
    fetch('/create-checkout-session', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(j => {
      console.log('[pricing-stripe] Checkout response:', j);
      if (j && j.url) {
        console.log('[pricing-stripe] Redirecting to Stripe:', j.url);
        window.location.href = j.url;
      } else {
        console.error('[pricing-stripe] checkout session failed', j);
        alert('Erreur lors de la création de la session de paiement : ' + (j && j.error || 'unknown'));
      }
    }).catch(err => {
      console.error('[pricing-stripe] fetch error:', err);
      alert('Erreur de connexion : ' + err.message);
    });
  }
  
  function onBuyClick(e) {
    console.log('[pricing-stripe] onBuyClick called, e:', e);
    e.preventDefault();
    console.log('[pricing-stripe] preventDefault() called');
    const priceId = this.dataset.priceId || this.getAttribute('data-price-id');
    const mode = this.dataset.mode || this.getAttribute('data-mode') || 'payment';
    if (!priceId) return console.warn('[pricing-stripe] priceId not found on element', this);

    // Option 2: si on est en dehors du domaine vitrine, rediriger vers la page pricing officielle (clé live déjà configurée là-bas)
    if (shouldRedirectExternally()) {
      console.log('[pricing-stripe] Redirecting to external pricing page (official domain)');
      redirectToExternalPricing(mode);
      return;
    }
    
    // Show registration modal before proceeding to Stripe
    showRegistrationModal(priceId, mode, this);
  }

  // Attach to any button with .stripe-buy class or data-price-id attribute
  function attachEventListeners() {
    const buttons = document.querySelectorAll('button[data-price-id], a[data-price-id], .stripe-buy');
    console.log('[pricing-stripe] Found', buttons.length, 'buttons to attach listeners');
    buttons.forEach(btn => {
      if (!btn.hasListener) {
        btn.addEventListener('click', onBuyClick);
        btn.hasListener = true;
        console.log('[pricing-stripe] Attached listener to button:', btn.id || btn.textContent);
      }
    });
  }

  // Attach listeners when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEventListeners);
  } else {
    // DOM already loaded
    attachEventListeners();
  }
  
  // Also attach on any dynamically added buttons
  const observer = new MutationObserver(attachEventListeners);
  observer.observe(document.body, { childList: true, subtree: true });
})();
