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

// Vérifier l'authentification pour le téléchargement de la démo
function handleDemoDownload(event) {
  event.preventDefault();
  
  // Vérifier si l'utilisateur a un token (connecté)
  // Chercher dans localStorage ou cookies
  let token = localStorage.getItem('vhr_token') || getCookie('vhr_token');
  
  console.log('[demo] token from storage/cookie:', !!token);
  
  // Si pas de token, vérifier auprès du serveur si l'utilisateur est authentifié
  if (!token) {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.user) {
          console.log('[demo] user authenticated via /api/me:', data.user.username);
          // Utilisateur authentifié - télécharger la démo
          downloadDemo();
        } else {
          console.log('[demo] user not authenticated');
          // Utilisateur non authentifié - rediriger vers la page de compte
          window.location.href = '/account.html?action=demo_required';
        }
      })
      .catch(err => {
        console.error('[demo] error checking auth:', err);
        window.location.href = '/account.html?action=demo_required';
      });
    return;
  }
  
  // Utilisateur authentifié - télécharger la démo
  downloadDemo();
}

function downloadDemo() {
  console.log('[demo] downloading demo zip');
  const link = document.createElement('a');
  link.href = '/vhr-dashboard-demo.zip';
  link.download = 'vhr-dashboard-demo.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Initialize subscription button listeners (CSP-compliant)
document.addEventListener('DOMContentLoaded', function() {
  const subBtn = document.getElementById('stripe-sub-btn');
  const oneTimeBtn = document.getElementById('stripe-onetime-btn');
  const demoBtnMain = document.getElementById('demo-download-btn');
  const demoBtnFooter = document.getElementById('demo-download-footer');
  
  if (subBtn) {
    subBtn.addEventListener('click', handleSubscriptionClick);
  }
  if (oneTimeBtn) {
    oneTimeBtn.addEventListener('click', handleSubscriptionClick);
  }
  if (demoBtnMain) {
    demoBtnMain.addEventListener('click', handleDemoDownload);
  }
  if (demoBtnFooter) {
    demoBtnFooter.addEventListener('click', handleDemoDownload);
  }
});
