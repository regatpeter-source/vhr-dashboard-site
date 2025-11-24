// Dashboard client script
// Based on backup, with small additions: app-running indicator and VHR naming

// ========== MULTI-UTILISATEURS ENRICHI ========== 
let currentUser = localStorage.getItem('vhr_user') || '';
let userList = JSON.parse(localStorage.getItem('vhr_user_list') || '[]');
let userRoles = JSON.parse(localStorage.getItem('vhr_user_roles') || '{}'); // { user: role }

function saveUserList() {
  localStorage.setItem('vhr_user_list', JSON.stringify(userList));
  localStorage.setItem('vhr_user_roles', JSON.stringify(userRoles));
}

function setUser(user) {
  currentUser = user;
  localStorage.setItem('vhr_user', user);
  if (!userList.includes(user)) {
    userList.push(user);
    saveUserList();
  }
  updateUserUI();
}

// ... keep other user functions (omitted for brevity in this file but present in original backup) ...

// ========== CONSTANTES & INIT ========== 
const API_BASE = '/api';
const socket = io();
let devices = [];
let games = [];
let favorites = [];
let activeApps = {}; // Map serial -> { package, startedAt }

const grid = document.getElementById('deviceGrid');

// ========== API Helper ========== 
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    return await res.json();
  } catch (e) {
    console.error('[api]', path, e);
    return { ok: false, error: e.message };
  }
}

// ========== Devices ========== 
async function loadDevices() {
  const data = await api('/api/devices');
  if (data.ok && Array.isArray(data.devices)) {
    devices = data.devices;
    renderDevices();
  }
}

function renderDevices() {
  grid.innerHTML = '';
  if (devices.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-device-msg';
    msg.innerHTML = `Aucun casque détecté.<br><button id="forceRefreshBtn">Rafraîchir</button>`;
    grid.appendChild(msg);
    setTimeout(() => { if (devices.length === 0) msg.style.color = 'red'; }, 2000);
    setTimeout(() => {
      const btn = document.getElementById('forceRefreshBtn');
      if (btn) btn.onclick = () => { loadDevices(); };
    }, 100);
    return;
  }
  devices.forEach(d => {
    let card = createDeviceCard(d);
    grid.appendChild(card);
  });
}

function createDeviceCard(d) {
  const card = document.createElement('div');
  card.className = 'device-card';
  card.dataset.serial = d.serial;
  const profiles = [
    { value: 'ultra-low', label: 'Ultra Low (320p, 600K)' },
    { value: 'low', label: 'Low (480p, 1.5M)' },
    { value: 'wifi', label: 'WiFi (640p, 2M)' },
    { value: 'default', label: '720p, 3M' },
    { value: 'high', label: 'High (1280p, 8M)' },
    { value: 'ultra', label: 'Ultra (1920p, 12M)' }
  ];
  let profileSelect = '';
  if (d.status !== 'streaming') {
    profileSelect = `<select class="stream-profile-select" data-serial="${d.serial}">${profiles.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}</select>`;
  }
  const scrcpyBtn = `<button class="btn-scrcpy-gui" data-serial="${d.serial}">🖥️ Ouvrir scrcpy</button>`;
  const stopBtn = `<button class="btn-stop-stream" data-serial="${d.serial}" ${d.status === 'streaming' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"'}>⏹️ Stop Stream</button>`;
  // Playing indicator
  const isPlaying = activeApps[d.serial];
  const playingBadge = isPlaying ? `<span class="badge playing">🟢 En cours: ${isPlaying.package}</span>` : '';

  card.innerHTML = `
    <div class="card-header-line">
      <b>${d.name}</b>
      <small>${d.serial}</small>
      <span class="badge ${d.status}">${d.status === 'streaming' ? '🟢 Streaming' : d.status}</span>
      ${playingBadge}
    </div>
    <div class="card-action-line">
      ${profileSelect}
      ${scrcpyBtn}
      ${stopBtn}
    </div>
    <div class="card-action-line">
      <button class="btn-rename" data-serial="${d.serial}">✏️ Renommer</button>
      <button class="btn-apps" data-serial="${d.serial}">📱 Apps</button>
      <button class="btn-fav" data-serial="${d.serial}">⭐ Favoris</button>
      <button class="btn-storage" data-serial="${d.serial}">💾 Stockage</button>
      ${d.serial && !d.serial.includes(':') && !d.serial.includes('.') ? `<button class="btn-wifi" data-serial="${d.serial}">📶 WiFi</button>` : ''}
    </div>
  `;
  // Event listeners
  const stopBtnEl = card.querySelector('.btn-stop-stream');
  if (stopBtnEl) stopBtnEl.onclick = () => { if (d.status === 'streaming') stopStream(d); };
  const scrcpyBtnEl = card.querySelector('.btn-scrcpy-gui');
  if (scrcpyBtnEl) scrcpyBtnEl.onclick = async () => {
    const res = await api('/api/scrcpy-gui', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serial: d.serial }) });
    if (!res.ok) alert('Erreur lancement scrcpy: ' + (res.error || 'inconnue'));
  };
  card.querySelector('.btn-rename').onclick = () => renameDevice(d);
  card.querySelector('.btn-apps').onclick = () => showAppsDialog(d);
  card.querySelector('.btn-fav').onclick = () => showFavoritesDialog(d);
  card.querySelector('.btn-storage').onclick = () => showStorageDialog(d);
  const wifiBtn = card.querySelector('.btn-wifi');
  if (wifiBtn) wifiBtn.onclick = () => connectWifi(d);
  return card;
}

// ========== APPS ========== 
async function showAppsDialog(device) {
  const res = await api(`/api/apps/${device.serial}`);
  if (!res.ok) return alert('Erreur chargement apps');
  const apps = res.apps || [];
  let html = `<h3>Apps installées</h3><ul>`;
  apps.forEach(pkg => { html += `<li>${pkg} <button onclick="launchApp('${device.serial}','${pkg}')">Lancer</button></li>`; });
  html += '</ul>';
  showModal(html);
}

async function launchApp(serial, pkg) {
  const res = await api(`/api/apps/${serial}/launch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: pkg }) });
  if (res && res.ok) {
    // Update client-side state immediately
    activeApps[serial] = { package: pkg, startedAt: Date.now() };
    renderDevices();
  } else {
    alert('Erreur lors du lancement: ' + (res && res.msg ? res.msg : (res && res.error ? res.error : 'inconnue')));
  }
}

// ========== SOCKET.IO EVENTS ========== 
socket.on('devices-update', (data) => { devices = data; renderDevices(); });
socket.on('games-update', (data) => { games = data; });
socket.on('favorites-update', (data) => { favorites = data; });
socket.on('stream-event', (evt) => { if (evt.type === 'start') {} if (evt.type === 'stop') {} });
socket.on('app-launch', (evt) => {
  if (!evt || !evt.serial) return;
  if (evt.success) {
    activeApps[evt.serial] = { package: evt.package, startedAt: evt.startedAt || Date.now() };
  } else {
    delete activeApps[evt.serial];
  }
  renderDevices();
});

// ========== INIT ========== 
loadDevices();
