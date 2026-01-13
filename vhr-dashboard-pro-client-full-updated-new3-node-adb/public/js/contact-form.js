// Handle contact form submission for /contact.html
document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formStatus = document.getElementById('formStatus');
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    if (!name || !email || !subject || !message) {
      formStatus.innerHTML = '<p style="color: red;">Tous les champs sont requis.</p>';
      return;
    }
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, subject, message })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        formStatus.innerHTML = '<p style="color: green; font-weight: bold;">Message reçu! Nous vous répondrons bientôt.</p>';
        form.reset();
      } else {
        formStatus.innerHTML = `<p style="color: red;">Erreur: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Error:', error);
      formStatus.innerHTML = '<p style="color: red;">Erreur lors de l\'envoi du message.</p>';
    }
  });
});
