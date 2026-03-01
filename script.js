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
      status.innerHTML = '<p style="color: red; font-weight: bold;">⚠️ Tous les champs sont requis.</p>';
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
        status.innerHTML = '<p style="color: green; font-weight: bold;">✅ Message reçu! Nous vous répondrons très bientôt.</p>';
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

// Utilitaire pour lire un cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// ---- Gestion du bouton "Lancer maintenant" (bloqué tant que le compte n'est pas créé) ----
let isLaunchAllowed = false;
let launchGuardMessageEl = null;

function ensureLaunchGuardMessage() {
  if (launchGuardMessageEl) return launchGuardMessageEl;
  launchGuardMessageEl = document.createElement('div');
  launchGuardMessageEl.id = 'launchGuardMessage';
  launchGuardMessageEl.setAttribute('role', 'status');
  launchGuardMessageEl.style.marginTop = '12px';
  launchGuardMessageEl.style.padding = '10px 12px';
  launchGuardMessageEl.style.borderRadius = '10px';
  launchGuardMessageEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
  launchGuardMessageEl.style.fontWeight = '600';
  launchGuardMessageEl.style.textAlign = 'left';
  launchGuardMessageEl.style.lineHeight = '1.5';
  return launchGuardMessageEl;
}

function setLaunchBlocked(messageHtml) {
  const btn = document.getElementById('launchDashboardBtn');
  if (!btn) return;
  isLaunchAllowed = false;
  btn.setAttribute('aria-disabled', 'true');
  btn.dataset.blocked = '1';
  btn.style.opacity = '0.6';
  btn.style.cursor = 'not-allowed';

  const container = btn.closest('.download-block') || btn.parentElement;
  const msg = ensureLaunchGuardMessage();
  msg.style.background = '#fbe9e7';
  msg.style.color = '#c62828';
  msg.innerHTML = messageHtml || '🔐 Créez votre compte avant de lancer le dashboard.';
  if (container && !msg.isConnected) {
    container.appendChild(msg);
  }
}

function setLaunchAllowed(user) {
  const btn = document.getElementById('launchDashboardBtn');
  if (!btn) return;
  isLaunchAllowed = true;
  btn.removeAttribute('aria-disabled');
  btn.dataset.blocked = '';
  btn.style.opacity = '';
  btn.style.cursor = '';

  const msg = ensureLaunchGuardMessage();
  msg.style.background = '#e8f5e9';
  msg.style.color = '#1b5e20';
  const username = (user && (user.username || user.name)) || 'Votre compte';
  msg.innerHTML = `✅ ${username} est connecté. Vous pouvez lancer le dashboard.`;
  if (!msg.isConnected) {
    const container = btn.closest('.download-block') || btn.parentElement;
    if (container) container.appendChild(msg);
  }
}

async function checkLaunchEligibility() {
  const defaultMessage = '🔐 Créez un compte gratuit avant de lancer le dashboard.<br><a href="/account.html?action=launch_required" style="color:#c62828;text-decoration:underline;">Créer mon compte</a>';
  setLaunchBlocked(defaultMessage);
  try {
    const res = await fetch('/api/check-auth', { credentials: 'include' });
    const data = await res.json();
    const allowed = data && data.ok && (data.authenticated || (data.user && data.user.username));
    if (allowed) {
      setLaunchAllowed(data.user);
    } else {
      setLaunchBlocked(defaultMessage);
    }
  } catch (e) {
    console.warn('[launch] Impossible de vérifier le compte avant le lancement:', e);
    setLaunchBlocked(defaultMessage);
  }
}

function handleLaunchClick(event) {
  if (!isLaunchAllowed) {
    event.preventDefault();
    const redirectTarget = encodeURIComponent('/launch-dashboard.html');
    window.location.href = `/account.html?action=launch_required&redirect=${redirectTarget}`;
    return;
  }
  openDashboard(event);
}

// Open dashboard launcher - redirect to launcher page
function openDashboard(event) {
  event.preventDefault();
  window.location.href = '/launch-dashboard.html';
}

// ========== DOMContentLoaded Handlers ==========
document.addEventListener('DOMContentLoaded', function() {
  // Launch Dashboard button - download PowerShell script
  const launchBtn = document.getElementById('launchDashboardBtn');
  if (launchBtn) {
    launchBtn.addEventListener('click', handleLaunchClick);
    checkLaunchEligibility();
  }
  
  // All Stripe buttons handled by pricing-stripe.js (external script)
  // No local listeners needed to avoid conflicts
});
