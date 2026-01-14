# Activer HTTPS local pour le casque via mkcert (dashboard pro)

Objectif : permettre au casque (Quest/Android) d’accéder au dashboard pro en HTTPS local sans avertissement, tout en gardant l’ADB sur la machine locale. On utilise mkcert pour générer un certificat local signé par une autorité que l’on installe sur le casque.

## Pré-requis
- PC avec accès admin (Windows dans ce projet) et ADB fonctionnel.
- mkcert installé sur le PC.
- Le casque relié au même réseau (Wi-Fi) et l’ADB disponible sur la machine locale.

## Étapes côté PC (Windows)
1) Installer mkcert (si absent) :
   - Télécharger depuis https://github.com/FiloSottile/mkcert/releases (binaire Windows).
   - Placer mkcert.exe dans un dossier présent dans le PATH ou dans le repo.

2) Initialiser l’autorité locale :
   - `mkcert -install`
   - Cela ajoute la racine mkcert dans le store de confiance du PC.

3) Générer un certificat pour l’IP (et/ou hostname) utilisée par le casque :
   - Identifier l’IP LAN du PC vue par le casque, ex. 192.168.X.Y.
   - Générer : `mkcert -cert-file cert.pem -key-file key.pem 192.168.X.Y`
   - Optionnel : ajouter un hostname local si tu en utilises un : `mkcert -cert-file cert.pem -key-file key.pem 192.168.X.Y monpc.local`
   - Copier/écraser les fichiers `cert.pem` et `key.pem` à la racine du projet (ils y sont déjà référencés par `.env`).

4) Vérifier `.env` (côté app locale) :
   - `HTTPS_ENABLED=1`
   - `HTTPS_CERT_FILE=./cert.pem`
   - `HTTPS_KEY_FILE=./key.pem`
   - `FORCE_HTTP=0`
   - Laisser `ADMIN_ALLOWLIST` tel quel (fallback conserve vhr admin si vide).

5) Redémarrer le serveur Node local (port 3000). La page doit être servie en HTTPS avec ce certificat.

## Étapes côté casque (Quest/Android)
Objectif : installer la racine mkcert pour que le cert soit accepté.

1) Récupérer la racine mkcert générée sur le PC :
   - Emplacement par défaut : `C:\Users\\<toi>\\AppData\\Local\\mkcert\\rootCA.pem`

2) Copier sur le casque :
   - `adb push rootCA.pem /sdcard/Download/`

3) Installer la racine sur le casque :
   - Sur le Quest : Paramètres > Sécurité > Chiffrement & identifiants > Installer depuis le stockage.
   - Choisir `rootCA.pem`, valider l’installation.
   - Redémarrer le casque.

4) Connexion :
   - Depuis le casque, ouvrir `https://192.168.X.Y:3000/launch-dashboard.html` (remplacer par l’IP/hostname utilisé lors de la génération du certificat).
   - Le navigateur doit accepter le certificat (pas d’avertissement) et les WebSocket passeront en `wss://`.

## Notes et dépannage
- Si le casque affiche encore un avertissement, vérifier que l’IP/hostname utilisé dans l’URL correspond bien à ceux inclus dans le certificat généré.
- Si tu changes d’IP LAN, régénère un certificat avec la nouvelle IP et réinstalle si nécessaire.
- Ne pas mélanger HTTP et HTTPS : si la page est en HTTPS, les WebSocket doivent être en `wss://` (c’est déjà le cas dans le code quand la page est chargée en HTTPS).
- Render ne sert pas au streaming ADB ; le streaming doit se faire sur la machine locale avec ADB branché. HTTPS côté Render est déjà géré par le proxy Render.
