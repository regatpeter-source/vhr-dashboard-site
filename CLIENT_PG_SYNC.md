# Synchroniser le dashboard PRO local avec PostgreSQL 18 (sécurisé)

1) Préparer un utilisateur Postgres restreint
- Créez un user dédié (droits uniquement sur le schéma/DB du dashboard, pas de superuser).
- Mot de passe fort, rotation recommandée.
- Ouvrez le firewall / security group pour l’IP du client sur le port 5432 uniquement.
- Activez SSL/TLS sur le serveur Postgres.

2) Générer un .env pour le client
- Copiez `CLIENT_ENV_TEMPLATE.env` en `.env` dans le dossier du zip du client.
- Renseignez :
  - `DATABASE_URL=postgresql://<pg_user_restreint>:<motdepasse>@<hote_pg>:5432/<base_pg>`
  - `DATABASE_SSL=true` et `PGSSLMODE=require` (recommandé).
  - `JWT_SECRET` et `LICENSE_SECRET` uniques pour ce client.
- Laissez `STRIPE_*` et `EMAIL_*` vides si non nécessaires côté client.

3) Tester la connectivité
- Sur la machine client, avant de lancer :
  - `ping <hote_pg>` ou `Resolve-DnsName <hote_pg>` (PowerShell) pour vérifier le DNS.
  - `psql "postgresql://user:pass@<hote_pg>:5432/<base_pg>?sslmode=require" -c "SELECT 1"` pour valider l’accès.

4) Lancer le serveur local
- Dans le dossier du zip : `npm start` (ou le script fourni). 
- Le serveur doit afficher un mode Postgres (pas d’erreur ENOTFOUND/ECONNREFUSED).
- Si un ancien cookie JWT traîne, vider les cookies/localStorage du domaine local puis réessayer le login.

5) Bonnes pratiques de sécurité
- Ne distribuez jamais l’utilisateur admin Postgres ; utilisez un compte restreint.
- Limitez l’accès réseau (whitelist IP du client, pas d’exposition publique ouverte).
- Exigez SSL (`PGSSLMODE=require`).
- Renouvelez les secrets (JWT/LICENSE) par client.
- Si le client n’a pas d’IP fixe, envisagez un VPN ou une passerelle intermédiaire avec IP fixe.

6) Option silence des warnings
- Le warning `better-sqlite3` est cosmétique si `DATABASE_URL` est défini. Pour le supprimer : `npm install better-sqlite3` avant de zipper.
