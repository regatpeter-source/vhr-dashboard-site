// ========== VHR DASHBOARD AUTHENTICATION SYSTEM ==========

// Event listeners setup (CSP compliant - no inline onclick)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnLogin')?.addEventListener('click', handleLogin);
  document.getElementById('btnRegister')?.addEventListener('click', handleRegister);
  document.getElementById('btnSwitchToRegister')?.addEventListener('click', switchToRegister);
  document.getElementById('btnSwitchToLogin')?.addEventListener('click', switchToLogin);
  document.getElementById('linkToRegister')?.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
  document.getElementById('linkToLogin')?.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });
  document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
  
  // Enter key on login
  document.getElementById('loginPass')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

async function handleLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('errorMessage');
  
  if (!username || !password) {
    errorEl.textContent = 'Veuillez remplir tous les champs';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('[auth] login success:', data.username);
      errorEl.style.display = 'none';
      document.getElementById('loginUser').value = '';
      document.getElementById('loginPass').value = '';
      
      // Save user info and show dashboard
      localStorage.setItem('vhr_user', data.username);
      showDashboard();
      checkDemoStatus();
      checkSubscriptionStatus();
    } else {
      errorEl.textContent = data.error || 'Erreur de connexion';
      errorEl.style.display = 'block';
    }
  } catch (e) {
    console.error('[auth] login error:', e);
    errorEl.textContent = 'Erreur réseau: ' + e.message;
    errorEl.style.display = 'block';
  }
}

async function handleRegister() {
  const username = document.getElementById('regUser').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const password2 = document.getElementById('regPass2').value;
  const errorEl = document.getElementById('regErrorMessage');
  const successEl = document.getElementById('regSuccessMessage');
  
  if (!username || !email || !password || !password2) {
    errorEl.textContent = 'Veuillez remplir tous les champs';
    errorEl.style.display = 'block';
    return;
  }
  
  if (password !== password2) {
    errorEl.textContent = 'Les mots de passe ne correspondent pas';
    errorEl.style.display = 'block';
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('[auth] register success:', data.username);
      errorEl.style.display = 'none';
      successEl.textContent = '✅ Inscription réussie! Vous êtes connecté.';
      successEl.style.display = 'block';
      
      setTimeout(() => {
        localStorage.setItem('vhr_user', data.username);
        showDashboard();
        checkDemoStatus();
        checkSubscriptionStatus();
      }, 1000);
    } else {
      errorEl.textContent = data.error || 'Erreur lors de l\'inscription';
      errorEl.style.display = 'block';
      successEl.style.display = 'none';
    }
  } catch (e) {
    console.error('[auth] register error:', e);
    errorEl.textContent = 'Erreur réseau: ' + e.message;
    errorEl.style.display = 'block';
  }
}

function handleLogout() {
  localStorage.removeItem('vhr_user');
  document.getElementById('dashboardContainer').style.display = 'none';
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  switchToLogin();
}

function switchToLogin() {
  document.getElementById('loginMode').style.display = 'block';
  document.getElementById('registerMode').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('successMessage').style.display = 'none';
}

function switchToRegister() {
  document.getElementById('loginMode').style.display = 'none';
  document.getElementById('registerMode').style.display = 'block';
  document.getElementById('regErrorMessage').style.display = 'none';
  document.getElementById('regSuccessMessage').style.display = 'none';
}

function showDashboard() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('dashboardContainer').style.display = 'block';
  
  const username = localStorage.getItem('vhr_user');
  document.getElementById('currentUsername').textContent = username;
  
  loadDevices();
}

async function checkDemoStatus() {
  try {
    const response = await fetch('/api/demo/status', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.ok) {
      const daysRemaining = data.demo.remainingDays;
      const warningBanner = document.getElementById('demoWarningBanner');
      const expiredBanner = document.getElementById('demoExpiredBanner');
      const demoStatus = document.getElementById('demoStatus');
      
      if (data.demo.hasActiveSubscription) {
        demoStatus.innerHTML = '✅ <strong>Abonné</strong>';
        warningBanner.style.display = 'none';
        expiredBanner.style.display = 'none';
      } else if (data.demo.demoExpired) {
        demoStatus.innerHTML = '❌ <strong>Essai expiré</strong>';
        expiredBanner.style.display = 'block';
        warningBanner.style.display = 'none';
      } else {
        demoStatus.innerHTML = `⏱️ <strong>Essai: ${daysRemaining}j</strong>`;
        if (daysRemaining <= 3) {
          warningBanner.style.display = 'block';
          document.getElementById('daysUntilExpiry').textContent = daysRemaining;
        } else {
          warningBanner.style.display = 'none';
        }
        expiredBanner.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('[demo] status check error:', e);
  }
}

async function checkSubscriptionStatus() {
  try {
    const response = await fetch('/api/subscriptions/my-subscription', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.ok) {
      const badge = document.getElementById('subscriptionStatus');
      if (data.subscription.isActive) {
        badge.textContent = '💳 ' + (data.subscription.currentPlan?.name || 'Abonné');
        badge.className = 'subscription-badge active';
      } else {
        badge.textContent = '📋 Essai';
        badge.className = 'subscription-badge trial';
      }
    }
  } catch (e) {
    console.error('[subscription] check error:', e);
  }
}

// Check if already logged in
window.addEventListener('load', () => {
  const savedUser = localStorage.getItem('vhr_user');
  if (savedUser) {
    showDashboard();
    checkDemoStatus();
    checkSubscriptionStatus();
  }
});

// Refresh demo status every minute
setInterval(checkDemoStatus, 60000);
