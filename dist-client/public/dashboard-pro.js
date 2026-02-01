// VHR DASHBOARD PRO - Version complète avec fond noir et vue tableau
// Date: 2026-01-09

// ========== TAB/SESSION MANAGEMENT ==========
// Unique ID for this browser tab to manage multiple connections
const VHR_TAB_ID = 'vhr_tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const VHR_BROADCAST_CHANNEL = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vhr_dashboard_sync') : null;

// Track active audio session across tabs
let isAudioSessionOwner = false;

// Listen for messages from other tabs

if (VHR_BROADCAST_CHANNEL) {
	VHR_BROADCAST_CHANNEL.onmessage = (event) => {
		const { type, tabId, serial } = event.data;

		if (tabId === VHR_TAB_ID) return; // Ignore own messages

		switch(type) {
			case 'audio-started':
				// Another tab started audio - close ours if active
				if (activeAudioStream) {
					console.log('[VHR Multi-Tab] Another tab started audio, closing local stream');
					window.closeAudioStream(true); // true = silent close (no toast)
				}
				break;
			case 'audio-stopped':
				console.log('[VHR Multi-Tab] Another tab stopped audio for', serial);
				break;
			case 'request-audio-status':
				// Another tab is asking who owns the audio
				if (activeAudioStream && isAudioSessionOwner) {
					VHR_BROADCAST_CHANNEL.postMessage({
						type: 'audio-status-response',
						tabId: VHR_TAB_ID,
						serial: activeAudioSerial,
						active: true
					});
				}
				break;
		}
	};
}

// Notify other tabs when audio starts/stops
function broadcastAudioState(type, serial) {
	if (VHR_BROADCAST_CHANNEL) {
		VHR_BROADCAST_CHANNEL.postMessage({ type, tabId: VHR_TAB_ID, serial });
	}
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
	if (activeAudioStream) {
		broadcastAudioState('audio-stopped', activeAudioSerial);
		// Attempt synchronous cleanup
		try {
			if (activeAudioStream.localStream) {
				activeAudioStream.localStream.getTracks().forEach(t => t.stop());
			}
		} catch (e) { /* ignore */ }
	}
});

// ========== HELPER FUNCTIONS ========== 
// Toggle password visibility in forms
window.toggleDashboardPassword = function(inputId) {
	const input = document.getElementById(inputId);
	if (!input) return;
	if (input.type === 'password') {
		input.type = 'text';
	} else {
		input.type = 'password';
	}
};

function showModalInputPrompt(options = {}) {
	const {
		title,
		message,
		defaultValue = '',
		placeholder = '',
		confirmText = 'Valider',
		cancelText = 'Annuler',
		type = 'text',
		selectOptions = []
	} = options || {};
	const normalizedDefault = defaultValue != null ? defaultValue : '';
	return new Promise(resolve => {
		const existing = document.getElementById('vhrInputPromptOverlay');
		if (existing) existing.remove();
		const overlay = document.createElement('div');
		overlay.id = 'vhrInputPromptOverlay';
		overlay.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:rgba(4,6,13,0.75);backdrop-filter:blur(6px);padding:20px;z-index:5500;';
		const dialog = document.createElement('div');
		dialog.style = 'background:#11131a;border-radius:16px;padding:24px;width:100%;max-width:420px;border:2px solid #2ecc71;box-shadow:0 25px 70px rgba(0,0,0,0.65);';
		if (title) {
			const titleEl = document.createElement('h3');
			titleEl.textContent = title;
			titleEl.style = 'margin:0 0 8px;color:#2ecc71;font-size:22px;';
			dialog.appendChild(titleEl);
		}
		if (message) {
			const messageEl = document.createElement('p');
			messageEl.textContent = message;
			messageEl.style = 'margin:0 0 12px;color:#b0b7c4;font-size:14px;';
			dialog.appendChild(messageEl);
		}
		let inputElement;
		if (Array.isArray(selectOptions) && selectOptions.length) {
			inputElement = document.createElement('select');
			inputElement.style = 'width:100%;padding:12px;border-radius:8px;border:1px solid #34495e;background:#182026;color:#fff;font-size:16px;';
			selectOptions.forEach(option => {
				const optionEl = document.createElement('option');
				if (typeof option === 'string') {
					optionEl.value = option;
					optionEl.textContent = option;
				} else {
					optionEl.value = option.value;
					optionEl.textContent = option.label || option.value;
					if (option.disabled) optionEl.disabled = true;
				}
				if (String(optionEl.value) === String(normalizedDefault)) {
					optionEl.selected = true;
				}
				inputElement.appendChild(optionEl);
			});
			if (!inputElement.value && selectOptions[0]) {
				inputElement.value = selectOptions[0].value;
			}
		} else {
			inputElement = document.createElement('input');
			inputElement.type = type;
			inputElement.placeholder = placeholder;
			inputElement.value = normalizedDefault;
			inputElement.style = 'width:100%;padding:12px;border-radius:8px;border:1px solid #34495e;background:#182026;color:#fff;font-size:16px;';
		}
		inputElement.setAttribute('autocomplete', 'off');
		inputElement.setAttribute('aria-label', message || title || 'Saisie');
		dialog.appendChild(inputElement);
		const actions = document.createElement('div');
		actions.style = 'display:flex;justify-content:flex-end;gap:12px;margin-top:20px;';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.textContent = cancelText;
		cancelBtn.style = 'background:#1a1d24;color:#fff;border:1px solid #34495e;padding:10px 18px;border-radius:8px;cursor:pointer;';
		const confirmBtn = document.createElement('button');
		confirmBtn.type = 'button';
		confirmBtn.textContent = confirmText;
		confirmBtn.style = 'background:#2ecc71;color:#000;border:none;padding:10px 18px;border-radius:8px;font-weight:bold;cursor:pointer;';
		actions.appendChild(cancelBtn);
		actions.appendChild(confirmBtn);
		dialog.appendChild(actions);
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);
		inputElement.focus();
		let resolved = false;
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				close(null);
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				handleConfirm();
			}
		};
		const cleanup = () => {
			document.removeEventListener('keydown', handleKeyDown);
			if (overlay.parentNode) {
				overlay.parentNode.removeChild(overlay);
			}
		};
		const close = (value) => {
			if (resolved) return;
			resolved = true;
			cleanup();
			resolve(value);
		};
		const handleConfirm = () => {
			close(inputElement.value);
		};
		document.addEventListener('keydown', handleKeyDown);
		overlay.addEventListener('click', (event) => {
			if (event.target === overlay) {
				close(null);
			}
		});
		confirmBtn.addEventListener('click', handleConfirm);
		cancelBtn.addEventListener('click', () => close(null));
	});
}

// ========== CONFIGURATION ========== 
let viewMode = localStorage.getItem('vhr_view_mode') || 'table'; // 'table' ou 'cards'
let currentUser = localStorage.getItem('vhr_user') || '';
let userList = JSON.parse(localStorage.getItem('vhr_user_list') || '[]');
let userRoles = JSON.parse(localStorage.getItem('vhr_user_roles') || '{}');
let licenseKey = localStorage.getItem('vhr_license_key') || '';
let licenseStatus = {
	licensed: false,
	trial: false,
	expired: false,
	accessBlocked: false,
	demo: null,
	subscriptionStatus: 'unknown',
	hasPerpetualLicense: false,
	licenseCount: 0
};
const ALLOWED_ADMIN_USER = 'peter';
const AUTH_TOKEN_STORAGE_KEY = 'vhr_auth_token';
let installationOverlayElement = null;
const DEMO_GUEST_USERNAME = 'demo_guest';

function isAdminAllowed(user) {
	return typeof user === 'string' && user === ALLOWED_ADMIN_USER;
}

function normalizeRoleForUser(user, requestedRole) {
	const target = (requestedRole || 'user').toLowerCase();
	if (target === 'guest') return 'guest';
	if (target === 'admin' && isAdminAllowed(user)) return 'admin';
	return 'user';
}

function getDisplayedRole(user) {
	return normalizeRoleForUser(user, userRoles[user]);
}

function readAuthToken() {
	return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
}

function saveAuthToken(token) {
	if (token && token.trim()) {
		localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim());
		return token.trim();
	}
	localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
	return '';
}

async function syncTokenFromCookie() {
	// If the user is already authenticated via httpOnly cookie (e.g., after a redirect from HTTPS
	// to LAN HTTP) but localStorage lacks the JWT, ask the server to echo it once so we can
	// propagate it via ?token=… on LAN links.
	const existing = readAuthToken();
	if (existing) return existing;
	try {
		const res = await api('/api/check-auth?includeToken=1', { skipAuthHeader: true });
		if (res && res.ok && res.authenticated && res.token) {
			return saveAuthToken(res.token);
		}
	} catch (e) {
		console.warn('[auth] syncTokenFromCookie failed', e);
	}
	return '';
}

function captureTokenFromQuery() {
	if (!window || !window.location || !window.history) return;
	const params = new URLSearchParams(window.location.search || '');
	const tokenParam = params.get('token') || params.get('vhr_token');
	if (!tokenParam) return;
	saveAuthToken(tokenParam);
	params.delete('token');
	params.delete('vhr_token');
	const baseUrl = window.location.origin + window.location.pathname;
	const search = params.toString();
	const newUrl = `${baseUrl}${search ? ('?' + search) : ''}${window.location.hash || ''}`;
	window.history.replaceState(null, document.title, newUrl);
}

captureTokenFromQuery();

// ========== NAVBAR ========== 
function createNavbar() {
	let nav = document.getElementById('mainNavbar');
	if (!nav) {
		nav = document.createElement('nav');
		nav.id = 'mainNavbar';
		document.body.appendChild(nav);
		document.body.style.paddingTop = '56px';
	}
	
	nav.style = 'position:fixed;top:0;left:0;width:100vw;height:50px;background:#1a1d24;color:#fff;z-index:1100;display:flex;align-items:center;box-shadow:0 2px 8px #000;border-bottom:2px solid #2ecc71;';
	nav.innerHTML = `
		<div style='display:flex;align-items:center;font-weight:bold;margin-left:20px;gap:10px;' aria-label='VHR Dashboard PRO'>
			<img src='/assets/logo-vd.svg' alt='' aria-hidden='true' onerror="this.style.display='none';" style='height:32px;width:auto;object-fit:contain;filter:drop-shadow(0 0 6px rgba(0,0,0,0.45));'>
			<span style='color:#2ecc71;font-size:20px;'>VHR DASHBOARD PRO</span>
		</div>
		<div style='flex:1'></div>
		<button id="toggleViewBtn" style="margin-right:15px;background:#2ecc71;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			📊 Vue: Tableau
		</button>
		<button id="refreshBtn" style="margin-right:15px;background:#9b59b6;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			🔄 Rafraîchir
		</button>
		<button id="noticeBtn" style="margin-right:15px;background:#f1c40f;color:#1a1d24;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			🛈 Notice
		</button>
		<button id="favoritesBtn" style="margin-right:15px;background:#f39c12;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			� Ajouter aux favoris
		</button>
		<button id="accountBtn" style="margin-right:15px;background:#3498db;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			👤 Mon Compte
		</button>
		<div id='navbarUser' style='margin-right:24px;display:flex;gap:12px;align-items:center;'></div>
	`;
	
	document.getElementById('toggleViewBtn').onclick = toggleView;
	document.getElementById('refreshBtn').onclick = refreshDevicesList;
	document.getElementById('noticeBtn').onclick = showSetupNotice;
	document.getElementById('favoritesBtn').onclick = addDashboardToFavorites;
	document.getElementById('accountBtn').onclick = showAccountPanel;
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
	const normalizedRole = normalizeRoleForUser(user, role);
	userRoles[user] = normalizedRole;
	saveUserList();
	updateUserUI();
}

function updateUserUI() {
	let userDiv = document.getElementById('navbarUser');
	if (!userDiv) return;
	let role = getDisplayedRole(currentUser);
	let roleColor = role==='admin' ? '#ff9800' : role==='guest' ? '#95a5a6' : '#2196f3';
	userDiv.innerHTML = `
		<span style='font-size:18px;'>👤</span> 
		<b style='color:#2ecc71;'>${currentUser || 'Invité'}</b> 
		<span style="font-size:11px;background:${roleColor};color:#fff;padding:3px 8px;border-radius:6px;">${role}</span>
		<button id="changeUserBtn" style='margin-left:8px;'>Changer</button>
		<button id="userMenuBtn">Menu</button>
	`;
	document.getElementById('changeUserBtn').onclick = async () => {
		const name = await showModalInputPrompt({
			title: 'Changer d\'utilisateur',
			message: 'Nom d\'utilisateur',
			defaultValue: currentUser || '',
			placeholder: 'Nom d\'utilisateur'
		});
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
		let role = getDisplayedRole(u);
		let roleColor = role==='admin' ? '#ff9800' : role==='guest' ? '#95a5a6' : '#2196f3';
		const isAuthenticated = authenticatedUsers[u] ? '✅' : '🔒';
		html += `<li style='margin-bottom:8px;padding:8px;background:#23272f;border-radius:6px;'>
			<span style='cursor:pointer;color:${u===currentUser?'#2ecc71':'#fff'};font-weight:bold;' onclick='switchToUser("${u}")'>${isAuthenticated} ${u}</span>
			<span style='font-size:10px;background:${roleColor};color:#fff;padding:2px 6px;border-radius:4px;margin-left:6px;'>${role}</span>
			${u!=='Invité'?`<button onclick='removeUser("${u}")' style='margin-left:8px;font-size:10px;'>�</button>`:''}
			<button onclick='setUserRolePrompt("${u}")' style='margin-left:4px;font-size:10px;'>🔧</button>
		</li>`;
	});
	html += `</ul>`;
	html += `<div style='display:flex;gap:8px;flex-wrap:wrap;'>`;
	html += `<button onclick='showAddUserDialog()' style='background:#2ecc71;color:#000;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;'>➕ Ajouter</button>`;
	html += `<button onclick='showLoginDialog()' style='background:#3498db;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;'>🔑 Connexion</button>`;
	html += `<button onclick='showSessionMenu()' style='background:#9b59b6;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;'>� Session</button>`;
	html += `<button onclick='closeUserMenu()' style='background:#e74c3c;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;'>�</button>`;
	html += `</div>`;
	menu.innerHTML = html;
	document.body.appendChild(menu);
}

// ========== AUTHENTICATION SYSTEM ==========
let authenticatedUsers = JSON.parse(localStorage.getItem('vhr_auth_users') || '{}');
let currentSession = null;

function saveAuthUsers() {
	localStorage.setItem('vhr_auth_users', JSON.stringify(authenticatedUsers));
}

window.setUser = setUser;
window.removeUser = removeUser;

window.switchToUser = function(u) {
	if (authenticatedUsers[u]) {
		setUser(u);
		showToast(`✅ Connecté en tant que ${u}`, 'success');
	} else {
		showLoginDialogForUser(u);
	}
};

window.setUserRolePrompt = async function(u) {
	const roleOptions = [
		{ value: 'user', label: 'Utilisateur' },
		{ value: 'guest', label: 'Invité' }
	];
	if (isAdminAllowed(u)) {
		roleOptions.unshift({ value: 'admin', label: 'Administrateur' });
	}
	const defaultRole = getDisplayedRole(u);
	const role = await showModalInputPrompt({
		title: 'Modifier le rôle',
		message: `Rôle pour ${u} ?`,
		type: 'select',
		selectOptions: roleOptions,
		defaultValue: defaultRole
	});
	if (role) setUserRole(u, role.trim());
};

// Show dialog to add a new user with password
window.showAddUserDialog = function() {
	closeUserMenu();
	let dialog = document.getElementById('addUserDialog');
	if (dialog) dialog.remove();
	
	dialog = document.createElement('div');
	dialog.id = 'addUserDialog';
	dialog.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:3000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
	dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
	
	dialog.innerHTML = `
		<div style='background:#1a1d24;border:3px solid #2ecc71;border-radius:16px;padding:30px;width:400px;color:#fff;'>
			<h2 style='color:#2ecc71;margin:0 0 20px;text-align:center;'>➕ Nouvel Utilisateur</h2>
			<div style='margin-bottom:15px;'>
				<label style='display:block;margin-bottom:5px;color:#95a5a6;'>Nom d'utilisateur</label>
				<input type='text' id='newUserName' placeholder='Nom' style='width:100%;padding:12px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;box-sizing:border-box;'>
			</div>
			<div style='margin-bottom:15px;'>
				<label style='display:block;margin-bottom:5px;color:#95a5a6;'>Mot de passe</label>
				<div style='position:relative;'>
					<input type='password' id='newUserPass' placeholder='Mot de passe (min 4 caractères)' style='width:100%;padding:12px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;box-sizing:border-box;'>
					<button type='button' onclick='toggleDashboardPassword("newUserPass")' style='position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#95a5a6;cursor:pointer;font-size:18px;'>��</button>
				</div>
			</div>
			<div style='margin-bottom:20px;'>
				<label style='display:block;margin-bottom:5px;color:#95a5a6;'>Rôle</label>
				<select id='newUserRole' style='width:100%;padding:12px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;'>
					<option value='user'>👤 Utilisateur</option>
					<option value='guest'>👥 Invité</option>
				</select>
			</div>
			<div style='display:flex;gap:10px;'>
				<button onclick='createNewUser()' style='flex:1;background:#2ecc71;color:#000;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>✅ Créer</button>
				<button onclick='document.getElementById("addUserDialog").remove()' style='flex:1;background:#e74c3c;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>� Annuler</button>
			</div>
			<p style='text-align:center;color:#95a5a6;font-size:12px;margin-top:15px;'>Le compte sera créé sur le serveur avec authentification sécurisée</p>
		</div>
	`;
	document.body.appendChild(dialog);
	document.getElementById('newUserName').focus();
};

window.createNewUser = async function() {
	const username = document.getElementById('newUserName').value.trim();
	const password = document.getElementById('newUserPass').value;
	const role = document.getElementById('newUserRole').value;
	const normalizedRole = normalizeRoleForUser(username, role);
	
	if (!username) {
		showToast('� Entrez un nom d\'utilisateur', 'error');
		return;
	}
	if (password.length < 4) {
		showToast('� Le mot de passe doit contenir au moins 4 caractères', 'error');
		return;
	}
	
	try {
		const res = await fetch('/api/dashboard/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password, role: normalizedRole })
		});
		const data = await res.json();
		
		if (data.ok) {
			// Add to local list
			if (!userList.includes(username)) {
				userList.push(username);
			}
			userRoles[username] = normalizedRole;
			authenticatedUsers[username] = { token: data.token, role: normalizedRole };
			saveUserList();
			saveAuthUsers();
			setUser(username);
			document.getElementById('addUserDialog').remove();
			showToast(`✅ Utilisateur ${username} créé avec succès!`, 'success');
		} else {
			showToast(`� ${data.error || 'Erreur lors de la création'}`, 'error');
		}
	} catch (e) {
		console.error('[createNewUser]', e);
		showToast('� Erreur de connexion au serveur', 'error');
	}
};

// Show login dialog
window.showLoginDialog = function() {
	closeUserMenu();
	showLoginDialogForUser('');
};

window.showLoginDialogForUser = function(username) {
	let dialog = document.getElementById('loginDialog');
	if (dialog) dialog.remove();
	
	dialog = document.createElement('div');
	dialog.id = 'loginDialog';
	dialog.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:3000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
	dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
	
	dialog.innerHTML = `
		<div style='background:#1a1d24;border:3px solid #3498db;border-radius:16px;padding:30px;width:400px;color:#fff;'>
			<h2 style='color:#3498db;margin:0 0 20px;text-align:center;'>🔑 Connexion</h2>
			<div style='margin-bottom:15px;'>
				<label style='display:block;margin-bottom:5px;color:#95a5a6;'>Nom d'utilisateur</label>
				<input type='text' id='loginUserName' value='${username}' placeholder='Nom' style='width:100%;padding:12px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;box-sizing:border-box;'>
			</div>
			<div style='margin-bottom:20px;'>
				<label style='display:block;margin-bottom:5px;color:#95a5a6;'>Mot de passe</label>
				<div style='position:relative;'>
					<input type='password' id='loginUserPass' placeholder='Mot de passe' style='width:100%;padding:12px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;box-sizing:border-box;' onkeypress='if(event.key==="Enter")loginUser()'>
					<button type='button' onclick='toggleDashboardPassword("loginUserPass")' style='position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#95a5a6;cursor:pointer;font-size:18px;'>��</button>
				</div>
			</div>
			<div style='display:flex;gap:10px;'>
				<button onclick='loginUser()' style='flex:1;background:#3498db;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>🔓 Connexion</button>
				<button onclick='document.getElementById("loginDialog").remove()' style='flex:1;background:#e74c3c;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>� Annuler</button>
			</div>
			<p style='text-align:center;color:#95a5a6;font-size:12px;margin-top:15px;'>Pas de compte? <a href='#' onclick='document.getElementById("loginDialog").remove();showAddUserDialog();' style='color:#2ecc71;'>Créer un compte</a></p>
		</div>
	`;
	document.body.appendChild(dialog);
	if (username) {
		document.getElementById('loginUserPass').focus();
	} else {
		document.getElementById('loginUserName').focus();
	}
};

