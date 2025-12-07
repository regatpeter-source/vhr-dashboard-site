// VHR DASHBOARD PRO - Version complète avec fond noir et vue tableau
// Date: 2025-12-03

// ========== CONFIGURATION ========== 
let viewMode = localStorage.getItem('vhr_view_mode') || 'table'; // 'table' ou 'cards'
let currentUser = localStorage.getItem('vhr_user') || '';
let userList = JSON.parse(localStorage.getItem('vhr_user_list') || '[]');
let userRoles = JSON.parse(localStorage.getItem('vhr_user_roles') || '{}');
let licenseKey = localStorage.getItem('vhr_license_key') || '';
let licenseStatus = { licensed: false, trial: false, expired: false };

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
		<button id="favoritesBtn" style="margin-right:15px;background:#f39c12;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			⭐ Ajouter aux favoris
		</button>
		<button id="accountBtn" style="margin-right:15px;background:#3498db;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			👤 Mon Compte
		</button>
		<div id='navbarUser' style='margin-right:24px;display:flex;gap:12px;align-items:center;'></div>
	`;
	document.body.appendChild(nav);
	document.body.style.paddingTop = '56px';
	
	document.getElementById('toggleViewBtn').onclick = toggleView;
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
		showToast('⭐ Appuyez sur Ctrl+D pour ajouter aux favoris', 'info', 4000);
	}
};

// ========== MON COMPTE PANEL ========== 
function showAccountPanel() {
	let panel = document.getElementById('accountPanel');
	if (panel) panel.remove();
	
	// Récupérer les stats utilisateur
	const userStats = getUserStats();
	const userPrefs = getUserPreferences();
	const role = userRoles[currentUser] || 'user';
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
					⚙️ Paramètres
				</button>
			</div>
			
			<!-- Content -->
			<div id='accountContent' style='padding:24px;'>
				${getProfileContent(userStats, role)}
			</div>
		</div>
	`;
	
	document.body.appendChild(panel);
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
				
				<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>🔐 Sécurité</h3>
				<div style='background:#23272f;padding:18px;border-radius:8px;'>
					<button onclick='exportUserData()' style='width:100%;background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:10px;'>
						📥 Exporter mes données
					</button>
					<button onclick='confirmDeleteAccount()' style='width:100%;background:#e74c3c;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;'>
						🗑️ Supprimer mon compte
					</button>
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
		
		<h3 style='color:#2ecc71;margin:24px 0 16px 0;font-size:20px;'>🏆 Accomplissements</h3>
		<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;'>
			${stats.totalSessions >= 10 ? `
				<div style='background:#23272f;padding:16px;border-radius:8px;border:2px solid #f39c12;text-align:center;'>
					<div style='font-size:40px;'>🏅</div>
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
	
	return `
		<div style='max-width:700px;margin:0 auto;'>
			<h3 style='color:#2ecc71;margin-bottom:16px;font-size:20px;'>💳 Abonnement & Facturation</h3>
			<div style='background:#23272f;padding:20px;border-radius:12px;margin-bottom:24px;border-left:4px solid #3498db;'>
				<div style='margin-bottom:16px;'>
					<label style='color:#95a5a6;font-size:12px;text-transform:uppercase;letter-spacing:1px;'>Statut</label>
					<div style='color:#fff;font-size:16px;font-weight:bold;margin-top:4px;'>
						<span style='color:#2ecc71;'>✓ Plan Actif</span>
						<span style='color:#95a5a6;margin-left:12px;font-size:13px;'>(29€/mois)</span>
					</div>
				</div>
				<div style='margin-bottom:20px;padding:12px;background:#1a1d24;border-radius:6px;'>
					<div style='color:#95a5a6;font-size:12px;'>Prochain renouvellement</div>
					<div style='color:#2ecc71;font-size:14px;font-weight:bold;margin-top:4px;'>15 Janvier 2025</div>
				</div>
				<div style='display:flex;gap:10px;flex-wrap:wrap;'>
					<button onclick='showModal("<h3>Voir les factures</h3><p>Facture du 15 Décembre 2024 - 29€</p><p>Facture du 15 Novembre 2024 - 29€</p>")' style='flex:1;min-width:150px;background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>📄 Factures</button>
					<button onclick='showModal("<h3>Gérer le paiement</h3><p>Vous serez redirigé vers le portail Stripe pour gérer votre méthode de paiement.</p><button onclick=\"window.location.href=\\\"/api/billing/portal\\\" style=\\\"width:100%;background:#2ecc71;color:#000;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;\\\">Accéder au portail Stripe</button>")' style='flex:1;min-width:150px;background:#f39c12;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>💳 Méthode de paiement</button>
					<button onclick='confirmCancelSubscription()' style='flex:1;min-width:150px;background:#e74c3c;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;'>❌ Annuler l\'abonnement</button>
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
						<span>🐛 Mode debug (logs console)</span>
					</label>
				</div>
				<div>
					<label style='color:#fff;font-size:15px;display:flex;align-items:center;cursor:pointer;'>
						<input type='checkbox' id='prefAutoWifi' ${prefs.autoWifi === true ? 'checked' : ''} style='margin-right:10px;width:20px;height:20px;cursor:pointer;' />
						<span>📶 WiFi auto au démarrage</span>
					</label>
				</div>
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

window.closeAccountPanel = function() {
	const panel = document.getElementById('accountPanel');
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

window.confirmCancelSubscription = function() {
	showModal(`
		<h3 style='color:#e74c3c;margin-bottom:16px;'>⚠️ Annuler l'abonnement</h3>
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
	showToast('⏳ Annulation en cours...', 'info');
	const res = await api('/api/subscriptions/cancel', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
	});
	if (res.ok) {
		showToast('✅ Abonnement annulé avec succès', 'success');
		closeModal();
		setTimeout(() => {
			window.location.href = '/account.html';
		}, 2000);
	} else {
		showToast('❌ Erreur: ' + (res.error || 'Annulation échouée'), 'error');
	}
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
	if (confirm(`⚠️ ATTENTION !\n\nÊtes-vous sûr de vouloir supprimer votre compte "${currentUser}" ?\n\nCette action est IRRÉVERSIBLE !\n\nToutes vos données, statistiques et préférences seront définitivement supprimées.`)) {
		if (confirm('Dernière confirmation : Supprimer définitivement le compte ?')) {
			// Supprimer toutes les données utilisateur
			localStorage.removeItem('vhr_user_stats_' + currentUser);
			localStorage.removeItem('vhr_user_prefs_' + currentUser);
			removeUser(currentUser);
			
			closeAccountPanel();
			showToast('🗑️ Compte supprimé', 'error');
			
			// Redémarrer avec un nouveau utilisateur
			setTimeout(() => {
				const name = prompt('Nouveau nom d\'utilisateur ?');
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
		// Include cookies in request (for httpOnly vhr_token cookie)
		if (!opts.credentials) {
			opts.credentials = 'include';
		}
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
					<button onclick='startStreamFromTable("${d.serial}")' style='background:#3498db;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>▶️ Scrcpy</button>
					<button onclick='startStreamJSMpeg("${d.serial}")' style='background:#9b59b6;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-left:4px;'>🎬 JSMpeg</button>
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
					<button onclick='startStreamFromCard("${d.serial}")' style='width:100%;background:#3498db;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>▶️ Scrcpy</button>
					<button onclick='startStreamJSMpeg("${d.serial}")' style='width:100%;background:#9b59b6;color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:6px;'>🎬 JSMpeg</button>
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
	
	// Launch Scrcpy directly (simple and works great)
	const res = await api('/api/scrcpy-gui', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	
	if (res.ok) {
		showToast('🎮 Scrcpy lancé ! Vérifiez votre écran...', 'success');
		incrementStat('totalSessions');
	} else {
		showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
	}
	setTimeout(loadDevices, 500);
};

window.startStreamFromCard = async function(serial) {
	const profileSelect = document.getElementById(`profile_card_${serial}`);
	const profile = profileSelect ? profileSelect.value : 'default';
	
	// Launch Scrcpy directly (simple and works great)
	const res = await api('/api/scrcpy-gui', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	
	if (res.ok) {
		showToast('🎮 Scrcpy lancé ! Vérifiez votre écran...', 'success');
	} else {
		showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
	}
	setTimeout(loadDevices, 500);
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
	else showToast('❌ Erreur: ' + (res.error || 'inconnue'), 'error');
};

window.showStreamViewer = function(serial) {
	let modal = document.getElementById('streamModal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'streamModal';
		modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:3000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
		document.body.appendChild(modal);
	}
	
	modal.innerHTML = `
		<div style='width:90%;max-width:960px;background:#1a1d24;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px #000;'>
			<div style='background:#23272f;padding:16px;display:flex;justify-content:space-between;align-items:center;'>
				<h2 style='color:#2ecc71;margin:0;'>📹 Stream - ${serial}</h2>
				<button onclick='closeStreamViewer()' style='background:#e74c3c;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;'>✕ Fermer</button>
			</div>
			<div id='streamContainer' style='width:100%;background:#000;position:relative;padding-bottom:56.25%;'>
				<canvas id='streamCanvas' style='position:absolute;top:0;left:0;width:100%;height:100%;display:block;'></canvas>
				<div id='streamLoading' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;text-align:center;font-size:16px;z-index:10;'>
					⏳ Connexion au stream...
				</div>
			</div>
			<div style='background:#23272f;padding:16px;text-align:center;color:#95a5a6;font-size:12px;'>
				🟢 En direct - ${new Date().toLocaleTimeString('fr-FR')}
			</div>
		</div>
	`;
	modal.style.display = 'flex';
	
	// Attendre 1 seconde que le stream soit bien lancé côté serveur avant de connecter le player
	console.log('[stream] Modal opened, waiting for stream to stabilize...');
	setTimeout(() => {
		initStreamPlayer(serial);
	}, 1000);
};

window.closeStreamViewer = function() {
	const modal = document.getElementById('streamModal');
	if (modal) modal.style.display = 'none';
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
			showToast('❌ Erreur: impossible de charger la librairie vidéo', 'error');
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
	const wsUrl = 'ws://' + window.location.host + '/api/stream/ws?serial=' + encodeURIComponent(serial);
	const canvas = document.getElementById('streamCanvas');
	
	if (!canvas) {
		console.error('[stream] Canvas not found');
		showToast('❌ Canvas non trouvé', 'error');
		return;
	}
	
	console.log('[stream] connectStreamSocket: URL:', wsUrl);
	console.log('[stream] connectStreamSocket: Canvas found');
	console.log('[stream] connectStreamSocket: JSMpeg class available?', typeof JSMpeg !== 'undefined');
	
	try {
		console.log('[stream] Creating JSMpeg player...');
		
		// JSMpeg.Player handles WebSocket connection internally
		const player = new JSMpeg.Player(wsUrl, {
			canvas: canvas,
			autoplay: true,
			progressive: true,
			onPlay: () => {
				console.log('[stream] JSMpeg onPlay callback fired');
				showToast('🎬 Stream connecté !', 'success');
				// Remove loading indicator
				const loading = document.getElementById('streamLoading');
				if (loading) loading.style.display = 'none';
			},
			onError: (err) => {
				console.error('[stream] JSMpeg onError callback:', err);
				showToast('❌ Erreur stream: ' + err, 'error');
			}
		});
		
		window.jsmpegPlayer = player;
		console.log('[stream] JSMpeg player created and assigned to window.jsmpegPlayer');
	} catch (e) {
		console.error('[stream] Connection error:', e);
		console.error('[stream] Stack:', e.stack);
		showToast('❌ Erreur de connexion stream: ' + e.message, 'error');
	}
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
	const favs = JSON.parse(localStorage.getItem('vhr_favorites_' + device.serial) || '[]');
	let html = `<h3 style='color:#2ecc71;'>Apps installées sur ${device.name}</h3>`;
	html += `<div style='max-height:400px;overflow-y:auto;'>`;
	apps.forEach(pkg => {
		const isFav = favs.includes(pkg);
		html += `<div style='padding:8px;margin:4px 0;background:#23272f;border-radius:6px;display:flex;justify-content:space-between;align-items:center;'>
			<span style='color:#fff;flex:1;'>${pkg}</span>
			<button onclick="toggleFavorite('${device.serial}','${pkg}')" style='background:${isFav ? '#f39c12' : '#555'};color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-weight:bold;margin-right:4px;'>⭐</button>
			<button onclick="launchApp('${device.serial}','${pkg}')" style='background:#2ecc71;color:#000;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;'>▶️ Lancer</button>
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
	}
	else showToast('❌ Erreur lancement', 'error');
	closeModal();
};

window.toggleFavorite = function(serial, pkg) {
	const favs = JSON.parse(localStorage.getItem('vhr_favorites_' + serial) || '[]');
	const idx = favs.indexOf(pkg);
	if (idx >= 0) {
		favs.splice(idx, 1);
		showToast('⭐ Retiré des favoris', 'info');
	} else {
		favs.push(pkg);
		showToast('⭐ Ajouté aux favoris', 'success');
	}
	localStorage.setItem('vhr_favorites_' + serial, JSON.stringify(favs));
	// Rafraîchir la liste sans fermer la modal
	const device = { serial, name: 'Device' };
	showAppsDialog(device);
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

// ========== LICENSE CHECK & UNLOCK SYSTEM ========== 
async function checkLicense() {
	try {
		const res = await api('/api/license/check', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ licenseKey })
		});
		
		licenseStatus = res;
		
		if (res.expired) {
			// Trial expired - show unlock modal
			showUnlockModal(res);
			return false;
		}
		
		if (res.trial) {
			// Show trial banner
			showTrialBanner(res.daysRemaining);
		}
		
		return res.licensed || res.trial;
	} catch (e) {
		console.error('[license] check failed:', e);
		return true; // Allow access on error
	}
}

