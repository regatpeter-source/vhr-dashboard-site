/* Botpress Webchat configuration for the demo site. Avoid inline script usage to comply with CSP */
window.botpressWebChat = window.botpressWebChat || {};
// Replace these with your real IDs if needed (keep empty / placeholders for dev)
window.botpressWebChat.botId = window.botpressWebChat.botId || '01HXXXXXXX';
window.botpressWebChat.hostUrl = window.botpressWebChat.hostUrl || 'https://cdn.botpress.cloud/webchat/v1';
window.botpressWebChat.messagingUrl = window.botpressWebChat.messagingUrl || 'https://messaging.botpress.cloud';
window.botpressWebChat.clientId = window.botpressWebChat.clientId || '01HXXXXXXX';
window.botpressWebChat.botName = window.botpressWebChat.botName || 'Assistant VHR DASHBOARD';
window.botpressWebChat.avatarUrl = window.botpressWebChat.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';
window.botpressWebChat.showPoweredBy = false;
window.botpressWebChat.enableTranscriptDownload = true;
window.botpressWebChat.stylesheet = '';
window.botpressWebChat.containerWidth = '400px';
window.botpressWebChat.layoutWidth = '400px';
window.botpressWebChat.enableReset = true;

// If you need to add more config, do so here rather than embedding inline script on pages.

