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

// Vérifier l'authentification pour le téléchargement de la démo
function handleDemoDownload(event) {
  event.preventDefault();
  
  // Vérifier si l'utilisateur a un token (connecté)
  const token = localStorage.getItem('vhr_token') || 
                (typeof getCookie === 'function' ? getCookie('vhr_token') : null);
  
  if (!token) {
    // Utilisateur non authentifié - afficher message
    alert('⚠️ Vous devez créer un compte pour télécharger la démo.\n\nVous pouvez vous inscrire gratuitement pour accéder à la démo et profiter de 7 jours d\'essai gratuits !');
    // Rediriger vers la page de création de compte ou connexion
    window.location.href = '/account.html';
    return;
  }
  
  // Utilisateur authentifié - télécharger la démo
  window.location.href = '/vhr-dashboard-demo.zip';
}
