# 🌐 Configuration DNS Brevo sur Cloudflare

**Domaine:** vhr-dashboard-site.com  
**Date:** 18 décembre 2025  
**Fournisseur Email:** Brevo

---

## 📋 Enregistrements à ajouter (4 total)

Voici exactement ce que tu dois ajouter dans Cloudflare:

### 1️⃣ Verification TXT (SPF/Brevo)
```
Type:    TXT
Name:    @
Value:   brevo-code:a3f353e0f9caa01984bb9d6cd569b71b
TTL:     Auto
Proxy:   DNS only (☁️ gris)
```

### 2️⃣ DKIM 1
```
Type:    CNAME
Name:    brevo1._domainkey
Value:   b1.vhr-dashboard-site-onrender-com.dkim.brevo.com
TTL:     Auto
Proxy:   DNS only (☁️ gris)
```

### 3️⃣ DKIM 2
```
Type:    CNAME
Name:    brevo2._domainkey
Value:   b2.vhr-dashboard-site-onrender-com.dkim.brevo.com
TTL:     Auto
Proxy:   DNS only (☁️ gris)
```

### 4️⃣ DMARC
```
Type:    TXT
Name:    _dmarc
Value:   v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com
TTL:     Auto
Proxy:   DNS only (☁️ gris)
```

---

## 🚀 Instructions Cloudflare Pas à Pas

### Étape 1: Accéder à Cloudflare

1. Aller sur https://dash.cloudflare.com
2. Sélectionner le domaine **vhr-dashboard-site.com**
3. Cliquer sur **DNS** dans la barre latérale

### Étape 2: Ajouter le record TXT (Verification)

1. Cliquer **+ Add record**
2. Remplir:
   - **Type:** TXT
   - **Name:** @ 
   - **Content:** `brevo-code:a3f353e0f9caa01984bb9d6cd569b71b`
   - **TTL:** Auto
   - **Proxy status:** DNS only (☁️ gris, pas orange)
3. Cliquer **Save**

### Étape 3: Ajouter DKIM 1

1. Cliquer **+ Add record**
2. Remplir:
   - **Type:** CNAME
   - **Name:** `brevo1._domainkey`
   - **Content:** `b1.vhr-dashboard-site-onrender-com.dkim.brevo.com`
   - **TTL:** Auto
   - **Proxy status:** DNS only (☁️ gris)
3. Cliquer **Save**

### Étape 4: Ajouter DKIM 2

1. Cliquer **+ Add record**
2. Remplir:
   - **Type:** CNAME
   - **Name:** `brevo2._domainkey`
   - **Content:** `b2.vhr-dashboard-site-onrender-com.dkim.brevo.com`
   - **TTL:** Auto
   - **Proxy status:** DNS only (☁️ gris)
3. Cliquer **Save**

### Étape 5: Ajouter DMARC

1. Cliquer **+ Add record**
2. Remplir:
   - **Type:** TXT
   - **Name:** `_dmarc`
   - **Content:** `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`
   - **TTL:** Auto
   - **Proxy status:** DNS only (☁️ gris)
3. Cliquer **Save**

---

## ✅ Vérification de la Configuration

### Dans Cloudflare

Après l'ajout, tu devrais voir dans **DNS → Records**:

```
@ (root)           TXT    brevo-code:a3f353e0f9caa01984bb9d6cd569b71b
brevo1._domainkey  CNAME  b1.vhr-dashboard-site-onrender-com.dkim.brevo.com
brevo2._domainkey  CNAME  b2.vhr-dashboard-site-onrender-com.dkim.brevo.com
_dmarc             TXT    v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com
```

### Dans Brevo

1. Aller sur **Settings** → **Domains & Sender Identities**
2. Cliquer **Check DNS Records** ou **Verify**
3. Attendre la vérification (peut prendre 24-48h max)
4. Tous les records devraient montrer ✅

### Test en Ligne

Vérifie avec ces outils:

- **SPF/Brevo Code:** https://mxtoolbox.com/spf.aspx?domain=vhr-dashboard-site.com
- **DKIM:** https://mxtoolbox.com/dkim.aspx?domain=vhr-dashboard-site.com&selector=brevo1
- **DMARC:** https://dmarcian.com/dmarc-survey/?domain=vhr-dashboard-site.com

---

## ⏱️ Délais d'Attente

```
Ajout dans Cloudflare:   Immédiat (quelques secondes)
Propagation DNS:         15 min - 24h (généralement 1-2h)
Vérification Brevo:      Automatic (après propagation)
Envoi d'emails:          OK une fois tous les records ✅
```

---

## 🔍 Dépannage

### "DNS records not verified" dans Brevo

**Causes possibles:**
1. Les records ne se sont pas encore propagés → attendre 24h
2. Les records sont mal copiés → vérifier caractère par caractère
3. CNAME pointe vers un proxy Cloudflare → s'assurer que **DNS only** (gris)

**Solutions:**
- Vérifier avec `nslookup`:
  ```powershell
  nslookup brevo1._domainkey.vhr-dashboard-site.com
  ```
- Attendre la propagation complète
- Cliquer **Verify** à nouveau dans Brevo

### Les emails vont au spam

Une fois les DNS validés:
1. Utiliser un sender email valide: `noreply@vhr-dashboard-site.com`
2. Ajouter un email de réponse dans Brevo Settings
3. Commencer avec un volume faible
4. Augmenter progressivement

### Erreur "CNAME conflict"

Si Cloudflare bloque l'ajout d'un CNAME à la racine (@):
- C'est normal, ce record TXT n'est pas un CNAME
- Le record @ TXT pour `brevo-code` est correct
- Les CNAME brevo1 et brevo2 vont fonctionner

---

## 📊 Checklist Final

- [ ] Record TXT (brevo-code) ajouté dans Cloudflare
- [ ] DKIM 1 (brevo1._domainkey) ajouté dans Cloudflare
- [ ] DKIM 2 (brevo2._domainkey) ajouté dans Cloudflare
- [ ] DMARC (_dmarc) ajouté dans Cloudflare
- [ ] **Tous les records en "DNS only"** (pas proxiés)
- [ ] DNS propagation confirmée (attendre 1-24h)
- [ ] Vérification effectuée dans Brevo Settings
- [ ] Tous les records montrent ✅ dans Brevo
- [ ] Sender email configuré: noreply@vhr-dashboard-site.com
- [ ] Email de test envoyé avec succès

---

## 🎯 Prochaines Étapes

Une fois que Brevo confirme que tous les DNS sont validés:

1. **Configuration Render:**
   - Ajouter les variables d'environnement Brevo
   - EMAIL_ENABLED=true
   - BREVO_SMTP_USER et BREVO_SMTP_PASS
   - Redéployer

2. **Tester l'envoi d'emails:**
   - Envoyer un email de test depuis le dashboard
   - Vérifier la réception
   - Vérifier les logs Brevo

3. **Monitoring:**
   - Vérifier régulièrement les rapports de livraison
   - Surveiller les bounces dans Brevo

---

## 📚 Ressources

- [Brevo: How to add a domain](https://help.brevo.com/hc/en-us/articles/208758119)
- [Cloudflare: DNS Management](https://developers.cloudflare.com/dns/manage-dns-records/)
- [Understanding DKIM, SPF, DMARC](https://dmarcian.com/what-is-dmarc/)
- [Email Authentication Guide](https://blog.google/products/gmail/3-for-3-email-authentication/)

---

**Status: ✅ PRÊT À IMPLÉMENTER**

Les 4 enregistrements DNS sont prêts à être ajoutés. Fais-moi signe une fois que tu les as tous ajoutés dans Cloudflare! 🚀
