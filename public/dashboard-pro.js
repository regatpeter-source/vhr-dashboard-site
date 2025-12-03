// VHR DASHBOARD PRO - Version complète avec fond noir et vue tableau
// Date: 2025-12-03

// ========== CONFIGURATION ========== 
let viewMode = localStorage.getItem('vhr_view_mode') || 'table'; // 'table' ou 'cards'
let currentUser = localStorage.getItem('vhr_user') || '';
let userList = JSON.parse(localStorage.getItem('vhr_user_list') || '[]');
let userRoles = JSON.parse(localStorage.getItem('vhr_user_roles') || '{}');

// ========== NAVBAR ========== 
function createNavbar() {
	if (document.getElementById('mainNavbar')) return;
	const nav = document.createElement('nav');
	nav.id = 'mainNavbar';
	nav.style = 'position:fixed;top:0;left:0;width:100vw;height:50px;background:#1a1d24;color:#fff;z-index:1100;display:flex;align-items:center;box-shadow:0 2px 8px #000;border-bottom:2px solid #2ecc71;';
	nav.innerHTML = `
		<div style='display:flex;align-items:center;font-size:22px;font-weight:bold;margin-left:20px;color:#2ecc71;'>
			🥽 VHR DASHBOARD PRO
		</div>
		<div style='flex:1'></div>
		<button id="toggleViewBtn" style="margin-right:15px;background:#2ecc71;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			📊 Vue: Tableau
		</button>
		<div id='navbarUser' style='margin-right:24px;display:flex;gap:12px;align-items:center;'></div>
	`;
	document.body.appendChild(nav);
	document.body.style.paddingTop = '56px';
	
	document.getElementById('toggleViewBtn').onclick = toggleView;
	updateUserUI();
}

function toggleView() {
	viewMode = viewMode === 'table' ? 'cards' : 'table';
	localStorage.setItem('vhr_view_mode', viewMode);
	document.getElementById('toggleViewBtn').innerHTML = viewMode === 'table' ? '📊 Vue: Tableau' : '🎴 Vue: Cartes';
	renderDevices();
}

// ========== USERS ========== 
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

function removeUser(user) {
	userList = userList.filter(u => u !== user);
	if (userRoles[user]) delete userRoles[user];
	saveUserList();
	if (currentUser === user) setUser(userList[0] || 'Invité');
	else updateUserUI();
}

function setUserRole(user, role) {
	userRoles[user] = role;
	saveUserList();
	updateUserUI();
}

function updateUserUI() {
	let userDiv = document.getElementById('navbarUser');
	if (!userDiv) return;
	let role = userRoles[currentUser] || 'user';
	let roleColor = role==='admin' ? '#ff9800' : '#2196f3';
	userDiv.innerHTML = `
		<span style='font-size:18px;'>👤</span> 
		<b style='color:#2ecc71;'>${currentUser || 'Invité'}</b> 
		<span style="font-size:11px;background:${roleColor};color:#fff;padding:3px 8px;border-radius:6px;">${role}</span>
		<button id="changeUserBtn" style='margin-left:8px;'>Changer</button>
		<button id="userMenuBtn">Menu</button>
	`;
	document.getElementById('changeUserBtn').onclick = () => {
		const name = prompt('Nom d\'utilisateur ?', currentUser);
		if (name && name.trim()) setUser(name.trim());
	};
	document.getElementById('userMenuBtn').onclick = showUserMenu;
}

