# 🔧 Configuration DNS Cloudflare pour Brevo

## 📋 Enregistrements à ajouter dans Cloudflare

Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com/) → Sélectionnez votre domaine → **DNS** → **Records**

### 1. ✅ Verification Brevo (TXT)

```
Type:   TXT
Name:   @ (ou votre domaine racine)
Value:  brevo-code:a3f353e0f9caa01984bb9d6cd569b71b
TTL:    Auto
Proxy:  DNS only
```

**Statut:** À ajouter en premier pour valider votre domaine

---

### 2. ✅ MX Record (Mail Exchange)

```
Type:     MX
Name:     @ (ou votre domaine racine)
Value:    10 mx.brevo.com
Priority: 10
TTL:      Auto
Proxy:    DNS only
```

**Statut:** À ajouter pour recevoir les emails

---

### 3. ✅ SPF Record (TXT)

```
Type:   TXT
Name:   @ (ou votre domaine racine)
Value:  v=spf1 include:smtp.brevo.com ~all
TTL:    Auto
Proxy:  DNS only
```

**Statut:** À ajouter pour l'authentification SPF

**Note:** Si vous avez déjà un SPF, fusionnez-le :
```
v=spf1 include:smtp.brevo.com include:sendgrid.net ~all
```

---

### 4. ✅ DKIM Record 1 (CNAME)

```
Type:   CNAME
Name:   brevo1._domainkey
Value:  b1.vhr-dashboard-site-onrender-com.dkim.brevo.com
TTL:    Auto
Proxy:  DNS only
```

**Statut:** À ajouter pour la signature DKIM #1

---

### 5. ✅ DKIM Record 2 (CNAME)

```
Type:   CNAME
Name:   brevo2._domainkey
Value:  b2.vhr-dashboard-site-onrender-com.dkim.brevo.com
TTL:    Auto
Proxy:  DNS only
```

**Statut:** À ajouter pour la signature DKIM #2

---

### 6. ✅ DMARC Record (TXT)

```
Type:   TXT
Name:   _dmarc
Value:  v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com
TTL:    Auto
Proxy:  DNS only
```

**Statut:** À ajouter pour les rapports DMARC

---

## 🚀 Ordre d'ajout recommandé

1. ✅ Verification Brevo (TXT avec brevo-code)
2. ✅ MX Record
3. ✅ SPF Record (fusionner si existant)
4. ✅ DKIM 1 (CNAME)
5. ✅ DKIM 2 (CNAME)
6. ✅ DMARC (TXT)

---

## ⏳ Vérification dans Brevo

Une fois tous les enregistrements ajoutés dans Cloudflare:

1. Va sur [Brevo Dashboard](https://app.brevo.com)
2. Aller à **Senders & domains**
3. Sélectionne ton domaine
4. Clique **Check domain configuration**
5. Tous les enregistrements doivent afficher ✅ **VALID**

---

## ⚠️ Délai de propagation

- **Vérification Brevo:** 5-30 minutes (parfois jusqu'à 1h)
- **Propagation DNS:** 24-48h pour la propagation complète
- **Tests d'envoi:** Vous pouvez tester l'envoi après validation Brevo

---

## ✅ Checklist finale

- [ ] Enregistrement TXT Brevo-code ajouté dans Cloudflare
- [ ] Enregistrement MX ajouté
- [ ] Enregistrement SPF ajouté/fusionné
- [ ] Enregistrement DKIM 1 (brevo1._domainkey) ajouté
- [ ] Enregistrement DKIM 2 (brevo2._domainkey) ajouté
- [ ] Enregistrement DMARC (_dmarc) ajouté
- [ ] Vérification dans Brevo: Tous les enregistrements ✅ VALID
- [ ] Test d'envoi depuis https://vhr-dashboard-site.onrender.com/contact.html
- [ ] Admin reçoit l'email de contact
- [ ] Admin répond et email est envoyé au contact

---

## 🆘 Dépannage

### Les enregistrements ne s'affichent pas comme valides dans Brevo

1. Vérifier la **propagation DNS:**
   - Utiliser [MXToolbox](https://mxtoolbox.com/)
   - Chercher votre domaine
   - Vérifier chaque enregistrement

2. Vérifier les **valeurs exactes** dans Cloudflare
   - Pas d'espaces supplémentaires
   - Pas de tirets supplémentaires
   - Vérifier les majuscules/minuscules

3. **Attendre la propagation:**
   - Brevo peut mettre jusqu'à 1h à valider
   - Cliquer sur "Check domain configuration" pour forcer la vérification

### Les emails ne s'envoient toujours pas

1. Vérifier que la **messagerie Brevo** est bien configurée dans `.env`
2. Vérifier que **EMAIL_ENABLED=true** dans Render
3. Vérifier les **logs Render** pour les erreurs

---

**Status: ⏳ EN ATTENTE - Enregistrements DNS à ajouter dans Cloudflare**