function showTrialBanner(daysRemaining) {
	let banner = document.getElementById('trialBanner');
	if (banner) return;
	
	banner = document.createElement('div');
	banner.id = 'trialBanner';
	banner.style = 'position:fixed;top:56px;left:0;width:100vw;background:linear-gradient(135deg, #f39c12, #e67e22);color:#fff;padding:10px 20px;text-align:center;z-index:1050;font-weight:bold;box-shadow:0 2px 8px #000;';
	banner.innerHTML = `
		⏱️ Essai gratuit - <b>${daysRemaining} jour(s)</b> restant(s) 
		<button onclick="showUnlockModal()" style="margin-left:20px;background:#2ecc71;color:#000;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">
			🚀 Débloquer maintenant
		</button>
	`;
	document.body.appendChild(banner);
	document.body.style.paddingTop = '106px'; // 56 + 50
}

window.showUnlockModal = function(status = licenseStatus) {
	let modal = document.getElementById('unlockModal');
	if (modal) modal.remove();
	
	modal = document.createElement('div');
	modal.id = 'unlockModal';
	modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:2000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
	
	const expiredMessage = status.expired 
		? '<h2 style="color:#e74c3c;">⚠️ Période d\'essai expirée</h2><p style="color:#95a5a6;">Pour continuer à utiliser VHR Dashboard, choisissez une option ci-dessous :</p>'
		: '<h2 style="color:#f39c12;">🚀 Débloquez VHR Dashboard</h2><p style="color:#95a5a6;">Profitez de toutes les fonctionnalités sans limitation !</p>';
	
	modal.innerHTML = `
		<div style="background:linear-gradient(135deg, #1a1d24, #2c3e50);max-width:700px;width:90%;border-radius:16px;padding:40px;color:#fff;box-shadow:0 8px 32px #000;">
			${expiredMessage}
			
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
				<button onclick="subscribePro()" style="width:100%;background:#3498db;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">
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
				<button onclick="purchasePro()" style="width:100%;background:#2ecc71;color:#000;border:none;padding:14px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">
					🎁 Acheter maintenant
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
			
			${!status.expired ? `<button onclick="closeUnlockModal()" style="width:100%;background:#7f8c8d;color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;margin-top:12px;">❌ Fermer</button>` : ''}
		</div>
	`;
	
	document.body.appendChild(modal);
};

