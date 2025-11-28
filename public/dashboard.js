

// ========== NAVBAR & MULTI-UTILISATEURS PRO ========== 
// AVERTISSEMENT SÉCURITÉ (mode démo)
function showSecurityBanner() {
  if (document.getElementById('securityBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'securityBanner';
  banner.className = 'securityBanner';
  banner.innerHTML = '⚠️ Ce dashboard est en mode démo/local sans authentification sécurisée. Pour un usage commercial, intégrez une authentification serveur et ne stockez aucune donnée sensible côté client.';
  document.body.appendChild(banner);
  document.body.style.paddingTop = '80px';
}

// Détection naïve : si pas de session utilisateur serveur, afficher le bandeau et la modale de connexion
if (!localStorage.getItem('vrm_auth_token')) {
  showSecurityBanner();
  setTimeout(showLoginModal, 400);
}

// ========== MODALE DE CONNEXION ========== 
function showLoginModal() {
  if (document.getElementById('loginModal')) return;
  let modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = 'modal';
  modal.innerHTML = `<div class='modal-content' style="background:#23272f;padding:32px 28px 22px 28px;border-radius:14px;box-shadow:0 4px 32px #000a;max-width:95vw;width:350px;margin:60px auto 0 auto;position:relative;">
    <h2 style='margin-bottom:18px;'>Connexion</h2>
    <form id='loginForm'>
      <input id='loginUser' type='text' placeholder='Nom d\'utilisateur' style='width:100%;margin-bottom:12px;padding:10px;font-size:16px;border-radius:7px;border:1px solid #888;background:#181c24;color:#fff;'>
      <input id='loginPass' type='password' placeholder='Mot de passe' style='width:100%;margin-bottom:18px;padding:10px;font-size:16px;border-radius:7px;border:1px solid #888;background:#181c24;color:#fff;'>
      <button type='submit' style='width:100%;padding:10px 0;font-size:17px;border-radius:8px;background:#2196f3;color:#fff;border:none;cursor:pointer;'>Se connecter</button>
    </form>
    <span id='closeLoginModalBtn' style="position:absolute;top:10px;right:18px;font-size:22px;cursor:pointer;color:#aaa;">×</span>
    <div id='loginError' style='color:#e53935;margin-top:10px;display:none;'></div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('closeLoginModalBtn').addEventListener('click', closeLoginModal);
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const res = await login(user, pass);
    if (res.ok) {
      closeLoginModal();
      location.reload();
    } else {
      document.getElementById('loginError').innerText = res.error || 'Erreur de connexion';
      document.getElementById('loginError').style.display = 'block';
    }
  };
}
function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.remove();
}

// ========== LOGIN/LOGOUT API ========== 
async function login(username, password) {
  // Appel API sécurisé côté serveur (commercial)
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.ok && data.token) {
      localStorage.setItem('vrm_auth_token', data.token);
      localStorage.setItem('vrm_user', data.username);
      // Optionnel : stocker le rôle pour l'UI
      if (data.role) {
        let roles = JSON.parse(localStorage.getItem('vrm_user_roles')||'{}');
        roles[data.username] = data.role;
        localStorage.setItem('vrm_user_roles', JSON.stringify(roles));
      }
      return { ok: true };
    } else {
      return { ok: false, error: data.error || 'Erreur de connexion' };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Déconnexion sécurisée côté serveur
async function logout() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer '+localStorage.getItem('vrm_auth_token') }
    });
  } catch (e) {}
  localStorage.removeItem('vrm_auth_token');
  // localStorage.removeItem('vrm_user'); // Optionnel
  location.reload();
}
// Barre de navigation moderne
function createNavbar() {
  if (document.getElementById('mainNavbar')) return;
  const nav = document.createElement('nav');
  nav.id = 'mainNavbar';
  nav.className = 'mainNavbar';
  nav.innerHTML = `
    <div class='navbar-left'>
      <img src='logo-vr.png' alt='VR' class='navbar-logo'>
      <span class='navbar-title'>VHR Dashboard</span>
    </div>
    <div class='navbar-spacer'></div>
      <button id='refreshDevicesBtn' class='navbar-refresh' title='Rafraîchir la liste'>🔄 Rafraîchir</button>
      <button id='loginBtnTop' class='navbar-login' title='Se connecter' style='margin-left:8px;'>Se connecter</button>
      <div id='navbarQuick' class='navbar-quick'></div>
  `;
  setTimeout(() => {
    const btn = document.getElementById('refreshDevicesBtn');
    if (btn) btn.addEventListener('click', () => { loadDevices(); showToast('Liste des casques rafraîchie', 'info', 1500); });
    // Apply safe event handler to img if exists (no inline attributes to comply with CSP)
    const navImg = nav.querySelector('.navbar-logo');
    if (navImg) {
      navImg.addEventListener('error', () => { navImg.style.display = 'none'; });
    }
  }, 100);
  // Hook up our top login button for convenience
  setTimeout(() => {
    const loginTop = document.getElementById('loginBtnTop');
    if (loginTop) loginTop.addEventListener('click', showLoginModal);
  }, 150);
  document.body.appendChild(nav);
  document.body.style.paddingTop = '48px';
}

// Make sure a navbar exists on initial load
createNavbar();

// Ensure minimal injected styles and body padding for the navbar
function injectDashboardStyles() {
  try {
    console.log('[Dashboard] injectDashboardStyles called');
    let s = document.getElementById('dashboard-injected-style');
    if (!s) {
      s = document.createElement('style');
      s.id = 'dashboard-injected-style';
      s.innerHTML = `
        /* minimal layout adjustments added by JS */
        body { transition: padding-top .15s ease-out; }
        #mainNavbar { position: fixed; z-index: 1100; width: 100vw; }
      `;
      document.head.appendChild(s);
    }
    const nav = document.getElementById('mainNavbar');
    if (nav) {
      nav.style.display = 'flex';
      document.body.style.paddingTop = (nav.offsetHeight + 10) + 'px';
    }
  } catch (e) { console.error('[injectDashboardStyles] error', e); }
}

let currentUser = localStorage.getItem('vrm_user') || '';
let userList = JSON.parse(localStorage.getItem('vrm_user_list') || '[]');
let userRoles = JSON.parse(localStorage.getItem('vrm_user_roles') || '{}'); // { user: role }
// Modal cleanup callbacks (global) - initialized early to avoid TDZ runtime errors
let modalCleanupCallbacks = [];
let modalOpen = false;

function saveUserList() {
  localStorage.setItem('vrm_user_list', JSON.stringify(userList));
  localStorage.setItem('vrm_user_roles', JSON.stringify(userRoles));
}

function setUser(user) {
  currentUser = user;
  localStorage.setItem('vrm_user', user);
  if (!userList.includes(user)) {
    userList.push(user);
    saveUserList();
  }
  updateUserUI();
}

function removeUser(user) {
  userList = userList.filter(u => u !== user);
  if (userRoles[user]) delete userRoles[user];
  saveUserList();
  if (currentUser === user) {
    setUser(userList[0] || 'Invité');
  } else {
    updateUserUI();
  }
}

function setUserRole(user, role) {
  userRoles[user] = role;
  saveUserList();
  updateUserUI();
}

function updateUserUI() {
  let quick = document.getElementById('navbarQuick');
  if (!quick) return;
    let role = userRoles[currentUser] || 'user';
  let roleColor = role==='admin' ? '#ff9800' : (role==='user' ? '#2196f3' : '#aaa');
  let html = `<span style='font-size:18px;vertical-align:middle;'>👤</span> <b>${currentUser ? currentUser : '<i>non connecté</i>'}</b> <span style="font-size:12px;background:${roleColor};color:#fff;padding:2px 8px;border-radius:8px;margin-left:6px;">${role}</span> `;
  if (localStorage.getItem('vrm_auth_token')) {
    html += `<button id="logoutBtn" style='margin-left:10px;'>Déconnexion</button>`;
    html += `<button id="userMenuBtn" style='margin-left:8px;'>Mon compte</button>`;
  } else {
    html += `<button id="loginBtn" style='margin-left:10px;'>Se connecter</button>`;
  }
  quick.innerHTML = html;
  // Top-level login button visibility
  const loginTop = document.getElementById('loginBtnTop');
  if (loginTop) {
    if (localStorage.getItem('vrm_auth_token')) loginTop.style.display = 'none';
    else loginTop.style.display = 'inline-block';
  }
  if (localStorage.getItem('vrm_auth_token')) {
    const logoutBtnEl = document.getElementById('logoutBtn'); if (logoutBtnEl) logoutBtnEl.addEventListener('click', logout);
  } else {
    const loginBtnEl = document.getElementById('loginBtn'); if (loginBtnEl) loginBtnEl.addEventListener('click', showLoginModal);
  }
  const userMenuBtn = document.getElementById('userMenuBtn'); if (userMenuBtn) userMenuBtn.addEventListener('click', showUserMenu);
  // If no auth token, hide Mon compte button (only shows for logged-in users)
  if (!localStorage.getItem('vrm_auth_token')) {
    if (userMenuBtn) userMenuBtn.style.display = 'none';
  }
}

function showUserMenu() {
  let menu = document.getElementById('userMenu');
  if (menu) menu.remove();
  menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.style = 'position:fixed;top:48px;right:16px;background:#23272f;color:#fff;padding:16px 22px;z-index:1200;border-radius:8px;box-shadow:0 2px 16px #0008;min-width:270px;max-width:90vw;';
  let html = `<b style='font-size:17px;'>Utilisateurs</b><ul style='margin:10px 0 14px 0;padding:0;list-style:none;'>`;
  let role = userRoles[currentUser] || 'user';
  let isAdmin = role === 'admin';
  userList.forEach(u => {
    let urole = userRoles[u]||'user';
    let roleColor = urole==='admin' ? '#ff9800' : (urole==='user' ? '#2196f3' : '#aaa');
    html += `<li style='margin-bottom:6px;'>
      <span class='user-menu-user' data-user='${u}' style='cursor:pointer;color:${u===currentUser?'#0f0':'#fff'};font-weight:${u===currentUser?'bold':'normal'}'>${u}</span>
      <span style='font-size:11px;background:${roleColor};color:#fff;padding:2px 8px;border-radius:8px;margin-left:6px;'>${urole}</span>
      ${isAdmin && u!=='Invité'?`<button class='user-menu-remove' data-user='${u}' style='margin-left:8px;font-size:11px;'>Suppr</button>`:''}
      <button class='user-menu-role' data-user='${u}' style='margin-left:4px;font-size:11px;'>Rôle</button>
    </li>`;
  });
  html += `</ul>`;
  html += `<button id='editTitleBtn' style='margin-bottom:8px;' disabled title='Titre fixe: VHR Dashboard'>📝 Modifier le titre</button> `;
  html += `<button id='addUserPromptBtn'>Ajouter un utilisateur</button> <button id='closeUserMenuBtn'>Fermer</button>`;
  menu.innerHTML = html;
  document.body.appendChild(menu);
  // Ajout des listeners JS pour la CSP
  menu.querySelectorAll('.user-menu-user').forEach(el => {
    el.addEventListener('click', e => setUser(e.target.dataset.user));
  });
  menu.querySelectorAll('.user-menu-remove').forEach(el => {
    el.addEventListener('click', e => removeUser(e.target.dataset.user));
  });
  menu.querySelectorAll('.user-menu-role').forEach(el => {
    el.addEventListener('click', e => setUserRolePrompt(e.target.dataset.user));
  });
  document.getElementById('addUserPromptBtn').addEventListener('click', addUserPrompt);
  document.getElementById('closeUserMenuBtn').addEventListener('click', closeUserMenu);
  document.getElementById('editTitleBtn').addEventListener('click', editPageTitlePrompt);
}
// Gestion du titre personnalisé par utilisateur
function getUserPageTitle(user) {
  if (!user) return null;
  const titles = JSON.parse(localStorage.getItem('vrm_user_titles') || '{}');
  return titles[user] || null;
}
function setUserPageTitle(user, title) {
  if (!user) return;
  let titles = JSON.parse(localStorage.getItem('vrm_user_titles') || '{}');
  if (title) {
    titles[user] = title;
  } else {
    delete titles[user];
  }
  localStorage.setItem('vrm_user_titles', JSON.stringify(titles));
}
function applyUserPageTitle() {
  const user = localStorage.getItem('vrm_user');
  // Fixed title for the dashboard
  console.log('[Dashboard] applyUserPageTitle called for user:', user || '<none>');
  document.title = 'VHR Dashboard';
}
function editPageTitlePrompt() {
  const user = localStorage.getItem('vrm_user');
  const current = getUserPageTitle(user) || 'VHR Dashboard';
  const title = prompt('Titre de la page (onglet) pour votre session :', current);
  if (title !== null) {
    if (title.trim() === '' || title.trim().toLowerCase() === 'vr manager') {
      setUserPageTitle(user, null);
      showToast('Titre réinitialisé', 'info', 1800);
    } else {
      setUserPageTitle(user, title.trim());
      showToast('Titre personnalisé enregistré', 'success', 1800);
    }
    applyUserPageTitle();
  }
}

// ========== NOTIFICATIONS (TOAST) ========== 
function showToast(msg, type='info', duration=3000) {
  let toast = document.createElement('div');
  toast.className = 'toast-notif';
  toast.style = `position:fixed;bottom:32px;right:32px;z-index:2000;background:${type==='error'?'#e53935':type==='success'?'#43a047':'#222'};color:#fff;padding:14px 28px;border-radius:8px;box-shadow:0 2px 12px #0007;font-size:16px;opacity:0;transition:opacity .3s;pointer-events:none;`;
  toast.innerHTML = msg;
  document.body.appendChild(toast);
  setTimeout(()=>{toast.style.opacity=1;},50);
  setTimeout(()=>{toast.style.opacity=0;setTimeout(()=>toast.remove(),400);},duration);
}


// Pour la sécurité : NE PAS exposer les fonctions sensibles sur window en production !
// window.setUser = setUser;
// window.removeUser = removeUser;
// window.setUserRolePrompt = ...
// window.addUserPrompt = ...
// window.closeUserMenu = ...

// Pour le fonctionnement actuel (démo/local), on garde l'exposition, mais commenter en prod :
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  window.setUser = setUser;
  window.removeUser = removeUser;
  window.setUserRolePrompt = function(u) {
    const role = prompt('Rôle pour '+u+' ? (admin/user/guest)', userRoles[u]||'user');
    if (role && role.trim()) setUserRole(u, role.trim());
  };
  window.addUserPrompt = function() {
    const name = prompt('Nom du nouvel utilisateur ?');
    if (name && name.trim()) setUser(name.trim());
  };
  window.closeUserMenu = function() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.remove();
  };
}

