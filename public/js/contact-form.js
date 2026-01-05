// Gestion du formulaire de contact pour /contact.html avec mise en avant de l'adresse support
(function() {
  const SUPPORT_EMAIL = 'support@vhr-dashboard-site.com';

  function buildMailtoLink(subject, body) {
    const s = encodeURIComponent(subject || 'Contact VHR Dashboard');
    const b = encodeURIComponent(body || 'Bonjour équipe VHR Dashboard,\n\n');
    return `mailto:${SUPPORT_EMAIL}?subject=${s}&body=${b}`;
  }

  function injectEncouragement() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.setAttribute('data-contact-enhanced', 'true');
    const banner = document.createElement('div');
    banner.style.background = '#e8f5e9';
    banner.style.border = '1px solid #43a047';
    banner.style.color = '#1b5e20';
    banner.style.padding = '12px 14px';
    banner.style.borderRadius = '10px';
    banner.style.marginBottom = '14px';
    banner.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
    banner.innerHTML = `💌 Une question, une démo ou un devis&nbsp;? <strong>Écrivez-nous</strong> — nous répondons vite !<br><a href="${buildMailtoLink('Demande VHR Dashboard','Bonjour, je souhaite en savoir plus sur VHR Dashboard.')}" style="color:#1b5e20;text-decoration:underline;">${SUPPORT_EMAIL}</a>`;
    form.parentElement?.insertBefore(banner, form);
  }

  document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    injectEncouragement();

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
          const mailto = buildMailtoLink(subject, `Bonjour,\n\n${message}\n\n— ${name} (${email})`);
          formStatus.innerHTML = `<p style="color: #1b5e20; font-weight:700;">✅ Message bien reçu ! Nous vous répondons sous 24h.<br><small>Vous pouvez aussi nous écrire directement à <a href="${mailto}" style="color:#1b5e20;text-decoration:underline;">${SUPPORT_EMAIL}</a></small></p>`;
          form.reset();
        } else {
          const mailto = buildMailtoLink(subject, `Bonjour,\n\n${message}\n\n— ${name} (${email})`);
          formStatus.innerHTML = `<p style="color: #c62828; font-weight:700;">❌ Erreur: ${data.error || 'envoi impossible'}<br><small>Essayez à nouveau ou écrivez-nous à <a href="${mailto}" style="color:#c62828;text-decoration:underline;">${SUPPORT_EMAIL}</a></small></p>`;
        }
      } catch (error) {
        console.error('Error:', error);
        const mailto = buildMailtoLink(subject, `Bonjour,\n\n${message}\n\n— ${name} (${email})`);
        formStatus.innerHTML = `<p style="color: #c62828; font-weight:700;">❌ Erreur réseau lors de l'envoi.<br><small>Envoyez-nous directement un email à <a href="${mailto}" style="color:#c62828;text-decoration:underline;">${SUPPORT_EMAIL}</a></small></p>`;
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
})();