window.closeUnlockModal = function() {
	const modal = document.getElementById('unlockModal');
	if (modal) modal.remove();
};

window.subscribePro = async function() {
	// Vérifier que l'utilisateur est connecté
	if (!currentUser || currentUser === 'Invité') {
		showToast('⚠️ Vous devez créer un compte pour vous abonner', 'error');
		setTimeout(() => {
			window.location.href = '/account.html?action=register';
		}, 2000);
		return;
	}
	
	// Check if user is authenticated with JWT (has valid token)
	try {
		const meRes = await api('/api/me');
		if (!meRes || !meRes.ok) {
			showToast('⚠️ Vous devez vous connecter à votre compte', 'error');
			setTimeout(() => {
				window.location.href = '/account.html?action=login';
			}, 2000);
			return;
		}
	} catch (e) {
		console.error('[subscribe] auth check failed:', e);
		showToast('⚠️ Erreur d\'authentification - veuillez vous reconnecter', 'error');
		setTimeout(() => {
			window.location.href = '/account.html?action=login';
		}, 2000);
		return;
	}
	
	showToast('🔄 Création de la session de paiement...', 'info');
	
	try {
		// Create Stripe Checkout session for subscription
		const res = await api('/api/subscriptions/create-checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ planId: 'STANDARD' })
		});
		
		console.log('[subscribe] API response:', res);
		
		if (res && res.url) {
			// Session créée avec succès, rediriger vers Stripe Checkout
			window.location.href = res.url;
		} else if (res && res.error) {
			showToast('❌ Erreur: ' + res.error, 'error');
			if (res.error.includes('authentication')) {
				setTimeout(() => {
					window.location.href = '/account.html?action=login';
				}, 2000);
			}
		} else {
			showToast('❌ Erreur: Session non créée', 'error');
		}
	} catch (e) {
		console.error('[subscribe] error:', e);
		showToast('❌ Erreur lors de la création de la session', 'error');
	}
};

