# 📦 VHR Dashboard Pro – Pack Client Local

Ce pack permet à chaque abonné de lancer le Dashboard Pro **en local** sur son PC (Windows), avec détection du casque via ADB, sans changer l’authentification actuelle (démo 7 jours, login existant).

## Inclus dans le pack
- Code Dashboard Pro (inchangé)
- Scripts de démarrage local (HTTP) avec logs silencieux
- Fichier `.env` pré-rempli pour l’usage local (FORCE_HTTP=1, QUIET_MODE=1)

## Prérequis côté client
- Windows 10/11
- ADB disponible (installé ou fourni)
- Chrome/Edge à jour
- (Optionnel) Node.js installé si vous ne livrez pas une version portable de Node dans le zip

## Installation (client final)
1. Télécharger le ZIP fourni.
2. Décompresser dans un dossier (ex: `C:\VHR-Dashboard-Pro`).
3. Double-cliquer sur `start-dashboard-pro.bat` (ou `start-dashboard-pro.ps1`).
4. Le navigateur s’ouvrira sur `http://localhost:3000/vhr-dashboard-pro.html`.
5. Brancher le casque (USB) ou via réseau local (ADB over WiFi) pour la détection/streaming.

## Authentification / Démo 7 jours
- Aucun changement : le système d’auth et la démo 7 jours restent identiques.
- Les utilisateurs se connectent avec leurs identifiants habituels.

## Fichier .env (local)
Un exemple `.env.client-example` est fourni. Copiez-le en `.env` si besoin. Paramètres clés :
- `FORCE_HTTP=1` (obligatoire pour ADB/local)
- `QUIET_MODE=1` (logs verbeux masqués côté console)
- Conservez vos clés BREVO/Stripe si nécessaires; sinon laissez vides pour le local.

## Commandes utiles (si Node est installé)
```bash
npm ci --omit=dev
node server.js
```

## Support
- Le pack est prévu pour un usage local. ADB ne traverse pas Internet.
- Si le casque n’est pas détecté : vérifiez `adb devices` et les permissions USB.
