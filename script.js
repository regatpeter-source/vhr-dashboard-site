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

// Open dashboard launcher - downloads batch wrapper script
function openDashboard(event) {
  event.preventDefault();
  const link = document.createElement('a');
  link.href = '/download/launch-script';
  link.download = 'launch-dashboard.bat';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========== DOMContentLoaded Handlers ==========
document.addEventListener('DOMContentLoaded', function() {
  // Launch Dashboard button - download PowerShell script
  const launchBtn = document.getElementById('launchDashboardBtn');
  if (launchBtn) {
    launchBtn.addEventListener('click', openDashboard);
  }
  
  // All Stripe buttons handled by pricing-stripe.js (external script)
  // No local listeners needed to avoid conflicts
});