window.loginUser = async function() {
	const username = document.getElementById('loginUserName').value.trim();
	const password = document.getElementById('loginUserPass').value;
	
	if (!username || !password) {
		showToast('� Entrez nom d\'utilisateur et mot de passe', 'error');
		return;
	}
	
	try {
		const res = await fetch('/api/dashboard/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await res.json();
		
		if (data.ok) {
			if (!userList.includes(username)) {
				userList.push(username);
			}
			userRoles[username] = data.user.role;
			authenticatedUsers[username] = { token: data.token, role: data.user.role };
			saveUserList();
			saveAuthUsers();
			setUser(username);
			document.getElementById('loginDialog').remove();
			showToast(`✅ Bienvenue ${username}!`, 'success');
		} else {
			showToast(`� ${data.error || 'Identifiants incorrects'}`, 'error');
		}
	} catch (e) {
		console.error('[loginUser]', e);
		showToast('� Erreur de connexion au serveur', 'error');
	}
};

// ========== COLLABORATIVE SESSIONS ==========
window.showSessionMenu = function() {
	closeUserMenu();
	let menu = document.getElementById('sessionMenu');
	if (menu) menu.remove();
	
	menu = document.createElement('div');
	menu.id = 'sessionMenu';
	menu.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:3000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
	menu.onclick = (e) => { if (e.target === menu) menu.remove(); };
	
	const sessionInfo = currentSession ? `
		<div style='background:#27ae60;padding:15px;border-radius:8px;margin-bottom:20px;'>
			<h3 style='margin:0 0 10px;'>✅ Session Active: ${currentSession.code}</h3>
			<p style='margin:0;font-size:14px;'>Hôte: ${currentSession.host}</p>
			<p style='margin:5px 0 0;font-size:14px;'>${currentSession.users?.length || 1} utilisateur(s) connecté(s)</p>
			<div id='sessionUsersList' style='margin-top:10px;font-size:12px;'></div>
		</div>
		<button onclick='leaveSession()' style='width:100%;background:#e74c3c;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;margin-bottom:15px;'>🚪 Quitter la session</button>
	` : '';
	
	menu.innerHTML = `
		<div style='background:#1a1d24;border:3px solid #9b59b6;border-radius:16px;padding:30px;width:450px;color:#fff;'>
			<h2 style='color:#9b59b6;margin:0 0 20px;text-align:center;'>� Sessions Collaboratives</h2>
			<p style='color:#95a5a6;text-align:center;margin-bottom:20px;font-size:14px;'>
				Partagez votre dashboard avec d'autres utilisateurs à distance
			</p>
			
			${sessionInfo}
			
			<div style='display:grid;gap:15px;'>
				<button onclick='createSession()' style='background:#9b59b6;color:#fff;border:none;padding:16px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;${currentSession ? 'opacity:0.5;' : ''}' ${currentSession ? 'disabled' : ''}>
					🎯 Créer une session
				</button>
				
				<div style='text-align:center;color:#95a5a6;'>— ou —</div>
				
				<div style='display:flex;gap:10px;'>
					<input type='text' id='joinSessionCode' placeholder='Code session (ex: ABC123)' maxlength='6' 
						style='flex:1;padding:14px;border:2px solid #34495e;border-radius:8px;background:#23272f;color:#fff;font-size:16px;text-transform:uppercase;text-align:center;letter-spacing:4px;'
						oninput='this.value = this.value.toUpperCase()'>
					<button onclick='joinSession()' style='background:#3498db;color:#fff;border:none;padding:14px 20px;border-radius:8px;cursor:pointer;font-weight:bold;'>
						🔗 Rejoindre
					</button>
				</div>
			</div>
			
			<button onclick='document.getElementById("sessionMenu").remove()' style='width:100%;background:#34495e;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;margin-top:20px;'>
				� Fermer
			</button>
		</div>
	`;
	document.body.appendChild(menu);
	
	if (currentSession) {
		updateSessionUsersList();
	}
};

function updateSessionUsersList() {
	const list = document.getElementById('sessionUsersList');
	if (list && currentSession && currentSession.users) {
		list.innerHTML = currentSession.users.map(u => 
			`<span style='display:inline-block;background:#34495e;padding:4px 8px;border-radius:4px;margin:2px;'>${u.role === 'host' ? '👑' : '👤'} ${u.username}</span>`
		).join('');
	}
}

// Socket.IO session handlers
function initSessionSocket() {
	if (typeof io === 'undefined') return;
	
	const socket = window.vhrSocket || io();
	window.vhrSocket = socket;
	
	socket.on('session-created', (data) => {
		currentSession = { code: data.sessionCode, users: data.users, host: currentUser };
		showToast(`🎯 Session créée! Code: ${data.sessionCode}`, 'success', 5000);
		// Show the code prominently
		showSessionCodePopup(data.sessionCode);
	});
	
	socket.on('session-joined', (data) => {
		currentSession = { code: data.sessionCode, users: data.users, host: data.host };
		showToast(`✅ Connecté à la session ${data.sessionCode}`, 'success');
		document.getElementById('sessionMenu')?.remove();
	});
	
	socket.on('session-updated', (data) => {
		if (currentSession) {
			currentSession.users = data.users;
			if (data.message) {
				showToast(`� ${data.message}`, 'info');
			}
			updateSessionUsersList();
			updateSessionIndicator();
		}
	});
	
	socket.on('session-error', (data) => {
		showToast(`� ${data.error}`, 'error');
	});
	
	socket.on('session-action', (data) => {
		// Handle synchronized actions from other users
		console.log('[Session] Action received:', data);
		handleSessionAction(data);
	});
}

function handleSessionAction(data) {
	const { action, payload, from } = data;
	
	switch(action) {
		case 'launch-game':
			showToast(`🎮 ${from} lance ${payload.gameName}`, 'info');
			break;
		case 'device-selected':
			showToast(`📱 ${from} a sélectionné ${payload.deviceName}`, 'info');
			break;
		case 'settings-changed':
			showToast(`⚙� ${from} a modifié les paramètres`, 'info');
			break;
	}
}

window.createSession = function() {
	if (!currentUser || currentUser === 'Invité') {
		showToast('� Connectez-vous d\'abord pour créer une session', 'error');
		return;
	}
	
	if (window.vhrSocket) {
		window.vhrSocket.emit('create-session', { username: currentUser });
	} else {
		showToast('� Connexion socket non disponible', 'error');
	}
};

window.joinSession = function() {
	const code = document.getElementById('joinSessionCode')?.value.trim().toUpperCase();
	if (!code || code.length !== 6) {
		showToast('� Entrez un code de session valide (6 caractères)', 'error');
		return;
	}
	
	if (!currentUser || currentUser === 'Invité') {
		showToast('� Connectez-vous d\'abord pour rejoindre une session', 'error');
		return;
	}
	
	if (window.vhrSocket) {
		window.vhrSocket.emit('join-session', { sessionCode: code, username: currentUser });
	}
};

window.leaveSession = function() {
	if (window.vhrSocket && currentSession) {
		window.vhrSocket.emit('leave-session');
		currentSession = null;
		showToast('👋 Session quittée', 'info');
		document.getElementById('sessionMenu')?.remove();
		updateSessionIndicator();
	}
};

function showSessionCodePopup(code) {
	let popup = document.getElementById('sessionCodePopup');
	if (popup) popup.remove();
	
	popup = document.createElement('div');
	popup.id = 'sessionCodePopup';
	popup.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1d24;border:4px solid #9b59b6;border-radius:20px;padding:40px;z-index:4000;text-align:center;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,0.5);';
	
	popup.innerHTML = `
		<h2 style='color:#9b59b6;margin:0 0 10px;'>🎯 Session Créée!</h2>
		<p style='color:#95a5a6;margin:0 0 20px;'>Partagez ce code avec vos collaborateurs:</p>
		<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:20px;'>
			<span style='font-size:48px;font-weight:bold;letter-spacing:8px;color:#2ecc71;font-family:monospace;'>${code}</span>
		</div>
		<button onclick='copySessionCode("${code}")' style='background:#3498db;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;margin-right:10px;'>📋 Copier</button>
		<button onclick='document.getElementById("sessionCodePopup").remove()' style='background:#34495e;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;'>✅ OK</button>
	`;
	
	document.body.appendChild(popup);
	document.getElementById('sessionMenu')?.remove();
	updateSessionIndicator();
}

window.copySessionCode = function(code) {
	navigator.clipboard.writeText(code).then(() => {
		showToast('📋 Code copié!', 'success');
	});
};

function updateSessionIndicator() {
	let indicator = document.getElementById('sessionIndicator');
	
	if (currentSession) {
		if (!indicator) {
			indicator = document.createElement('div');
			indicator.id = 'sessionIndicator';
			indicator.style = 'position:fixed;top:60px;right:20px;background:#9b59b6;color:#fff;padding:8px 16px;border-radius:8px;z-index:1000;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
			indicator.onclick = showSessionMenu;
			document.body.appendChild(indicator);
		}
		indicator.innerHTML = `� Session: ${currentSession.code} (${currentSession.users?.length || 1})`;
	} else if (indicator) {
		indicator.remove();
	}
}

// Broadcast action to session
function broadcastSessionAction(action, payload) {
	if (currentSession && window.vhrSocket) {
		window.vhrSocket.emit('session-action', { action, payload });
	}
}

window.addUserPrompt = function() {
	showAddUserDialog();
};

window.closeUserMenu = function() {
	const menu = document.getElementById('userMenu');
	if (menu) menu.remove();
};

// ========== DOWNLOAD PANEL ========== 
window.addDashboardToFavorites = function() {
	// Add this page to browser bookmarks
	const url = window.location.href;
	const title = '🥽 VHR Dashboard PRO';
	
	if (window.sidebar && window.sidebar.addPanel) {
		// Firefox
		window.sidebar.addPanel(title, url, '');
	} else if (window.external && window.external.AddFavorite) {
		// Internet Explorer
		window.external.AddFavorite(url, title);
	} else {
		// Autres navigateurs - affiche instruction
		showToast('� Appuyez sur Ctrl+D pour ajouter aux favoris', 'info', 4000);
	}
};

// ========== MON COMPTE PANEL ========== 
function showAccountPanel() {
	let panel = document.getElementById('accountPanel');
	if (panel) panel.remove();
	
	// Récupérer les stats utilisateur
	const userStats = getUserStats();
	const userPrefs = getUserPreferences();
	const role = getDisplayedRole(currentUser);
	const roleColor = role==='admin' ? '#ff9800' : role==='user' ? '#2196f3' : '#95a5a6';
	const roleIcon = role==='admin' ? '👑' : role==='user' ? '👤' : '👥';
	
	panel = document.createElement('div');
	panel.id = 'accountPanel';
	panel.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
	panel.onclick = (e) => { if (e.target === panel) closeAccountPanel(); };
	
	panel.innerHTML = `
		<div style='background:#1a1d24;border:3px solid #2ecc71;border-radius:16px;padding:0;max-width:900px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px #000;color:#fff;'>
			<!-- Header -->
			<div style='background:linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);padding:24px;border-radius:13px 13px 0 0;position:relative;'>
				<button onclick='closeAccountPanel()' style='position:absolute;top:16px;right:16px;background:rgba(0,0,0,0.3);color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:18px;font-weight:bold;'>✕</button>
				<div style='display:flex;align-items:center;gap:20px;'>
					<div style='width:80px;height:80px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;box-shadow:0 4px 12px rgba(0,0,0,0.3);'>
						${roleIcon}
					</div>
					<div>
						<h2 style='margin:0;font-size:28px;color:#fff;'>${currentUser || 'Invité'}</h2>
						<div style='margin-top:6px;display:flex;gap:8px;align-items:center;'>
							<span style='background:${roleColor};color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:bold;text-transform:uppercase;'>${role}</span>
							<span style='background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;'>Membre depuis ${userStats.memberSince}</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Tabs -->
			<div style='display:flex;background:#23272f;border-bottom:2px solid #2ecc71;'>
				<button id='tabProfile' class='account-tab active' onclick='switchAccountTab("profile")' style='flex:1;padding:16px;background:transparent;border:none;color:#fff;cursor:pointer;font-weight:bold;border-bottom:3px solid #2ecc71;transition:all 0.3s;'>
					📋 Profil
				</button>
				<button id='tabStats' class='account-tab' onclick='switchAccountTab("stats")' style='flex:1;padding:16px;background:transparent;border:none;color:#95a5a6;cursor:pointer;font-weight:bold;border-bottom:3px solid transparent;transition:all 0.3s;'>
					📊 Statistiques
				</button>
				<button id='tabSettings' class='account-tab' onclick='switchAccountTab("settings")' style='flex:1;padding:16px;background:transparent;border:none;color:#95a5a6;cursor:pointer;font-weight:bold;border-bottom:3px solid transparent;transition:all 0.3s;'>
					⚙� Paramètres
				</button>
			</div>
			
			<!-- Content -->
			<div id='accountContent' style='padding:24px;'>
				${getProfileContent(userStats, role)}
			</div>
		</div>
	`;
	
	document.body.appendChild(panel);
	setAudioPanelMinimized(true);
	setAudioPanelMinimized(true);
}

function getUserStats() {
	const stats = JSON.parse(localStorage.getItem('vhr_user_stats_' + currentUser) || '{}');
	const now = new Date();
	const joined = new Date(stats.joinedAt || now);
	const daysSince = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
	
	return {
		memberSince: daysSince === 0 ? "Aujourd'hui" : daysSince === 1 ? "Hier" : `${daysSince} jours`,
		totalSessions: stats.totalSessions || 0,
		totalStreamTime: stats.totalStreamTime || 0,
		devicesManaged: stats.devicesManaged || 0,
		appsLaunched: stats.appsLaunched || 0,
		lastLogin: stats.lastLogin || new Date().toISOString(),
		favoriteDevice: stats.favoriteDevice || 'Aucun',
		joinedAt: stats.joinedAt || now.toISOString()
	};
}

function getUserPreferences() {
	return JSON.parse(localStorage.getItem('vhr_user_prefs_' + currentUser) || '{}');
}

function saveUserPreferences(prefs) {
	localStorage.setItem('vhr_user_prefs_' + currentUser, JSON.stringify(prefs));
}

function getProfileContent(stats, role) {
	return `
		<div style='display:grid;grid-template-columns:1fr 1fr;gap:20px;'>
			<!-- Colonne gauche -->
			<div>
				<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>📋 Informations du compte</h3>
				<div style='background:#23272f;padding:18px;border-radius:8px;margin-bottom:16px;'>
					<div style='margin-bottom:12px;'>
						<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:4px;'>Nom d'utilisateur</label>
						<div style='display:flex;gap:8px;'>
							<input type='text' id='inputUsername' value='${currentUser}' style='flex:1;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;' />
							<button onclick='updateUsername()' style='background:#2ecc71;color:#000;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:bold;'>✓</button>
						</div>
					</div>
					<div style='margin-bottom:12px;'>
						<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:4px;'>Rôle</label>
						<div style='background:#1a1d24;padding:10px;border-radius:6px;border:2px solid #34495e;'>
							<span style='color:#fff;font-weight:bold;'>${role}</span>
							${role === 'admin' ? ' <span style="color:#ff9800;">👑 Administrateur</span>' : ''}
						</div>
					</div>
					<div style='margin-bottom:12px;'>
						<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:4px;'>Email (optionnel)</label>
						<input type='email' id='inputEmail' placeholder='votre@email.com' style='width:100%;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;' />
					</div>
					<div>
						<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:4px;'>Bio</label>
						<textarea id='inputBio' placeholder='Parlez-nous de vous...' style='width:100%;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;resize:vertical;min-height:80px;'></textarea>
					</div>
				</div>
				
				<button onclick='saveProfileChanges()' style='width:100%;background:#2ecc71;color:#000;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>
					💾 Sauvegarder les modifications
				</button>
			</div>
			
			<!-- Colonne droite -->
			<div>
				<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>🎯 Activité récente</h3>
				<div style='background:#23272f;padding:18px;border-radius:8px;margin-bottom:16px;'>
					<div style='display:flex;justify-content:space-between;margin-bottom:12px;padding:10px;background:#1a1d24;border-radius:6px;'>
						<span style='color:#95a5a6;'>Dernière connexion</span>
						<span style='color:#fff;font-weight:bold;'>${formatDate(stats.lastLogin)}</span>
					</div>
					<div style='display:flex;justify-content:space-between;margin-bottom:12px;padding:10px;background:#1a1d24;border-radius:6px;'>
						<span style='color:#95a5a6;'>Sessions totales</span>
						<span style='color:#2ecc71;font-weight:bold;font-size:18px;'>${stats.totalSessions}</span>
					</div>
					<div style='display:flex;justify-content:space-between;margin-bottom:12px;padding:10px;background:#1a1d24;border-radius:6px;'>
						<span style='color:#95a5a6;'>Apps lancées</span>
						<span style='color:#3498db;font-weight:bold;font-size:18px;'>${stats.appsLaunched}</span>
					</div>
					<div style='display:flex;justify-content:space-between;padding:10px;background:#1a1d24;border-radius:6px;'>
						<span style='color:#95a5a6;'>Casques gérés</span>
						<span style='color:#9b59b6;font-weight:bold;font-size:18px;'>${stats.devicesManaged}</span>
					</div>
				</div>
				
				<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>� Sécurité</h3>
				<div style='background:#23272f;padding:18px;border-radius:8px;'>
					<button onclick='exportUserData()' style='width:100%;background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:10px;'>
						📥 Exporter mes données
					</button>
					<button onclick='confirmDeleteAccount()' style='width:100%;background:#e74c3c;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;'>
						🗑� Supprimer mon compte
					</button>
				</div>

				<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>💠 Statut d'accès</h3>
				<div style='background:#23272f;padding:18px;border-radius:8px;'>
					<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;'>
						<span style='color:#95a5a6;font-size:13px;'>Statut actuel</span>
						${getAccessStatusBadge(licenseStatus.demo || licenseStatus)}
					</div>
					<div style='background:#1a1d24;padding:12px;border-radius:6px;'>
						${buildAccessSummaryHtml(licenseStatus.demo || licenseStatus)}
					</div>
				</div>
			</div>
		</div>
	`;
}

function getStatsContent(stats) {
	const streamHours = Math.floor(stats.totalStreamTime / 3600);
	const streamMinutes = Math.floor((stats.totalStreamTime % 3600) / 60);
	
	return `
		<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:20px;margin-bottom:24px;'>
			<div style='background:linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(46,204,113,0.3);'>
				<div style='font-size:48px;font-weight:bold;color:#fff;'>${stats.totalSessions}</div>
				<div style='color:#fff;font-size:16px;margin-top:8px;opacity:0.9;'>Sessions totales</div>
			</div>
			<div style='background:linear-gradient(135deg, #3498db 0%, #2980b9 100%);padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(52,152,219,0.3);'>
				<div style='font-size:48px;font-weight:bold;color:#fff;'>${stats.appsLaunched}</div>
				<div style='color:#fff;font-size:16px;margin-top:8px;opacity:0.9;'>Apps lancées</div>
			</div>
			<div style='background:linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(155,89,182,0.3);'>
				<div style='font-size:48px;font-weight:bold;color:#fff;'>${stats.devicesManaged}</div>
				<div style='color:#fff;font-size:16px;margin-top:8px;opacity:0.9;'>Casques gérés</div>
			</div>
			<div style='background:linear-gradient(135deg, #f39c12 0%, #e67e22 100%);padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(243,156,18,0.3);'>
				<div style='font-size:32px;font-weight:bold;color:#fff;'>${streamHours}h ${streamMinutes}m</div>
				<div style='color:#fff;font-size:16px;margin-top:8px;opacity:0.9;'>Temps de streaming</div>
			</div>
		</div>
		
		<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>📈 Graphiques d'activité</h3>
		<div style='background:#23272f;padding:24px;border-radius:12px;text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center;'>
			<div style='color:#95a5a6;font-size:16px;'>
				📊 Graphiques détaillés disponibles prochainement
			</div>
		</div>
		
		<h3 style='color:#2ecc71;margin:24px 0 16px 0;font-size:20px;'>� Accomplissements</h3>
		<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;'>
			${stats.totalSessions >= 10 ? `
				<div style='background:#23272f;padding:16px;border-radius:8px;border:2px solid #f39c12;text-align:center;'>
					<div style='font-size:40px;'>�</div>
					<div style='color:#f39c12;font-weight:bold;margin-top:8px;'>Habitué</div>
					<div style='color:#95a5a6;font-size:12px;margin-top:4px;'>10+ sessions</div>
				</div>
			` : ''}
			${stats.appsLaunched >= 50 ? `
				<div style='background:#23272f;padding:16px;border-radius:8px;border:2px solid #9b59b6;text-align:center;'>
					<div style='font-size:40px;'>🎮</div>
					<div style='color:#9b59b6;font-weight:bold;margin-top:8px;'>Joueur</div>
					<div style='color:#95a5a6;font-size:12px;margin-top:4px;'>50+ apps lancées</div>
				</div>
			` : ''}
			${stats.devicesManaged >= 3 ? `
				<div style='background:#23272f;padding:16px;border-radius:8px;border:2px solid #3498db;text-align:center;'>
					<div style='font-size:40px;'>🥽</div>
					<div style='color:#3498db;font-weight:bold;margin-top:8px;'>Collectionneur</div>
					<div style='color:#95a5a6;font-size:12px;margin-top:4px;'>3+ casques</div>
				</div>
			` : ''}
			<div style='background:#23272f;padding:16px;border-radius:8px;border:2px solid #95a5a6;text-align:center;opacity:0.5;'>
				<div style='font-size:40px;'>🔒</div>
				<div style='color:#95a5a6;font-weight:bold;margin-top:8px;'>À débloquer</div>
				<div style='color:#95a5a6;font-size:12px;margin-top:4px;'>Continuez à jouer!</div>
			</div>
		</div>
	`;
}

function getSettingsContent() {
	const prefs = getUserPreferences();
	const detail = licenseStatus.demo || licenseStatus;
	const subscriptionStatusLabel = detail.subscriptionStatus ? detail.subscriptionStatus.replace(/_/g, ' ') : '—';
	const planName = detail.planName ||
		detail.currentPlan?.name ||
		(detail.subscriptionStatus === 'admin'
			? 'Administrateur (accès illimité)'
			: detail.subscriptionStatus === 'active'
				? 'Plan Pro'
				: detail.subscriptionStatus === 'trial'
					? 'Essai gratuit'
					: detail.hasActiveLicense
						? 'Licence à vie'
						: 'Sans abonnement');
	let planPrice = detail.planPrice || detail.planAmount || detail.priceLabel || detail.price || '';
	if (!planPrice) {
		if (detail.subscriptionStatus === 'active') planPrice = 'À partir de 29€/mois';
		else if (detail.subscriptionStatus === 'trial') planPrice = 'Essai gratuit';
		else if (detail.subscriptionStatus === 'admin') planPrice = 'Accès illimité';
		else if (detail.hasActiveLicense) planPrice = 'Paiement unique';
		else planPrice = 'Détails disponibles sur le portail sécurisé';
	}
	const statusBadge = detail.accessBlocked
		? '<span style="color:#e74c3c;font-weight:600;">🔒 Bloqué</span>'
		: detail.expired
			? '<span style="color:#f39c12;font-weight:600;">⚠� Expiré</span>'
			: '<span style="color:#2ecc71;font-weight:600;">✅ Actif</span>';
	const renewalSource = detail.nextBillingDate || detail.expirationDate;
	const renewalLabel = renewalSource
		? formatLongDate(renewalSource)
		: Number.isFinite(detail.remainingDays)
			? `${detail.remainingDays} jour(s)`
			: '—';
	const remainingLabel = Number.isFinite(detail.remainingDays)
		? detail.remainingDays < 0
			? 'Illimité'
			: `${detail.remainingDays} jour(s)`
		: '—';
	const licenseLabel = detail.hasActiveLicense ? '✅ Oui' : '� Non';
	const planMessage = detail.message || 'Les détails de facturation sont synchronisés avec notre portail sécurisé.';
	
	return `
		<div style='max-width:700px;margin:0 auto;'>
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>💳 Abonnement & Facturation</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;border-left:4px solid #3498db;'>
				<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;'>
					<div style='background:#1a1d24;padding:16px;border-radius:8px;border:1px solid #34495e;min-height:120px;'>
						<div style='color:#95a5a6;font-size:12px;margin-bottom:6px;'>Plan</div>
						<div style='color:#fff;font-size:16px;font-weight:bold;line-height:1.3;'>${planName}</div>
						<div style='color:#95a5a6;font-size:12px;margin-top:6px;'>${subscriptionStatusLabel}</div>
						<div style='color:#2ecc71;font-size:18px;font-weight:bold;margin-top:10px;'>${planPrice}</div>
					</div>
					<div style='background:#1a1d24;padding:16px;border-radius:8px;border:1px solid #34495e;min-height:120px;'>
						<div style='color:#95a5a6;font-size:12px;margin-bottom:6px;'>Statut</div>
						<div style='font-size:18px;margin-bottom:6px;'>${statusBadge}</div>
						<div style='color:#95a5a6;font-size:12px;'>${detail.accessBlocked ? 'Accès bloqué' : detail.expired ? 'Licence expirée' : 'Activité en ordre'}</div>
					</div>
					<div style='background:#1a1d24;padding:16px;border-radius:8px;border:1px solid #34495e;min-height:120px;'>
						<div style='color:#95a5a6;font-size:12px;margin-bottom:6px;'>Renouvellement</div>
						<div style='color:#fff;font-size:16px;font-weight:bold;'>${renewalLabel}</div>
						<div style='color:#95a5a6;font-size:12px;'>Prochain prélèvement</div>
					</div>
					<div style='background:#1a1d24;padding:16px;border-radius:8px;border:1px solid #34495e;min-height:120px;'>
						<div style='color:#95a5a6;font-size:12px;margin-bottom:6px;'>Jours restants</div>
						<div style='color:#fff;font-size:16px;font-weight:bold;'>${remainingLabel}</div>
						<div style='color:#95a5a6;font-size:12px;'>${detail.subscriptionStatus === 'trial' ? 'Essai gratuit' : 'Données synchronisées'}</div>
					</div>
					<div style='background:#1a1d24;padding:16px;border-radius:8px;border:1px solid #34495e;min-height:120px;'>
						<div style='color:#95a5a6;font-size:12px;margin-bottom:6px;'>Licence à vie</div>
						<div style='color:#fff;font-size:18px;font-weight:bold;'>${licenseLabel}</div>
						<div style='color:#95a5a6;font-size:12px;'>${detail.hasActiveLicense ? 'Clé activée' : 'Non activée'}</div>
					</div>
				</div>
				<p style='color:#bdc3c7;font-size:14px;margin-bottom:16px;'>${planMessage}</p>
				<div style='display:flex;gap:10px;flex-wrap:wrap;'>
					<button onclick='openBillingPortal()' style='flex:1;min-width:150px;background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>📄 Factures</button>
					<button onclick='openBillingPortal()' style='flex:1;min-width:150px;background:#f39c12;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>💳 Méthode de paiement</button>
					<button onclick='confirmCancelSubscription()' style='flex:1;min-width:150px;background:#e74c3c;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>� Annuler l\'abonnement</button>
				</div>
			</div>
			
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>🎨 Apparence</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;'>
				<div style='margin-bottom:16px;'>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefAutoRefresh' ${prefs.autoRefresh !== false ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>🔄 Rafraîchissement automatique des casques</span>
					</label>
				</div>
				<div style='margin-bottom:16px;'>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefNotifications' ${prefs.notifications !== false ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>🔔 Notifications toast activées</span>
					</label>
				</div>
				<div style='margin-bottom:16px;'>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefSounds' ${prefs.sounds === true ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>🔊 Sons d'actions activés</span>
					</label>
				</div>
				<div>
					<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:8px;'>Vue par défaut</label>
					<select id='prefDefaultView' style='width:100%;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;cursor:pointer;'>
						<option value='table' ${viewMode === 'table' ? 'selected' : ''}>📊 Tableau</option>
						<option value='cards' ${viewMode === 'cards' ? 'selected' : ''}>🎴 Cartes</option>
					</select>
				</div>
			</div>
			
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>⚡ Performance</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;'>
				<div style='margin-bottom:16px;'>
					<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:8px;'>Profil streaming par défaut</label>
					<select id='prefDefaultProfile' style='width:100%;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;cursor:pointer;'>
						<option value='ultra-low'>Ultra Low (320p)</option>
						<option value='low'>Low (480p)</option>
						<option value='wifi'>WiFi (640p)</option>
						<option value='default' selected>Default (720p)</option>
						<option value='high'>High (1280p)</option>
						<option value='ultra'>Ultra (1920p)</option>
					</select>
				</div>
				<div>
					<label style='color:#95a5a6;font-size:13px;display:block;margin-bottom:8px;'>Intervalle de rafraîchissement (secondes)</label>
					<input type='number' id='prefRefreshInterval' value='${prefs.refreshInterval || 5}' min='1' max='60' style='width:100%;background:#1a1d24;color:#fff;border:2px solid #34495e;padding:10px;border-radius:6px;font-size:14px;' />
				</div>
			</div>
			
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>🔧 Avancé</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;'>
				<div style='margin-bottom:16px;'>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefDebugMode' ${prefs.debugMode === true ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>� Mode debug (logs console)</span>
					</label>
				</div>
				<div>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefAutoWifi' ${prefs.autoWifi === true ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>📶 WiFi auto au démarrage</span>
					</label>
				</div>
			</div>
			
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>🖥� Raccourcis Bureau</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;'>
				<p style='color:#95a5a6;font-size:13px;margin-bottom:16px;'>Créez un raccourci sur votre bureau pour lancer rapidement le dashboard. Le serveur démarrera automatiquement en arrière-plan.</p>
				<button onclick='window.createDesktopShortcut()' style='width:100%;background:linear-gradient(135deg, #3498db 0%, #2980b9 100%);color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;display:flex;align-items:center;justify-content:center;gap:10px;'>
					<span style='font-size:20px;'>🖥�</span> Créer un raccourci sur le bureau
				</button>
			</div>
			
			<button onclick='saveSettings()' style='width:100%;background:#2ecc71;color:#000;border:none;padding:16px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;'>
				💾 Sauvegarder les paramètres
			</button>
		</div>
	`;
}

window.switchAccountTab = function(tab) {
	const tabs = document.querySelectorAll('.account-tab');
	tabs.forEach(t => {
		t.style.color = '#95a5a6';
		t.style.borderBottom = '3px solid transparent';
	});
	
	const activeTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
	if (activeTab) {
		activeTab.style.color = '#fff';
		activeTab.style.borderBottom = '3px solid #2ecc71';
	}
	
	const content = document.getElementById('accountContent');
	const stats = getUserStats();
	
	if (tab === 'profile') content.innerHTML = getProfileContent(stats, userRoles[currentUser] || 'user');
	else if (tab === 'stats') content.innerHTML = getStatsContent(stats);
	else if (tab === 'settings') content.innerHTML = getSettingsContent();
};

// ========== AUDIO STREAMING (WebRTC) ==========
let activeAudioStream = null;  // Global audio stream instance
let activeAudioSerial = null;  // Serial of device receiving audio

console.log('[voice] dashboard-pro.js build stamp: 2026-01-26 22:00');

// Keep panel always compact (no fullscreen overlay)
function setAudioPanelMinimized() {
	const panel = document.getElementById('audioStreamPanel');
	const content = document.getElementById('audioStreamContent');
	const pill = document.getElementById('audioStreamPill');
	if (!panel || !content) return;
	panel.style = 'position:fixed;bottom:12px;right:12px;z-index:120;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:8px;pointer-events:auto;background:transparent;width:auto;height:auto;';
	content.style.display = 'none';
	content.style.maxWidth = '420px';
	content.style.width = '360px';
	content.style.maxHeight = '80vh';
	content.style.pointerEvents = 'auto';
	content.style.margin = '0';
	if (pill) {
		pill.style.display = 'inline-flex';
		pill.innerHTML = `🎤<span style="font-size:11px;">ON</span>`;
	}
	panel.dataset.minimized = 'true';
}

window.toggleAudioPanelSize = function() {
	return false; // always compact
};

window.sendVoiceToHeadset = async function(serial) {
	console.log('[voice] sendVoiceToHeadset invoked for serial:', serial);
	// Close any existing stream first (same or different device)
	if (activeAudioStream) {
		console.log('[sendVoiceToHeadset] Closing existing stream before starting new one');
		await window.closeAudioStream(true); // true = silent close
	}

	const device = devices.find(d => d.serial === serial);
	const deviceName = device ? device.name : 'Casque';
	
	// Notify other tabs that we're starting audio
	broadcastAudioState('audio-started', serial);
	isAudioSessionOwner = true;
	
	// Create audio control panel
	let panel = document.getElementById('audioStreamPanel');
	if (panel) panel.remove();

	panel = document.createElement('div');
	panel.id = 'audioStreamPanel';
	panel.dataset.minimized = 'true';
	panel.style = 'position:fixed;bottom:12px;right:12px;z-index:120;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:8px;pointer-events:auto;background:transparent;width:auto;height:auto;';
	panel.onclick = null;
	
	panel.innerHTML = `
		<div id='audioStreamContent' style='background:#1a1d24;border:3px solid #2ecc71;border-radius:12px;padding:0;max-width:420px;width:360px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 20px #000;color:#fff;'>
			<!-- Header -->
			<div style='background:linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);padding:16px;border-radius:10px 10px 0 0;position:relative;display:flex;justify-content:space-between;align-items:center;'>
				<h2 style='margin:0;font-size:24px;color:#fff;display:flex;align-items:center;gap:12px;'>
					🎤 Streaming Audio WebRTC vers ${deviceName}
				</h2>
				<button onclick='window.closeAudioStream()' style='background:rgba(0,0,0,0.3);color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:16px;font-weight:bold;'>✕</button>
			</div>
			
			<!-- Visualizer -->
			<div id='audioVizContainer' style='padding:20px;display:flex;align-items:flex-end;justify-content:center;gap:3px;height:200px;background:#0d0f14;'>
				${Array(32).fill(0).map((_, i) => `<div style='width:8px;background:linear-gradient(to top, #2ecc71, #27ae60);border-radius:2px;flex:1;min-height:4px;'></div>`).join('')}
			</div>
			
			<!-- Audio Output Controls -->
			<div style='padding:15px 20px;background:#1e2128;border-top:1px solid #333;'>
				<div style='display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;'>
					<label style='color:#fff;font-size:13px;display:flex;align-items:center;gap:8px;'>
						🔊 Sortie audio:
						<select id='voiceAudioOutputSelect' style='background:#1a1d24;color:#fff;border:1px solid #2ecc71;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;'>
							<option value='headset' selected>📱 Casque uniquement</option>
							<option value='pc'>💻 PC uniquement</option>
							<option value='both'>🔊 Casque + PC</option>
						</select>
					</label>
					<button id='localMonitorBtn' onclick='window.toggleLocalVoiceMonitor()' style='background:linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%);color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;'>
						🔇 Écouter localement: OFF
					</button>
				</div>
			</div>
			<!-- Controls -->
			<div style='padding:20px;background:#2a2d34;border-top:1px solid #444;'>
				<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;'>
					<button id='pauseAudioBtn' onclick='window.toggleAudioStreamPause()' style='background:linear-gradient(135deg, #3498db 0%, #2980b9 100%);color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;'>
						�� Pause
					</button>
					<button onclick='window.closeAudioStream()' style='background:linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;'>
						🛑 Arrêter
					</button>
				</div>
				<div style='margin-top:15px;padding:12px;background:rgba(46,204,113,0.1);border-left:4px solid #2ecc71;border-radius:4px;font-size:12px;color:#bdc3c7;'>
					<strong>📊 Status:</strong> Streaming en direct depuis votre micro vers ${deviceName} (+ PC si activé)
				</div>
			</div>
		</div>
	`;
	
	document.body.appendChild(panel);

	// Add a tiny pill button so the stream never covers the dashboard
	const contentEl = document.getElementById('audioStreamContent');
	if (contentEl) {
		const pill = document.createElement('button');
		pill.id = 'audioStreamPill';
		pill.setAttribute('aria-label', 'Streaming audio actif');
		pill.style = 'background:linear-gradient(135deg,#2ecc71 0%,#27ae60 100%);color:#0b0c10;border:none;padding:8px 10px;border-radius:12px;font-weight:bold;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 4px 12px rgba(0,0,0,0.35);cursor:pointer;min-width:52px;height:48px;';
		pill.innerHTML = `🎤<span style="font-size:11px;">ON</span>`;
		pill.onclick = () => {
			const isHidden = contentEl.style.display === 'none';
			if (isHidden) {
				contentEl.style.display = 'block';
				pill.innerHTML = `🎤<span style="font-size:11px;">ON ▾</span>`;
			} else {
				contentEl.style.display = 'none';
				pill.innerHTML = `🎤<span style="font-size:11px;">ON</span>`;
			}
		};
		panel.insertBefore(pill, contentEl);
	}

	setAudioPanelMinimized();
	
	// Start audio streaming
	try {
		// Build headset-accessible server URL (avoid localhost inside headset)
		const resolvedServerUrl = await resolveAudioServerUrl();
		const useBackgroundApp = true; // casque app prioritaire
		// Ensure we have a token for signaling (LAN origin may not share localStorage)
		let signalingToken = readAuthToken();
		if (!signalingToken) {
			signalingToken = await syncTokenFromCookie();
		}

		activeAudioStream = new window.VHRAudioStream({
			signalingServer: resolvedServerUrl,
			signalingPath: '/api/audio/signal',
			relayBase: resolvedServerUrl,
			authToken: signalingToken || ''
		});
		console.log('[voice] Starting VHRAudioStream (WebRTC+relay) for', serial);
		let startOk = false;
		try {
			await activeAudioStream.start(serial);
			startOk = true;
			console.log('[voice] VHRAudioStream started for', serial);
		} catch (startErr) {
			console.error('[voice] Failed to start audio stream (mic/permissions?/WebRTC):', startErr);
			showToast('⚠� WebRTC/connexion audio ko, on bascule en relais WS', 'warning');
		}
		
		// Save serial for cleanup later
		activeAudioSerial = serial;
		
		// Local monitoring is OFF by default (sound goes to headset only)
		activeAudioStream.isLocalMonitoring = false;
		activeAudioStream.setLocalMonitoring(false);
		
		// Start audio receiver on headset - browser only (pas d'ouverture forcée sur le Quest)
		try {
			const serverUrl = resolvedServerUrl || window.location.origin;
			console.log('[voice] Receiver serverUrl:', serverUrl);
			showToast('📱 Ouverture du récepteur voix (casque)...', 'info');

			// Forcer toujours l'ouverture en localhost pour autoriser le micro sur le PC
			const displayName = deviceName || serial || 'casque';
			const path = `/audio-receiver.html?serial=${encodeURIComponent(serial)}&name=${encodeURIComponent(displayName)}&autoconnect=true`;
			const port = window.location.port || 3000;
			let storedToken = readAuthToken() || await syncTokenFromCookie();
			let receiverUrl = `${resolvedServerUrl}${path}`;
			if (storedToken) receiverUrl += `&token=${encodeURIComponent(storedToken)}`;
			console.log('[voice] receiverUrl (casque):', receiverUrl);
			// Pas de bouton ni d'ouverture sur le PC : le récepteur reste uniquement dans le casque
			window.lastAudioReceiverUrl = receiverUrl;
			// Ne jamais ouvrir le récepteur web dans le casque (l'app native doit être utilisée)
			console.log('[voice] Web receiver launch on headset disabled (native app enforced)');

			// Lancer aussi l'app native VHR Voice sur le casque avec autostart
			try {
				const startRes = await api('/api/device/start-voice-app', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ serial, serverUrl: resolvedServerUrl })
				});
				if (startRes && startRes.ok) {
					console.log('[voice] Voice app launch request sent');
					showToast('📱 App VHR Voice lancée sur le casque', 'success');
				} else {
					console.warn('[voice] Voice app launch failed:', startRes?.error);
					// Fallback: ouvrir le récepteur web via ADB pour garantir le lien émetteur/récepteur
					try {
						const openRes = await api('/api/device/open-audio-receiver', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ serial, server: resolvedServerUrl })
						});
						if (openRes && openRes.ok) {
							console.log('[voice] Fallback receiver lancé (web)');
							showToast('🔊 Récepteur voix ouvert en fallback', 'info');
						} else {
							console.warn('[voice] Fallback receiver non lancé:', openRes?.error);
						}
					} catch (fallbackOpenErr) {
						console.warn('[voice] Erreur ouverture fallback receiver:', fallbackOpenErr);
					}
				}
			} catch (adbLaunchErr) {
				console.warn('[voice] ADB launch voice app error:', adbLaunchErr);
				// Second fallback if l'appel ADB échoue directement
				try {
					const openRes = await api('/api/device/open-audio-receiver', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ serial, server: resolvedServerUrl })
					});
					if (openRes && openRes.ok) {
						console.log('[voice] Fallback receiver lancé (web) après échec ADB');
						showToast('🔊 Récepteur voix ouvert (fallback)', 'info');
					} else {
						console.warn('[voice] Fallback receiver non lancé:', openRes?.error);
					}
				} catch (fallbackOpenErr) {
					console.warn('[voice] Erreur ouverture fallback receiver (post-ADB):', fallbackOpenErr);
				}
			}

			// Ne pas forcer l'ouverture via ADB pour éviter qu'une page prenne le focus dans le casque
		} catch (openError) {
			console.warn('[sendVoiceToHeadset] Could not open audio receiver:', openError);
		}
		
		// Also start audio relay to headset via WebSocket for simple receivers
		// Priorité app casque : tente OGG, sinon fallback WebM. Même si WebRTC a échoué, on pousse le relais.
		try {
			const relayFormat = useBackgroundApp ? 'ogg' : 'webm';
			if (activeAudioStream && typeof activeAudioStream.startAudioRelay === 'function' && activeAudioStream.localStream) {
				console.log('[voice] Starting audio relay WS sender for', serial, 'format=', relayFormat, 'startOk=', startOk);
				await activeAudioStream.startAudioRelay(serial, { format: relayFormat });
				console.log('[sendVoiceToHeadset] Audio relay started for headset receivers');
			} else {
				console.warn('[sendVoiceToHeadset] Audio relay skipped: stream not ready or no mic stream');
			}
		} catch (relayError) {
			console.warn('[sendVoiceToHeadset] Audio relay failed (attempted', useBackgroundApp ? 'ogg' : 'webm', '):', relayError);
			// Fallback: retry in webm if ogg failed
			if (useBackgroundApp && activeAudioStream && typeof activeAudioStream.startAudioRelay === 'function') {
				try {
					console.log('[voice] Fallback relay in webm for', serial);
					await activeAudioStream.startAudioRelay(serial, { format: 'webm' });
					console.log('[sendVoiceToHeadset] Fallback WebM relay started');
				} catch (fallbackErr) {
					console.warn('[sendVoiceToHeadset] Fallback relay failed:', fallbackErr);
				}
			}
		}
		
		// Setup voice audio output select handler
		setTimeout(() => {
			const voiceAudioSelect = document.getElementById('voiceAudioOutputSelect');
			if (voiceAudioSelect) {
				voiceAudioSelect.addEventListener('change', (e) => {
					const mode = e.target.value;
					console.log('[voice] Audio output changed to:', mode);
					
					// Adjust local monitoring based on selection
					if (mode === 'headset') {
						// Casque only - disable PC playback
						if (activeAudioStream) activeAudioStream.setLocalMonitoring(false);
						showToast('🔊 Son: Casque uniquement', 'info');
					} else if (mode === 'pc') {
						// PC only - enable PC playback, disable relay to headset
						if (activeAudioStream) activeAudioStream.setLocalMonitoring(true);
						showToast('🔊 Son: PC uniquement', 'info');
					} else if (mode === 'both') {
						// Both - enable PC playback + keep headset relay
						if (activeAudioStream) activeAudioStream.setLocalMonitoring(true);
						showToast('🔊 Son: Casque + PC', 'info');
					}
					
					// Update UI
					const monitorBtn = document.getElementById('localMonitorBtn');
					if (monitorBtn && mode !== 'headset') {
						monitorBtn.innerHTML = '🎧 Écouter localement: ON';
						monitorBtn.style.background = 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)';
					} else if (monitorBtn) {
						monitorBtn.innerHTML = '🔇 Écouter localement: OFF';
						monitorBtn.style.background = 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)';
					}
				});
			}
		}, 100);
		
		window.animateAudioVisualizer();
		showToast(`🎤 Streaming vers ${deviceName} (+ PC)`, 'success');
	} catch (e) {
		console.error('[sendVoiceToHeadset] Error:', e);
		window.closeAudioStream();
		showToast(`� Erreur: ${e.message}`, 'error');
	}
};

