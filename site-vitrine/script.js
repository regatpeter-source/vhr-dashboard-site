// Animation menu actif
const links = document.querySelectorAll('nav ul li a');
links.forEach(link => {
  link.addEventListener('click', function() {
    links.forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

// Formulaire de contact - Envoi réel à l'API
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    if (!name || !email || !subject || !message) {
      status.innerHTML = '<p style="color: red; font-weight: bold;">Tous les champs sont requis.</p>';
      return;
    }
    
    status.textContent = '📤 Envoi en cours...';
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, subject, message })
      });

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (parseErr) {
        console.error('[contact-form] Invalid JSON response from /api/contact:', parseErr);
        data = null;
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Réponse invalide du serveur');
      }
      
      if (data.ok) {
        status.innerHTML = '<p style="color: green; font-weight: bold;">Message reçu! Nous vous répondrons très bientôt.</p>';
        form.reset();
      } else {
        status.innerHTML = `<p style="color: red; font-weight: bold;">❌ Erreur: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      status.innerHTML = '<p style="color: red; font-weight: bold;">❌ Erreur lors de l\'envoi du message.</p>';
    }
  });
}
