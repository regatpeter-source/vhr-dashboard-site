# 📧 Configuration Brevo (Sendinblue) pour VHR Dashboard

## ✅ État Actuel

- **Service Email:** Brevo (Sendinblue) ✓
- **SMTP Host:** smtp-relay.brevo.com ✓
- **Port:** 587 (TLS) ✓
- **Nodemailer:** Installé ✓
- **Code:** Adapté pour Brevo ✓

## ⚙️ Configuration Render

### Étape 1: Obtenir vos credentials Brevo

1. Va sur [Brevo Dashboard](https://app.brevo.com)
2. Clique sur **Settings** (⚙️)
3. Va à **SMTP & API**
4. Copie:
   - **SMTP Username** (adresse email ou login)
   - **SMTP Password** (clé SMTP)

Exemple:
```
BREVO_SMTP_USER: contact@vhr-dashboard-site.com
BREVO_SMTP_PASS: xxxxxxxxxxxxxxxxxxx
```

### Étape 2: Ajouter les variables dans Render

1. Va sur [Render Dashboard](https://dashboard.render.com)
2. Sélectionne ton service **vhr-dashboard-backend**
3. Clique **Settings**
4. Scroll à **Environment Variables**
5. Ajoute:

```
BREVO_SMTP_USER = <ton-email-brevo>
BREVO_SMTP_PASS = <ta-cle-smtp-brevo>
EMAIL_ENABLED = true
EMAIL_FROM = noreply@vhr-dashboard-site.com
```

### Étape 3: Redéployer

1. Sauvegarde les variables
2. Render redéploiera automatiquement
3. Les emails fonctionneront immédiatement ✓

---

## 📬 Emails qui seront envoyés

Quand EMAIL_ENABLED=true, voici ce qui se passe:

### 1. Achat Perpétuel
```
Événement: checkout.session.completed (mode: payment)
À: Email du client
Contient:
  ✓ Confirmation de paiement
  ✓ Clé de licence VHR-XXXX-XXXX-XXXX-XXXX
  ✓ Lien de téléchargement
  ✓ Instructions d'installation
```

### 2. Abonnement
```
Événement: checkout.session.completed (mode: subscription)
À: Email de l'abonné
Contient:
  ✓ Confirmation d'abonnement
  ✓ Plan et prix
  ✓ Lien d'accès au dashboard
  ✓ Date de renouvellement
```

### 3. Reminders de Paiement
```
Événement: invoice.payment_succeeded (Stripe)
Automatique via Stripe et Brevo
```

---

## 🧪 Test Local

Pour tester localement avec les credentials Render:

```bash
# Ajoute au .env local:
BREVO_SMTP_USER=votre-email@brevo.com
BREVO_SMTP_PASS=votre-cle-smtp

# Lance le test:
node test-brevo-email.js
```

---

## ✅ Checklist Final

- [ ] Variables Brevo ajoutées dans Render
- [ ] EMAIL_ENABLED = true
- [ ] Application redéployée
- [ ] Envoyer un email de test via le site
- [ ] Recevoir l'email de confirmation dans votre boîte

---

## 🔗 Ressources

- [Brevo SMTP Settings](https://app.brevo.com/settings/smtp-api)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Nodemailer Brevo Guide](https://nodemailer.com/)

---

## 🆘 Troubleshooting

### Les emails ne s'envoient pas

1. **Vérifier EMAIL_ENABLED = true** dans Render
2. **Checker les logs** dans Render Dashboard
3. **Vérifier les credentials** SMTP dans Brevo
4. **Tester avec test-brevo-email.js** localement

### Authentification échouée

- Les credentials Brevo sont-ils corrects?
- Compte Brevo est-il actif?
- Accès SMTP est-il activé dans Brevo Settings?

### Rate limiting

Brevo a des limites d'envoi selon votre plan:
- Plan Gratuit: 300/jour
- Plan Pro: Illimité

Vérifier votre plan: https://app.brevo.com/account/plan

---

**Status: ✅ PRÊT - En attente de configuration Render**
