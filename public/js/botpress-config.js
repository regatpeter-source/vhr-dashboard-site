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
		const q = String(text || '').toLowerCase();
		if (!q) {
			return 'Bonjour 👋 Bienvenue chez VHR Dashboard Pro !\nJe peux vous expliquer directement :\n• les tarifs et la différence abonnement/licence\n• la compatibilité des casques VR\n• l’installation (USB, ADB, WiFi)\n• le support et les délais de réponse\n\nExemple : « comment fonctionne l’abonnement ? »';
		}
		if (q.includes('bonjour') || q.includes('salut') || q.includes('hello') || q.includes('coucou')) {
			return 'Bonjour 👋 Ravi de vous aider. Dites-moi ce que vous voulez savoir et je vous réponds clairement ici, sans vous renvoyer partout.\n\nJe peux commencer par : tarifs, compatibilité, installation, ou support.';
		}
		if (q.includes('tarif') || q.includes('prix') || q.includes('coût') || q.includes('abonnement')) {
			return 'Voici l’essentiel 👇\n• Abonnement mensuel : 29€/mois, sans engagement, résiliable à tout moment, mises à jour + support inclus.\n• Licence définitive : 499€ HT en paiement unique, avec 1 an de mises à jour et support prioritaire 1 an.\n\nEn résumé : abonnement = flexible, licence = investissement long terme.';
		}
		if (q.includes('demo') || q.includes('démo') || q.includes('essai')) {
			return 'Oui ✅ Vous pouvez tester la solution.\nLa démo sert à valider rapidement :\n• détection des casques\n• streaming en direct\n• commandes à distance\n• flux de support opérateur\n\nSi vous voulez, je peux vous guider sur les étapes de démarrage selon votre parc (Quest/Pico/HTC).';
		}
		if (q.includes('support') || q.includes('contact') || q.includes('email')) {
			return 'Le support VHR est orienté réponse rapide par email.\n📧 Adresse : support@vhr-dashboard-site.com\n\nQuand vous contactez le support, indiquez idéalement :\n• modèle du casque\n• type de connexion (USB/WiFi)\n• message d’erreur\n• objectif (streaming, installation, accès...)\n\nComme ça, la résolution est beaucoup plus rapide.';
		}
		if (q.includes('quest') || q.includes('pico') || q.includes('htc') || q.includes('casque') || q.includes('compatible')) {
			return 'Compatibilité actuelle :\n• Meta Quest (1/2/3/Pro)\n• Pico (Neo/4/Pro selon versions)\n• HTC Vive Focus/Pro\n• plus largement les casques Android compatibles ADB\n\nLe principe : première connexion USB pour initialiser, puis passage en WiFi pour l’exploitation à distance.';
		}
		if (q.includes('installation') || q.includes('adb') || q.includes('wifi') || q.includes('guide')) {
			return 'Installation type (simple) :\n1) installer ADB (platform-tools) sur le PC\n2) activer le mode développeur du casque\n3) brancher en USB et accepter le débogage\n4) vérifier avec « adb devices »\n5) activer ensuite le mode WiFi depuis le Dashboard\n\nJe peux aussi vous aider à diagnostiquer si un casque n’apparaît pas.';
		}
		return 'Bonne question 👍\nJe peux vous répondre en direct sur :\n• tarifs et choix de formule\n• installation pas à pas\n• compatibilité des casques\n• support et dépannage\n\nSi vous voulez, décrivez votre contexte (nombre de casques + modèles) et je vous fais une recommandation claire.';
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