function showUserMenu() {
	let menu = document.getElementById('userMenu');
	if (menu) menu.remove();
	menu = document.createElement('div');
	menu.id = 'userMenu';
	menu.style = 'position:fixed;top:54px;right:16px;background:#1a1d24;color:#fff;padding:18px;z-index:1200;border-radius:8px;box-shadow:0 4px 20px #000;border:2px solid #2ecc71;min-width:280px;';
	let html = `<b style='font-size:18px;color:#2ecc71;'>Utilisateurs</b><ul style='margin:12px 0;padding:0;list-style:none;'>`;
	userList.forEach(u => {
		let role = userRoles[u]||'user';
		let roleColor = role==='admin' ? '#ff9800' : '#2196f3';
		html += `<li style='margin-bottom:8px;padding:8px;background:#23272f;border-radius:6px;'>
			<span style='cursor:pointer;color:${u===currentUser?'#2ecc71':'#fff'};font-weight:bold;' onclick='setUser("${u}")'>${u}</span>
			<span style='font-size:10px;background:${roleColor};color:#fff;padding:2px 6px;border-radius:4px;margin-left:6px;'>${role}</span>
			${u!=='Invité'?`<button onclick='removeUser("${u}")' style='margin-left:8px;font-size:10px;'>❌</button>`:''}
			<button onclick='setUserRolePrompt("${u}")' style='margin-left:4px;font-size:10px;'>🔧</button>
		</li>`;
	});
	html += `</ul>`;
	html += `<button onclick='addUserPrompt()' style='background:#2ecc71;color:#000;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;'>➕ Ajouter</button> `;
	html += `<button onclick='closeUserMenu()' style='background:#e74c3c;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;'>❌ Fermer</button>`;
	menu.innerHTML = html;
	document.body.appendChild(menu);
}

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

// ========== TOAST NOTIFICATIONS ========== 
function showToast(msg, type='info', duration=3000) {
	let toast = document.createElement('div');
	let bgColor = type==='error' ? '#e74c3c' : type==='success' ? '#2ecc71' : '#3498db';
	toast.style = `position:fixed;bottom:32px;right:32px;z-index:2000;background:${bgColor};color:#fff;padding:16px 24px;border-radius:8px;box-shadow:0 4px 16px #000;font-size:15px;font-weight:bold;opacity:0;transition:opacity .3s;`;
	toast.innerHTML = msg;
	document.body.appendChild(toast);
	setTimeout(()=>{toast.style.opacity=1;},50);
	setTimeout(()=>{toast.style.opacity=0;setTimeout(()=>toast.remove(),400);},duration);
}

// ========== INIT USER ========== 
if (!currentUser) {
	setTimeout(() => {
		const name = prompt('Bienvenue ! Entrez votre nom d\'utilisateur :');
		if (name && name.trim()) setUser(name.trim());
		else setUser('Invité');
	}, 300);
}

// ========== API & DATA ========== 
const API_BASE = '/api';
const socket = io();
let devices = [];
let games = [];
let favorites = [];

async function api(path, opts = {}) {
	try {
		const res = await fetch(path, opts);
		return await res.json();
	} catch (e) {
		console.error('[api]', path, e);
		return { ok: false, error: e.message };
	}
}

async function loadDevices() {
	const data = await api('/api/devices');
	if (data.ok && Array.isArray(data.devices)) {
		devices = data.devices;
		renderDevices();
	}
}