window.toggleAudioStreamPause = function() {
	if (!activeAudioStream) return;
	
	const isPaused = activeAudioStream.isPaused || false;
	activeAudioStream.setPaused(!isPaused);
	activeAudioStream.isPaused = !isPaused;
	
	const pauseBtn = document.getElementById('pauseAudioBtn');
	if (pauseBtn) pauseBtn.innerHTML = isPaused ? '�� Pause' : '▶� Reprendre';
	showToast(isPaused ? '▶� Streaming repris' : '�� Streaming en pause', 'info');
};

// Toggle local voice monitoring (hear your own voice on PC speakers)
window.toggleLocalVoiceMonitor = function() {
	if (!activeAudioStream) return;
	
	const isMonitoring = activeAudioStream.isLocalMonitoring || false;
	activeAudioStream.setLocalMonitoring(!isMonitoring);
	activeAudioStream.isLocalMonitoring = !isMonitoring;
	
	const monitorBtn = document.getElementById('localMonitorBtn');
	if (monitorBtn) {
		monitorBtn.innerHTML = !isMonitoring ? '🎧 Écouter localement: ON' : '🔇 Écouter localement: OFF';
		monitorBtn.style.background = !isMonitoring 
			? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' 
			: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)';
	}
	showToast(!isMonitoring ? '🎧 Écoute locale activée' : '🔇 Écoute locale désactivée', 'info');
};

window.animateAudioVisualizer = function() {
	// Stop animation if stream is closed or panel is gone
	if (!activeAudioStream || !document.getElementById('audioVizContainer')) {
		return; // Don't call requestAnimationFrame - stop the loop
	}
	
	const bars = document.querySelectorAll('#audioVizContainer > div');
	
	try {
		const freqData = activeAudioStream.getFrequencyData();
		
		if (freqData && bars.length > 0) {
			const barCount = bars.length;
			for (let i = 0; i < barCount; i++) {
				const idx = Math.floor((i / barCount) * freqData.length);
				const height = Math.max(4, (freqData[idx] / 255) * 100);
				bars[i].style.height = height + '%';
			}
		}
	} catch (e) {
		// If there's an error getting frequency data, just skip this frame
		console.warn('[animateAudioVisualizer] Error:', e.message);
	}
	
	requestAnimationFrame(window.animateAudioVisualizer);
};

window.closeAccountPanel = function() {
	const panel = document.getElementById('accountPanel');
	if (panel) panel.remove();
};

