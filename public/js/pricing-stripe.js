/* Minimal client code to create a Stripe Checkout session via server endpoint /create-checkout-session */
(async function() {
  function onBuyClick(e) {
    e.preventDefault();
    const priceId = this.dataset.priceId || this.getAttribute('data-price-id');
    const mode = this.dataset.mode || this.getAttribute('data-mode') || 'payment';
    if (!priceId) return console.warn('priceId not found on element', this);
    fetch('/create-checkout-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, mode })
    }).then(r => r.json()).then(j => {
      if (j && j.url) {
        window.location.href = j.url;
      } else {
        console.error('checkout session failed', j);
        alert('Erreur lors de la création de la session de paiement : ' + (j && j.error || 'unknown'));
      }
    }).catch(err => {
      console.error('Error creating checkout session', err);
    });
  }

  // Attach to any button with .stripe-buy class or data-price-id attribute
  document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button[data-price-id], a[data-price-id], .stripe-buy');
    buttons.forEach(btn => btn.addEventListener('click', onBuyClick));
  });
})();