if (!currentUser) {
  setTimeout(() => {
    const name = prompt('Bienvenue ! Entrez votre nom d\'utilisateur :');
    if (name && name.trim()) setUser(name.trim());
    else setUser('Invité');
  }, 300);
} else {
  updateUserUI();
}

// ========== CONSTANTES & INIT ========== 
// IMPORTANT : Pour la commercialisation, il faut :
// - Remplacer la gestion locale des utilisateurs/roles par une API sécurisée (login, logout, session, JWT)
// - Ne jamais stocker de données sensibles (mot de passe, droits) dans le localStorage
// - Vérifier tous les droits côté serveur (le frontend n'est qu'une interface)
// - Utiliser HTTPS et protéger contre XSS/CSRF
// - Voir le backend pour l'intégration complète !
const API_BASE = '/api';
const socket = io();
let devices = [];
let games = [];
let favorites = [];


// ========== DEVICE SEARCH BAR ========== 
let grid = document.getElementById('deviceGrid');
const streamViewers = document.getElementById('streamViewers');

// Loader global
function showLoader(msg = 'Chargement...') {
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:3000;display:flex;align-items:center;justify-content:center;background:rgba(30,34,40,0.45);backdrop-filter:blur(2px);';
    loader.innerHTML = `<div style="background:#23272f;padding:32px 38px;border-radius:16px;box-shadow:0 4px 32px #000a;display:flex;flex-direction:column;align-items:center;">
      <div class='loader-spinner' style='width:38px;height:38px;border:5px solid #2196f3;border-top:5px solid #fff;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:18px;'></div>
      <div style='color:#fff;font-size:18px;'>${msg}</div>
    </div>`;
    document.body.appendChild(loader);
    // Animation CSS
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
    document.head.appendChild(style);
  } else {
    loader.style.display = 'flex';
    loader.querySelector('div > div:last-child').innerText = msg;
  }
}
function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