window.showStoragePanel = function() {
	let panel = document.getElementById('storagePanel');
	if (panel) panel.remove();
	
	const localStorageSize = Object.keys(localStorage).reduce((total, key) => {
		return total + localStorage.getItem(key).length;
	}, 0);
	
	const localStorageSizeKB = (localStorageSize / 1024).toFixed(2);
	const localStorageSizeMB = (localStorageSize / (1024 * 1024)).toFixed(4);
	
	const storageItems = Object.keys(localStorage).filter(key => key.startsWith('vhr_')).map(key => {
		const size = (localStorage.getItem(key).length / 1024).toFixed(2);
		return `
			<tr style='border-bottom:1px solid #2ecc71;'>
				<td style='padding:12px;font-size:13px;'>${key}</td>
				<td style='padding:12px;font-size:13px;text-align:right;'>${size} KB</td>
				<td style='padding:12px;text-align:center;'>
					<button onclick="localStorage.removeItem('${key}'); window.showStoragePanel();" style='background:#e74c3c;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;'>Supprimer</button>
				</td>
			</tr>
		`;
	}).join('');
	
	panel = document.createElement('div');
	panel.id = 'storagePanel';
	panel.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
	panel.onclick = (e) => { if (e.target === panel) window.closeStoragePanel(); };
	
	panel.innerHTML = `
		<div style='background:#1a1d24;border:3px solid #e74c3c;border-radius:16px;padding:0;max-width:800px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px #000;color:#fff;'>
			<!-- Header -->
			<div style='background:linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);padding:24px;border-radius:13px 13px 0 0;position:relative;'>
				<button onclick='window.closeStoragePanel()' style='position:absolute;top:16px;right:16px;background:rgba(0,0,0,0.3);color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:18px;font-weight:bold;'>✕</button>
				<div style='display:flex;align-items:center;gap:16px;'>
					<div style='font-size:40px;'>💾</div>
					<div>
						<h2 style='margin:0;font-size:28px;color:#fff;'>Gestion du Stockage</h2>
						<p style='margin:6px 0 0 0;font-size:13px;opacity:0.9;'>Taille totale: <strong>${localStorageSizeMB} MB</strong> (${localStorageSizeKB} KB)</p>
					</div>
				</div>
			</div>
			
			<!-- Content -->
			<div style='padding:24px;'>
				<h3 style='margin-top:0;color:#2ecc71;margin-bottom:16px;'>Fichiers stockés:</h3>
				<div style='overflow-x:auto;'>
					<table style='width:100%;border-collapse:collapse;font-size:13px;'>
						<thead>
							<tr style='background:#2ecc71;color:#000;font-weight:bold;'>
								<th style='padding:12px;text-align:left;'>Clé de stockage</th>
								<th style='padding:12px;text-align:right;'>Taille</th>
								<th style='padding:12px;text-align:center;'>Action</th>
							</tr>
						</thead>
						<tbody>
							${storageItems || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#95a5a6;">Aucun stockage VHR détecté</td></tr>'}
						</tbody>
					</table>
				</div>
				
				<div style='margin-top:24px;padding:16px;background:#2c3e50;border-radius:8px;border-left:4px solid #e74c3c;'>
					<p style='margin:0;font-size:12px;color:#ecf0f1;'>
						<strong>Note:</strong> Le localStorage du navigateur peut stocker jusqu'à 5-10 MB selon votre navigateur. 
						Vous pouvez supprimer des éléments individuellement pour libérer de l'espace.
					</p>
				</div>
				
				<div style='margin-top:24px;display:flex;gap:12px;justify-content:center;'>
					<button onclick='window.closeStoragePanel()' style='background:#3498db;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:bold;'>Fermer</button>
					<button onclick='localStorage.clear(); alert("Stockage vidé!"); window.showStoragePanel();' style='background:#e74c3c;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:bold;'>Vider tout</button>
				</div>
			</div>
		</div>
	`;
	document.body.appendChild(panel);
};

window.closeStoragePanel = function() {
	const panel = document.getElementById('storagePanel');
	if (panel) panel.remove();
};

window.updateUsername = function() {
	const newName = document.getElementById('inputUsername').value.trim();
	if (!newName || newName === currentUser) return;
	
	const oldName = currentUser;
	setUser(newName);
	
	// Migrer les données
	const oldStats = localStorage.getItem('vhr_user_stats_' + oldName);
	const oldPrefs = localStorage.getItem('vhr_user_prefs_' + oldName);
	if (oldStats) localStorage.setItem('vhr_user_stats_' + newName, oldStats);
	if (oldPrefs) localStorage.setItem('vhr_user_prefs_' + newName, oldPrefs);
	
	showToast('✅ Nom d\'utilisateur mis à jour !', 'success');
	closeAccountPanel();
	setTimeout(() => showAccountPanel(), 300);
};

window.saveProfileChanges = function() {
	showToast('✅ Profil sauvegardé !', 'success');
};

window.saveSettings = function() {
	const prefs = {
		autoRefresh: document.getElementById('prefAutoRefresh').checked,
		notifications: document.getElementById('prefNotifications').checked,
		sounds: document.getElementById('prefSounds').checked,
		defaultView: document.getElementById('prefDefaultView').value,
		defaultProfile: document.getElementById('prefDefaultProfile').value,
		refreshInterval: parseInt(document.getElementById('prefRefreshInterval').value) || 5,
		debugMode: document.getElementById('prefDebugMode').checked,
		autoWifi: document.getElementById('prefAutoWifi').checked
	};
	
	saveUserPreferences(prefs);
	
	// Appliquer la vue par défaut
	if (prefs.defaultView !== viewMode) {
		viewMode = prefs.defaultView;
		localStorage.setItem('vhr_view_mode', viewMode);
		document.getElementById('toggleViewBtn').innerHTML = viewMode === 'table' ? '📊 Vue: Tableau' : '🎴 Vue: Cartes';
		renderDevices();
	}
	
	showToast('✅ Paramètres sauvegardés !', 'success');
};

// Créer un raccourci sur le bureau
window.createDesktopShortcut = async function() {
	showToast('� Création du raccourci...', 'info');
	try {
		const res = await api('/api/create-desktop-shortcut', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			showToast('✅ Raccourci créé sur le bureau !', 'success');
		} else {
			showToast('� Erreur: ' + (res.error || 'Impossible de créer le raccourci'), 'error');
		}
	} catch (e) {
		console.error('[shortcut]', e);
		showToast('� Erreur lors de la création du raccourci', 'error');
	}
};

window.openBillingPortal = async function() {
	// Redirection systématique vers la page billing vitrine (pas d'appel API local)
	goToOfficialBillingPage();
	return;
};

window.confirmCancelSubscription = function() {
	showModal(`
		<h3 style='color:#e74c3c;margin-bottom:16px;'>⚠� Annuler l'abonnement</h3>
		<p style='color:#fff;margin-bottom:12px;'>Êtes-vous sûr de vouloir annuler votre abonnement ?</p>
		<ul style='color:#95a5a6;margin-bottom:20px;'>
			<li>Vous perdrez accès aux fonctionnalités premium</li>
			<li>Aucun remboursement ne sera effectué</li>
			<li>Les données seront conservées pendant 90 jours</li>
		</ul>
		<div style='display:flex;gap:10px;'>
			<button onclick='cancelSubscription()' style='flex:1;background:#e74c3c;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;'>Confirmer l'annulation</button>
			<button onclick='closeModal()' style='flex:1;background:#95a5a6;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;'>Garder mon abonnement</button>
		</div>
	`);
};

window.cancelSubscription = async function() {
	goToOfficialBillingPage();
	closeModal();
	return;
};

window.exportUserData = function() {
	const userData = {
		username: currentUser,
		role: userRoles[currentUser] || 'user',
		stats: getUserStats(),
		preferences: getUserPreferences(),
		exportDate: new Date().toISOString()
	};
	
	const dataStr = JSON.stringify(userData, null, 2);
	const dataBlob = new Blob([dataStr], { type: 'application/json' });
	const url = URL.createObjectURL(dataBlob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `vhr-data-${currentUser}-${Date.now()}.json`;
	link.click();
	URL.revokeObjectURL(url);
	
	showToast('📥 Données exportées !', 'success');
};

window.confirmDeleteAccount = function() {
	if (confirm(`⚠� ATTENTION !\n\nÊtes-vous sûr de vouloir supprimer votre compte "${currentUser}" ?\n\nCette action est IRRÉVERSIBLE !\n\nToutes vos données, statistiques et préférences seront définitivement supprimées.`)) {
		if (confirm('Dernière confirmation : Supprimer définitivement le compte ?')) {
			// Supprimer toutes les données utilisateur
			localStorage.removeItem('vhr_user_stats_' + currentUser);
			localStorage.removeItem('vhr_user_prefs_' + currentUser);
			removeUser(currentUser);
			
			closeAccountPanel();
			showToast('🗑� Compte supprimé', 'error');
			
			// Redémarrer avec un nouveau utilisateur
			setTimeout(async () => {
				const name = await showModalInputPrompt({
					title: 'Nouveau compte',
					message: 'Quel nom pour le nouvel utilisateur ?',
					placeholder: 'Nom d\'utilisateur'
				});
				if (name && name.trim()) setUser(name.trim());
				else setUser('Invité');
			}, 1000);
		}
	}
};

function formatDate(isoString) {
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now - date;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);
	
	if (diffMins < 1) return 'À l\'instant';
	if (diffMins < 60) return `Il y a ${diffMins} min`;
	if (diffHours < 24) return `Il y a ${diffHours}h`;
	if (diffDays < 7) return `Il y a ${diffDays} jours`;
	
	return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLongDate(isoString) {
	if (!isoString) return '—';
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return isoString;
	return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// UI fallback when popup is blocked: show a fixed banner with the receiver URL
function showVoiceReceiverFallback(url, deviceLabel = 'casque') {
	let box = document.getElementById('voiceReceiverFallback');
	if (!box) {
		box = document.createElement('div');
		box.id = 'voiceReceiverFallback';
		box.style.position = 'fixed';
		box.style.bottom = '12px';
		box.style.right = '12px';
		box.style.zIndex = '9999';
		box.style.padding = '12px 14px';
		box.style.borderRadius = '10px';
		box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
		box.style.background = 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
		box.style.color = '#ecf0f1';
		box.style.fontSize = '14px';
		box.style.maxWidth = '320px';
		box.style.lineHeight = '1.5';
		box.innerHTML = `
			<div style="font-weight:600;margin-bottom:6px;">🔗 Ouvrir le récepteur voix (${deviceLabel})</div>
			<a id="voiceReceiverFallbackLink" href="${url}" target="_blank" rel="noopener noreferrer" style="display:block; word-break:break-all; color:#1abc9c; text-decoration:underline; margin-bottom:8px;">${url}</a>
			<button id="voiceReceiverCopyBtn" style="border:none; background:#1abc9c; color:#0b1d24; padding:8px 10px; border-radius:6px; cursor:pointer; font-weight:600;">Copier le lien</button>
			<button id="voiceReceiverCloseBtn" style="border:none; background:transparent; color:#bdc3c7; margin-left:8px; cursor:pointer;">Fermer</button>
		`;
		document.body.appendChild(box);
		const copyBtn = document.getElementById('voiceReceiverCopyBtn');
		const linkEl = document.getElementById('voiceReceiverFallbackLink');
		const closeBtn = document.getElementById('voiceReceiverCloseBtn');
		if (copyBtn && linkEl) {
			copyBtn.onclick = async () => {
				try {
					await navigator.clipboard.writeText(linkEl.href);
					showToast('Lien copié ✔�', 'success');
				} catch (e) {
					showToast('Copie impossible, copiez manuellement', 'warning');
				}
			};
		}
		if (closeBtn) {
			closeBtn.onclick = () => box.remove();
		}
	} else {
		const linkEl = document.getElementById('voiceReceiverFallbackLink');
		if (linkEl) {
			linkEl.href = url;
			linkEl.textContent = url;
		}
		box.style.display = 'block';
	}
}

// Incrémenter les stats lors des actions
function incrementStat(statName) {
	const stats = JSON.parse(localStorage.getItem('vhr_user_stats_' + currentUser) || '{}');
	if (!stats.joinedAt) stats.joinedAt = new Date().toISOString();
	stats[statName] = (stats[statName] || 0) + 1;
	stats.lastLogin = new Date().toISOString();
	localStorage.setItem('vhr_user_stats_' + currentUser, JSON.stringify(stats));
}

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
	// Don't auto-create guest user - force login/register
	setUser(null);
}

// ========== API & DATA ========== 
const urlParams = new URLSearchParams(window.location.search || '');

const AUTH_OVERRIDE_RESET_KEY = 'vhr_dashboard_override_reset';
const AUTH_OVERRIDE_RESET_VERSION = '2026-01-24';
(function resetLegacyAuthOverrides() {
	if (typeof localStorage === 'undefined') return;
	try {
		const previous = localStorage.getItem(AUTH_OVERRIDE_RESET_KEY);
		if (previous === AUTH_OVERRIDE_RESET_VERSION) return;
		['forceLocalAuth', 'useMockAuth', 'forceProdAuth'].forEach(k => localStorage.removeItem(k));
		localStorage.setItem(AUTH_OVERRIDE_RESET_KEY, AUTH_OVERRIDE_RESET_VERSION);
		console.info(`[auth] Cleared legacy local/mock override flags (release ${AUTH_OVERRIDE_RESET_VERSION})`);
	} catch (err) {
		console.warn('[auth] Unable to reset local/mock override flags', err);
	}
})();

// Persiste le choix si un paramètre d'URL est fourni
if (urlParams.get('auth') === 'prod' || urlParams.get('prod-auth') === '1') {
	try { localStorage.setItem('forceProdAuth', '1'); localStorage.removeItem('forceLocalAuth'); } catch (e) {}
}
if (urlParams.get('auth') === 'local' || urlParams.get('local-auth') === '1') {
	try { localStorage.setItem('forceLocalAuth', '1'); localStorage.removeItem('forceProdAuth'); } catch (e) {}
}
if (urlParams.get('mock-auth') === '1' || urlParams.get('mock') === '1') {
	try { localStorage.setItem('useMockAuth', '1'); } catch (e) {}
}

const FORCE_PROD_AUTH = (() => {
	if (urlParams.get('auth') === 'prod' || urlParams.get('prod-auth') === '1') return true;
	try { return localStorage.getItem('forceProdAuth') === '1'; } catch (e) { return false; } // explicit override only
})();
const FORCE_LOCAL_AUTH = (() => {
	if (urlParams.get('auth') === 'local' || urlParams.get('local-auth') === '1') return true;
	try { return localStorage.getItem('forceLocalAuth') === '1'; } catch (e) { return false; }
})();
const USE_MOCK_AUTH = (() => {
	if (urlParams.get('mock-auth') === '1' || urlParams.get('mock') === '1') return true;
	try { return localStorage.getItem('useMockAuth') === '1'; } catch (e) { return false; }
})();

const PRODUCTION_AUTH_ORIGIN = 'https://www.vhr-dashboard-site.com';
const LOCAL_AUTH_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const isLocalHostname = (() => {
	try {
		const hostname = (window.location && window.location.hostname) || '';
		const normalized = String(hostname).toLowerCase();
		if (LOCAL_AUTH_HOSTNAMES.has(normalized)) return true;
		if (normalized.startsWith('::ffff:127.0.0.1')) return true;
		return false;
	} catch (e) {
		return false;
	}
})();
const isElectronUserAgent = (() => {
	try {
		return typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent || '');
	} catch (e) {
		return false;
	}
})();
const isFileProtocol = (() => {
	try {
		return window.location && window.location.protocol === 'file:';
	} catch (e) {
		return false;
	}
})();
const isLocalAuthContext = isLocalHostname || isElectronUserAgent || isFileProtocol;
const AUTH_API_BASE = (() => {
	if (USE_MOCK_AUTH) return '';
	if (FORCE_LOCAL_AUTH) return '';
	if (isLocalAuthContext && !FORCE_PROD_AUTH) return PRODUCTION_AUTH_ORIGIN;
	if (FORCE_PROD_AUTH) return PRODUCTION_AUTH_ORIGIN;
	return PRODUCTION_AUTH_ORIGIN;
})();
const DEFAULT_SYNC_USERS_SECRET = 'yZ2_viQfMWgyUBjBI-1Bb23ez4VyAC_WUju_W2X_X-s';
const API_BASE = '/api';
const ENABLE_GUEST_DEMO = false;
let cachedSyncUsersSecret = DEFAULT_SYNC_USERS_SECRET;
let syncSecretPromise = null;

function getSyncUsersSecret() {
	if (syncSecretPromise) return syncSecretPromise;
	syncSecretPromise = fetch('/api/admin/sync-config', {
		credentials: 'include'
	})
	.then(async res => {
		if (!res.ok) throw new Error('sync config unavailable');
		const payload = await res.json().catch(() => null);
		return payload?.syncSecret || DEFAULT_SYNC_USERS_SECRET;
	})
	.catch(() => DEFAULT_SYNC_USERS_SECRET)
	.then(secret => {
		cachedSyncUsersSecret = secret;
		return cachedSyncUsersSecret;
	});
	return syncSecretPromise;
}
const socket = io({
	reconnection: true,
	reconnectionAttempts: 5,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000,
	timeout: 20000,
	query: {
		tabId: VHR_TAB_ID // Send tab ID to server for connection tracking
	}
});

let socketConnected = false;
let pollingFallbackInterval = null;
let offlineToastShown = false;
const API_TIMEOUT_MS = 15000; // 15s timeout for HTTP requests to avoid false timeouts on slow links
let offlineReasons = new Set();
let offlineBannerEl = null;
let isLoadingDevices = false;
let lastDevicesLoadTs = 0;
const MIN_LOAD_DEVICES_INTERVAL_MS = 3000; // throttle to avoid overlapping fetches
let initialDevicesLoadComplete = false;
let usbTutorialShown = false;

function renderOfflineBanner() {
	if (offlineReasons.size === 0) {
		if (offlineBannerEl) {
			offlineBannerEl.remove();
			offlineBannerEl = null;
		}
		return;
	}

	const reasonText = Array.from(offlineReasons).join(' • ');
	if (!offlineBannerEl) {
		offlineBannerEl = document.createElement('div');
		offlineBannerEl.id = 'offlineBanner';
		offlineBannerEl.style = 'position:fixed;top:0;left:0;width:100%;z-index:2500;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;padding:10px 16px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;';
		document.body.appendChild(offlineBannerEl);
	}

	offlineBannerEl.innerHTML = `
		<span>🚧 Hors ligne — reconnexion en cours...</span>
		<span style="font-weight:normal;opacity:0.9;">(${reasonText})</span>
	`;
}

function addOfflineReason(reason) {
	offlineReasons.add(reason);
	renderOfflineBanner();
}

function removeOfflineReason(reason) {
	offlineReasons.delete(reason);
	renderOfflineBanner();
}

function startPollingFallback() {
	if (pollingFallbackInterval) return;
	console.warn('[fallback] Socket offline, switching to HTTP polling');
	if (!offlineToastShown) {
		showToast('� Socket indisponible — passage en mode polling', 'info', 4000);
		offlineToastShown = true;
	}
	// Poll devices every 6s to keep UI alive when socket is down
	pollingFallbackInterval = setInterval(() => {
		loadDevices();
	}, 6000);
}

function stopPollingFallback() {
	if (pollingFallbackInterval) {
		clearInterval(pollingFallbackInterval);
		pollingFallbackInterval = null;
	}
}

// Handle socket errors gracefully
socket.on('connect_error', (err) => {
	console.warn('[socket] Connection error:', err.message);
	socketConnected = false;
	addOfflineReason('socket');
	startPollingFallback();
});

socket.on('disconnect', (reason) => {
	console.warn('[socket] Disconnected:', reason);
	socketConnected = false;
	addOfflineReason('socket');
	startPollingFallback();
	// Clean up audio on disconnect to prevent orphaned sessions
	if (activeAudioStream) {
		console.log('[socket] Cleaning up audio stream due to disconnect');
		window.closeAudioStream(true);
	}
});

socket.on('reconnect', (attemptNumber) => {
	console.log('[socket] Reconnected after', attemptNumber, 'attempts');
	socketConnected = true;
	removeOfflineReason('socket');
	stopPollingFallback();
	offlineToastShown = false;
	// Refresh once to sync state after reconnection
	loadDevices();
});

socket.on('connect', () => {
	console.log('[socket] Connected');
	socketConnected = true;
	removeOfflineReason('socket');
	stopPollingFallback();
	offlineToastShown = false;
});

window.vhrSocket = socket; // Make socket available globally for sessions
let devices = [];
let games = [];
let favorites = [];
let runningApps = {}; // Track running apps: { serial: [pkg1, pkg2, ...] }
let gameMetaMap = {}; // Map packageId -> { name, icon }
const DEFAULT_GAME_ICON = 'https://cdn-icons-png.flaticon.com/512/1005/1005141.png';
let serverInfoCache = null; // { lanIp, port, host }
const VOICE_LAN_OVERRIDE_KEY = 'vhr_voice_lan_ip_override';

function updateGameMetaFromList(list) {
	gameMetaMap = {};
	(list || []).forEach(g => {
		if (!g?.packageId) return;
		gameMetaMap[g.packageId] = {
			name: g.name || g.packageId,
			icon: g.icon || null
		};
	});
}

function normalizeGameIcon(icon) {
	if (!icon) return DEFAULT_GAME_ICON;
	if (icon.startsWith('data:') || icon.startsWith('http')) return icon;
	return `data:image/png;base64,${icon}`;
}

function getGameMeta(pkg) {
	const meta = gameMetaMap[pkg] || {};
	return {
		name: meta.name || pkg,
		icon: normalizeGameIcon(meta.icon)
	};
}

async function loadGamesCatalog() {
	try {
		const res = await api('/api/games', { timeout: 8000 });
		if (res.ok && Array.isArray(res.games)) {
			games = res.games;
			updateGameMetaFromList(res.games);
		}
	} catch (e) {
		console.warn('[games] load failed', e);
	}
}

async function syncFavorites() {
	try {
		const res = await api('/api/favorites', { timeout: 8000 });
		if (res.ok && Array.isArray(res.favorites)) {
			favorites = res.favorites;
			return favorites;
		}
	} catch (e) {
		console.warn('[favorites] sync failed', e);
	}
	return favorites;
}

async function getServerInfo() {
	if (serverInfoCache) return serverInfoCache;
	try {
		const res = await api('/api/server-info', { timeout: 5000 });
		if (res.ok) {
			serverInfoCache = res;
			return serverInfoCache;
		}
	} catch (e) {
		console.warn('[server-info] fetch failed', e);
	}
	return null;
}

async function buildLanUrlForPath(pathname = '/vhr-dashboard-pro.html') {
	const info = await getServerInfo();
	const port = (info && info.port) || window.location.port || 3000;
	const proto = 'http:'; // Toujours HTTP pour éviter les erreurs SSL
	const lanIp = info && info.lanIp ? info.lanIp : '';
	const manual = getLanOverride(); // peut être un host ou une URL complète
	const fallbackHost = window.location.hostname || 'localhost';

	let baseOrigin;
	if (manual) {
		if (manual.startsWith('http://') || manual.startsWith('https://')) {
			baseOrigin = manual.replace(/^https:/, 'http:').replace(/\/$/, '');
		} else {
			baseOrigin = `${proto}//${manual}:${port}`;
		}
	} else if (lanIp) {
		baseOrigin = `${proto}//${lanIp}:${port}`;
	} else {
		baseOrigin = `${proto}//${fallbackHost}:${port}`;
	}

	let storedToken = readAuthToken();
	if (!storedToken) {
		storedToken = await syncTokenFromCookie();
	}
	const baseUrl = `${baseOrigin}${pathname}`;
	let url = baseUrl;
	if (storedToken) {
		url += (pathname.includes('?') ? '&' : '?') + `token=${encodeURIComponent(storedToken)}`;
	}
	return { url, lanIp: lanIp || manual || fallbackHost };
}

async function buildLanDashboardUrl() {
	return buildLanUrlForPath('/vhr-dashboard-pro.html');
}

function getLanOverride() {
	return localStorage.getItem(VOICE_LAN_OVERRIDE_KEY) || '';
}

function setLanOverride(ip) {
	if (ip && ip.trim()) {
		localStorage.setItem(VOICE_LAN_OVERRIDE_KEY, ip.trim());
		return ip.trim();
	}
	return '';
}

