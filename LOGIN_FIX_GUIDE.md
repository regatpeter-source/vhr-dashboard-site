# 🔧 Guide de Dépannage - Problème de Connexion Admin

## Symptôme
- ❌ Erreur: "Utilisateur inconnu" quand vous essayez de vous connecter avec `vhr`
- Console: `Failed to load resource: 401 - [API /api/me] Response status: 401`

## Cause
La base de données PostgreSQL n'a pas les utilisateurs par défaut (admin `vhr` et démo `VhrDashboard`).

## ✅ Solution Rapide

### Option 1: Appel d'initialisation (Recommandée)
Une fois le serveur redéployé (après le `git push`), attendez 1-2 minutes et exécutez:

**PowerShell (Windows):**
```powershell
cd c:\Users\peter\VR-Manager
.\init-admin-users.ps1
```

**Bash/Linux/Mac:**
```bash
bash ./init-admin-users.sh
```

**cURL (tous les OS):**
```bash
curl -X POST https://vhr-dashboard-site.onrender.com/api/admin/init-users
```

### Option 2: Vérifier le statut du déploiement
Allez sur https://dashboard.render.com et vérifiez que votre service a été redéployé.

## 🔑 Identifiants de connexion par défaut

| Champ | Valeur |
|-------|--------|
| **Username** | `vhr` |
| **Password** | `[REDACTED]` |
| **URL** | https://vhr-dashboard-site.onrender.com/account.html |

## 🐛 En cas de problème

1. Vérifiez les logs Render:
   - Allez à https://dashboard.render.com
   - Sélectionnez votre service
   - Consultez l'onglet "Logs"

2. Cherchez les messages:
   - `[DB] PostgreSQL initialized successfully` ✓
   - `[api/admin/init-users] ✓ Admin user created` ✓

3. Si ça échoue, lancez manuellement:
   ```
   curl -X POST https://vhr-dashboard-site.onrender.com/api/admin/init-users
   ```

## 📝 Qu'est-ce qui a changé?

Le serveur a été mis à jour pour:
1. **Créer automatiquement** les utilisateurs par défaut au démarrage (s'ils manquent)
2. **Exposer un endpoint** `/api/admin/init-users` pour initialiser manuellement
3. **Meilleur gestion d'erreur** au démarrage avec logs détaillés

## ✨ Prochaines étapes

Une fois connecté:
1. Allez à `https://vhr-dashboard-site.onrender.com/admin-dashboard.html`
2. Changez le mot de passe de l'admin
3. Créez des utilisateurs supplémentaires si nécessaire
