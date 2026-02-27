// Gestion du formulaire de contact pour /contact.html
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formStatus = document.getElementById('formStatus');
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!name || !email || !subject || !message) {
        formStatus.innerHTML = '<p style="color: #c62828; font-weight:600;">⚠️ Tous les champs sont requis.</p>';
        return;
      }

      formStatus.innerHTML = '<p style="color:#0d47a1; font-weight:600;">📨 Envoi en cours... Nous revenons vers vous rapidement.</p>';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (data.ok) {
          formStatus.innerHTML = '<p style="color: #1b5e20; font-weight:700;">✅ Message bien reçu. Nous vous répondons rapidement par email.</p>';
          form.reset();
        } else {
          formStatus.innerHTML = `<p style="color: #c62828; font-weight:700;">❌ Erreur: ${data.error || 'envoi impossible'}</p>`;
        }
      } catch (error) {
        console.error('Error:', error);
        formStatus.innerHTML = '<p style="color: #c62828; font-weight:700;">❌ Erreur réseau lors de l\'envoi.</p>';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
})();