async function promptLanRedirectForVoice() {
	const { url: lanUrl, lanIp } = await buildLanUrlForPath('/audio-receiver.html');
	if (lanIp) {
		try {
			window.open(lanUrl, '_blank', 'noopener,noreferrer');
		} catch (e) {
			console.warn('[voice] window.open blocked', e);
		}
	}
	return lanUrl;
}

async function openVoiceReceiverForDevice(serial = '', name = '') {
	try {
		const displayName = name || serial || 'casque';
		const path = `/audio-receiver.html?serial=${encodeURIComponent(serial || '')}&name=${encodeURIComponent(displayName)}&autoconnect=true`;
		const port = window.location.port || 3000;
			let storedToken = readAuthToken() || await syncTokenFromCookie();
		let url = `http://localhost:${port}${path}`;
		if (storedToken) url += `&token=${encodeURIComponent(storedToken)}`;
			showToast(`🗣� Voix pour ${displayName} (localhost)`, 'info');
			const opened = window.open(url, '_blank', 'noopener,noreferrer');
			if (!opened) {
				console.warn('[voice] Popup bloquée, ouvrir manuellement :', url);
				showToast(`🔗 Ouvrez manuellement : ${url}`, 'warning');
				showVoiceReceiverFallback(url, displayName);
			}
		return url;
	} catch (e) {
		console.error('[voice] openVoiceReceiverForDevice failed', e);
		showToast('� Impossible d’ouvrir la voix: ' + (e.message || 'erreur inconnue'), 'error');
	}
}

async function resolveAudioServerUrl() {
	const proto = window.location.protocol;
	const port = window.location.port || 3000;
	// 1) Manual override wins
	const manual = getLanOverride();
	if (manual) return `${proto}//${manual}:${port}`;

	// 2) Toujours essayer de détecter l'IP LAN (jamais localhost)
	const info = await getServerInfo();
	if (info && info.lanIp) {
		return `${proto}//${info.lanIp}:${info.port || port}`;
	}

	// 3) Fallback: autoriser aussi depuis localhost en renvoyant l'origine (pour un usage PC local)
	return window.location.origin;
}

async function syncRunningAppsFromServer() {
	try {
		const res = await api('/api/apps/running', { timeout: 8000 });
		if (res.ok && res.running) {
			runningApps = res.running || {};
			return true;
		}
	} catch (e) {
		console.warn('[runningApps] sync failed', e);
	}
	return false;
}
let batteryPollInterval = null;  // Single interval reference
const batteryBackoff = {}; // backoff per serial on repeated errors

// Initialize collaborative session socket handlers
initSessionSocket();

function startBatteryPolling() {
	if (batteryPollInterval) return;
	const poll = async () => {
		for (const d of devices) {
			fetchBatteryLevel(d.serial);
		}
	};
	// poll immediately then on interval
	poll();
	batteryPollInterval = setInterval(poll, 30000); // 30s cadence
}

async function api(path, opts = {}) {
	try {
		// Include cookies in request (for httpOnly vhr_token cookie)
		if (!opts.credentials) {
			opts.credentials = 'include';
		}
		const skipAuthHeader = opts.skipAuthHeader === true;
		if (skipAuthHeader) {
			delete opts.skipAuthHeader;
		}
		const storedToken = readAuthToken();
		if (storedToken && !skipAuthHeader) {
			opts.headers = {
				...(opts.headers || {}),
				Authorization: 'Bearer ' + storedToken
			};
		}

		// Timeout support
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), opts.timeout || API_TIMEOUT_MS);
		const res = await fetch(path, { ...opts, signal: controller.signal }).finally(() => clearTimeout(t));
		
		// Check if response is JSON
		const contentType = res.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			console.error('[api] Invalid content-type:', contentType, 'Status:', res.status);
			return { ok: false, error: `Invalid response type: ${contentType}, Status: ${res.status}` };
		}
		
		const data = await res.json();
		// Attach status code to response for better error checking
		data._status = res.status;
		removeOfflineReason('api-timeout');
		return data;
	} catch (e) {
		if (e.name === 'AbortError') {
			console.warn('[api timeout]', path, 'after', opts.timeout || API_TIMEOUT_MS, 'ms');
			addOfflineReason('api-timeout');
			return { ok: false, error: 'timeout', timeout: true };
		}
		console.error('[api]', path, e);
		return { ok: false, error: e.message };
	}
}

async function refreshDevicesList() {
	const btn = document.getElementById('refreshBtn');
	if (!btn) return;
	
	// Montrer un état de loading
	btn.style.opacity = '0.6';
	btn.style.pointerEvents = 'none';
	const originalText = btn.innerHTML;
	btn.innerHTML = '� Rafraîchissement...';
	
	try {
		// Recharger les devices
		const data = await api('/api/devices');
		if (data.ok && Array.isArray(data.devices)) {
			devices = data.devices;
			renderDevices();
			
			// Feedback visuel de succès
			btn.innerHTML = '✓ Rafraîchi!';
			setTimeout(() => {
				btn.innerHTML = originalText;
				btn.style.opacity = '1';
				btn.style.pointerEvents = 'auto';
			}, 1500);
		} else {
			throw new Error(data.error || 'Échec du chargement des devices');
		}
	} catch (error) {
		console.error('[refresh]', error);
		btn.innerHTML = '� Erreur';
		btn.style.background = '#e74c3c';
		setTimeout(() => {
			btn.innerHTML = originalText;
			btn.style.background = '#9b59b6';
			btn.style.opacity = '1';
			btn.style.pointerEvents = 'auto';
		}, 2000);
	}
}

async function loadDevices() {
	const now = Date.now();
	if (isLoadingDevices) {
		console.warn('[devices] Ignored loadDevices: already loading');
		return;
	}
	if (now - lastDevicesLoadTs < MIN_LOAD_DEVICES_INTERVAL_MS) {
		console.warn('[devices] Ignored loadDevices: throttled');
		return;
	}
	isLoadingDevices = true;
	try {
		const data = await api('/api/devices');
		if (data.ok && Array.isArray(data.devices)) {
			devices = data.devices;
			lastDevicesLoadTs = Date.now();
			// Récupérer l'état des jeux en cours depuis le serveur avant de rendre
			await syncRunningAppsFromServer();
			
			// Mettre à jour le nombre de casques gérés
			if (devices.length > 0) {
				const stats = JSON.parse(localStorage.getItem('vhr_user_stats_' + currentUser) || '{}');
				const currentMax = stats.devicesManaged || 0;
				if (devices.length > currentMax) {
					stats.devicesManaged = devices.length;
					stats.lastLogin = new Date().toISOString();
					if (!stats.joinedAt) stats.joinedAt = new Date().toISOString();
					localStorage.setItem('vhr_user_stats_' + currentUser, JSON.stringify(stats));
				}
			}
			
			renderDevices();
			startBatteryPolling();
			if (!initialDevicesLoadComplete) {
				initialDevicesLoadComplete = true;
				if (devices.length === 0 && !usbTutorialShown) {
					showUsbConnectionTutorial();
				}
			}
		}
	} finally {
		isLoadingDevices = false;
	}
}
// Expose loadDevices globally for onclick handlers in HTML
window.loadDevices = loadDevices;

function isRelayDevice(dev) {
	return !!dev && (dev.origin === 'relay' || dev.status === 'relay');
}

// ========== RENDER: TABLE VIEW ========== 
function renderDevicesTable() {
	const container = document.getElementById('deviceGrid');
	container.innerHTML = '';
	container.style.display = 'block';
	container.style.padding = '20px';
	container.style.opacity = '1';
	container.style.pointerEvents = 'auto';
	
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
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Batterie</th>
				<th style='padding:14px;text-align:left;border-bottom:2px solid #2ecc71;font-size:15px;'>Statut</th>
				<th style='padding:14px;text-align:center;border-bottom:2px solid #2ecc71;font-size:15px;'>Jeu en cours</th>
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
		const relay = isRelayDevice(d);
		const statusColor = relay ? '#9b59b6' : d.status === 'device' ? '#2ecc71' : d.status === 'streaming' ? '#3498db' : '#e74c3c';
		const statusIcon = relay ? '📡' : d.status === 'device' ? '✅' : d.status === 'streaming' ? '🟢' : '�';
		const statusLabel = relay ? 'relay (cloud)' : d.status;
		const runningGamesList = runningApps[d.serial] || [];
		const serialJson = JSON.stringify(d.serial);
		const runningGameDisplay = runningGamesList.length > 0 ? runningGamesList.map(pkg => {
			const meta = getGameMeta(pkg);
			const safeName = meta.name.replace(/"/g, '&quot;');
			return `
			<div style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;background:#0f1117;padding:8px;border-radius:10px;'>
				<img src="${meta.icon}" alt="${safeName}" style='width:42px;height:42px;border-radius:8px;object-fit:cover;border:1px solid #2ecc71;' onerror="this.onerror=null;this.src='${DEFAULT_GAME_ICON}'" />
				<div style='display:flex;flex-direction:column;gap:6px;align-items:flex-start;'>
					<span class='pill pill-muted'>🎮 ${safeName}</span>
					<div style='display:flex;gap:6px;flex-wrap:wrap;'>
						<button class='btn btn-ghost btn-compact' onclick='pauseGame(${serialJson}, "${pkg}")'>�� Pause</button>
						<button class='btn btn-accent btn-compact' onclick='resumeGame(${serialJson}, "${pkg}")'>▶� Reprendre</button>
						<button class='btn btn-danger btn-compact' onclick='stopGame(${serialJson}, "${pkg}")'>�� Stop</button>
					</div>
				</div>
			</div>
			`;
		}).join('') : `<span style='color:#95a5a6;'>-</span>`;
		
		// Escape special characters for HTML attributes
		const safeSerial = d.serial.replace(/'/g, "\\'").replace(/"/g, '&quot;');
		const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
		// Create safe ID for HTML (no colons, dots, or special chars)
		const safeId = d.serial.replace(/[^a-zA-Z0-9]/g, '_');
		
		const batteryCell = relay 
			? `<div style='font-size:14px;font-weight:bold;color:#bdc3c7;'>🔋 N/A (relais)</div>`
			: `<div id='battery_${safeId}' style='font-size:14px;font-weight:bold;color:#95a5a6;'>🔋 Batterie...</div>`;

		const streamingCell = relay
			? `<div style='color:#bdc3c7;font-size:12px;max-width:160px;margin:0 auto;'>Actions locales désactivées en mode cloud. Connectez l'agent PC pour le contrôle ADB.</div>`
			: (d.status !== 'streaming' ? `
				<select id='profile_${safeId}' style='background:#34495e;color:#fff;border:1px solid #2ecc71;padding:6px;border-radius:4px;margin-bottom:4px;width:140px;'>
					<option value='ultra-low'>Ultra Low</option>
					<option value='low'>Low</option>
					<option value='wifi'>WiFi</option>
					<option value='default' selected>Default</option>
					<option value='high'>High</option>
					<option value='ultra'>Ultra</option>
				</select><br>
				<button onclick='startStreamFromTable(${JSON.stringify(d.serial)})' style='background:#3498db;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>▶� Scrcpy</button>
			` : `
				<button onclick='stopStreamFromTable(${JSON.stringify(d.serial)})' style='background:#e74c3c;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>�� Stop</button>
			`);

		const wifiCell = relay
			? `<span style='color:#95a5a6;'>-</span>`
			: (!d.serial.includes(':') ? `
				<button onclick='connectWifiAuto(${JSON.stringify(d.serial)})' style='background:#9b59b6;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>📶 WiFi Auto</button>
			` : `<span style='color:#95a5a6;'>-</span>`);

		const appsCell = relay
			? `<div style='color:#bdc3c7;font-size:12px;'>Apps/Favoris indisponibles en mode relais</div>`
			: `
			<button onclick='showAppsDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#f39c12;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>📱 Apps</button>
			<button onclick='showFavoritesDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#e67e22;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-top:4px;'>� Favoris</button>
		`;

		const voiceCell = relay
			? `<div style='color:#bdc3c7;font-size:12px;'>Voix PC→Casque indisponible en mode relais</div>`
			: `
			<button onclick='sendVoiceToHeadset(${JSON.stringify(d.serial)})' style='background:#16a085;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold;'>🗣� Voix LAN</button>
			<button onclick='showVoiceAppDialog(${JSON.stringify(d.serial)})' style='background:#34495e;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:11px;margin-left:4px;' title='Installer l’émetteur voix sur le casque'>📲 Émetteur</button>
		`;

		const actionsCell = relay
			? `<div style='color:#bdc3c7;font-size:12px;'>Actions ADB désactivées (relais cloud)</div>`
			: `
			<button onclick='renameDevice({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#34495e;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;margin:2px;'>��</button>
			<button onclick='showStorageDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#34495e;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;margin:2px;'>💾</button>
		`;

		table += `<tr style='background:${bgColor};border-bottom:1px solid #34495e;'>
			<td style='padding:12px;'>
				<div style='font-weight:bold;font-size:16px;color:#2ecc71;'>${d.name}</div>
				<div style='font-size:11px;color:#95a5a6;margin-top:2px;'>${d.serial}</div>
			</td>
			<td style='padding:12px;text-align:center;'>
				${batteryCell}
			</td>
			<td style='padding:12px;'>
				<span style='background:${statusColor};color:${relay ? '#fff' : '#fff'};padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;'>
					${statusIcon} ${statusLabel}
				</span>
			</td>
			<td style='padding:12px;text-align:center;'>
				${runningGameDisplay}
			</td>
			<td style='padding:12px;text-align:center;'>
				${streamingCell}
			</td>
			<td style='padding:12px;text-align:center;'>
				${wifiCell}
			</td>
			<td style='padding:12px;text-align:center;'>
				${appsCell}
			</td>
			<td style='padding:12px;text-align:center;'>
				${voiceCell}
			</td>
			<td style='padding:12px;text-align:center;'>
				${actionsCell}
			</td>
		</tr>`;
		
		// Battery gauge disabled
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
	grid.style.opacity = '1';
	grid.style.pointerEvents = 'auto';
	
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
		
		const relay = isRelayDevice(d);
		const statusColor = relay ? '#9b59b6' : d.status === 'device' ? '#2ecc71' : d.status === 'streaming' ? '#3498db' : '#e74c3c';
		const runningGamesList = runningApps[d.serial] || [];
		const serialJson = JSON.stringify(d.serial);
		const runningGameDisplay = runningGamesList.length > 0 ? runningGamesList.map(pkg => {
			const meta = getGameMeta(pkg);
			const safeName = meta.name.replace(/"/g, '&quot;');
			return `
			<div style='margin-bottom:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#0f1117;padding:10px;border-radius:10px;'>
				<img src="${meta.icon}" alt="${safeName}" style='width:46px;height:46px;border-radius:10px;object-fit:cover;border:1px solid #2ecc71;' onerror="this.onerror=null;this.src='${DEFAULT_GAME_ICON}'" />
				<div style='display:flex;flex-direction:column;gap:6px;align-items:flex-start;'>
					<span class="pill pill-muted">🎮 ${safeName}</span>
					<div style='display:flex;gap:6px;flex-wrap:wrap;'>
						<button class='btn btn-ghost btn-compact' onclick='pauseGame(${serialJson}, "${pkg}")'>�� Pause</button>
						<button class='btn btn-accent btn-compact' onclick='resumeGame(${serialJson}, "${pkg}")'>▶� Reprendre</button>
						<button class='btn btn-danger btn-compact' onclick='stopGame(${serialJson}, "${pkg}")'>�� Stop</button>
					</div>
				</div>
			</div>
			`;
		}).join('') : '';
		
		// Escape special characters for HTML attributes
		const safeSerial = d.serial.replace(/'/g, "\\'").replace(/"/g, '&quot;');
		const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
		// Create safe ID for HTML (no colons, dots, or special chars)
		const safeId = d.serial.replace(/[^a-zA-Z0-9]/g, '_');
		
		const batteryBlock = relay
			? `<div style='font-size:14px;font-weight:bold;color:#bdc3c7;'>🔋 N/A (relais)</div>`
			: `<div id='battery_${safeId}' style='font-size:14px;font-weight:bold;color:#95a5a6;'>🔋 Batterie...</div>`;

		const streamingBlock = relay
			? `<div style='color:#bdc3c7;font-size:12px;margin-bottom:10px;'>Actions locales désactivées en mode cloud. Ouvrez l'agent PC pour contrôler le casque.</div>`
			: (d.status !== 'streaming' ? `
			<select id='profile_card_${safeId}' style='width:100%;background:#34495e;color:#fff;border:1px solid #2ecc71;padding:8px;border-radius:6px;margin-bottom:6px;'>
				<option value='ultra-low'>Ultra Low</option>
				<option value='low'>Low</option>
				<option value='wifi'>WiFi</option>
				<option value='default' selected>Default</option>
				<option value='high'>High</option>
				<option value='ultra'>Ultra</option>
			</select>
			<button onclick='startStreamFromCard(${JSON.stringify(d.serial)})' style='width:100%;background:#3498db;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>▶� Scrcpy</button>
		` : `
			<button onclick='stopStreamFromTable(${JSON.stringify(d.serial)})' style='width:100%;background:#e74c3c;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>�� Stop Stream</button>
		`);

		const appsBlock = relay
			? `<div style='color:#bdc3c7;font-size:12px;margin-bottom:10px;'>Apps/Favoris indisponibles en mode relais</div>`
			: `<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;'>
				<button onclick='showAppsDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#f39c12;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>📱 Apps</button>
				<button onclick='showFavoritesDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#e67e22;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>� Favoris</button>
			</div>`;

		const voiceBlock = relay
			? `<div style='color:#bdc3c7;font-size:12px;margin-bottom:6px;'>Voix PC→Casque indisponible en mode relais</div>`
			: `<div style='display:flex;gap:6px;margin-bottom:6px;'>
				<button onclick='sendVoiceToHeadset(${JSON.stringify(d.serial)})' style='flex:1;background:#16a085;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;'>🗣� Voix LAN</button>
				<button onclick='showVoiceAppDialog(${JSON.stringify(d.serial)})' style='background:#34495e;color:#fff;border:none;padding:10px 12px;border-radius:6px;cursor:pointer;' title='Installer l’émetteur voix sur le casque'>📲 Émetteur</button>
			</div>`;

		const wifiBlock = relay
			? ''
			: (!d.serial.includes(':') ? `
				<button onclick='connectWifiAuto(${JSON.stringify(d.serial)})' style='width:100%;background:#9b59b6;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>📶 WiFi Auto</button>
			` : '');

		const actionsBlock = relay
			? `<div style='color:#bdc3c7;font-size:12px;'>Actions ADB désactivées (relais cloud)</div>`
			: `<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;'>
				<button onclick='renameDevice({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#34495e;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>�� Renommer</button>
				<button onclick='showStorageDialog({serial:${JSON.stringify(d.serial)},name:${JSON.stringify(d.name || '')}})' style='background:#34495e;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>💾 Stockage</button>
			</div>`;

		card.innerHTML = `
			<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
				<div style='font-weight:bold;font-size:18px;color:#2ecc71;'>${d.name}</div>
				${batteryBlock}
			</div>
			<div style='font-size:11px;color:#95a5a6;margin-bottom:12px;'>${d.serial}</div>
			<div style='margin-bottom:12px;'>
				<span style='background:${statusColor};color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:bold;'>
					${relay ? '📡 relay (cloud)' : (d.status === 'device' ? '✅ device' : d.status === 'streaming' ? '🟢 streaming' : `� ${d.status}`)}
				</span>
			</div>
			${runningGameDisplay}
			<div style='margin-bottom:10px;'>
				${streamingBlock}
			</div>
			${appsBlock}
			${voiceBlock}
			${wifiBlock}
			${actionsBlock}
		`;
		
		grid.appendChild(card);
		
		// Battery gauge disabled
	});
}

// Fetch and update battery level for a device
async function fetchBatteryLevel(serial) {
	if (!serial) return;
	const device = devices.find(d => d.serial === serial);
	if (device && isRelayDevice(device)) return; // Pas de batterie en mode relais
	const now = Date.now();
	const nextAllowed = batteryBackoff[serial] || 0;
	if (now < nextAllowed) return;

	const el = document.getElementById('battery_' + serial.replace(/[^a-zA-Z0-9]/g, '_'));
	if (el) el.innerText = '🔄 Lecture...';

	try {
		const res = await api(`/api/battery/${encodeURIComponent(serial)}`, { timeout: 12000 });
		if (res.ok && typeof res.level === 'number') {
			const lvl = res.level;
			let color = '#2ecc71';
			if (lvl < 20) color = '#e74c3c';
			else if (lvl < 50) color = '#f1c40f';
			if (el) {
				el.style.color = color;
				el.innerText = `🔋 ${lvl}%`;
			}
			batteryBackoff[serial] = now + 30000; // normal cadence
		} else {
			if (el) {
				el.style.color = '#e67e22';
				el.innerText = '⚠� Batterie inconnue';
			}
			batteryBackoff[serial] = now + 60000; // slow down on errors
		}
	} catch (e) {
		if (el) {
			el.style.color = '#e74c3c';
			el.innerText = '� Batterie (err)';
		}
		batteryBackoff[serial] = now + 60000; // backoff 60s on failure
	}
}

function renderDevices() {
	if (viewMode === 'table') renderDevicesTable();
	else renderDevicesCards();
}