// ========== RENDER: TABLE VIEW ========== 
function renderDevicesTable() {
	const container = document.getElementById('deviceGrid');
	container.innerHTML = '';
	container.style.display = 'block';
	container.style.padding = '20px';
	
	if (devices.length === 0) {
		container.innerHTML = `<div style='text-align:center;color:#fff;font-size:18px;padding:40px;'>
			Aucun casque détecté 😢<br><br>
			<button onclick="loadDevices()" style='background:#2ecc71;color:#000;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>🔄 Rafraîchir</button>
		</div>`;
		return;
	}
	
	let table = `<table style='width:100%;border-collapse:collapse;background:#1a1d24;color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px #000;'>
		<thead>
			<tr style='background:#23272f;'>
				<th style='padding:14px;text-align:left;border-bottom:2px solid #2ecc71;font-size:15px;'>Casque</th>
				<th style='padding:14px;text-align:left;border-bottom:2px solid #2ecc71;font-size:15px;'>Statut</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Streaming</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>WiFi</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Apps</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Voix PC→Casque</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Actions</th>
			</tr>
		</thead>
		<tbody>`;
	
	devices.forEach((d, idx) => {
		const bgColor = idx % 2 === 0 ? '#1a1d24' : '#23272f';
		const statusColor = d.status === 'device' ? '#2ecc71' : d.status === 'streaming' ? '#3498db' : '#e74c3c';
		const statusIcon = d.status === 'device' ? '✅' : d.status === 'streaming' ? '🟢' : '❌';
		
		table += `<tr style='background:${bgColor};border-bottom:1px solid #34495e;'>
			<td style='padding:12px;'>
				<div style='font-weight:bold;font-size:16px;color:#2ecc71;'>${d.name}</div>
				<div style='font-size:11px;color:#95a5a6;margin-top:2px;'>${d.serial}</div>
			</td>
			<td style='padding:12px;'>
				<span style='background:${statusColor};color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;'>
					${statusIcon} ${d.status}
				</span>
			</td>
			<td style='padding:12px;text-align:center;'>
				${d.status !== 'streaming' ? `
					<select id='profile_${d.serial}' style='background:#34495e;color:#fff;border:1px solid #2ecc71;padding:6px;border-radius:4px;margin-bottom:4px;width:140px;'>
						<option value='ultra-low'>Ultra Low</option>
						<option value='low'>Low</option>
						<option value='wifi'>WiFi</option>
						<option value='default' selected>Default</option>
						<option value='high'>High</option>
						<option value='ultra'>Ultra</option>
					</select><br>
					<button onclick='startStreamFromTable("${d.serial}")' style='background:#3498db;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>▶️ Start</button>
				` : `
					<button onclick='stopStreamFromTable("${d.serial}")' style='background:#e74c3c;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>⏹️ Stop</button>
				`}
			</td>
			<td style='padding:12px;text-align:center;'>
				${!d.serial.includes(':') && !d.serial.includes('.') ? `
					<button onclick='connectWifiAuto("${d.serial}")' style='background:#9b59b6;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>📶 WiFi Auto</button>
				` : `<span style='color:#95a5a6;'>-</span>`}
			</td>
			<td style='padding:12px;text-align:center;'>
				<button onclick='showAppsDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#f39c12;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>📱 Apps</button>
				<button onclick='showFavoritesDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#e67e22;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-top:4px;'>⭐ Favoris</button>
			</td>
			<td style='padding:12px;text-align:center;'>
				<button onclick='sendVoiceToHeadset("${d.serial}")' style='background:#1abc9c;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>🎤 Envoyer Voix</button>
			</td>
			<td style='padding:12px;text-align:center;'>
				<button onclick='renameDevice({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;margin:2px;'>✏️</button>
				<button onclick='showStorageDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;margin:2px;'>💾</button>
			</td>
		</tr>`;
	});
	
	table += `</tbody></table>`;
	container.innerHTML = table;
}

