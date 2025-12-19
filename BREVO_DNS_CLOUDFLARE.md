# 📧 Configuration DNS Brevo vers Cloudflare

## 📋 Résumé

Ce guide configure les enregistrements DNS Brevo (SPF, DKIM, DMARC) dans Cloudflare pour une meilleure délivrabilité des emails.

---

## 🔑 Étape 1: Obtenir les enregistrements DNS Brevo

### Dans le tableau de bord Brevo:

1. Aller sur **Settings** (⚙️) → **Domains & Sender Identities**
2. Cliquer sur **Add a domain** ou sélectionner le domaine existant
3. Brevo te montrera 3 enregistrements DNS à ajouter:

```
Type de record: TXT
Enregistrement SPF:  v=spf1 include:mail.brevo.com ~all
Enregistrement DKIM: (clé DKIM fournie par Brevo)
Enregistrement DMARC: v=DMARC1; p=none; rua=mailto:...
```

**⚠️ IMPORTANT:** Copie ces valeurs exactes - tu en auras besoin pour Cloudflare!

---

## 🌐 Étape 2: Ajouter les enregistrements dans Cloudflare

### Prérequis:
- Domaine pointant vers Cloudflare (nameservers changés)
- Accès au dashboard Cloudflare

### Ajouter SPF:

1. Aller sur **DNS** → **Records** dans Cloudflare
2. Cliquer **+ Add record**
3. Remplir:
   ```
   Type: TXT
   Name: @  (ou votre-domaine.com)
   Content: v=spf1 include:mail.brevo.com ~all
   TTL: Auto (ou 3600)
   Proxy: DNS only (☁️ gris, pas orange)
   ```
4. Cliquer **Save**

### Ajouter DKIM:

1. **+ Add record** à nouveau
2. Remplir:
   ```
   Type: CNAME
   Name: brevo._domainkey  (exactement comme ça)
   Content: [DKIM clé de Brevo]
   TTL: Auto
   Proxy: DNS only
   ```
3. Cliquer **Save**

**OU** si Brevo donne une clé TXT:

```
Type: TXT
Name: brevo._domainkey
Content: [Contenu de la clé DKIM]
TTL: Auto
Proxy: DNS only
```

### Ajouter DMARC:

1. **+ Add record**
2. Remplir:
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=none; rua=mailto:dmarc@votre-domaine.com
   TTL: Auto
   Proxy: DNS only
   ```
3. Cliquer **Save**

---

## ✅ Étape 3: Vérifier la configuration

### Vérification dans Brevo:

1. Aller dans **Settings** → **Domains & Sender Identities**
2. Cliquer **Check DNS Records** ou **Verify**
3. Brevo confirmera:
   - ✅ SPF validé
   - ✅ DKIM configuré
   - ✅ DMARC en place

### Vérification dans Cloudflare:

Dans **DNS** → **Records**, tu devrais voir:
```
@ TXT v=spf1 include:mail.brevo.com ~all
brevo._domainkey CNAME [clé Brevo]
_dmarc TXT v=DMARC1; p=none; ...
```

### Test en ligne:

Utilise ces outils pour vérifier:
- **SPF Checker:** https://mxtoolbox.com/spf.aspx
- **DKIM Checker:** https://mxtoolbox.com/dkim.aspx
- **DMARC Checker:** https://dmarcian.com/dmarc-survey/

---

## 🔍 Dépannage

### Les records n'apparaissent pas dans Cloudflare

- Attends 24-48h pour la propagation DNS
- Vérifier que le domaine pointe bien vers Cloudflare (nameservers)
- Forcer le refresh: `nslookup @1.1.1.1 votre-domaine.com`

### Brevo dit "DNS not verified"

1. Vérifier l'exactitude des valeurs copiées
2. S'assurer que les records sont en **DNS only** (pas proxiés)
3. Attendre la propagation DNS complète
4. Cliquer **Verify** à nouveau dans Brevo

### Les emails vont au spam

Une fois les DNS validés:
1. Améliorer le contenu (moins de pièces jointes, liens suspects)
2. Envoyer depuis une adresse reconnue
3. Réduire le volume si nouveau domaine
4. Utiliser une IP warm-up (progression progressive)

---

## 📊 Configuration Finale Attendue

Après propagation DNS complète (24-48h), dans Brevo tu devrais avoir:

```
✅ SPF: VALID
✅ DKIM: VALID  
✅ DMARC: VALID
✅ Domain Verified
✅ Ready to send emails
```

---

## 🎯 Bonnes Pratiques

1. **Domaine de sendeur:** Utiliser `noreply@votre-domaine.com` ou `contact@votre-domaine.com`
2. **Adresse de réponse:** Configurer dans Brevo pour recevoir les réponses
3. **Test avant production:** Envoyer un email de test avant d'envoyer à des clients
4. **Monitoring:** Vérifier régulièrement les rapports de livraison dans Brevo

---

## 📚 Ressources

- [Brevo DNS Configuration](https://help.brevo.com/hc/en-us/articles/208758119-How-to-add-a-domain)
- [Cloudflare DNS Management](https://developers.cloudflare.com/dns/manage-dns-records/)
- [SPF, DKIM, DMARC Explained](https://dmarcian.com/what-is-dmarc/)
- [Email Authentication Best Practices](https://blog.google/products/gmail/3-for-3-email-authentication/)

---

**Status: 📋 GUIDE PRÊT - En attente de ton domaine pour l'étape finale**

Quel est ton domaine pour Cloudflare?