function showUsbConnectionTutorial() {
	if (usbTutorialShown) return;
	usbTutorialShown = true;
	const existing = document.getElementById('usbTutorialOverlay');
	if (existing) return;
	const overlay = document.createElement('div');
	overlay.id = 'usbTutorialOverlay';
	overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:4500;display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit;';
	overlay.onclick = (e) => { if (e.target === overlay) closeUsbConnectionTutorial(); };
	overlay.innerHTML = `
		<div style='background:#0c0f15;border:2px solid #2ecc71;border-radius:18px;padding:32px;max-width:920px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.9);color:#fff;'>
			<h2 style='margin-top:0;color:#2ecc71;font-size:32px;'>Casque non détecté ?</h2>
			<p style='color:#bdc3c7;font-size:15px;margin-bottom:24px;'>Tout est prêt côté serveur, mais votre machine doit autoriser ADB/USB. Voici les étapes rapides pour débloquer la détection.</p>
			<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;'>
				<div style='background:#111620;border:1px solid rgba(46,204,113,0.1);border-radius:12px;padding:16px;'>
					<h3 style='margin-top:0;color:#2ecc71;'>1. Câble & drivers</h3>
					<p style='color:#95a5a6;font-size:13px;margin-bottom:12px;'>Vérifiez que vous utilisez un câble USB-C capable de données, branchez une autre prise et redémarrez le casque.</p>
					<a href='https://developer.oculus.com/downloads/package/oculus-adb-drivers/' target='_blank' rel='noopener noreferrer' style='color:#fff;text-decoration:underline;font-size:13px;'>Télécharger les drivers Meta Quest</a><br>
					<a href='https://developer.android.com/studio/run/win-usb' target='_blank' rel='noopener noreferrer' style='color:#fff;text-decoration:underline;font-size:13px;'>Guide driver USB Google</a>
				</div>
				<div style='background:#111620;border:1px solid rgba(46,204,113,0.1);border-radius:12px;padding:16px;'>
					<h3 style='margin-top:0;color:#2ecc71;'>2. Mode développeur actif</h3>
					<p style='color:#95a5a6;font-size:13px;'>Activez le mode développeur dans l'app mobile du casque (Meta Quest, Pico, etc.), puis redémarrez le casque.</p>
				</div>
				<div style='background:#111620;border:1px solid rgba(46,204,113,0.1);border-radius:12px;padding:16px;'>
					<h3 style='margin-top:0;color:#2ecc71;'>3. Autoriser le débogage USB</h3>
					<p style='color:#95a5a6;font-size:13px;'>Après connexion, acceptez la popup “Autoriser le débogage USB� et cochez “Toujours autoriser�.</p>
					<p style='color:#95a5a6;font-size:13px;margin-top:8px;'>Lancez <code style='background:#323843;padding:2px 6px;border-radius:4px;'>adb devices</code> pour vérifier la présence.</p>
				</div>
				<div style='background:#111620;border:1px solid rgba(46,204,113,0.1);border-radius:12px;padding:16px;'>
					<h3 style='margin-top:0;color:#2ecc71;'>4. Relancer la détection</h3>
					<p style='color:#95a5a6;font-size:13px;margin-bottom:12px;'>Réouvrez le dashboard ou cliquez sur “🔄 Rafraîchir� pour relancer l’exploration.</p>
					<button onclick='closeUsbConnectionTutorial();' style='background:#2ecc71;color:#000;border:none;padding:8px 14px;border-radius:6px;font-weight:bold;cursor:pointer;'>Ok, j’ai vérifié</button>
				</div>
			</div>
			<div style='display:flex;flex-wrap:wrap;gap:10px;margin-top:28px;'>
				<button onclick='closeUsbConnectionTutorial();' style='flex:1;background:#3498db;color:#fff;border:none;padding:14px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold;'>Fermer</button>
				<button onclick='openUsbConnectionTutorialGuide();' style='flex:1;background:#2ecc71;color:#000;border:none;padding:14px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold;'>Voir le guide étape par étape</button>
			</div>
			<p style='color:#95a5a6;font-size:12px;margin-top:14px;'>Besoin d’aide personnalisée ? Consultez la section “Drivers Android� dans la doc développeur.</p>
		</div>
	`;
	document.body.appendChild(overlay);
}

function closeUsbConnectionTutorial() {
	const overlay = document.getElementById('usbTutorialOverlay');
	if (overlay) {
		overlay.remove();
	}
}

function openUsbConnectionTutorialGuide() {
	const target = '/site-vitrine/developer-setup.html';
	window.open(target, '_blank');
}

// ========== STREAMING FUNCTIONS ========== 

// Show audio output selection dialog for stream
window.showStreamAudioDialog = function(serial, callback) {
	// Récupérer le nom du casque
	const device = devices.find(d => d.serial === serial);
	const deviceName = device ? device.name : serial;
	
	let dialog = document.getElementById('streamAudioDialog');
	if (dialog) dialog.remove();
	
	dialog = document.createElement('div');
	dialog.id = 'streamAudioDialog';
	dialog.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:4000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
	dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
	
	dialog.innerHTML = `
		<div style='background:#1a1d24;border:2px solid #2ecc71;border-radius:12px;padding:24px;max-width:400px;width:90%;text-align:center;'>
			<h3 style='color:#2ecc71;margin:0 0 8px 0;'>🎮 Scrcpy - ${deviceName}</h3>
			<p style='color:#95a5a6;margin:0 0 20px 0;font-size:12px;'>${serial}</p>
			<p style='color:#bdc3c7;margin-bottom:20px;font-size:14px;'>🔊 Où voulez-vous entendre le son ?</p>
			<div style='display:flex;flex-direction:column;gap:10px;'>
				<button onclick='window.launchStreamWithAudio("${serial}", "headset")' style='background:linear-gradient(135deg, #3498db 0%, #2980b9 100%);color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;'>
					📱 Casque uniquement
				</button>
				<button onclick='window.launchStreamWithAudio("${serial}", "pc")' style='background:linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;'>
					💻 PC uniquement
				</button>
				<button onclick='window.launchStreamWithAudio("${serial}", "both")' style='background:linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;'>
					🔊 Casque + PC (recommandé)
				</button>
			</div>
			<button onclick='document.getElementById("streamAudioDialog").remove()' style='margin-top:16px;background:#7f8c8d;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;'>Annuler</button>
		</div>
	`;
	document.body.appendChild(dialog);
};

window.launchStreamWithAudio = async function(serial, audioOutput) {
	// Close dialog
	const dialog = document.getElementById('streamAudioDialog');
	if (dialog) dialog.remove();
	
	showToast('🎮 Lancement Scrcpy...', 'info');
	
	const res = await api('/api/scrcpy-gui', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial, audioOutput })
	});
	
	if (res.ok) {
		const audioMsg = audioOutput === 'headset' ? '(son sur casque)' : audioOutput === 'pc' ? '(son sur PC)' : '(son sur casque + PC)';
		showToast(`🎮 Scrcpy lancé ! ${audioMsg}`, 'success');
		incrementStat('totalSessions');
	} else {
		showToast('� Erreur: ' + (res.error || 'inconnue'), 'error');
	}
	setTimeout(loadDevices, 500);
};

window.startStreamFromTable = async function(serial) {
	// Show audio output selection dialog
	window.showStreamAudioDialog(serial);
};

window.startStreamFromCard = async function(serial) {
	// Show audio output selection dialog  
	window.showStreamAudioDialog(serial);
};

window.startStreamJSMpeg = async function(serial) {
	const res = await api('/api/stream/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial, profile: 'default' })
	});
	if (res.ok) {
		showToast('✅ Stream JSMpeg démarré !', 'success');
		setTimeout(() => showStreamViewer(serial), 500);
	}
	else showToast('� Erreur: ' + (res.error || 'inconnue'), 'error');
};

window.showStreamViewer = function(serial) {
	// Récupérer le nom du casque
	const device = devices.find(d => d.serial === serial);
	const deviceName = device ? device.name : serial;
	
	let modal = document.getElementById('streamModal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'streamModal';
		modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:3000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
		document.body.appendChild(modal);
	}
	
	// Store serial in data attribute for later use
	modal.dataset.serial = serial;
	
	modal.innerHTML = `
		<div style='width:90%;max-width:960px;background:#1a1d24;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px #000;'>
			<div style='background:#23272f;padding:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;'>
				<h2 style='color:#2ecc71;margin:0;'>📹 Stream - ${deviceName}</h2>
				<div style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;'>
					<label style='color:#fff;font-size:12px;display:flex;align-items:center;gap:6px;'>
						🔊 Son:
						<select id='audioOutputSelect' style='background:#1a1d24;color:#fff;border:1px solid #2ecc71;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;'>
							<option value='headset'>📱 Casque</option>
							<option value='pc'>💻 PC</option>
							<option value='both'>🔊 Les deux</option>
						</select>
					</label>
					<button onclick='window.closeStreamViewer()' style='background:#e74c3c;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;'>✕ Fermer</button>
				</div>
			</div>
			<div id='streamContainer' style='width:100%;background:#000;position:relative;padding-bottom:56.25%;'>
				<canvas id='streamCanvas' style='position:absolute;top:0;left:0;width:100%;height:100%;display:block;'></canvas>
				<!-- Overlay transparent avec le nom du casque -->
				<div id='streamDeviceOverlay' style='position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.6);color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:bold;z-index:15;backdrop-filter:blur(4px);border:1px solid rgba(46,204,113,0.5);display:flex;align-items:center;gap:8px;'>
					<span style='color:#2ecc71;'>🥽</span> ${deviceName}
				</div>
				<div id='streamLoading' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;text-align:center;font-size:16px;z-index:10;'>
					� Connexion au stream...
				</div>
			</div>
			<div style='background:#23272f;padding:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;'>
				<div style='color:#95a5a6;font-size:12px;'>
					🟢 En direct - <span id='streamTime'>${new Date().toLocaleTimeString('fr-FR')}</span>
				</div>
				<div style='display:flex;gap:8px;font-size:12px;'>
					<button onclick='toggleStreamFullscreen()' style='background:#3498db;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;'>⛶ Plein écran</button>
					<button onclick='captureStreamScreenshot()' style='background:#2ecc71;color:#000;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;'>📸 Capture</button>
				</div>
			</div>
		</div>
	`;
	modal.style.display = 'flex';
	
	// Attendre 1 seconde que le stream soit bien lancé côté serveur avant de connecter le player
	console.log('[stream] Modal opened, waiting for stream to stabilize...');
	
	// Ajouter event listener au select audio - attendre que le DOM soit ready
	setTimeout(() => {
		const audioSelect = document.getElementById('audioOutputSelect');
		if (audioSelect) {
			audioSelect.addEventListener('change', (e) => {
				const audioMode = e.target.value;
				const serialFromModal = document.getElementById('streamModal').dataset.serial || serial;
				console.log('[stream] Audio mode changed to:', audioMode, 'Serial:', serialFromModal);
				showToast('🔊 Audio: ' + (audioMode === 'headset' ? 'Casque' : audioMode === 'pc' ? 'PC' : 'Les deux'), 'info');
				// Envoyer au serveur
				api('/api/stream/audio-output', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ serial: serialFromModal, audioOutput: audioMode })
				}).then(res => {
					if (res && res.ok) {
						console.log('[stream audio] Success:', res);
					} else {
						console.error('[stream audio] Failed:', res);
					}
				}).catch(err => console.error('[stream audio]', err));
			});
		} else {
			console.warn('[stream] audioOutputSelect element not found');
		}
	}, 100);
	
	// Mettre à jour l'heure en temps réel (store reference for cleanup)
	if (window.streamTimeInterval) clearInterval(window.streamTimeInterval);
	window.streamTimeInterval = setInterval(() => {
		const timeEl = document.getElementById('streamTime');
		if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('fr-FR');
	}, 1000);
	
	setTimeout(() => {
		initStreamPlayer(serial);
	}, 1000);
};

window.toggleStreamFullscreen = function() {
	const container = document.getElementById('streamContainer');
	if (!document.fullscreenElement) {
		container.requestFullscreen().catch(err => console.error('[fullscreen]', err));
	} else {
		document.exitFullscreen();
	}
};

window.captureStreamScreenshot = function() {
	const canvas = document.getElementById('streamCanvas');
	if (!canvas) {
		showToast('� Canvas non disponible', 'error');
		return;
	}
	
	try {
		const link = document.createElement('a');
		link.href = canvas.toDataURL('image/png');
		link.download = 'screenshot-' + new Date().getTime() + '.png';
		link.click();
		showToast('📸 Capture enregistrée!', 'success');
	} catch (err) {
		console.error('[screenshot]', err);
		showToast('� Erreur capture', 'error');
	}
};

window.closeStreamViewer = function() {
	const modal = document.getElementById('streamModal');
	if (modal) modal.style.display = 'none';
	
	// Clean up stream time interval
	if (window.streamTimeInterval) {
		clearInterval(window.streamTimeInterval);
		window.streamTimeInterval = null;
	}
	
	if (window.jsmpegPlayer) {
		window.jsmpegPlayer.destroy();
		window.jsmpegPlayer = null;
	}
};

window.initStreamPlayer = function(serial) {
	console.log('[stream] initStreamPlayer called for:', serial);
	
	// Vérifier si JSMpeg est chargé
	if (typeof JSMpeg === 'undefined') {
		console.log('[stream] JSMpeg not loaded, loading from CDN...');
		// Charger JSMpeg dynamiquement
		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/jsmpeg-player@0.2.8/jsmpeg.min.js';
		script.onerror = () => {
			console.error('[stream] Failed to load JSMpeg library');
			showToast('� Erreur: impossible de charger la librairie vidéo', 'error');
		};
		script.onload = () => {
			console.log('[stream] JSMpeg library loaded successfully');
			connectStreamSocket(serial);
		};
		document.head.appendChild(script);
	} else {
		console.log('[stream] JSMpeg already loaded, using it');
		connectStreamSocket(serial);
	}
};


window.connectStreamSocket = function(serial) {
	const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
	const wsUrl = wsProtocol + window.location.host + '/api/stream/ws?serial=' + encodeURIComponent(serial);
	const canvas = document.getElementById('streamCanvas');
	
	if (!canvas) {
		console.error('[stream] Canvas not found');
		showToast('� Canvas non trouvé', 'error');
		return;
	}
	
	console.log('[stream] connectStreamSocket: URL:', wsUrl);
	console.log('[stream] connectStreamSocket: Canvas found');
	console.log('[stream] connectStreamSocket: JSMpeg class available?', typeof JSMpeg !== 'undefined');
	
	try {
		console.log('[stream] Creating JSMpeg player...');
		
		// JSMpeg.Player configuration pour une lecture stable
		// Priorité: stabilité vidéo sans scintillement plutôt que latence basse
		const player = new JSMpeg.Player(wsUrl, {
			canvas: canvas,
			autoplay: true,
			progressive: true,
			// Optimisations pour éviter le scintillement:
			bufferSize: 512 * 1024,  // 512KB buffer client-side (accepte +100-200ms pour la stabilité)
			chunkSize: 1024 * 10,    // Traiter les chunks par 10KB
			throttled: true,         // Throttle rendering quand le navigateur est occupé
			onPlay: () => {
				console.log('[stream] JSMpeg onPlay callback fired');
				showToast('🎬 Stream connecté ! (buffering pour stabilité)', 'success');
				// Remove loading indicator
				const loading = document.getElementById('streamLoading');
				if (loading) loading.style.display = 'none';
			},
			onError: (err) => {
				console.error('[stream] JSMpeg onError callback:', err);
				showToast('� Erreur stream: ' + err, 'error');
			}
		});
		
		window.jsmpegPlayer = player;
		console.log('[stream] JSMpeg player créé avec stabilisation vidéo activée');
		console.log('[stream] - Buffer côté client: 512KB pour absorber les variations de débit');
		console.log('[stream] - Rendu throttlé pour éviter le scintillement');
		console.log('[stream] - Latence acceptée: +100-200ms pour la stabilité');
	} catch (e) {
		console.error('[stream] Connection error:', e);
		console.error('[stream] Stack:', e.stack);
		showToast('� Erreur de connexion stream: ' + e.message, 'error');
	}
};


window.stopStreamFromTable = async function(serial) {
	const res = await api('/api/stream/stop', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	if (res.ok) showToast('�� Stream arrêté !', 'success');
	else showToast('� Erreur: ' + (res.error || 'inconnue'), 'error');
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
	else showToast('� Erreur WiFi: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 1000);
};

// ========== VOICE TO HEADSET (TTS) ========== 
window.closeAudioStream = async function(silent = false) {
	// ALWAYS remove the panel first to ensure UI is responsive
	const panel = document.getElementById('audioStreamPanel');
	if (panel) {
		panel.remove();
	}
	
	// Store references and reset globals immediately to prevent re-entry issues
	const streamToClose = activeAudioStream;
	const serialToStop = activeAudioSerial;
	activeAudioStream = null;
	activeAudioSerial = null;
	isAudioSessionOwner = false;
	
	// Notify other tabs
	if (serialToStop) {
		broadcastAudioState('audio-stopped', serialToStop);
	}
	
	try {
		// Stop background voice app on headset if running
		if (serialToStop) {
			try {
				await api('/api/device/stop-audio-receiver', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ serial: serialToStop }),
					timeout: 35000 // allow adb broadcast to finish on slow links
				});
				console.log('[closeAudioStream] Stopped background voice app');
			} catch (e) {
				console.warn('[closeAudioStream] Error stopping background app:', e);
			}
		}
		
		if (streamToClose) {
			// Stop audio relay first
			try {
				if (typeof streamToClose.stopAudioRelay === 'function') {
					streamToClose.stopAudioRelay();
				}
			} catch (e) {
				console.warn('[closeAudioStream] Error stopping relay:', e);
			}
			
			// Then stop main WebRTC stream
			try {
				await streamToClose.stop();
			} catch (e) {
				console.warn('[closeAudioStream] Error stopping WebRTC stream:', e);
			}
		}
		
		if (!silent) {
			showToast('�� Streaming arrêté', 'success');
		}
	} catch (error) {
		console.error('[Audio Stream] Error closing:', error);
		if (!silent) {
			showToast('�� Streaming arrêté', 'info');
		}
	}
};

// ========== VHR VOICE APP INSTALLATION ==========
window.installVoiceApp = async function(serial) {
	// Show installation progress dialog
	const progressHtml = `
		<div id="installProgressContent" style="text-align:center; padding: 20px;">
			<h2 style="color:#1abc9c; margin-bottom: 20px;">📲 Installation en cours...</h2>
			
			<div style="margin: 30px 0;">
				<div style="width: 100%; height: 8px; background: #23272f; border-radius: 4px; overflow: hidden;">
					<div id="installProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #2ecc71, #1abc9c); border-radius: 4px; transition: width 0.3s ease;"></div>
				</div>
				<p id="installProgressText" style="color: #95a5a6; margin-top: 12px; font-size: 14px;">Préparation de l'installation...</p>
			</div>
			
			<div style="font-size: 48px; margin: 20px 0;">
				<span id="installSpinner" style="display: inline-block; animation: spin 1s linear infinite;">�</span>
			</div>
			
			<p style="color: #7f8c8d; font-size: 12px;">Assurez-vous que le casque est connecté en USB</p>
		</div>
		<style>
			@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
		</style>
	`;
	
	showModal(progressHtml);
	
	// Simulate progress stages
	const updateProgress = (percent, text) => {
		const bar = document.getElementById('installProgressBar');
		const textEl = document.getElementById('installProgressText');
		if (bar) bar.style.width = percent + '%';
		if (textEl) textEl.textContent = text;
	};
	
	try {
		updateProgress(10, 'Connexion au casque...');
		await new Promise(r => setTimeout(r, 500));
		
		updateProgress(30, 'Transfert de VHR Voice vers le casque...');
		
		const res = await api('/api/device/install-voice-app', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ serial })
		});
		
		updateProgress(80, 'Finalisation de l\'installation...');
		await new Promise(r => setTimeout(r, 500));
		
		if (res && res.ok) {
			updateProgress(100, 'Installation terminée !');
			
			// Show success message
			const successHtml = `
				<div style="text-align:center; padding: 20px;">
					<div style="font-size: 80px; margin-bottom: 20px;">✅</div>
					<h2 style="color:#2ecc71; margin-bottom: 16px;">VHR Voice installé !</h2>
					<p style="color:#bdc3c7; margin-bottom: 24px; line-height: 1.6;">
						L'application a été installée avec succès sur votre casque Quest.
					</p>
					
					<div style="background:#27ae60; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
						<h4 style="color:#fff; margin-bottom: 8px;">🎮 Prochaine étape</h4>
						<p style="color:#d5f4e6; font-size: 14px; margin: 0;">
							Dans le casque, allez dans <strong>Applications</strong> → <strong>Sources inconnues</strong><br>
							et lancez <strong>VHR Voice</strong>
						</p>
					</div>
					
					<button onclick="closeModal()" style="
						background: linear-gradient(135deg, #2ecc71, #27ae60);
						color: #fff;
						border: none;
						padding: 14px 32px;
						border-radius: 8px;
						font-size: 16px;
						font-weight: bold;
						cursor: pointer;
					">� Compris !</button>
				</div>
			`;
			
			setTimeout(() => {
				const modal = document.getElementById('modal');
				if (modal) {
					modal.querySelector('div').innerHTML = successHtml + '<br><button onclick="closeModal()" style="background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:12px;">� Fermer</button>';
				}
			}, 500);
			
			showToast('✅ VHR Voice installé avec succès!', 'success');
			return true;
		} else {
			// Show error
			const errorHtml = `
				<div style="text-align:center; padding: 20px;">
					<div style="font-size: 80px; margin-bottom: 20px;">�</div>
					<h2 style="color:#e74c3c; margin-bottom: 16px;">Échec de l'installation</h2>
					<p style="color:#bdc3c7; margin-bottom: 16px;">
						${res?.error || 'Une erreur est survenue lors de l\'installation.'}
					</p>
					
					<div style="background:#34495e; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
						<h4 style="color:#f39c12; margin-bottom: 8px;">💡 Solutions possibles</h4>
						<ul style="color:#95a5a6; font-size: 13px; padding-left: 20px; margin: 0;">
							<li>Vérifiez que le casque est connecté en USB</li>
							<li>Acceptez la demande de débogage USB sur le casque</li>
							<li>Essayez de télécharger l'APK et de l'installer manuellement</li>
						</ul>
					</div>
					
					<!-- Bouton téléchargement retiré -->
				</div>
			`;
			
			const modal = document.getElementById('modal');
			if (modal) {
				modal.querySelector('div').innerHTML = errorHtml + '<br><button onclick="closeModal()" style="background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:12px;">� Fermer</button>';
			}
			
			showToast('� Erreur installation: ' + (res?.error || 'inconnue'), 'error');
			return false;
		}
	} catch (e) {
		console.error('[installVoiceApp] Error:', e);
		
		const errorHtml = `
			<div style="text-align:center; padding: 20px;">
				<div style="font-size: 80px; margin-bottom: 20px;">⚠�</div>
				<h2 style="color:#e74c3c; margin-bottom: 16px;">Erreur de connexion</h2>
				<p style="color:#bdc3c7; margin-bottom: 24px;">
					Impossible de communiquer avec le serveur.<br>
					<small style="color:#7f8c8d;">${e.message}</small>
				</p>
				
				<!-- Bouton téléchargement retiré -->
			</div>
		`;
		
		const modal = document.getElementById('modal');
		if (modal) {
			modal.querySelector('div').innerHTML = errorHtml + '<br><button onclick="closeModal()" style="background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:12px;">� Fermer</button>';
		}
		
		showToast('� Erreur: ' + e.message, 'error');
		return false;
	}
};

// Bouton de téléchargement de la voix désactivé (supprimé)
window.downloadVoiceApk = function() {
	showToast('� Téléchargement désactivé pour la voix.', 'warning');
};

window.startVoiceApp = async function(serial) {
	try {
		showToast('🚀 Lancement de VHR Voice...', 'info');
		
		const res = await api('/api/device/start-voice-app', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ serial })
		});
		
		if (res && res.ok) {
			showToast('✅ VHR Voice lancé ! Vérifiez le casque.', 'success');
			closeModal();
		} else {
			showToast('⚠� ' + (res?.message || 'Vérifiez l\'installation'), 'warning');
		}
	} catch (e) {
		console.error('[startVoiceApp] Error:', e);
		showToast('� Erreur: ' + e.message, 'error');
	}
};

