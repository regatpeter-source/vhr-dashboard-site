╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║         🔧 DIAGNOSTIC - SYSTÈME DE MESSAGES (CONTACT + RÉPONSE)             ║
║                                                                              ║
║         Problème: Les réponses du admin bloquent via Brevo                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
                              PROBLÈME IDENTIFIÉ
═══════════════════════════════════════════════════════════════════════════════

❌ CAUSE: Désalignement des variables d'environnement

server.js cherche:
  ├─ EMAIL_USER
  ├─ EMAIL_PASS
  ├─ EMAIL_HOST (défaut: smtp.gmail.com)
  └─ EMAIL_PORT (défaut: 587)

Mais .env contient:
  ├─ BREVO_SMTP_USER ← pas utilisé
  ├─ BREVO_SMTP_PASS ← pas utilisé
  └─ EMAIL_FROM

Résultat: Brevo n'est jamais utilisé → Essaie Gmail par défaut → Bloque!


═══════════════════════════════════════════════════════════════════════════════
                              SOLUTION APPLIQUÉE
═══════════════════════════════════════════════════════════════════════════════

✅ server.js a été modifié pour:

1. Supporter BREVO_SMTP_* variables
   const emailUser = process.env.BREVO_SMTP_USER || process.env.EMAIL_USER
   const emailPass = process.env.BREVO_SMTP_PASS || process.env.EMAIL_PASS
   const emailHost = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'

2. Utiliser le bon port
   secure: emailPort === 465 ? true : false
   (Brevo utilise 587 = TLS, pas 465 = SSL)

3. Vérifier et logger la configuration au démarrage


═══════════════════════════════════════════════════════════════════════════════
                       FLUX DE MESSAGES - AVANT/APRÈS
═══════════════════════════════════════════════════════════════════════════════

AVANT (Bloqué):
─────────────
[Contact] User sends message
    ↓
[API] POST /api/messages
    ↓
[Email] Essaie Gmail (pas configuré correctement)
    ↓
❌ BLOQUE - Gmail refuse la connexion
    ↓
[Admin] Reçoit le message OK (stocké en DB)
    ↓
[Admin] Clique "Répondre"
    ↓
[API] PATCH /api/admin/messages/:id
    ↓
[Email] sendReplyToContact() → Essaie Gmail → ❌ BLOQUE


APRÈS (Fonctionnel):
──────────────────
[Contact] User sends message
    ↓
[API] POST /api/messages
    ↓
[Email] Utilise Brevo SMTP (BREVO_SMTP_USER/PASS)
    ↓
✅ Email envoyé à admin@... via Brevo
    ↓
[Admin] Reçoit le message OK
    ↓
[Admin] Clique "Répondre"
    ↓
[API] PATCH /api/admin/messages/:id
    ↓
[Email] sendReplyToContact() → Utilise Brevo
    ↓
✅ Email envoyé au user via Brevo


═══════════════════════════════════════════════════════════════════════════════
                        VÉRIFICATION & TESTER
═══════════════════════════════════════════════════════════════════════════════

1️⃣ Vérifier le .env local (développement)
   ──────────────────────────────────────
   
   cat .env | grep BREVO
   
   Doit afficher:
   ✅ BREVO_SMTP_USER=9d4018001@smtp-brevo.com
   ✅ BREVO_SMTP_PASS=6E37aw1L4An2XcSZ
   
   Si manquant: Ajouter les valeurs

2️⃣ Tester localement
   ─────────────────
   
   node test-messaging-system.js
   
   Doit afficher:
   ✅ Connexion SMTP vérifiée
   ✅ Email admin envoyé avec succès
   ✅ Email de réponse envoyé avec succès


3️⃣ Vérifier Render (production)
   ─────────────────────────────
   
   a) Va sur https://dashboard.render.com
   b) Sélectionne vhr-dashboard-site (ou ton service)
   c) Clique "Settings"
   d) Scroll à "Environment Variables"
   e) Vérifie qu'il y a:
      
      BREVO_SMTP_USER=9d4018001@smtp-brevo.com
      BREVO_SMTP_PASS=6E37aw1L4An2XcSZ
      EMAIL_FROM=noreply@vhr-dashboard-site.com
      EMAIL_ENABLED=true

   Si absent: Ajouter immédiatement


4️⃣ Redéployer Render
   ──────────────────
   
   Une fois les variables ajoutées:
   a) Render redéploiera automatiquement
   b) Attendre 2-3 minutes
   c) Vérifier les logs dans "Logs" tab


5️⃣ Tester en production
   ────────────────────
   
   a) Va sur https://vhr-dashboard-site.onrender.com/contact.html
   b) Envoie un message de test
   c) Va sur https://vhr-dashboard-site.onrender.com/admin-dashboard.html
   d) Vérifie que le message apparaît
   e) Clique "Répondre"
   f) Écris une réponse
   g) Clique "Envoyer la réponse"
   h) L'email doit être envoyé via Brevo


═══════════════════════════════════════════════════════════════════════════════
                            POINTS DE BLOCAGE POSSIBLES
═══════════════════════════════════════════════════════════════════════════════

Si les emails ne s'envoient toujours pas:

1. Variables Render absentes
   → Solution: Ajouter BREVO_SMTP_USER/PASS dans Render Dashboard

2. Limite de débit Brevo atteinte
   → Vérifier: https://app.brevo.com/account/plan
   → Plan Gratuit: 300/jour max
   → Solution: Passer à un plan payant ou attendre demain

