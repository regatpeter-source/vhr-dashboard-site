/* Minimal client code to create a Stripe Checkout session via server endpoint /create-checkout-session */
(function() {
  const OFFICIAL_HOSTS = ['www.vhr-dashboard-site.com', 'vhr-dashboard-site.com', 'vhr-dashboard-site.com'];
  const PRICING_URL = 'https://vhr-dashboard-site.com/pricing.html';
  let cachedAccountUser = null;
  let accountUserPromise = null;
  function shouldRedirectExternally() {
    return !OFFICIAL_HOSTS.includes(window.location.hostname);
  }
  function redirectToExternalPricing(mode) {
    const plan = mode === 'subscription' ? 'subscription' : 'payment';
    const url = `${PRICING_URL}?plan=${encodeURIComponent(plan)}#checkout`;
    window.location.href = url;
  }

  // Proceed to Stripe checkout (account-linked only)
  function proceedToCheckout(priceId, mode) {
    console.log('[pricing-stripe] Creating checkout session:', { priceId, mode, accountLinked: true });
    const payload = { priceId, mode };
    
    fetch('/create-checkout-session', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
  
  async function fetchLoggedInUser() {
    if (cachedAccountUser) return cachedAccountUser;
    if (accountUserPromise) return accountUserPromise;

    accountUserPromise = (async () => {
      try {
        const resp = await fetch('/api/me', { credentials: 'include' });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.ok && data.user) {
          cachedAccountUser = data.user;
          return cachedAccountUser;
        }
      } catch (err) {
        console.log('[pricing-stripe] Unable to fetch logged-in user:', err);
      }
      return null;
    })();

    const result = await accountUserPromise;
    accountUserPromise = null;
    return result;
  }

  async function onBuyClick(e) {
    console.log('[pricing-stripe] onBuyClick called, e:', e);
    e.preventDefault();
    console.log('[pricing-stripe] preventDefault() called');
    const priceId = this.dataset.priceId || this.getAttribute('data-price-id');
    const mode = this.dataset.mode || this.getAttribute('data-mode') || 'payment';
    if (!priceId) return console.warn('[pricing-stripe] priceId not found on element', this);
    
    if (OFFICIAL_HOSTS.includes(window.location.hostname)) {
      const accountUser = await fetchLoggedInUser();
      if (accountUser && accountUser.username && accountUser.email) {
        console.log('[pricing-stripe] Logged-in user detected; skipping registration modal');
        proceedToCheckout(priceId, mode);
        return;
      }
    }

    if (shouldRedirectExternally()) {
      console.log('[pricing-stripe] Redirecting to external pricing page (official domain)');
      redirectToExternalPricing(mode);
      return;
    }

    const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash || ''}` || '/pricing.html#checkout');
    alert('Connectez-vous à votre compte pour lancer un paiement lié automatiquement à votre profil.');
    window.location.href = `/account.html?action=checkout_login_required&redirect=${returnTo}`;
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