window.showVoiceAppDialog = function(serial) {
	const html = `
		<div style="text-align:center; padding: 20px;">
			<h2 style="color:#1abc9c; margin-bottom: 20px;">🎤 VHR Voice App</h2>
			
			<p style="color:#bdc3c7; margin-bottom: 24px; line-height: 1.6;">
				Cette application permet de recevoir l'audio du PC sur le casque Quest 
				<strong style="color:#2ecc71;">en arrière-plan</strong>, sans interrompre vos jeux.
			</p>
			
			<div style="background:#23272f; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
				<h4 style="color:#f39c12; margin-bottom: 12px;">✨ Avantages</h4>
				<ul style="text-align:left; color:#95a5a6; font-size: 13px; padding-left: 20px;">
					<li>Audio en arrière-plan pendant les jeux</li>
					<li>Reconnexion automatique</li>
					<li>Notification pour contrôler le service</li>
					<li>Pas besoin d'ouvrir le navigateur</li>
				</ul>
			</div>
			
			${serial ? `
			<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 16px;">
				<button onclick="startVoiceApp('${serial}')" style="
					background: linear-gradient(135deg, #9b59b6, #8e44ad);
					color: #fff;
					border: none;
					padding: 14px 28px;
					border-radius: 8px;
					font-size: 16px;
					font-weight: bold;
					cursor: pointer;
					display: inline-flex;
					align-items: center;
					gap: 8px;
				">▶� Démarrer l'app</button>
				
				<button onclick="installVoiceApp('${serial}')" style="
					background: linear-gradient(135deg, #2ecc71, #27ae60);
					color: #fff;
					border: none;
					padding: 14px 28px;
					border-radius: 8px;
					font-size: 16px;
					font-weight: bold;
					cursor: pointer;
					display: inline-flex;
					align-items: center;
					gap: 8px;
				">📲 Installer</button>
			</div>
			` : ''}
			
			<!-- Bouton téléchargement retiré -->
			
			<div style="margin-top: 24px; padding: 12px; background: rgba(26, 188, 156, 0.1); border-radius: 8px; border-left: 4px solid #1abc9c;">
				<p style="color:#95a5a6; font-size: 12px; margin: 0;">
					💡 <strong>Première utilisation:</strong> Cliquez d'abord sur "Installer", puis sur "Démarrer".<br>
					L'app se configurera automatiquement avec l'IP du serveur et le serial du casque.
				</p>
			</div>
		</div>
	`;
	
	showModal(html);
};

// ========== DEVICE ACTIONS ========== 
window.renameDevice = async function(device) {
	const name = await showModalInputPrompt({
		title: 'Renommer le casque',
		message: 'Nom du casque',
		defaultValue: device.name,
		placeholder: 'Nom du casque'
	});
	if (!name) return;
	const normalized = name.trim();
	if (!normalized || normalized === device.name) return;
	const res = await api('/api/devices/rename', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial: device.serial, name: normalized })
	});
	if (res.ok) {
		showToast('✅ Casque renommé !', 'success');
		loadDevices();
	} else showToast('� Erreur: ' + (res.error || 'inconnue'), 'error');
};

