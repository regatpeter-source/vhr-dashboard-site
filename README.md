Environment variables
---------------------
The server uses the following environment variables. Configure them in Render (or your host) or place them in a local `.env` for development.

- STRIPE_SECRET_KEY: your stripe sk_test_... key (required for live Stripe features)
- STRIPE_DEBUG_PRICES: set to `1` to enable `/stripe-check` debug route
- NO_ADB: set to `1` if the host should skip ADB tracking (recommended for cloud)
- JWT_SECRET: a secret for signing JWT tokens (change in production!)
- PORT: the port to run the server on (defaults to 3000)
 - DB_SQLITE_FILE: path for the SQLite DB file (default `./data/vhr.db`). If set and `better-sqlite3` installed, the server will use SQLite to persist users.
 - STRIPE_WEBHOOK_SECRET: set it with the webhook secret to validate Stripe webhooks in production.

Streaming notes & ADB
---------------------
The backend uses ADB and system tools like `ffmpeg`, `adb`, and `scrcpy` to drive streaming and native-screen capture. For production use of streaming features, the server must be on the same local network as the devices or able to reach them. Running the Node app in a remote cloud environment (Render, Heroku) usually prevents direct access to local devices — in such cases, set `NO_ADB=1` or use a local on-prem deployment (e.g., a machine inside the customer network) to support streaming/ADB features.

# VHR Dashboard (VR Manager)

This repository contains the VHR Dashboard project: a Node.js app for managing and streaming VR headsets and a static `site-vitrine` folder for the marketing website.

Preview (GitHub Pages)
----------------------

The repository includes a GitHub Actions workflow to publish the `site-vitrine/` folder to the `gh-pages` branch on pushes to the `feat/dev-setup-pr` branch.

How to use:
- Push to `feat/dev-setup-pr` branch.
- In GitHub, open the `Actions` tab to see the workflow run.
- Once the workflow completes, enable GitHub Pages on branch `gh-pages` (Settings -> Pages) if not already enabled.
- Your preview is then available at: https://regatpeter-source.github.io/vhr-dashboard-site/

Notes:
- This workflow publishes only the static site in `site-vitrine`; the backend (Express server) is not deployed in this preview.
- For dynamic preview (backend), consider using platforms such as Heroku, Render, or Vercel and set up environment variables accordingly.

Full deployment (backend + frontend) with Render
-----------------------------------------------

This repository includes a `Dockerfile` so you can deploy the full Node.js backend (including dependencies like adb, ffmpeg, scrcpy) on Render or similar services. Note that streaming features depend on network access to devices, and may not work if Render cannot reach the device network.

Render quick deployment steps:
1. Create a new Web Service on Render: https://dashboard.render.com/new/web-service.
2. Connect your GitHub repository and select the `feat/dev-setup-pr` branch.
3. Choose Docker as the Environment (Render will use the included Dockerfile).
4. Add environment variables in the Render dashboard: `STRIPE_SECRET_KEY`, `JWT_SECRET`, `NO_ADB` (set to `1` for Skip ADB or `0` to enable), `STRIPE_DEBUG_PRICES`, `PORT`.
5. Save and deploy. The Deploy logs are available in Render’s dashboard.

Optional: automatic redeploy from GitHub Actions
1. Create and configure a Render Web Service as above.
2. Add `RENDER_API_KEY` (your Render API key) and `RENDER_SERVICE_ID` (the service's id) to the repository secrets in GitHub.
3. The included `.github/workflows/deploy-full-app.yml` will trigger a Render redeploy on pushes to `feat/dev-setup-pr`.

Attention: erreur `npm ci` durant le build sur Render
----------------------------------------------------
Si Render renvoie une erreur similaire à : "`npm ci` ne peut installer de paquets que si vos fichiers package.json et package-lock.json sont synchronisés", le problème provient d'une désynchronisation entre `package.json` et `package-lock.json`.

Remèdes possibles :
- Re-générez `package-lock.json` dans un environnement Linux (WSL/Ubuntu, Docker builder) : `npm install` puis commitez `package-lock.json` sur la branche déployée. Cela rendra `npm ci` fiable et plus rapide.
- Si vous ne pouvez pas régénérer tout de suite, basculez temporairement la branche Render sur `fix-docker-npm-install` (branche de test fournie). Cette branche contient un Dockerfile plus tolérant qui tente `npm ci` puis retombe sur `npm install` si nécessaire. Cela évite les erreurs de build dues à la désynchronisation.
- Vérifiez si le Dockerfile contient l'installation des paquets système requis (ex: `build-essential`, `python3`, `libsqlite3-dev`) car `better-sqlite3` et autres modules natifs nécessitent ces dépendances pour se compiler.

Étapes recommandées :
1. Regénérez `package-lock.json` sur WSL/Ubuntu: `npm install` puis `git add package-lock.json && git commit -m "fix: regen lockfile" && git push`.
2. Si vous ne pouvez pas regénérer immédiatement, mettez Render sur la branche `fix-docker-npm-install` le temps de résoudre le lockfile.
3. Configurez Render pour utiliser la route de health `/health` et définissez `STRIPE_SECRET_KEY` sans guillemets.


Contôler Render via API (scripts)
----------------------------------
Vous pouvez déclencher un déploiement manuel et récupérer les logs via l'API Render en utilisant deux scripts PowerShell fournis dans `scripts/`:

- `scripts/render-deploy.ps1` — déclenche un deploy manuel. Il requiert deux variables d'environnement : `RENDER_API_KEY` et `RENDER_SERVICE_ID`.
- `scripts/render-logs.ps1` — récupère les logs d'un déploiement (ou du déploiement le plus récent) via `RENDER_API_KEY` et `RENDER_SERVICE_ID`.

Exemples d'utilisation (PowerShell):

```powershell
$env:RENDER_API_KEY = "<votre render api key>"
$env:RENDER_SERVICE_ID = "srv-xxxxxxxxxxxxxxxx"
# Trigger manual deploy
.\scripts\render-deploy.ps1
# Get latest logs
.\scripts\render-logs.ps1
```

Conseil: vous pouvez stocker `RENDER_API_KEY` dans GitHub Secrets et l'utiliser pour GitHub Actions afin de déclencher un redeploy automatique sur les pushes.

Database & Stripe webhook setup (production)
--------------------------------------------
 - To use SQLite in production, install `better-sqlite3` (e.g., `npm install better-sqlite3`) then set `DB_SQLITE_FILE` in your environment. The app will automatically create `data/vhr.db` and migrate existing `data/users.json` if present.
 - A migration helper is available at `scripts/migrate-to-sqlite.js` to move `data/users.json` into SQLite. Run it after installing `better-sqlite3` with:
   
	 node scripts/migrate-to-sqlite.js
   
	 It will initialize the DB and migrate users from the JSON file into `data/vhr.db`.
 - To validate Stripe webhooks, set `STRIPE_WEBHOOK_SECRET` (from the Stripe dashboard) in your environment. The webhook endpoint `/webhook` uses this secret for signature verification.
 - For high-scale/production usage consider migrating to a proper RDBMS like Postgres and a robust migration strategy.

