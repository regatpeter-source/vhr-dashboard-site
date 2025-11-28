# VHR DASHBOARD – Site Vitrine

![Qualité du site vitrine](https://github.com/regatpeter-source/vhr-dashboard-site/actions/workflows/site-quality.yml/badge.svg)

Ce dépôt contient le site vitrine commercial de VHR DASHBOARD, une solution SaaS pour la gestion et le contrôle à distance de casques VR.

## 📦 Structure du projet

- `site-vitrine/` : Contient tous les fichiers du site web statique (HTML, CSS, JS). C'est ce dossier qu'il faut publier sur GitHub Pages.
- `public/`, `server.js`, etc. : Partie dashboard/serveur (non concernée par GitHub Pages, mais utile pour la démo locale ou l’admin).

## 🚀 Déploiement sur GitHub Pages

1. **Créer un dépôt GitHub** (ex: `vhr-dashboard-site`)
2. Copier le contenu du dossier `site-vitrine/` à la racine du dépôt OU pousser tout le projet et configurer Pages sur `site-vitrine/`.
3. Sur GitHub, aller dans **Settings > Pages** :
   - Source : choisir la branche (ex: `main`) et le dossier `/site-vitrine`.
   - Valider. L’URL du site sera affichée après quelques minutes.

## 🖥️ Prévisualisation locale

Dans le dossier `site-vitrine/` :

```sh
python -m http.server 8080
```

Puis ouvrir [http://localhost:8080](http://localhost:8080)

## 💳 Offre SaaS

- Location mensuelle du dashboard VR
- Gestion à distance des casques
- Paiement simulé sur la page "Tarifs"

## 📄 Pages incluses

- Accueil
- Fonctionnalités
- Tarifs
- Contact
- Mentions légales

## 🤝 Contact

Pour toute question ou demande commerciale, voir la page Contact du site.

---

*VHR DASHBOARD – Gérez vos casques VR à distance, simplement.*

## ⚠️ Stripe checkout (local dev)

This project uses Stripe Checkout via a server-side endpoint (`POST /create-checkout-session`). To test payments locally, follow these steps:


For PowerShell (Windows):
```powershell
$env:STRIPE_SECRET_KEY = 'sk_test_...'
node server.js
```

Then open your browser at http://localhost:3000/pricing.html and click the buttons. If the server returns a `No such price` error, verify you're using the Test mode price ID and that `STRIPE_SECRET_KEY` is a secret key (sk_test_...).

If you want to verify your Stripe secret key or debug locally, enable the debug route by setting `STRIPE_DEBUG_PRICES=1` and visit `/stripe-check` from localhost (only for local testing):

```powershell
$env:STRIPE_DEBUG_PRICES = '1'
$env:NO_ADB = '1'
$env:STRIPE_SECRET_KEY = 'sk_test_...'
node server.js
# then open http://localhost:3000/stripe-check
```

## CI smoke test
The repository includes a GitHub Actions workflow that runs a smoke test on push/PR to `main`. The test verifies that the server is reachable, that the CSP header is present, and that POST `/create-checkout-session` returns a `url`.

To enable the CI smoke test, set the repository secrets:
- `STRIPE_SECRET_KEY` : your Stripe secret key (sk_test_...)
- `SMOKE_TEST_PRICE_ID` : a valid Stripe test price ID, e.g. `price_test_...`

The workflow file is `.github/workflows/stripe-smoke.yml`.