window.showAppsDialog = async function(device) {
	const res = await api(`/api/apps/${device.serial}`);
	if (!res.ok) {
		if (res.error === 'timeout') {
			showToast('�� Apps: délai dépassé, réessaye', 'warning');
		} else {
			showToast('� Erreur chargement apps', 'error');
		}
		return;
	}
	await syncFavorites();
	const apps = res.apps || [];
	const running = runningApps[device.serial] || [];
	let html = `<h3 style='color:#2ecc71;'>Apps installées sur ${device.name}</h3>`;
	html += `<div style='max-height:400px;overflow-y:auto;'>`;
	apps.forEach(pkg => {
		const isFav = favorites.some(f => f.packageId === pkg);
		const isRunning = running.includes(pkg);
		const statusBg = isRunning ? '#27ae60' : '#23272f';
		const statusIndicator = isRunning ? '🟢 En cours' : '';
		html += `<div style='padding:8px;margin:4px 0;background:${statusBg};border-radius:6px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${isRunning ? '#2ecc71' : '#555'};'>
			<span style='color:#fff;flex:1;'>${pkg}${statusIndicator ? ' ' + statusIndicator : ''}</span>
			<button onclick="toggleFavorite('${device.serial}','${pkg}')" style='background:${isFav ? '#f39c12' : '#555'};color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-weight:bold;margin-right:4px;'>�</button>
			${isRunning ? `<button onclick="stopGame('${device.serial}','${pkg}')" style='background:#e74c3c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;'>�� Stop</button>` : `<button onclick="launchApp('${device.serial}','${pkg}')" style='background:#2ecc71;color:#000;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;margin-right:4px;'>▶� Lancer</button>`}
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
	if (res.ok) {
		showToast('✅ App lancée !', 'success');
		incrementStat('appsLaunched');
		// Add to running apps
		if (!runningApps[serial]) runningApps[serial] = [];
		if (!runningApps[serial].includes(pkg)) {
			runningApps[serial].push(pkg);
		}
		// Notifier le serveur pour persister l'état
		api('/api/apps/running/mark', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ serial, package: pkg, action: 'add' })
		}).catch(() => {});
		// Rafraîchir immédiatement la vue tableau/cartes
		renderDevices();
		// Refresh the apps dialog
		const device = { serial, name: 'Device' };
		showAppsDialog(device);
	}
	else showToast('� Erreur lancement', 'error');
};

// Stop game
window.stopGame = async function(serial, pkg) {
	try {
		showToast('�� Arrêt du jeu...', 'info');
		const previouslyRunning = Array.isArray(runningApps[serial]) && runningApps[serial].includes(pkg);

		// 🔄 Optimistic UI update for immediate feedback
		if (runningApps[serial]) {
			runningApps[serial] = runningApps[serial].filter(p => p !== pkg);
			if (runningApps[serial].length === 0) {
				delete runningApps[serial];
			}
			// Re-render right away so "Jeu en cours" updates without page refresh
			renderDevices();
		}
		
		// Try primary endpoint first
		try {
			const stopRes = await api(`/api/apps/${serial}/stop`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ package: pkg })
			});
			
			console.log('[stopGame] Primary endpoint response:', stopRes);
			
			if (stopRes && stopRes.ok) {
				showToast('✅ Jeu arrêté!', 'success');
				// Aligner l'état serveur
				api('/api/apps/running/mark', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ serial, package: pkg, action: 'remove' })
				}).catch(() => {});
				// Rafraîchir les listes
				renderDevices();
				// Refresh the apps dialog
				const device = { serial, name: 'Device' };
				showAppsDialog(device);
				return;
			}
		} catch (error) {
			console.warn('[stopGame] Primary endpoint error:', error);
		}
		
		// Fallback: Use generic ADB command endpoint
		console.log('[stopGame] Trying fallback via /api/adb/command');
		const fallbackRes = await api('/api/adb/command', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				serial, 
				command: ['shell', 'am', 'force-stop', pkg]
			})
		});
		
		console.log('[stopGame] Fallback response:', fallbackRes);
		
		if (fallbackRes && fallbackRes.ok) {
			showToast('✅ Jeu arrêté!', 'success');
			// Notifier le serveur pour aligner l'état si le fallback a été utilisé
			api('/api/apps/running/mark', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ serial, package: pkg, action: 'remove' })
			}).catch(() => {});
			// Rafraîchir les listes
			renderDevices();
			// Refresh the apps dialog
			const device = { serial, name: 'Device' };
			showAppsDialog(device);
		} else {
			console.warn('[stopGame] Fallback did not confirm stop (peut déjà être arrêté):', fallbackRes);
			if (!previouslyRunning) {
				showToast('ℹ� Jeu déjà arrêté', 'info');
			} else {
				showToast('⚠� Arrêt non confirmé (peut déjà être stoppé)', 'warning');
			}
		}
		
	} catch (error) {
		console.error('[stopGame] Unexpected error:', error);
		showToast('⚠� Erreur lors de l\'arrêt du jeu', 'error');
	}
};

// Pause game (envoie HOME pour quitter proprement vers Oculus Home sans tuer l'app)
window.pauseGame = async function(serial, pkg) {
	try {
		showToast('�� Pause du jeu...', 'info');
		const res = await api('/api/adb/command', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ serial, command: ['shell', 'input', 'keyevent', 'KEYCODE_HOME'] })
		});
		if (res && res.ok) {
			showToast('✅ Jeu mis en pause (Home)', 'success');
		} else {
			showToast('⚠� Impossible de mettre en pause', 'warning');
		}
	} catch (e) {
		console.error('[pauseGame]', e);
		showToast('⚠� Erreur pause', 'error');
	}
};

// Reprendre le jeu (relance l'activité)
window.resumeGame = async function(serial, pkg) {
	showToast('▶� Reprise du jeu...', 'info');
	return launchApp(serial, pkg);
};

window.toggleFavorite = async function(serial, pkg) {
	const meta = getGameMeta(pkg);
	const existing = favorites.find(f => f.packageId === pkg);
	try {
		if (existing) {
			const res = await api('/api/favorites/remove', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: existing.id })
			});
			if (res.ok) {
				showToast('� Retiré des favoris', 'info');
				favorites = favorites.filter(f => f.id !== existing.id);
			}
		} else {
			const res = await api('/api/favorites/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: meta.name || pkg, packageId: pkg, icon: meta.icon })
			});
			if (res.ok) {
				showToast('� Ajouté aux favoris', 'success');
				if (res.favorite) favorites.push(res.favorite);
			}
		}
	} catch (e) {
		console.error('[favorites] toggle', e);
		showToast('� Erreur favoris', 'error');
	}
	// Rafraîchir la liste sans fermer la modal
	const device = { serial, name: 'Device' };
	showAppsDialog(device);
};

window.showFavoritesDialog = async function(device) {
	const res = await api('/api/favorites');
	if (!res.ok) return showToast('� Erreur chargement favoris', 'error');
	const favs = res.favorites || [];
	let html = `<h3 style='color:#2ecc71;'>Favoris pour ${device.name}</h3>`;
	html += `<div style='max-height:400px;overflow-y:auto;'>`;
	if (favs.length === 0) {
		html += `<div style='padding:12px;color:#95a5a6;text-align:center;'>Aucun favori pour ce casque.</div>`;
	} else {
		favs.forEach(fav => {
			const meta = getGameMeta(fav.packageId || fav.name || '');
			const safeName = (meta.name || fav.name || fav.packageId || 'Favori').replace(/"/g, '&quot;');
			html += `<div style='padding:10px;margin:6px 0;background:#23272f;border-radius:8px;display:flex;align-items:center;gap:10px;border-left:4px solid #2ecc71;'>
				<img src="${meta.icon}" alt="${safeName}" style='width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid #2ecc71;' onerror="this.onerror=null;this.src='${DEFAULT_GAME_ICON}'" />
				<div style='flex:1;display:flex;flex-direction:column;gap:4px;'>
					<span style='color:#fff;font-weight:bold;'>${safeName}</span>
					<span style='color:#95a5a6;font-size:11px;'>${fav.packageId || ''}</span>
				</div>
				<div style='display:flex;gap:6px;'>
					<button onclick="launchApp('${device.serial}','${fav.packageId}')" style='background:#e67e22;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:bold;'>� Lancer</button>
					<button onclick="stopGame('${device.serial}','${fav.packageId}')" style='background:#e74c3c;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:bold;'>�� Stop</button>
				</div>
			</div>`;
		});
	}
	html += `</div>`;
	showModal(html);
};

window.showStorageDialog = function(device) {
	try {
		// Afficher le dialog de stockage avec les options d'installation
		// Données de placeholder pour demo (en prod, ces infos viendront du backend)
		const storageHTML = `
			<div style='margin-bottom:20px;'>
				<h3 style='color:#2ecc71;margin-top:0;'>💾 Stockage du casque: ${device.name}</h3>
				
				<div style='background:#2c3e50;padding:16px;border-radius:8px;margin-bottom:16px;'>
					<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;'>
						<div style='background:rgba(46,204,113,0.2);padding:12px;border-radius:6px;border-left:4px solid #2ecc71;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Utilisé</div>
							<div style='font-size:18px;font-weight:bold;color:#2ecc71;'>18.5 GB</div>
						</div>
						<div style='background:rgba(52,152,219,0.2);padding:12px;border-radius:6px;border-left:4px solid #3498db;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Libre</div>
							<div style='font-size:18px;font-weight:bold;color:#3498db;'>46.5 GB</div>
						</div>
						<div style='background:rgba(155,89,182,0.2);padding:12px;border-radius:6px;border-left:4px solid #9b59b6;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Total</div>
							<div style='font-size:18px;font-weight:bold;color:#9b59b6;'>64 GB</div>
						</div>
					</div>
					
					<div style='margin-top:16px;'>
						<div style='font-size:12px;margin-bottom:6px;'>Utilisation: <strong>28.9%</strong></div>
						<div style='background:#1a1d24;border-radius:4px;height:24px;overflow:hidden;border:1px solid #34495e;'>
							<div style='background:linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);height:100%;width:28.9%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:bold;'>
								28.9%
							</div>
						</div>
					</div>
				</div>
				
				<div style='background:#2c3e50;padding:16px;border-radius:8px;margin-bottom:16px;border-left:4px solid #e74c3c;'>
					<h4 style='margin-top:0;margin-bottom:12px;color:#fff;'>📦 Installer des jeux développeur</h4>
					<p style='margin:0 0 12px 0;font-size:12px;color:#ecf0f1;'>Téléchargez et installez des APK directement sur votre casque Meta Quest depuis votre PC.</p>
					<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;'>
						<button onclick='uploadDevGameToHeadset("${device.serial}", "${device.name}")' style='background:#9b59b6;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;transition:all 0.2s;'>
							📤 Uploader APK
						</button>
						<button onclick='installDevGameOnHeadset("${device.serial}", "${device.name}")' style='background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;transition:all 0.2s;'>
							⚙� Installer APK
						</button>
					</div>
					<div style='font-size:12px;color:#ecf0f1;background:#1a1d24;padding:12px;border-radius:6px;'>
						<strong>📋 Étapes:</strong>
						<ol style='margin:8px 0;padding-left:20px;'>
							<li>Cliquez sur "Uploader APK"</li>
							<li>Sélectionnez un fichier APK depuis votre PC</li>
							<li>Attendez le transfert</li>
							<li>Cliquez sur "Installer APK"</li>
							<li>L'application apparaîtra dans votre bibliothèque</li>
						</ol>
					</div>
				</div>
			</div>
		`;
		
		showModal(storageHTML);
		
	} catch (error) {
		console.error('[storage dialog]', error);
		showToast('� Erreur lors de l\'accès au stockage', 'error');
	}
};

window.uploadDevGameToHeadset = async function(serial, deviceName) {
	// Créer un input file
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.apk';
	input.onchange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		
		const formData = new FormData();
		formData.append('serial', serial);
		formData.append('apk', file);
		
		try {
			showToast('📤 Envoi du fichier en cours...', 'info');
			const res = await fetch('/api/upload-dev-game', {
				method: 'POST',
				body: formData
			});
			
			const data = await res.json();
			if (data.ok) {
				showToast(`✅ APK envoyé avec succès: ${file.name}`, 'success');
				setTimeout(() => showStorageDialog({ serial, name: deviceName }), 1000);
			} else {
				showToast(`� ${data.error || 'Erreur lors de l\'envoi'}`, 'error');
			}
		} catch (error) {
			console.error('[upload dev game]', error);
			showToast('� Erreur lors de l\'envoi du fichier', 'error');
		}
	};
	input.click();
};

window.installDevGameOnHeadset = async function(serial, deviceName) {
	try {
		showToast('⚙� Installation en cours...', 'info');
		const res = await api('/api/install-dev-game', { serial });
		
		if (!res || !res.ok) {
			showToast(`� ${res?.error || 'Erreur lors de l\'installation'}`, 'error');
			return;
		}
		
		showToast(`✅ APK installé avec succès sur ${deviceName}`, 'success');
		setTimeout(() => showStorageDialog({ serial, name: deviceName }), 1500);
		
	} catch (error) {
		console.error('[install dev game]', error);
		showToast('� Erreur lors de l\'installation', 'error');
	}
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
		<br><button onclick="closeModal()" style='background:#e74c3c;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:12px;'>� Fermer</button>
	</div>`;
	modal.style.display = 'flex';
}
// Expose showModal globally for onclick handlers
window.showModal = showModal;

window.closeModal = function() {
	const modal = document.getElementById('modal');
	if (modal) modal.style.display = 'none';
};

function showSetupNotice() {
	const noticeHTML = `
		<h2 style='margin-top:0;color:#f1c40f;'>🛈 Notice d'initialisation</h2>
		<p>Avant de lancer le Dashboard PRO, placez toujours le dossier <strong>platform-tools</strong> dans votre variable <strong>PATH</strong>. Si l'appareil sur lequel l'application est installée a déplacé ou extrait les fichiers ailleurs, cette notice explique pourquoi les casques peuvent rester invisibles même après la première installation.</p>
		<h3 style='color:#2ecc71;'>1. Ajouter platform-tools au PATH</h3>
		<ol style='padding-left:16px;line-height:1.6;'>
			<li>Ouvrez l'Explorateur et localisez le dossier <code>platform-tools</code> (il se trouve dans le répertoire d'installation de VHR Dashboard, par exemple <code>C:\\Program Files\\VHR Dashboard\\platform-tools</code>).</li>
			<li>Copiez le chemin complet du dossier (clic droit → « Copier l'adresse en tant que texte »).</li>
			<li>Ouvrez le Panneau de configuration → Système → Paramètres système avancés → Variables d'environnement.</li>
			<li>Dans la variable <strong>PATH</strong>, ajoutez ce dossier. Séparez les entrées par un point-virgule (;) et validez.</li>
			<li>Fermez puis rouvrez PowerShell ou l'invite de commande avant de relancer le dashboard.</li>
		</ol>
		<div style='margin-top:16px;padding:14px;background:#111b23;border:1px solid #3498db;border-radius:8px;'>
			<strong>Pourquoi cette notice ?</strong>
			<p style='margin:6px 0 0;'>Les systèmes Windows peuvent modifier l'emplacement des fichiers lors d'un redémarrage ou d'une copie automatique depuis l'appareil. Si les casques ne sont pas détectés, cela vient souvent du fait que la liaison <code>adb</code> pointe vers un <code>platform-tools</code> qui n'y est plus. Ce rappel vous aide à vérifier ou mettre à jour le chemin sans perdre de temps.</p>
		</div>
		<div style='margin-top:16px;padding:14px;background:#171f2a;border:1px solid #f39c12;border-radius:8px;'>
			<strong>Voix & Streaming</strong>
			<p style='margin:6px 0 0;'>Le premier clic sur les fonctions voix ou streaming peut parfois rester bloqué. Si le flux n'apparaît pas immédiatement, relancez la même fonction une seconde fois : cela réinitialise la chaîne audio/vidéo côté casque et permet de déclencher le streaming.</p>
		</div>
		<p style='margin-top:18px;font-size:13px;color:#95a5a6;'>Cette notice est disponible à tout moment depuis la barre d'outils. En cas de doutes sur la détection des casques, revérifiez le PATH et relancez la fonction voix/streaming.</p>
	`;
	showModal(noticeHTML);
}

// ========== SOCKET.IO EVENTS ========== 
socket.on('devices-update', (data) => {
	console.log('[socket] devices-update received:', data);
	if (Array.isArray(data)) {
		devices = data;
		renderDevices();
	} else {
		console.warn('[socket] Invalid devices data received:', data);
	}
});

socket.on('games-update', (data) => {
	if (Array.isArray(data)) {
		games = data;
		updateGameMetaFromList(data);
		renderDevices();
	} else {
		games = [];
	}
});

socket.on('favorites-update', (data) => {
	favorites = data;
});

socket.on('stream-event', (evt) => {
	if (evt.type === 'start') showToast('🟢 Stream démarré', 'success');
	if (evt.type === 'stop') showToast('�� Stream arrêté', 'info');
});

// ========== LICENSE CHECK & UNLOCK SYSTEM ========== 
const BILLING_PAGE_URL = 'https://www.vhr-dashboard-site.com/pricing.html#checkout';

function goToOfficialBillingPage() {
	try {
		window.location.href = BILLING_PAGE_URL;
	} catch (e) {
		// fallback new tab if navigation blocked
		window.open(BILLING_PAGE_URL, '_blank');
	}
}

window.openOfficialBillingPage = function() {
	goToOfficialBillingPage();
	const modal = document.getElementById('unlockModal');
	if (modal) modal.remove();
};

function applyDemoStatusSnapshot(demoStatus) {
	if (!demoStatus) return;
	licenseStatus.demo = demoStatus;
	licenseStatus.subscriptionStatus = demoStatus.subscriptionStatus || 'unknown';
	licenseStatus.hasPerpetualLicense = Boolean(demoStatus.hasPerpetualLicense);
	licenseStatus.licenseCount = demoStatus.licenseCount || 0;
	licenseStatus.accessBlocked = Boolean(demoStatus.accessBlocked);
	licenseStatus.trial = !demoStatus.demoExpired;
	licenseStatus.expired = Boolean(demoStatus.demoExpired);
	licenseStatus.licensed = Boolean(demoStatus.hasValidSubscription || demoStatus.hasPerpetualLicense || !demoStatus.demoExpired || demoStatus.subscriptionStatus === 'admin');
	if (typeof demoStatus.message === 'string') {
		licenseStatus.message = demoStatus.message;
	}
}

async function checkLicense() {
	try {
		// Admin = accès illimité (bypass paywall/licence)
		// Exigence : vhr avec mot de passe doit être toujours connecté en illimité,
		// même si le JWT n'est pas présent/valide côté client (ex: cookie expiré).
		const uname = (currentUser || '').toLowerCase();
		if (uname === 'vhr') {
			licenseStatus.licensed = true;
			licenseStatus.expired = false;
			showTrialBanner(0);
			return true;
		}

		// Check demo/trial status with Stripe subscription verification
		let storedToken = readAuthToken();
		if (!storedToken) {
			storedToken = await syncTokenFromCookie();
		}
		const authCheck = await api('/api/check-auth?includeToken=1', { skipAuthHeader: true });
		if (authCheck && authCheck.ok && authCheck.authenticated) {
			if (authCheck.token) {
				storedToken = authCheck.token;
			} else if (!storedToken) {
				storedToken = readAuthToken();
			}
		} else {
			saveAuthToken('');
			console.warn('[license] skipped demo check: not authenticated locally');
			return false;
		}
		if (!storedToken) {
			console.warn('[license] skipped demo check: no auth token');
			return false;
		}
		const demoUrl = `/api/demo/status?token=${encodeURIComponent(storedToken)}`;
		const res = await api(demoUrl, { skipAuthHeader: true });
		
		if (!res || !res.ok) {
			console.error('[license] demo status check failed');
			// Bloquer l'accès par défaut si la vérification échoue (éviter l'accès sans abo)
			showUnlockModal({ expired: true, accessBlocked: true, subscriptionStatus: res?.demo?.subscriptionStatus || 'unknown' });
			return false;
		}

		if (res.code === 'account_deleted') {
			showToast('� Ce compte a été supprimé ou désactivé', 'error');
			saveAuthToken('');
			showAuthModal('login');
			return false;
		}
		
		const demoStatus = res.demo;
		console.log('[license] Demo status:', demoStatus);
		applyDemoStatusSnapshot(demoStatus);
		
		// Demo is still valid - show banner with remaining days
		if (!demoStatus.demoExpired) {
			showTrialBanner(demoStatus.remainingDays);
			return true; // Allow access
		}
		
		// Demo is expired - check if user has valid subscription
		if (demoStatus.accessBlocked) {
			// No valid subscription after demo expiration
			console.warn('[license] Access blocked: demo expired + no subscription');
			showUnlockModal({
				expired: true,
				accessBlocked: true,
				subscriptionStatus: demoStatus.subscriptionStatus,
				hasActiveLicense: demoStatus.hasActiveLicense
			});
			return false; // BLOCK ACCESS
		} else {
			// Has valid Stripe subscription
			console.log('[license] Access granted: user has active subscription');
			showTrialBanner(0); // Show banner indicating active subscription
			return true; // Allow access
		}
	} catch (e) {
		console.error('[license] check failed:', e);
		showUnlockModal({ expired: true, accessBlocked: true, subscriptionStatus: 'unknown' });
		return false; // Fail closed to prevent accès sans licence
	}
}

function showTrialBanner(daysRemaining) {
	let banner = document.getElementById('trialBanner');
	if (banner) return;
	
	banner = document.createElement('div');
	banner.id = 'trialBanner';
	
	let bannerText = '';
	let bgColor = 'linear-gradient(135deg, #f39c12, #e67e22)'; // Orange for trial
	
	if (daysRemaining > 0) {
		// Trial in progress
		bannerText = `�� Essai gratuit - <b>${daysRemaining} jour(s)</b> restant(s)`;
	} else {
		// Active subscription
		bgColor = 'linear-gradient(135deg, #2ecc71, #27ae60)'; // Green for active
		bannerText = `✅ Abonnement actif`;
	}
	
	banner.style = `position:fixed;top:56px;left:0;width:100vw;background:${bgColor};color:#fff;padding:10px 20px;text-align:center;z-index:1050;font-weight:bold;box-shadow:0 2px 8px #000;`;
	banner.innerHTML = `
		${bannerText}
		${daysRemaining > 0 ? `<button onclick="openOfficialBillingPage()" style="margin-left:20px;background:#2ecc71;color:#000;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			🚀 Débloquer maintenant
		</button>` : ''}
	`;
	document.body.appendChild(banner);
	document.body.style.paddingTop = '106px'; // 56 navbar + 50 banner
	
	// Add margin-top to deviceGrid to prevent overlap with headers
	const deviceGrid = document.getElementById('deviceGrid');
	if (deviceGrid) {
		deviceGrid.style.marginTop = '20px';
	}
}

function buildAccessSummaryHtml(status = {}) {
	const detail = status.demo || status;
	const demoLabel = detail.demoExpired
		? 'Expiré'
		: Number.isFinite(detail.remainingDays) ? `${detail.remainingDays} jour(s)` : 'N/A';
	const subscriptionLabel = detail.subscriptionStatus || 'aucun';
	const licenseLabel = detail.hasPerpetualLicense
		? `Oui${detail.licenseCount > 1 ? ` (${detail.licenseCount})` : ''}`
		: 'Non';
	return `
		<div style="display:flex;flex-direction:column;gap:6px;color:#ecf0f3;">
			<div style="display:flex;justify-content:space-between;">
				<span>🎯 Essai</span>
				<strong>${demoLabel}</strong>
			</div>
			<div style="display:flex;justify-content:space-between;">
				<span>📅 Abonnement</span>
				<strong>${subscriptionLabel}</strong>
			</div>
			<div style="display:flex;justify-content:space-between;">
				<span>🛡� Licence</span>
				<strong>${licenseLabel}</strong>
			</div>
		</div>
	`;
}

function getAccessStatusBadge(detail = {}) {
	if (detail.accessBlocked) {
		return '<span style="color:#e74c3c;font-weight:600;">🔒 Bloqué</span>';
	}
	return '<span style="color:#2ecc71;font-weight:600;">✅ Actif</span>';
}

window.showUnlockModal = function(status = licenseStatus) {
	let modal = document.getElementById('unlockModal');
	if (modal) modal.remove();
	
	modal = document.createElement('div');
	modal.id = 'unlockModal';
	modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:2000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
	
	// Determine the message based on status
	let headerMessage = '<h2 style="color:#e74c3c;">⚠� Accès refusé</h2>';
	let bodyMessage = '<p style="color:#95a5a6;">Votre période d\'essai a expiré.<br>Pour continuer à utiliser VHR Dashboard, choisissez une option ci-dessous :</p>';
	
	if (status.expired || status.accessBlocked) {
		headerMessage = '<h2 style="color:#e74c3c;">⚠� Essai expiré - Abonnement requis</h2>';
		bodyMessage = '<p style="color:#95a5a6;">Votre accès à VHR Dashboard a expiré car votre période d\'essai est terminée et aucun abonnement n\'est actif.<br><br>Choisissez une option ci-dessous pour continuer :</p>';
	}
	const summaryHtml = buildAccessSummaryHtml(status);
	
	modal.innerHTML = `
		<div style="background:linear-gradient(135deg, #1a1d24, #2c3e50);max-width:700px;width:90%;border-radius:16px;padding:40px;color:#fff;box-shadow:0 8px 32px #000;">
			${headerMessage}
			${bodyMessage}
			${summaryHtml}
			
			<!-- Option 1: Abonnement mensuel -->
			<div style="background:#2c3e50;padding:24px;border-radius:12px;margin:20px 0;border:2px solid #3498db;">
				<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
					<h3 style="color:#3498db;margin:0;">💳 Abonnement Mensuel</h3>
					<span style="font-size:28px;font-weight:bold;color:#2ecc71;">29€<span style="font-size:14px;color:#95a5a6;">/mois TTC</span></span>
				</div>
				<ul style="color:#ecf0f1;line-height:1.8;margin:12px 0;">
					<li>✅ Toutes les fonctionnalités</li>
					<li>✅ Mises à jour automatiques</li>
					<li>✅ Support prioritaire</li>
					<li>✅ Annulation à tout moment</li>
				</ul>
				<button onclick="openOfficialBillingPage()" style="width:100%;background:#3498db;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">
					📱 S'abonner maintenant
				</button>
			</div>
			
			<!-- Option 2: Achat définitif -->
			<div style="background:#2c3e50;padding:24px;border-radius:12px;margin:20px 0;border:2px solid #2ecc71;">
				<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
					<h3 style="color:#2ecc71;margin:0;">🎯 Licence à Vie</h3>
					<span style="font-size:28px;font-weight:bold;color:#2ecc71;">499€<span style="font-size:14px;color:#95a5a6;">/unique TTC</span></span>
				</div>
				<ul style="color:#ecf0f1;line-height:1.8;margin:12px 0;">
					<li>✅ Licence perpétuelle (à vie)</li>
					<li>✅ Aucun paiement récurrent</li>
					<li>✅ Clé de licence par email</li>
					<li>✅ Fonctionne hors ligne</li>
				</ul>
				<button onclick="openOfficialBillingPage()" style="width:100%;background:#2ecc71;color:#000;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">
					� Acheter maintenant
				</button>
			</div>
			
			<!-- Option 3: Activer licence existante -->
			<div style="background:#34495e;padding:20px;border-radius:12px;margin:20px 0;">
				<h3 style="color:#9b59b6;margin-bottom:12px;">🔑 Vous avez déjà une licence ?</h3>
				<input type="text" id="licenseKeyInput" placeholder="VHR-XXXX-XXXX-XXXX-XXXX" 
					style="width:100%;background:#2c3e50;color:#fff;border:2px solid #9b59b6;padding:12px;border-radius:8px;margin-bottom:12px;font-size:14px;letter-spacing:2px;text-transform:uppercase;" />
				<button onclick="activateLicense()" style="width:100%;background:#9b59b6;color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:bold;">
					✅ Activer ma licence
				</button>
			</div>
			
			${status.expired || status.accessBlocked ? '' : `<button onclick="closeUnlockModal()" style="width:100%;background:#7f8c8d;color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;margin-top:12px;">� Fermer</button>`}
		</div>
	`;
	
	document.body.appendChild(modal);
};

window.closeUnlockModal = function() {
	const modal = document.getElementById('unlockModal');
	if (modal) modal.remove();
};

window.subscribePro = function() {
	openOfficialBillingPage();
};

window.purchasePro = function() {
	openOfficialBillingPage();
};

window.activateLicense = async function() {
	const input = document.getElementById('licenseKeyInput');
	const key = input.value.trim().toUpperCase();
	
	if (!key || !key.startsWith('VHR-')) {
		showToast('� Clé de licence invalide', 'error');
		return;
	}
	
	try {
		const res = await api('/api/license/activate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ licenseKey: key })
		});
		
		if (res.ok) {
			licenseKey = key;
			localStorage.setItem('vhr_license_key', key);
			licenseStatus.licensed = true;
			licenseStatus.expired = false;
			
			showToast('✅ Licence activée avec succès !', 'success');
			closeUnlockModal();
			
			// Remove trial banner if exists
			const banner = document.getElementById('trialBanner');
			if (banner) {
				banner.remove();
				document.body.style.paddingTop = '56px';
			}
		} else {
			showToast('� ' + (res.error || 'Clé invalide'), 'error');
		}
	} catch (e) {
		console.error('[license] activate error:', e);
		showToast('� Erreur lors de l\'activation', 'error');
	}
};

// ========== MANDATORY AUTHENTICATION ========== 
window.showAuthModal = function(mode = 'login') {
	let modal = document.getElementById('authModal');
	if (modal) modal.remove();
	const overlay = document.getElementById('authOverlay');
	if (overlay) {
		overlay.style.display = 'none';
	}

	modal = document.createElement('div');
	modal.id = 'authModal';
	modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:3000;display:flex;align-items:center;justify-content:center;';

	modal.innerHTML = `
		<div style="background:linear-gradient(135deg, #1a1d24, #2c3e50);max-width:500px;width:90%;border-radius:16px;padding:40px;color:#fff;box-shadow:0 8px 32px #000;">
			<div style="text-align:center;margin-bottom:32px;">
				<h2 style="color:#2ecc71;margin:0;font-size:32px;">🥽 VHR Dashboard</h2>
				<p style="color:#95a5a6;margin:0;font-size:14px;">Authentification obligatoire pour commencer</p>
			</div>

			<div style="margin-bottom:16px;">
				<label style="color:#95a5a6;font-size:12px;display:block;margin-bottom:6px;">Email ou nom d'utilisateur</label>
				<input type="text" id="loginIdentifier" placeholder="email ou utilisateur" style="width:100%;background:#2c3e50;color:#fff;border:2px solid #34495e;padding:12px;border-radius:8px;font-size:14px;box-sizing:border-box;" />
			</div>
			<div style="margin-bottom:20px;">
				<label style="color:#95a5a6;font-size:12px;display:block;margin-bottom:6px;">Mot de passe</label>
				<div style="display:flex;gap:8px;align-items:center;">
					<input type="password" id="loginPassword" placeholder="••••••••" style="flex:1;background:#2c3e50;color:#fff;border:2px solid #34495e;padding:12px;border-radius:8px;font-size:14px;box-sizing:border-box;" />
					<button type="button" onclick="toggleDashboardPassword('loginPassword')" style="background:none;border:none;cursor:pointer;font-size:18px;padding:8px;color:#fff;" title="Afficher/masquer">��</button>
				</div>
			</div>
			<button onclick="loginUser()" style="width:100%;background:#2ecc71;color:#000;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">
				� Se connecter
			</button>
			<p style="margin-top:16px;text-align:center;color:#95a5a6;font-size:12px;line-height:1.6;">
				Les comptes sont fournis via le <a href="https://www.vhr-dashboard-site.com/account.html" target="_blank" rel="noreferrer" style="color:#2ecc71;font-weight:bold;">site central</a>.
				Si vous n'avez pas encore reçu d'accès, contactez votre administrateur ou visitez la page du compte.
			</p>
		</div>
	`;

	document.body.appendChild(modal);
};

window.loginUser = async function() {
	const identifierInput = document.getElementById('loginIdentifier') || document.getElementById('loginUserName');
	const passwordInput = document.getElementById('loginPassword') || document.getElementById('loginUserPass');
	if (!identifierInput || !passwordInput) {
		showToast('� Impossible de trouver les champs de connexion', 'error');
		return;
	}
	const identifier = identifierInput.value.trim();
	const password = passwordInput.value;
	
	if (!identifier || !password) {
		showToast('� Identifiant et mot de passe requis', 'error');
		return;
	}
	
	showToast('🔄 Connexion en cours...', 'info');
	
	try {
		let res, data;
		// 1) Auth prod par username
		res = await fetch(`${AUTH_API_BASE}/api/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ username: identifier, password })
		});
		data = await res.json();

		// 2) Fallback prod par email
		if (!(res.ok && data.ok)) {
			res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: identifier, password })
			});
			data = await res.json();
		}

		// 3) Si prod OK, synchroniser vers backend local + cookie local
		if (res.ok && data.ok) {
			const syncedUsername = data.user?.username || data.user?.name || identifier;
			const syncedEmail = data.user?.email || identifier;
			try {
				const syncSecret = await getSyncUsersSecret();
				await fetch('/api/admin/sync-user', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-sync-secret': syncSecret
					},
					body: JSON.stringify({ username: syncedUsername, email: syncedEmail, role: 'user', password })
				});
			} catch (syncErr) {
				console.warn('[loginUser] sync-user failed', syncErr);
			}

			// Obtenir un token local pour les requêtes HTTP/localhost
			let localTokenApplied = false;
			if (isLocalAuthContext) {
				try {
					const remoteRes = await fetch('/api/remote-login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ identifier: syncedUsername, password })
					});
					const remoteData = await remoteRes.json().catch(() => null);
					if (remoteRes.ok && remoteData && remoteData.ok && remoteData.token) {
						res = remoteRes;
						data = remoteData;
						localTokenApplied = true;
					}
				} catch (remoteLoginErr) {
					console.warn('[loginUser] remote-login after sync failed', remoteLoginErr);
				}
			}
			if (!localTokenApplied) {
				try {
					const localRes = await fetch('/api/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ username: syncedUsername, password })
					});
					const localData = await localRes.json();
					if (localRes.ok && localData.ok && localData.token) {
						data.token = localData.token;
					}
				} catch (localLoginErr) {
					console.warn('[loginUser] local login after sync failed', localLoginErr);
				}
			}
		}

		// 4) Fallback local si prod échoue
		if (!(res.ok && data.ok)) {
			try {
				// Créer/synchroniser l'utilisateur en local avec le secret partagé
				await fetch('/api/admin/sync-user', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-sync-secret': await getSyncUsersSecret()
					},
					body: JSON.stringify({ username: identifier, email: identifier, role: 'user', password })
				});
			} catch (syncErr) {
				console.warn('[loginUser] sync-user after prod failure failed', syncErr);
			}

			try {
				const localRes = await fetch('/api/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ username: identifier, password })
				});
				const localData = await localRes.json();
				if (localRes.ok && localData.ok) {
					res = localRes;
					data = localData;
				}
			} catch (localErr) {
				console.warn('[loginUser] local login fallback failed', localErr);
			}
		}
		// 4b) Fallback distant via le serveur local si tout échoue
		if (!(res.ok && data.ok)) {
			try {
				const remoteRes = await fetch('/api/remote-login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ identifier, password })
				});
				const remoteData = await remoteRes.json().catch(() => null);
					if (remoteRes.ok && remoteData && remoteData.ok) {
						res = remoteRes;
						data = remoteData;
					} else if (remoteData && remoteData.error) {
						showToast('Erreur distante : ' + remoteData.error, 'error');
					}
			} catch (remoteErr) {
				console.warn('[loginUser] remote login failed', remoteErr);
			}
		}
		
		if (res.ok && data.ok) {
			if (data.token) {
				saveAuthToken(data.token);
			}
			showToast('✅ Connecté avec succès !', 'success');
			currentUser = data.user?.name || data.user?.username || data.user?.email || identifier;
			localStorage.setItem('vhr_current_user', currentUser);
			if (data.demo) {
				applyDemoStatusSnapshot(data.demo);
			}
			
			const modal = document.getElementById('authModal');
			if (modal) modal.remove();
			
			setTimeout(async () => {
				showDashboardContent();
				createNavbar();
				const authOk = await checkJWTAuth();
				if (!authOk) return;
				checkLicense().then(hasAccess => {
					if (hasAccess) {
						loadGamesCatalog().finally(() => loadDevices());
					}
				});
			}, 200);
		} else {
			if (data && data.code === 'account_deleted') {
				showToast('� Ce compte a été supprimé ou désactivé', 'error');
				saveAuthToken('');
				showAuthModal('login');
				return;
			}
			if (data && data.code === 'demo_expired') {
				showUnlockModal({
					expired: true,
					accessBlocked: true,
					subscriptionStatus: data.demo?.subscriptionStatus,
					hasActiveLicense: data.demo?.hasActiveLicense
				});
				return;
			}
			showToast('� ' + (data?.error || 'Connexion échouée'), 'error');
		}
	} catch (e) {
		console.error('[auth] login error:', e);
		showToast('� Erreur de connexion', 'error');
	}
};

function createInstallationOverlay() {
	if (installationOverlayElement) return installationOverlayElement;
	const overlay = document.createElement('div');
	overlay.id = 'installationVerificationOverlay';
	overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:9999;backdrop-filter:blur(6px);';
	overlay.innerHTML = `
		<div style='max-width:520px;width:90%;background:#0b0f15;border:2px solid #2ecc71;border-radius:18px;padding:32px;color:#fff;box-shadow:0 18px 45px rgba(0,0,0,0.75);text-align:center;'>
			<div class='installation-title' style='font-size:24px;font-weight:700;margin-bottom:14px;color:#2ecc71;'>Vérification de l'installation...</div>
			<p class='installation-detail' style='margin:0;font-size:16px;color:#c8d3e3;line-height:1.5;'>Merci de patienter pendant que l'installation est validée.</p>
			<div style='margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;'>
				<button id='installationRetryBtn' style='border:none;border-radius:10px;padding:12px 24px;background:#2ecc71;color:#000;font-weight:700;cursor:pointer;font-size:14px;'>🔄 Réessayer</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	const retryBtn = overlay.querySelector('#installationRetryBtn');
	if (retryBtn) {
		retryBtn.onclick = () => initDashboardPro();
	}
	installationOverlayElement = overlay;
	return overlay;
}

function showInstallationOverlay(title, detail) {
	const overlay = createInstallationOverlay();
	const titleEl = overlay.querySelector('.installation-title');
	const detailEl = overlay.querySelector('.installation-detail');
	if (titleEl) titleEl.textContent = title;
	if (detailEl) detailEl.textContent = detail;
	overlay.style.display = 'flex';
}

function hideInstallationOverlay() {
	if (installationOverlayElement) {
		installationOverlayElement.style.display = 'none';
	}
}

async function ensureInstallationVerified() {
	try {
		const res = await api('/api/installation/status', { timeout: 10000 });
		if (res && res.ok && res.installation && res.installation.installationId) {
			console.log('[installation] Verified installation id', res.installation.installationId);
			hideInstallationOverlay();
			return true;
		}
		const detail = res?.error || "La réponse ne contient pas l'identifiant attendu.";
		showInstallationOverlay("Vérification de l'installation impossible", detail);
	} catch (err) {
		console.error('[installation] verification failed', err);
		showInstallationOverlay('Impossible de contacter le serveur', err?.message || 'Erreur réseau inconnue');
	}
	return false;
}

// ========== CHECK JWT ON LOAD ========== 
async function checkJWTAuth() {
	console.log('[auth] Checking JWT authentication...');
	try {
		const res = await api('/api/check-auth', { skipAuthHeader: true });
		console.log('[auth] API response:', res);
		
		if (res && res.ok && res.authenticated && res.user) {
			const username = (res.user.username || '').toLowerCase();
			if (username === DEMO_GUEST_USERNAME) {
				console.warn('[auth] Demo guest tokens blocked');
				await revokeGuestSession();
				const overlay = document.getElementById('authOverlay');
				if (overlay) overlay.style.display = 'none';
				showAuthModal('login');
				return false;
			}
			if (res.token) {
				saveAuthToken(res.token);
			}
			if (!readAuthToken()) {
				await syncTokenFromCookie();
			}
			// User is authenticated
			currentUser = res.user.username || res.user.name || res.user.email;
			localStorage.setItem('vhr_current_user', currentUser);
			console.log('[auth] ✓ JWT valid for user:', currentUser);
			return true;
		} else {
			console.log('[auth] � No valid JWT - authenticated =', res?.authenticated);
			saveAuthToken('');
			console.log('[auth] Attempting guest demo activation...');
			const guestActivated = await activateGuestDemo();
			if (guestActivated) {
				console.log('[auth] Guest demo activated, proceeding');
				return true;
			}
			console.log('[auth] Guest demo activation failed, showing auth modal');
			// Hide the loading overlay immediately
			const overlay = document.getElementById('authOverlay');
			if (overlay) {
				overlay.style.display = 'none';
			}
			// Show auth modal
			showAuthModal('login');
			return false;
		}
	} catch (e) {
		console.error('[auth] JWT check error:', e);
		console.log('[auth] � Showing login modal due to exception');
		
		// Hide the loading overlay immediately
		const overlay = document.getElementById('authOverlay');
		if (overlay) {
			overlay.style.display = 'none';
		}
		
		showAuthModal('login');
		return false;
	}
}

async function revokeGuestSession() {
	try {
		await api('/api/logout', { method: 'POST' });
	} catch (err) {
		console.warn('[auth] Guest logout failed', err);
	}
	saveAuthToken('');
	showToast('� Le mode invité a été bloqué. Connectez-vous avec votre compte.', 'warning');
}

async function activateGuestDemo() {
	if (!ENABLE_GUEST_DEMO) {
		console.log('[guest] activation skipped - guest demo disabled for this build');
		return false;
	}
	try {
		const res = await api('/api/demo/activate-guest', { method: 'POST' });
		if (res && res.ok && res.user) {
			if (res.token) {
				saveAuthToken(res.token);
			}
			currentUser = res.user.username || res.user.name || res.user.email;
			localStorage.setItem('vhr_current_user', currentUser);
			showToast('✅ Essai invité activé pour 7 jours', 'success');
			return true;
		}
		console.warn('[guest] activation response invalid', res);
	} catch (e) {
		console.error('[guest] activation error:', e);
	}
	return false;
}


// ========== INIT ========== 
console.log('[Dashboard PRO] Init');

// Function to show dashboard content
function showDashboardContent() {
	const overlay = document.getElementById('authOverlay');
	if (overlay) {
		overlay.style.display = 'none';
	}
	const deviceGrid = document.getElementById('deviceGrid');
	if (deviceGrid) {
		deviceGrid.style.opacity = '1';
		deviceGrid.style.pointerEvents = 'auto';
	}
}

// Function to hide dashboard content (for auth)
function hideDashboardContent() {
	// Simply hide the overlay - the auth modal will appear on top
	const overlay = document.getElementById('authOverlay');
	if (overlay) {
		overlay.style.display = 'none';
	}
	const deviceGrid = document.getElementById('deviceGrid');
	if (deviceGrid) {
		deviceGrid.style.opacity = '0';
		deviceGrid.style.pointerEvents = 'none';
	}
}

// Check JWT authentication FIRST - this will show auth modal if needed
async function initDashboardPro() {
	const verified = await ensureInstallationVerified();
	if (!verified) {
		hideDashboardContent();
		return;
	}
	const isAuth = await checkJWTAuth();
	if (isAuth) {
		showDashboardContent();
		createNavbar();
		checkLicense().then(hasAccess => {
			if (hasAccess) {
				loadGamesCatalog().finally(() => loadDevices());
			}
		});
	} else {
		hideDashboardContent();
	}
}

initDashboardPro();