(function initVitrineFallbackChatbot() {
	function hasRealBotpressConfig() {
		const cfg = window.botpressWebChat || {};
		const botId = String(cfg.botId || '').trim();
		const clientId = String(cfg.clientId || '').trim();
		const looksPlaceholder = (v) => !v || /X{3,}/i.test(v) || v === '01HXXXXXXX';
		return !looksPlaceholder(botId) && !looksPlaceholder(clientId);
	}

	if (hasRealBotpressConfig()) {
		return;
	}

	const CHAT_ID = 'vhrFallbackChatbot';

	function answerFor(text) {
		const qRaw = String(text || '').trim();
		const q = qRaw
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');
		const hasAny = (arr) => arr.some(word => q.includes(word));

		const intents = [
			{
				id: 'install_trial',
				keywords: ['installer', 'installation', 'dashboard pro', '7 jours', 'essai', 'trial', 'demo', 'beneficier'],
				minScore: 2,
				reply: 'Excellente question ✅ Voici la méthode simple pour installer Dashboard Pro et activer l\'essai 7 jours :\n\n1) Créez votre compte sur la page Mon compte\n2) Téléchargez l\'installateur Dashboard Pro depuis le site vitrine\n3) Installez puis lancez l\'application sur votre PC\n4) Connectez-vous avec le même compte dans l\'app\n5) L\'essai gratuit de 7 jours démarre automatiquement sur votre compte\n\nPendant l\'essai, vous pouvez tester :\n• la détection des casques\n• le streaming\n• le contrôle à distance\n• les fonctions de support opérateur\n\nSi vous voulez, je peux aussi vous donner le parcours exact selon votre casque (Quest, Pico, HTC).'
			},
			{
				id: 'pricing',
				keywords: ['tarif', 'prix', 'cout', 'abonnement', 'licence', 'budget'],
				reply: 'Voici un comparatif clair 👇\n\n• Abonnement mensuel (29€/mois)\n  - idéal pour démarrer vite et rester flexible\n  - résiliable à tout moment\n  - mises à jour + support inclus\n\n• Licence définitive (499€ HT, paiement unique)\n  - idéale pour un usage long terme\n  - 1 an de mises à jour inclus\n  - support prioritaire pendant 1 an\n\nConseil pratique :\n- besoin évolutif / pilote / POC → abonnement\n- parc stable avec visibilité long terme → licence'
			},
			{
				id: 'trial_demo',
				keywords: ['essai', 'trial', 'demo', 'test'],
				reply: 'Oui ✅ Vous pouvez tester la solution, et c\'est recommandé avant un déploiement large.\n\nPendant la démo, vérifiez surtout :\n• découverte et gestion des casques\n• stabilité du streaming\n• commandes à distance / supervision\n• fluidité du support opérateur\n\nBon process en 3 étapes :\n1) test sur 1–2 casques,\n2) test en conditions réelles (réseau, usage),\n3) extension au reste de la flotte.'
			},
			{
				id: 'support',
				keywords: ['support', 'contact', 'email', 'mail', 'assistance', 'aide', 'incident', 'bug'],
				reply: 'Support VHR Dashboard Pro :\n📧 support@vhr-dashboard-site.com\n\nPour une réponse ultra rapide, envoyez :\n• modèle(s) de casque et version système\n• type de connexion (USB/WiFi)\n• capture du message d’erreur\n• action en cours (streaming, installation, login, etc.)\n• niveau d’urgence\n\nAstuce : plus le contexte est précis, plus la résolution est directe.'
			},
			{
				id: 'compatibility',
				keywords: ['quest', 'pico', 'htc', 'casque', 'compatible', 'compatibilite'],
				reply: 'Compatibilité actuelle (selon versions firmware) :\n• Meta Quest 1/2/3/Pro\n• Pico Neo / Pico 4 / Pro\n• HTC Vive Focus / Pro\n• et autres casques Android compatibles ADB\n\nMéthode recommandée :\n1) première connexion USB (initialisation),\n2) vérification ADB,\n3) bascule WiFi pour exploitation à distance.\n\nSi vous me donnez votre modèle exact, je peux vous indiquer la procédure la plus adaptée.'
			},
			{
				id: 'installation',
				keywords: ['installation', 'installer', 'adb', 'wifi', 'wi-fi', 'guide', 'setup', 'configurer'],
				reply: 'Installation rapide (recommandée) :\n1) installer Android Platform Tools (ADB) sur le PC\n2) activer le mode développeur sur le casque\n3) connecter en USB et accepter le débogage\n4) vérifier avec « adb devices »\n5) ouvrir VHR Dashboard puis activer le mode WiFi\n\nSi le casque n\'apparaît pas :\n• changer câble/port USB\n• vérifier autorisation debug dans le casque\n• relancer ADB serveur'
			},
			{
				id: 'security',
				keywords: ['securite', 'rgpd', 'permission', 'permissions', 'role', 'audit'],
				reply: 'Sécurité & gouvernance :\n• gestion des rôles et des accès\n• journalisation des actions (audit)\n• bonnes pratiques de segmentation des comptes\n• orientation conformité RGPD\n\nBon réflexe : créer un compte admin principal + comptes opérateurs séparés pour tracer les actions proprement.'
			},
			{
				id: 'streaming',
				keywords: ['stream', 'streaming', 'latence', 'qualite', 'performance', 'fluidite'],
				reply: 'Pour un streaming fluide :\n• privilégier un réseau WiFi stable (ou Ethernet côté poste admin)\n• réduire la résolution si la latence monte\n• fermer les apps lourdes sur le casque\n• tester un profil qualité adapté au contexte (démo, support, formation)\n\nObjectif : équilibre entre lisibilité et réactivité.'
			},
			{
				id: 'enterprise',
				keywords: ['entreprise', 'equipe', 'formation', 'deploiement', 'parc', 'flotte'],
				reply: 'Approche déploiement entreprise (simple et efficace) :\n1) pilote sur 2 à 5 casques\n2) standardisation des profils et procédures\n3) montée progressive sur la flotte\n4) suivi des incidents + amélioration continue\n\nJe peux vous proposer un plan selon la taille de votre parc (ex: 10, 50, 100+ casques).'
			}
		];

		if (!q) {
			return 'Bonjour 👋 Bienvenue chez VHR Dashboard Pro !\n\nJe peux vous aider de façon détaillée sur :\n• les tarifs (abonnement vs licence définitive)\n• la compatibilité des casques (Quest, Pico, HTC…)\n• l’installation pas à pas (USB, ADB, WiFi)\n• le support et les bonnes infos à fournir\n• les cas d’usage (formation, événementiel, support IT)\n\nExemples de questions :\n« Quelle formule est la plus adaptée pour 20 casques ? »\n« Comment démarrer rapidement sur Quest ? »\n« Que faire si ADB ne détecte pas le casque ? »';
		}
		if (hasAny(['bonjour', 'salut', 'hello', 'coucou', 'bonsoir'])) {
			return 'Bonjour 👋 Ravi de vous aider !\n\nMon rôle : vous donner des réponses concrètes, ici directement, pour avancer vite.\n\nJe peux commencer par :\n1) vous conseiller une formule (abonnement/licence),\n2) vous guider sur l’installation,\n3) vérifier la compatibilité de vos casques,\n4) vous proposer un mini plan de déploiement.';
		}

		let bestIntent = null;
		let bestScore = 0;
		for (const intent of intents) {
			const score = intent.keywords.reduce((acc, kw) => acc + (q.includes(kw) ? 1 : 0), 0);
			const minScore = intent.minScore || 1;
			if (score >= minScore && score > bestScore) {
				bestIntent = intent;
				bestScore = score;
			}
		}

		if (bestIntent) {
			return bestIntent.reply;
		}

		return 'Excellente question 👍\n\nJe peux vous faire une réponse personnalisée si vous me donnez :\n• votre objectif (support, formation, événement, production)\n• le nombre de casques\n• les modèles utilisés\n• votre priorité (coût, rapidité, stabilité, sécurité)\n\nEnsuite, je vous propose une recommandation concrète étape par étape.';
	}

	function createMessage(text, isUser) {
		const row = document.createElement('div');
		row.style.display = 'flex';
		row.style.justifyContent = isUser ? 'flex-end' : 'flex-start';
		row.style.margin = '8px 0';

		const bubble = document.createElement('div');
		bubble.textContent = text;
		bubble.style.maxWidth = '85%';
		bubble.style.padding = '9px 12px';
		bubble.style.borderRadius = '12px';
		bubble.style.lineHeight = '1.4';
		bubble.style.fontSize = '14px';
		bubble.style.whiteSpace = 'pre-wrap';
		bubble.style.background = isUser ? '#1b5e20' : '#f3f4f6';
		bubble.style.color = isUser ? '#fff' : '#111827';
		row.appendChild(bubble);
		return row;
	}

	function mount() {
		if (document.getElementById(CHAT_ID)) return;
		if (!window.location.pathname.startsWith('/site-vitrine/')) return;

		const root = document.createElement('div');
		root.id = CHAT_ID;
		root.style.position = 'fixed';
		root.style.right = '18px';
		root.style.bottom = '18px';
		root.style.zIndex = '9999';

		const panel = document.createElement('div');
		panel.style.display = 'none';
		panel.style.width = '330px';
		panel.style.maxWidth = 'calc(100vw - 24px)';
		panel.style.background = '#fff';
		panel.style.border = '1px solid #d1d5db';
		panel.style.borderRadius = '14px';
		panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)';
		panel.style.overflow = 'hidden';
		panel.style.marginBottom = '10px';

		const header = document.createElement('div');
		header.style.background = '#1b5e20';
		header.style.color = '#fff';
		header.style.padding = '10px 12px';
		header.style.fontWeight = '700';
		header.textContent = 'Assistant VHR';

		const messages = document.createElement('div');
		messages.style.height = '260px';
		messages.style.overflowY = 'auto';
		messages.style.padding = '10px';
		messages.style.background = '#ffffff';

		const inputWrap = document.createElement('div');
		inputWrap.style.display = 'flex';
		inputWrap.style.gap = '8px';
		inputWrap.style.padding = '10px';
		inputWrap.style.borderTop = '1px solid #e5e7eb';

		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = 'Posez votre question...';
		input.style.flex = '1';
		input.style.padding = '8px 10px';
		input.style.border = '1px solid #d1d5db';
		input.style.borderRadius = '8px';

		const sendBtn = document.createElement('button');
		sendBtn.type = 'button';
		sendBtn.textContent = 'Envoyer';
		sendBtn.style.padding = '8px 10px';
		sendBtn.style.border = 'none';
		sendBtn.style.borderRadius = '8px';
		sendBtn.style.background = '#1b5e20';
		sendBtn.style.color = '#fff';
		sendBtn.style.cursor = 'pointer';

		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.setAttribute('aria-label', 'Ouvrir le chat assistant');
		toggle.textContent = '💬 Chat';
		toggle.style.padding = '11px 14px';
		toggle.style.borderRadius = '999px';
		toggle.style.border = 'none';
		toggle.style.background = '#1b5e20';
		toggle.style.color = '#fff';
		toggle.style.fontWeight = '700';
		toggle.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
		toggle.style.cursor = 'pointer';

		function sendMessage() {
			const text = (input.value || '').trim();
			if (!text) return;
			messages.appendChild(createMessage(text, true));
			input.value = '';
			const reply = answerFor(text);
			setTimeout(() => {
				messages.appendChild(createMessage(reply, false));
				messages.scrollTop = messages.scrollHeight;
			}, 220);
			messages.scrollTop = messages.scrollHeight;
		}

		sendBtn.addEventListener('click', sendMessage);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				sendMessage();
			}
		});
		toggle.addEventListener('click', () => {
			const open = panel.style.display !== 'none';
			panel.style.display = open ? 'none' : 'block';
			if (!open) {
				setTimeout(() => input.focus(), 0);
			}
		});

		messages.appendChild(createMessage(answerFor(''), false));
		inputWrap.appendChild(input);
		inputWrap.appendChild(sendBtn);
		panel.appendChild(header);
		panel.appendChild(messages);
		panel.appendChild(inputWrap);
		root.appendChild(panel);
		root.appendChild(toggle);
		document.body.appendChild(root);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount);
	} else {
		mount();
	}
})();