function createDeviceSearchBar() {
  // Search bar removed per request, function intentionally noop to keep compatibility
  // If we ever re-enable, move HTML logic here and call createDeviceSearchBar()
  return;
}

function onDeviceSearchInput() {
  // Filtering logic will be implemented in the next step
  renderDevices();
}

// ========== API Helper ========== 
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    // If not OK, try to get text/json safely
    if (!res.ok) {
      let errBody = null;
      try { errBody = await res.text(); } catch(e) { errBody = String(e); }
      console.warn('[api] non-200 response', path, res.status, errBody && errBody.substring ? errBody.substring(0, 200) : errBody);
      // Attempt to parse JSON if content-type is JSON
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try { const j = await res.json(); return j; } catch (e) { }
      }
      return { ok: false, error: `HTTP ${res.status} - ${res.statusText}`, body: errBody };
    }
    // Try to parse JSON body, otherwise return text
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    // If the response is plain HTML (starts with <), wrap as error
    if (text && text.trim().startsWith('<')) return { ok: false, error: 'Unexpected HTML response', body: text };
    try { return JSON.parse(text); } catch (e) { return { ok: true, body: text }; }
  } catch (e) {
    console.error('[api]', path, e);
    return { ok: false, error: e.message };
  }
}

// ========== Devices ========== 
async function loadDevices() {
  showLoader('Chargement des casques...');
  try {
    const data = await api('/api/devices');
    if (data.ok && Array.isArray(data.devices)) {
      devices = data.devices;
      renderDevices();
    } else {
      showToast('Erreur chargement devices : ' + (data.error || 'inconnue'), 'error', 4000);
    }
  } catch (e) {
    showToast('Erreur réseau lors du chargement des devices', 'error', 4000);
  } finally {
    hideLoader();
  }
}