// ========== RENDER: CARDS VIEW ========== 
function renderDevicesCards() {
	const grid = document.getElementById('deviceGrid');
	grid.innerHTML = '';
	grid.style.display = 'grid';
	grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
	grid.style.gap = '20px';
	grid.style.padding = '20px';
	
	if (devices.length === 0) {
		grid.innerHTML = `<div style='text-align:center;color:#fff;grid-column:1/-1;padding:40px;'>
			Aucun casque détecté 😢<br><br>
			<button onclick="loadDevices()" style='background:#2ecc71;color:#000;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;'>🔄 Rafraîchir</button>
		</div>`;
		return;
	}
	
	devices.forEach(d => {
		const card = document.createElement('div');
		card.style = 'background:#1a1d24;border:2px solid #2ecc71;border-radius:12px;padding:18px;box-shadow:0 4px 16px #000;color:#fff;';
		
		const statusColor = d.status === 'device' ? '#2ecc71' : d.status === 'streaming' ? '#3498db' : '#e74c3c';
		
		card.innerHTML = `
			<div style='font-weight:bold;font-size:18px;color:#2ecc71;margin-bottom:8px;'>${d.name}</div>
			<div style='font-size:11px;color:#95a5a6;margin-bottom:12px;'>${d.serial}</div>
			<div style='margin-bottom:12px;'>
				<span style='background:${statusColor};color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:bold;'>
					${d.status === 'device' ? '✅' : d.status === 'streaming' ? '🟢' : '❌'} ${d.status}
				</span>
			</div>
			<div style='margin-bottom:10px;'>
				${d.status !== 'streaming' ? `
					<select id='profile_card_${d.serial}' style='width:100%;background:#34495e;color:#fff;border:1px solid #2ecc71;padding:8px;border-radius:6px;margin-bottom:6px;'>
						<option value='ultra-low'>Ultra Low</option>
						<option value='low'>Low</option>
						<option value='wifi'>WiFi</option>
						<option value='default' selected>Default</option>
						<option value='high'>High</option>
						<option value='ultra'>Ultra</option>
					</select>
					<button onclick='startStreamFromCard("${d.serial}")' style='width:100%;background:#3498db;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>▶️ Start Stream</button>
				` : `
					<button onclick='stopStreamFromTable("${d.serial}")' style='width:100%;background:#e74c3c;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>⏹️ Stop Stream</button>
				`}
			</div>
			<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;'>
				<button onclick='showAppsDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#f39c12;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>📱 Apps</button>
				<button onclick='showFavoritesDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#e67e22;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>⭐ Favoris</button>
			</div>
			<button onclick='sendVoiceToHeadset("${d.serial}")' style='width:100%;background:#1abc9c;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>🎤 Voix PC→Casque</button>
			${!d.serial.includes(':') && !d.serial.includes('.') ? `
				<button onclick='connectWifiAuto("${d.serial}")' style='width:100%;background:#9b59b6;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>📶 WiFi Auto</button>
			` : ''}
			<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;'>
				<button onclick='renameDevice({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>✏️ Renommer</button>
				<button onclick='showStorageDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>💾 Stockage</button>
			</div>
		`;
		
		grid.appendChild(card);
	});
}

function renderDevices() {
	if (viewMode === 'table') renderDevicesTable();
	else renderDevicesCards();
}

// ========== STREAMING FUNCTIONS ========== 
window.startStreamFromTable = async function(serial) {
	const profileSelect = document.getElementById(`profile_${serial}`);
	const profile = profileSelect ? profileSelect.value : 'default';
	const res = await api('/api/stream/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial, profile })
	});
	if (res.ok) showToast('✅ Stream démarré !', 'success');
	else showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 500);
};

window.startStreamFromCard = async function(serial) {
	const profileSelect = document.getElementById(`profile_card_${serial}`);
	const profile = profileSelect ? profileSelect.value : 'default';
	const res = await api('/api/stream/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial, profile })
	});
	if (res.ok) showToast('✅ Stream démarré !', 'success');
	else showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 500);
};

window.stopStreamFromTable = async function(serial) {
	const res = await api('/api/stream/stop', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	if (res.ok) showToast('⏹️ Stream arrêté !', 'success');
	else showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 500);
};

// ========== WIFI AUTO ========== 
window.connectWifiAuto = async function(serial) {
	showToast('📶 Connexion WiFi automatique en cours...', 'info');
	const res = await api('/api/adb/wifi-auto', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	if (res.ok) showToast('✅ WiFi connecté : ' + res.ip, 'success');
	else showToast('❌ Erreur WiFi: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 1000);
};

// ========== VOICE TO HEADSET (TTS) ========== 
window.sendVoiceToHeadset = async function(serial) {
	const text = prompt('💬 Entrez le texte à envoyer au casque (TTS):');
	if (!text || !text.trim()) return;
	
	showToast('🎤 Envoi de la voix...', 'info');
	const res = await api('/api/tts/send', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial, text: text.trim() })
	});
	
	if (res.ok) showToast('✅ Voix envoyée au casque !', 'success');
	else showToast('❌ Erreur: ' + (res.error || 'fonction non implémentée'), 'error');
};