window.purchasePro = async function() {
	// Vérifier que l'utilisateur est connecté
	if (!currentUser || currentUser === 'Invité') {
		showToast('⚠️ Vous devez créer un compte pour acheter la licence', 'error');
		setTimeout(() => {
			window.location.href = '/account.html?action=register';
		}, 2000);
		return;
	}
	
	// Check if user is authenticated with JWT (has valid token)
	try {
		const meRes = await api('/api/me');
		if (!meRes || !meRes.ok) {
			showToast('⚠️ Vous devez vous connecter à votre compte', 'error');
			setTimeout(() => {
				window.location.href = '/account.html?action=login';
			}, 2000);
			return;
		}
	} catch (e) {
		console.error('[purchase] auth check failed:', e);
		showToast('⚠️ Erreur d\'authentification - veuillez vous reconnecter', 'error');
		setTimeout(() => {
			window.location.href = '/account.html?action=login';
		}, 2000);
		return;
	}
	
	showToast('🔄 Création de la session de paiement...', 'info');
	
	try {
		// Create Stripe Checkout session for one-time purchase
		const res = await api('/api/purchases/create-checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ purchaseId: 'PERPETUAL' })
		});
		
		console.log('[purchase] API response:', res);
		
		if (res && res.url) {
			// Session créée avec succès, rediriger vers Stripe Checkout
			window.location.href = res.url;
		} else if (res && res.error) {
			showToast('❌ Erreur: ' + res.error, 'error');
			if (res.error.includes('authentication')) {
				setTimeout(() => {
					window.location.href = '/account.html?action=login';
				}, 2000);
			}
		} else {
			showToast('❌ Erreur: Session non créée', 'error');
		}
	} catch (e) {
		console.error('[purchase] error:', e);
		showToast('❌ Erreur lors de la création de la session', 'error');
	}
};

window.activateLicense = async function() {
	const input = document.getElementById('licenseKeyInput');
	const key = input.value.trim().toUpperCase();
	
	if (!key || !key.startsWith('VHR-')) {
		showToast('❌ Clé de licence invalide', 'error');
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
			showToast('❌ ' + (res.error || 'Clé invalide'), 'error');
		}
	} catch (e) {
		console.error('[license] activate error:', e);
		showToast('❌ Erreur lors de l\'activation', 'error');
	}
};

// ========== INIT ========== 
console.log('[Dashboard PRO] Init');
createNavbar();
checkLicense();
loadDevices();