async function sendHome(device) {
  const serial = device.serial;
  try {
    const res = await api('/api/adb/home', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serial }) });
    if (res && res.ok) showToast('🏠 Home envoyé', 'success', 1500);
    else showToast('Erreur envoi HOME: ' + (res.error || 'inconnu'), 'error', 3000);
  } catch (e) {
    showToast('Erreur réseau HOME: ' + e.message, 'error', 3000);
  }
}

async function stopApp(serial, pkg) {
  if (!pkg) return showToast('Aucune application en cours', 'info', 1400);
  if (!confirm('Arrêter l\'application '+pkg+' ?')) return;
  try {
    const res = await api(`/api/apps/${serial}/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: pkg }) });
    if (res && res.ok) showToast('Application arrêtée', 'success', 1500);
    else showToast('Erreur arrêt application: ' + (res.error || 'inconnu'), 'error', 3000);
  } catch (e) {
    showToast('Erreur réseau arrêt: ' + e.message, 'error', 3000);
  }
}

function renderDevices() {
  grid.innerHTML = '';
  let search = '';
  const searchInput = document.getElementById('deviceSearchInput');
  if (searchInput) search = searchInput.value.trim().toLowerCase();
  let filtered = devices;
  if (search) {
    filtered = devices.filter(d =>
      (d.name && d.name.toLowerCase().includes(search)) ||
      (d.serial && d.serial.toLowerCase().includes(search))
    );
  }
  if (filtered.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-device-msg';
    msg.innerHTML = `Aucun casque détecté.<br><button id="forceRefreshBtn">Rafraîchir</button>`;
    grid.appendChild(msg);
    setTimeout(() => {
      if (filtered.length === 0) msg.style.color = 'red';
    }, 2000);
    setTimeout(() => {
      const btn = document.getElementById('forceRefreshBtn');
      if (btn) btn.addEventListener('click', () => loadDevices());
    }, 100);
    return;
  }
  filtered.forEach(d => {
    let card = createDeviceCard(d);
    grid.appendChild(card);
  });
}

function createDeviceCard(d) {
  const card = document.createElement('div');
  card.className = 'device-card';
  card.dataset.serial = d.serial;
  card.style.opacity = 0;
  card.style.transition = 'opacity 0.4s';
  // Profils disponibles (doivent correspondre à ceux du backend)
  const profiles = [
    { value: 'ultra-low', label: 'Ultra Low (426x240, 400K)' },
    { value: 'low', label: 'Low (480x270, 600K)' },
    { value: 'wifi', label: 'WiFi (640x360, 1M)' },
    { value: 'default', label: '480p (854x480, 1.5M)' },
    { value: 'high', label: 'High (1280x720, 2M)' },
    { value: 'ultra', label: 'Ultra (1920x1080, 3M)' }
  ];
  let profileSelect = '';
  let selectedProfile = d.profile || 'ultra-low';
  if (d.status !== 'streaming') {
    profileSelect = `<select class="stream-profile-select" data-serial="${d.serial}">
      ${profiles.map(p => `<option value="${p.value}"${p.value === 'ultra-low' ? ' selected' : ''}>${p.label}</option>`).join('')}
    </select>`;
  } else {
    // Affiche le profil utilisé pendant le streaming
    const prof = profiles.find(p => p.value === selectedProfile);
    profileSelect = `<span class="profile-badge" style="background:#2196f3;color:#fff;padding:3px 10px;border-radius:8px;font-size:14px;">${prof ? prof.label : selectedProfile}</span>`;
  }
  // Role-based UI restrictions
  let role = userRoles[currentUser] || 'user';
  let isAdmin = role === 'admin';
  // Bouton scrcpy natif
  const scrcpyBtn = `<button class="btn-scrcpy-gui device-btn" data-serial="${d.serial}">🖥️ Ouvrir scrcpy</button>`;
  // Always show Stop Stream button, disable if not streaming
  // Stop button removed as UI handles stream differently
  // Badge d'état amélioré
  let badgeColor = d.status === 'streaming' ? '#43a047' : d.status === 'offline' ? '#e53935' : '#aaa';
  const playingBadge = d.runningApp ? `<span class="badge playing" title="En cours: ${d.runningApp}" style="margin-left:8px;">🎮 ${d.runningApp}</span>` : '';
  card.innerHTML = `
    <div class="card-header-line space-between">
      <div><b class="device-name">${d.name}</b> <small style="color:#888;font-size:13px;">${d.serial}</small></div>
      <span class="badge ${d.status}">${d.status === 'streaming' ? '🟢 Streaming' : d.status}</span>${playingBadge}
      <button class="btn-stop device-btn" data-serial="${d.serial}" ${d.status === 'streaming' ? '' : 'disabled'} title='Arrêter le stream'>⏹️ Arrêter</button>
    </div>
    <div class="card-action-line">
      ${profileSelect}
      ${scrcpyBtn}
    </div>
    <div class="card-action-line">
      ${isAdmin ? `<button class=\"btn-rename device-btn\" data-serial=\"${d.serial}\">✏️ Renommer</button>` : ''}
      <button class="btn-apps device-btn" data-serial="${d.serial}">📱 Apps</button>
      <button class="btn-fav device-btn" data-serial="${d.serial}">⭐ Favoris</button>
      <button class="btn-voice device-btn" data-serial="${d.serial}">🎙️ Voix</button>
      <button class=\"btn-storage device-btn\" data-serial=\"${d.serial}\">💾 Stockage</button>
      ${d.serial && !d.serial.includes(':') && !d.serial.includes('.') ? `<button class="btn-wifi device-btn" data-serial="${d.serial}">📶 WiFi</button>` : ''}
      ` + (!isAdmin ? `<span style='color:#aaa;font-size:12px;margin-left:8px;'>(admin requis pour renommer/stockage)</span>` : '') + `
    </div>
  `;
  // Style boutons device
  // Button hover/active visual states handled by CSS :hover and :active rules for consistency.
  // Event listeners
  const scrcpyBtnEl = card.querySelector('.btn-scrcpy-gui');
  if (scrcpyBtnEl) scrcpyBtnEl.addEventListener('click', async () => {
    const res = await api('/api/scrcpy-gui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: d.serial })
    });
    if (!res.ok) alert('Erreur lancement scrcpy: ' + (res.error || 'inconnue'));
  });

  if (isAdmin) {
    const renameBtn = card.querySelector('.btn-rename');
    if (renameBtn) renameBtn.addEventListener('click', () => renameDevice(d));
  }
  const storageBtn = card.querySelector('.btn-storage');
  if (storageBtn) storageBtn.addEventListener('click', () => showStorageDialog(d));
  const voiceBtnEl = card.querySelector('.btn-voice');
  if (voiceBtnEl) voiceBtnEl.addEventListener('click', () => openVoiceDialog(d));
  const appsBtn = card.querySelector('.btn-apps');
  if (appsBtn) appsBtn.addEventListener('click', () => showAppsDialog(d));
  const favBtn = card.querySelector('.btn-fav');
  if (favBtn) favBtn.addEventListener('click', () => showFavoritesDialog(d));
  const wifiBtn = card.querySelector('.btn-wifi');
  if (wifiBtn) wifiBtn.addEventListener('click', () => connectWifi(d));
  const stopBtnEl = card.querySelector('.btn-stop');
  if (stopBtnEl) stopBtnEl.addEventListener('click', async () => {
    // Confirm and call stopStream
    if (!confirm('Arrêter le stream ?')) return;
    await stopStream(d);
  });
  // Device-level stop (Arrêter) button present on the card for stopping stream
  // Fade-in animation
  setTimeout(() => { card.style.opacity = 1; }, 10);
  return card;
}

// ========== STREAM CONTROL ========== 
async function startStream(device, profile) {
  showLoader('Démarrage du stream...');
  const res = await api('/api/stream/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial: device.serial, profile: profile || 'default' })
  });
  hideLoader();
  if (!res.ok) {
    showToast('Erreur démarrage stream: ' + (res.error || 'inconnue'), 'error', 4000);
  } else {
    showToast('Stream démarré', 'success', 2000);
  }
  setTimeout(loadDevices, 500); // Refresh state
}

async function stopStream(device) {
  showLoader('Arrêt du stream...');
  const res = await api('/api/stream/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial: device.serial })
  });
  hideLoader();
  if (!res.ok) {
    showToast('Erreur arrêt stream: ' + (res.error || 'inconnue'), 'error', 4000);
  } else {
    showToast('Stream arrêté', 'success', 2000);
  }
  setTimeout(loadDevices, 500);
}

// ========== WIFI PAIRING ========== 
async function connectWifi(device) {
  showLoader('Tentative de connexion WiFi automatique...');
  try {
    const res = await api('/api/adb/wifi-connect-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: device.serial })
    });
    hideLoader();
    if (res && res.ok) {
      showToast('Connexion WiFi (auto) lancée', 'success', 2200);
    } else {
      showToast('Erreur auto WiFi: ' + (res && res.error ? res.error : 'inconnue'), 'error', 5000);
    }
  } catch (e) {
    hideLoader();
    showToast('Erreur auto WiFi: ' + e.message, 'error', 5000);
  }
  setTimeout(loadDevices, 2500);
}

// ========== STREAMING ========== 

// ========== RENOMMAGE ========== 
async function renameDevice(device) {
  const name = prompt('Nouveau nom pour le casque', device.name);
  if (!name || name === device.name) return;
  const res = await api('/api/devices/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial: device.serial, name })
  });
  if (res.ok) loadDevices();
  else alert('Erreur: ' + (res.error || 'inconnue'));
}

// ========== APPS ========== 
async function showAppsDialog(device) {
  const res = await api(`/api/apps/${device.serial}`);
  if (!res.ok) return alert('Erreur chargement apps');
  const apps = res.apps || [];
  // Get favorites mapping to show proper button state
  const favRes = await api('/api/favorites');
  const favMap = {};
  if (favRes && favRes.ok) {
    (favRes.favorites||[]).forEach(f => { favMap[f.packageId] = f; });
  }
  // cleanup function for modal close will be set later
  let cleanup = null;
  const renderAppsList = () => {
    let html = `<h3>Apps installées</h3><ul>`;
    apps.forEach(pkg => {
      const fav = favMap[pkg];
      const favBtn = fav ? `<button class='fav-remove-btn' data-serial='${device.serial}' data-id='${fav.id}' data-pkg='${pkg}' title='Retirer des favoris'>★</button>` : `<button class='fav-add-btn' data-serial='${device.serial}' data-pkg='${pkg}' title='Ajouter aux favoris'>❤</button>`;
      const isRunning = device.runningApp === pkg;
      const launchBtn = isRunning ? `<button class='launch-app-btn' disabled style='background:#dff0d8;color:#2e7d32;'>En cours</button>` : `<button class='launch-app-btn' data-serial='${device.serial}' data-pkg='${pkg}'>Lancer</button>`;
      const stopBtn = isRunning ? `<button class='stop-app-btn' data-serial='${device.serial}' data-pkg='${pkg}'>Arrêter</button>` : ``;
      html += `<li class='${isRunning ? 'running-app' : ''}' data-pkg='${pkg}'>${pkg} ${launchBtn} ${stopBtn} ${favBtn}</li>`;
    });
    html += '</ul>';
    showModal(html, cleanup);
    setupAppsModalHandlers();
  };
  const setupAppsModalHandlers = () => {
    // Launch handlers
    document.querySelectorAll('.launch-app-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', e => {
        const serial = e.target.getAttribute('data-serial');
        const pkg = e.target.getAttribute('data-pkg');
        launchApp(serial, pkg);
      });
    });
    // Stop handlers
    document.querySelectorAll('.stop-app-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', async e => {
        const serial = e.target.getAttribute('data-serial');
        const pkg = e.target.getAttribute('data-pkg');
        e.target.disabled = true;
        try {
          await stopApp(serial, pkg);
        } catch (err) {
          console.error('stop app error', err);
        } finally {
          e.target.disabled = false;
        }
      });
      btn.dataset.listenerAttached = '1';
    });
    // Favorites handling
    document.querySelectorAll('.fav-add-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', async e => {
        const pkg = e.target.getAttribute('data-pkg');
        const name = pkg;
        const r = await api('/api/favorites/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, packageId: pkg, icon: null }) });
        if (r && r.ok) {
          showToast('Ajouté aux favoris', 'success', 1500);
          // refresh favorites mapping
          const favRes = await api('/api/favorites');
          if (favRes && favRes.ok) {
            (favRes.favorites || []).forEach(f => { favMap[f.packageId] = f; });
          }
          renderAppsList();
        } else {
          showToast('Erreur ajout favoris', 'error', 2000);
        }
      });
    });
    document.querySelectorAll('.fav-remove-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', async e => {
        const id = e.target.getAttribute('data-id');
        const pkg = e.target.getAttribute('data-pkg');
        const r = await api('/api/favorites/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id) }) });
        if (r && r.ok) {
          showToast('Supprimé des favoris', 'info', 1500);
          const favRes = await api('/api/favorites');
          if (favRes && favRes.ok) {
            (favRes.favorites || []).forEach(f => { favMap[f.packageId] = f; });
          }
          renderAppsList();
        } else {
          showToast('Erreur suppression favoris', 'error', 2000);
        }
      });
      btn.dataset.listenerAttached = '1';
    });
  };
  // Listen to app-launch/app-stop for this device to update modal when open
  const onAppEvent = evt => {
    if (evt && evt.serial === device.serial) {
      // update device runningApp state via devices list
      const dev = devices.find(d => d.serial === device.serial);
      if (dev) device.runningApp = dev.runningApp;
      renderAppsList();
    }
  };
  // register socket listeners and pass cleanup to showModal
    // register socket listeners and define cleanup
    const onAppEventL = onAppEvent;
    socket.on('app-launch', onAppEventL);
    socket.on('app-stop', onAppEventL);
    const onDevicesUpdate = (list) => { const dev = (list||[]).find(d => d.serial === device.serial); if (dev) { device.runningApp = dev.runningApp; renderAppsList(); } };
    socket.on('devices-update', onDevicesUpdate);
  // cleanup function for modal close
  cleanup = () => { try { socket.off('app-launch', onAppEventL); socket.off('app-stop', onAppEventL); socket.off('devices-update', onDevicesUpdate); } catch (e) {} };
  // initial render and open modal with cleanup
    renderAppsList();
  // cleanup registration handled via showModal(html, cleanup) within renderAppsList
  // event listeners are setup by setupAppsModalHandlers() to avoid duplicates
  // Setup add/remove handlers
  document.querySelectorAll('.fav-add-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const pkg = e.target.getAttribute('data-pkg');
      const name = pkg;
      const r = await api('/api/favorites/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, packageId: pkg, icon: null }) });
      if (r && r.ok) {
        showToast('Ajouté aux favoris', 'success', 1500);
        // Replace add button with remove button and bind handler
        const newBtn = document.createElement('button');
        newBtn.className = 'fav-remove-btn';
        newBtn.dataset.serial = device.serial;
        newBtn.dataset.id = r.favorite.id;
        newBtn.dataset.pkg = pkg;
        newBtn.title = 'Retirer des favoris';
        newBtn.innerText = '★';
        newBtn.addEventListener('click', async ev => {
          const id = ev.target.getAttribute('data-id');
          const pkg2 = ev.target.getAttribute('data-pkg');
          const res = await api('/api/favorites/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id) }) });
          if (res && res.ok) {
            showToast('Supprimé des favoris', 'info', 1500);
            // swap to add
            const addBtn = document.createElement('button');
            addBtn.className = 'fav-add-btn';
            addBtn.dataset.serial = device.serial;
            addBtn.dataset.pkg = pkg2;
            addBtn.title = 'Ajouter aux favoris';
            addBtn.innerText = '❤';
            addBtn.addEventListener('click', async ev2 => {
              // delegated add logic (could call the same code path)
              const pkg3 = ev2.target.getAttribute('data-pkg');
              const r2 = await api('/api/favorites/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: pkg3, packageId: pkg3 }) });
              if (r2 && r2.ok) {
                showToast('Ajouté aux favoris', 'success', 1500);
                ev2.target.replaceWith(newBtn);
              }
            });
            ev.target.replaceWith(addBtn);
          } else {
            showToast('Erreur suppression favoris', 'error', 2000);
          }
        });
        e.target.replaceWith(newBtn);
      } else {
        showToast('Erreur ajout favoris', 'error', 2000);
      }
    });
  });
  document.querySelectorAll('.fav-remove-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.getAttribute('data-id');
      const pkg = e.target.getAttribute('data-pkg');
      const r = await api('/api/favorites/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id) }) });
      if (r && r.ok) {
        showToast('Supprimé des favoris', 'info', 1500);
        const addBtn = document.createElement('button');
        addBtn.className = 'fav-add-btn';
        addBtn.dataset.serial = device.serial;
        addBtn.dataset.pkg = pkg;
        addBtn.title = 'Ajouter aux favoris';
        addBtn.innerText = '❤';
        addBtn.addEventListener('click', async ev2 => {
          const pkg3 = ev2.target.getAttribute('data-pkg');
          const r2 = await api('/api/favorites/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: pkg3, packageId: pkg3 }) });
          if (r2 && r2.ok) {
            showToast('Ajouté aux favoris', 'success', 1500);
            ev2.target.replaceWith(btn);
          }
        });
        e.target.replaceWith(addBtn);
      } else {
        showToast('Erreur suppression favoris', 'error', 2000);
      }
    });
  });
}
async function launchApp(serial, pkg) {
  // find all relevant buttons and disable while launching
  const btns = Array.from(document.querySelectorAll(`.launch-app-btn[data-serial='${serial}'][data-pkg='${pkg}'], .launch-fav-btn[data-serial='${serial}'][data-pkg='${pkg}']`));
  btns.forEach(b => { b.dataset.prevText = b.innerText; b.disabled = true; b.innerText = 'Lancement...'; });
  try {

    // use global sendHome/stopApp functions
    const r = await api(`/api/apps/${serial}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkg })
    });
    if (r && r.ok) {
      showToast('Jeu lancé', 'success', 2500);
      // Attempt auto-WiFi for USB-connected devices after launching app
      try {
        const dev = devices.find(d => d.serial === serial);
        if (dev && dev.serial && !dev.serial.includes(':') && !dev.serial.includes('.')) {
          // Fire and forget; use the direct API call to avoid showing a loader
          api('/api/adb/wifi-connect-auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serial })
          }).then(wres => {
            if (wres && wres.ok) showToast('Connexion WiFi (auto) lancée', 'info', 2000);
            else if (wres && wres.error) console.warn('[AUTO_WIFI] failed:', wres.error);
          }).catch(e => console.warn('[AUTO_WIFI] error', e));
        }
      } catch (e) { console.warn('[AUTO_WIFI] launchApp check error', e); }
    } else {
      showToast('Échec du lancement: ' + (r.error || r.msg || 'inconnu'), 'error', 5000);
    }
  } catch (e) {
    showToast('Erreur réseau: ' + e.message, 'error', 5000);
  } finally {
    btns.forEach(b => { b.disabled = false; b.innerText = b.dataset.prevText || 'Lancer'; delete b.dataset.prevText; });
  }
}