3. Compte Brevo suspendu
   → Vérifier: https://app.brevo.com/dashboard
   → Si suspendu: Contacter support Brevo

4. Accès SMTP désactivé dans Brevo
   → Vérifier: https://app.brevo.com/account/settings
   → Aller à "SMTP & API"
   → S'assurer que SMTP est "Active"

5. Adresse de test en whitelist
   → Vérifier: https://app.brevo.com/account/settings
   → Aller à "Security"
   → S'assurer que test@example.com n'est pas bloquée

6. Logs Render montrent erreur
   → Vérifier: https://dashboard.render.com
   → Clique sur ton service
   → Aller à "Logs"
   → Chercher "[email]" dans les logs
   → Si erreur: Copier et envoyer au support


═══════════════════════════════════════════════════════════════════════════════
                          FICHIERS MODIFIÉS
═══════════════════════════════════════════════════════════════════════════════

✅ server.js
   ├─ Ligne 505-540: EMAIL CONFIGURATION section
   │  ├─ Ajouter support BREVO_SMTP_* variables
   │  ├─ Corriger logique de port (465=SSL, 587=TLS)
   │  └─ Améliorer les logs
   │
   └─ Impact: sendReplyToContact() utilise maintenant Brevo correctement

✅ .env.example
   ├─ Clarifier variables Brevo
   └─ Ajouter commentaires pour options alternatives

✅ test-messaging-system.js (nouveau)
   ├─ Tester la configuration SMTP
   ├─ Simuler envoi admin
   ├─ Simuler réponse admin
   └─ Utile pour diagnostiquer les problèmes


═══════════════════════════════════════════════════════════════════════════════
                              FLUX DÉTAILLÉ
═══════════════════════════════════════════════════════════════════════════════

Message depuis contact.html:
──────────────────────────

1. User: Visite https://vhr-dashboard-site.onrender.com/contact.html
2. User: Remplit formulaire (name, email, subject, message)
3. User: Clique "Envoyer"
4. API: POST /api/messages reçoit le message
5. Email: sendContactMessageToAdmin() appelée
   ├─ Récupère: adminEmail = process.env.ADMIN_EMAIL || 'admin@...'
   ├─ Utilise: emailTransporter.sendMail() avec Brevo
   ├─ Envoie: Email HTML à admin
   └─ Log: "[email] ✓ Contact message sent successfully"
6. Admin: Reçoit email dans sa boîte


Réponse depuis admin-dashboard.html:
────────────────────────────────────

1. Admin: Visite https://vhr-dashboard-site.onrender.com/admin-dashboard.html
2. Admin: Login avec credentials
3. Admin: Voit messages reçus (depuis API GET /api/admin/messages)
4. Admin: Clique "Répondre" sur un message
5. Admin: Écrit une réponse
6. Admin: Clique "Envoyer la réponse"
7. API: PATCH /api/admin/messages/:id reçoit la réponse
   ├─ Updates: message.response = "..."
   ├─ Updates: message.respondedAt = new Date()
   ├─ Appelle: sendReplyToContact() ← Voici le blocage avant
   │   ├─ Récupère: recipientEmail = message.email
   │   ├─ Utilise: emailTransporter.sendMail()
   │   │           (maintenant avec Brevo credentials)
   │   ├─ Envoie: Email HTML au user
   │   └─ Log: "[email] ✓ Reply sent successfully"
   └─ Retourne: { ok: true, emailSent: true }
8. User: Reçoit email de réponse dans sa boîte


═══════════════════════════════════════════════════════════════════════════════
                            RÉSUMÉ DES CHANGEMENTS
═══════════════════════════════════════════════════════════════════════════════

Commit: À venir

Titre: fix: Support Brevo SMTP credentials for contact message replies

Changements:
├─ server.js
│  ├─ Support BREVO_SMTP_USER/PASS variables
│  ├─ Fallback à EMAIL_USER/PASS si Brevo absent
│  ├─ Corriger logique de port (TLS vs SSL)
│  └─ Améliorer les messages de log
│
├─ .env.example
│  ├─ Clarifier configuration Brevo
│  └─ Ajouter options alternatives
│
└─ test-messaging-system.js (nouveau)
   ├─ Tester SMTP connection
   ├─ Simuler message + réponse
   └─ Utile pour diagnostiquer

Avant: ❌ Réponses bloquées (Gmail par défaut)
Après: ✅ Réponses fonctionnelles (Brevo)


═══════════════════════════════════════════════════════════════════════════════
                          PROCHAINES ÉTAPES
═══════════════════════════════════════════════════════════════════════════════

IMMÉDIAT (avant production):
────────────────────────────
1. ✅ Code: server.js modifié
2. ⏳ Tester: node test-messaging-system.js localement
3. ⏳ Commit: code + test file
4. ⏳ Push: vers GitHub

EN PRODUCTION (Render):
──────────────────────
1. ⏳ Vérifier: BREVO_SMTP_* dans Render env vars
2. ⏳ Redeploy: Render auto-redeploy après git push
3. ⏳ Tester: https://vhr-dashboard-site.onrender.com
4. ⏳ Contact: Envoyer un message de test
5. ⏳ Admin: Répondre au message
6. ⏳ Vérifier: Email de réponse reçu


═══════════════════════════════════════════════════════════════════════════════

Status: ✅ FIX APPLIQUÉ - EN ATTENTE DE TEST & DÉPLOIEMENT
