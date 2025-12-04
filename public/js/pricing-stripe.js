/* Minimal client code to create a Stripe Checkout session via server endpoint /create-checkout-session */
(function() {
  function onBuyClick(e) {
    console.log('[pricing-stripe] onBuyClick called, e:', e);
    e.preventDefault();
    console.log('[pricing-stripe] preventDefault() called');
    const priceId = this.dataset.priceId || this.getAttribute('data-price-id');
    const mode = this.dataset.mode || this.getAttribute('data-mode') || 'payment';
    if (!priceId) return console.warn('[pricing-stripe] priceId not found on element', this);
    
    console.log('[pricing-stripe] Creating checkout session:', { priceId, mode });
    
    fetch('/create-checkout-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, mode })
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