// ---------- Voice dialog (hold-to-talk) ----------
function openVoiceDialog(device) {
  const serial = device.serial;
  const html = `<h3>Microphone — ${device.name}</h3>
    <p>Maintenez pour parler au casque (Hold-to-Talk). Les données seront envoyées au serveur et jouées une fois la session terminée.</p>
    <div style='display:flex;gap:12px;align-items:center;'>
      <button id='btnHoldTalk' style='padding:12px 18px;border-radius:10px;background:#e6f7ff;color:#1769aa;border:none;font-size:16px;'>🎙️ Appuyer pour parler</button>
      <span id='voiceStatus' style='font-size:14px;color:#888;margin-left:6px;'>Prêt</span>
    </div>`;
  showModal(html);
  const btn = document.getElementById('btnHoldTalk');
  const status = document.getElementById('voiceStatus');
  let mediaStream = null;
  let recorder = null;
  let streamId = null;
  const startCapture = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' });
      // start stream session on server
      const r = await api('/api/adb/audio/stream/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serial }) });
      if (!r.ok) { status.innerText = 'Erreur démarrage session'; return; }
      streamId = r.streamId;
      status.innerText = 'Enregistrement...';
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const b = await e.data.arrayBuffer();
          const base64 = arrayBufferToBase64(b);
          // send chunk
          await api('/api/adb/audio/stream/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ streamId, chunk: base64 }) });
        }
      };
      recorder.start(300);
    } catch (e) {
      console.error('[voice] start capture error', e);
      status.innerText = 'Impossible d\'accéder au micro';
    }
  };
  const stopCapture = async () => {
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
      if (streamId) {
        const r = await api('/api/adb/audio/stream/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ streamId }) });
        if (r && r.ok) status.innerText = 'Envoyé'; else status.innerText = 'Échec envoi';
      }
    } catch (e) {
      console.error('[voice] stop capture error', e);
      status.innerText = 'Erreur envoi';
    }
  };
  btn.addEventListener('mousedown', startCapture);
  btn.addEventListener('mouseup', stopCapture);
  btn.addEventListener('touchstart', startCapture);
  btn.addEventListener('touchend', stopCapture);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ========== FAVORIS ========== 