// ========== DEVICE ACTIONS ========== 
window.renameDevice = async function(device) {
	const name = prompt('Nouveau nom pour le casque', device.name);
	if (!name || name === device.name) return;
	const res = await api('/api/devices/rename', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial: device.serial, name })
	});
	if (res.ok) {
		showToast('✅ Casque renommé !', 'success');
		loadDevices();
	} else showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
};

window.showAppsDialog = async function(device) {
	const res = await api(`/api/apps/${device.serial}`);
	if (!res.ok) return showToast('❌ Erreur chargement apps', 'error');
	const apps = res.apps || [];
	let html = `<h3 style='color:#2ecc71;'>Apps installées sur ${device.name}</h3>`;
	html += `<div style='max-height:400px;overflow-y:auto;'>`;
	apps.forEach(pkg => {
		html += `<div style='padding:8px;margin:4px 0;background:#23272f;border-radius:6px;'>
			<span style='color:#fff;'>${pkg}</span>
			<button onclick="launchApp('${device.serial}','${pkg}')" style='float:right;background:#2ecc71;color:#000;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;'>▶️ Lancer</button>
		</div>`;
	});
	html += `</div>`;
	showModal(html);
};

window.launchApp = async function(serial, pkg) {
	const res = await api(`/api/apps/${serial}/launch`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ package: pkg })
	});
	if (res.ok) showToast('✅ App lancée !', 'success');
	else showToast('❌ Erreur lancement', 'error');
	closeModal();
};

window.showFavoritesDialog = async function(device) {
	const res = await api('/api/favorites');
	if (!res.ok) return showToast('❌ Erreur chargement favoris', 'error');
	const favs = res.favorites || [];
	let html = `<h3 style='color:#2ecc71;'>Favoris pour ${device.name}</h3>`;
	html += `<div style='max-height:400px;overflow-y:auto;'>`;
	favs.forEach(fav => {
		html += `<div style='padding:8px;margin:4px 0;background:#23272f;border-radius:6px;'>
			<span style='color:#fff;'>${fav.name}</span>
			<button onclick="launchApp('${device.serial}','${fav.packageId}')" style='float:right;background:#e67e22;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;'>⭐ Lancer</button>
		</div>`;
	});
	html += `</div>`;
	showModal(html);
};

window.showStorageDialog = async function(device) {
	showToast('💾 Fonction stockage à venir...', 'info');
};

// ========== MODAL ========== 
function showModal(html) {
	let modal = document.getElementById('modal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'modal';
		modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:2500;display:flex;align-items:center;justify-content:center;';
		modal.onclick = (e) => { if (e.target === modal) closeModal(); };
		document.body.appendChild(modal);
	}
	modal.innerHTML = `<div style='background:#1a1d24;border:2px solid #2ecc71;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px #000;color:#fff;'>
		${html}
		<br><button onclick="closeModal()" style='background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:12px;'>❌ Fermer</button>
	</div>`;
	modal.style.display = 'flex';
}

window.closeModal = function() {
	const modal = document.getElementById('modal');
	if (modal) modal.style.display = 'none';
};

// ========== SOCKET.IO EVENTS ========== 
socket.on('devices-update', (data) => {
	devices = data;
	renderDevices();
});

socket.on('games-update', (data) => {
	games = data;
});

socket.on('favorites-update', (data) => {
	favorites = data;
});

socket.on('stream-event', (evt) => {
	if (evt.type === 'start') showToast('🟢 Stream démarré', 'success');
	if (evt.type === 'stop') showToast('⏹️ Stream arrêté', 'info');
});

// ========== INIT ========== 
console.log('[Dashboard PRO] Init');
createNavbar();
loadDevices();
