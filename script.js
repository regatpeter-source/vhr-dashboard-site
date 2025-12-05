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

// Télécharger la démo - simple et direct
function handleDemoDownload(event) {
  event.preventDefault();
  // Redirection vers le launcher local
  window.location.href = '/launch-dashboard.html';
}

// Vérifier l'authentification pour l'abonnement
function handleSubscriptionClick(event) {
  event.preventDefault();
  
  // Vérifier si l'utilisateur a un token (connecté)
  const token = localStorage.getItem('vhr_token') || getCookie('vhr_token');
  
  if (!token) {
    // Utilisateur non authentifié - rediriger vers la page de compte
    window.location.href = '/account.html?action=subscription_required';
    return;
  }
  
  // Utilisateur authentifié - continuer avec le paiement
  // Laisser le gestionnaire Stripe par défaut prendre le relais
  return true;
}

// Initialize demo download listeners (but NOT subscription buttons - handled by pricing-stripe.js)
document.addEventListener('DOMContentLoaded', function() {
  const demoBtnMain = document.getElementById('demo-download-btn');
  const demoBtnFooter = document.getElementById('demo-download-footer');
  
  if (demoBtnMain) {
    demoBtnMain.addEventListener('click', handleDemoDownload);
  }
  if (demoBtnFooter) {
    demoBtnFooter.addEventListener('click', handleDemoDownload);
  }
});