async function showFavoritesDialog(device) {
  const res = await api('/api/favorites');
  if (!res.ok) return alert('Erreur chargement favoris');
  const favs = res.favorites || [];
  let cleanupFavs = null;
  const renderFavsList = () => {
    let html = `<h3>Favoris</h3><ul>`;
    favs.forEach(fav => {
      const isRunning = device.runningApp === fav.packageId;
      const launchBtn = isRunning ? `<button class='launch-fav-btn' disabled style='background:#dff0d8;color:#2e7d32;'>En cours</button>` : `<button class='launch-fav-btn' data-serial='${device.serial}' data-pkg='${fav.packageId}'>Lancer</button>`;
      const stopBtn = isRunning ? `<button class='stop-fav-btn' data-serial='${device.serial}' data-pkg='${fav.packageId}'>Arrêter</button>` : ``;
      html += `<li class='${isRunning ? 'running-app' : ''}'>${fav.name} ${launchBtn} ${stopBtn} <button class='remove-fav-btn' data-id='${fav.id}' data-pkg='${fav.packageId}'>✖</button></li>`;
    });
    html += '</ul>';
    showModal(html, cleanupFavs);
    document.querySelectorAll('.launch-fav-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', e => {
        const serial = e.target.getAttribute('data-serial');
        const pkg = e.target.getAttribute('data-pkg');
        launchApp(serial, pkg);
      });
      btn.dataset.listenerAttached = '1';
    });
    // Stop handlers for favorite apps
    document.querySelectorAll('.stop-fav-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', async e => {
        const serial = e.target.getAttribute('data-serial');
        const pkg = e.target.getAttribute('data-pkg');
        e.target.disabled = true;
        try {
          await stopApp(serial, pkg);
        } catch (err) {
          console.error('stop fav error', err);
        } finally {
          e.target.disabled = false;
        }
      });
      btn.dataset.listenerAttached = '1';
    });
    document.querySelectorAll('.remove-fav-btn').forEach(btn => {
      if (btn.dataset.listenerAttached) return;
      btn.addEventListener('click', async e => {
        const id = e.target.getAttribute('data-id');
        const r = await api('/api/favorites/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id) }) });
        if (r && r.ok) {
          showToast('Favori supprimé', 'info', 1500);
          // refresh favorites
          const newR = await api('/api/favorites');
          if (newR && newR.ok) {
            favs.length = 0;
            (newR.favorites || []).forEach(f => favs.push(f));
            renderFavsList();
          }
        } else {
          showToast('Erreur suppression', 'error', 2500);
        }
      });
      btn.dataset.listenerAttached = '1';
    });
  };
  const onFavAppEvent = evt => { if (evt && evt.serial === device.serial) { const dev = devices.find(d => d.serial === device.serial); if (dev) device.runningApp = dev.runningApp; renderFavsList(); } };
  socket.on('app-launch', onFavAppEvent);
  socket.on('app-stop', onFavAppEvent);
  const onDevicesUpdateFavs = (list) => { const dev = (list||[]).find(d => d.serial === device.serial); if (dev) { device.runningApp = dev.runningApp; renderFavsList(); } };
  socket.on('devices-update', onDevicesUpdateFavs);
  cleanupFavs = () => { try { socket.off('app-launch', onFavAppEvent); socket.off('app-stop', onFavAppEvent); socket.off('devices-update', onDevicesUpdateFavs); } catch (e) {} };
  renderFavsList();
  // cleanup to remove listeners when modal closes is handled by cleanupFavs
}

