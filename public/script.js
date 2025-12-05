// Copie de root script.js vers public/script.js pour servir au chemin /script.js
// Animation menu actif
const links = document.querySelectorAll('nav ul li a');
links.forEach(link => {
  link.addEventListener('click', function() {
    links.forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

// Formulaire de contact (simulation)
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    status.textContent = 'Envoi en cours...';
    setTimeout(() => {
      status.textContent = 'Merci, votre message a bien été envoyé !';
      form.reset();
    }, 1200);
  });
}

// Utilitaire pour lire un cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Open local dashboard in new window
function openDashboard(event) {
  event.preventDefault();
  window.open('http://localhost:3000', '_blank');
}

// ========== DOMContentLoaded Handlers ==========
document.addEventListener('DOMContentLoaded', function() {
  // All Stripe buttons handled by pricing-stripe.js (external script)
  // No local listeners needed to avoid conflicts
});