// ========== STOCKAGE ========== 
async function showStorageDialog(device) {
  const serial = device.serial;
  const r = await api(`/api/storage/${serial}`);
  if (!r.ok) return alert('Erreur chargement storage: ' + (r.error || 'inconnu'));
  const files = r.files || [];
  let html = `<h3>Stockage — ${device.name}</h3><ul style='max-height:400px;overflow:auto;'>`;
  files.forEach(f => {
    html += `<li style='display:flex;gap:6px;align-items:center;justify-content:space-between;'><span>${f.name} <small style='color:#888'>(${f.size} bytes)</small></span><span><a class='download-file' href='/api/storage/${serial}/pull?path=${encodeURIComponent(f.name)}'>Télécharger</a></span></li>`;
  });
  html += `</ul>`;
  showModal(html);
}

// ========== MODAL ========== 
// Keep a list of modal cleanup callbacks for automatic deregistration
// (moved declaration earlier to avoid "before initialization" runtime error)

function showModal(html, onClose) {
  if (onClose && typeof onClose === 'function') modalCleanupCallbacks.push(onClose);
  let modal = document.getElementById('modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class='modal-content' style="background:#23272f;padding:32px 28px 22px 28px;border-radius:14px;box-shadow:0 4px 32px #000a;max-width:95vw;width:400px;margin:60px auto 0 auto;position:relative;">
    ${html}
    <br><button id='closeModalBtn' style="margin-top:18px;padding:10px 22px;font-size:16px;border-radius:8px;background:#222;color:#fff;border:none;cursor:pointer;">Fermer</button>
    <span id='closeModalX' style="position:absolute;top:10px;right:18px;font-size:22px;cursor:pointer;color:#aaa;">×</span>
  </div>`;
  modal.style.display = 'block';
  modalOpen = true;
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('closeModalX').addEventListener('click', closeModal);
}
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
  // call and clear modal cleanup callbacks
  while (modalCleanupCallbacks.length) {
    try { const fn = modalCleanupCallbacks.shift(); if (fn) fn(); } catch (e) { console.error('[modal] cleanup error', e); }
  }
  modalOpen = false;
}

// ========== SOCKET.IO EVENTS ========== 
socket.on('devices-update', (data) => {
	devices = data;
	renderDevices();
});

// Update device running app on app-launch/app-stop events (socket)
socket.on('app-launch', evt => {
  const i = devices.findIndex(d => d.serial === evt.serial);
  if (i !== -1) {
    devices[i].runningApp = evt.packageId;
    renderDevices();
  }
});
socket.on('app-stop', evt => {
  const i = devices.findIndex(d => d.serial === evt.serial);
  if (i !== -1) {
    devices[i].runningApp = null;
    renderDevices();
  }
});

// ========== INIT ==========
console.log('[Dashboard] Init');
console.log('[Dashboard] applyUserPageTitle in global scope:', typeof applyUserPageTitle);
if (typeof applyUserPageTitle === 'function') applyUserPageTitle(); else console.error('[Dashboard] ERROR: applyUserPageTitle not defined');
console.log('[Dashboard] injectDashboardStyles in global scope:', typeof injectDashboardStyles);
if (typeof injectDashboardStyles === 'function') injectDashboardStyles(); else console.error('[Dashboard] ERROR: injectDashboardStyles not defined');
  // Search bar disabled (removed); if needed, call createDeviceSearchBar() after reintroduction
// Update user UI (Se connecter / Mon compte)
try { updateUserUI(); } catch (e) { console.error('[Dashboard] updateUserUI error', e); }
loadDevices();
/* EOF */














































































































