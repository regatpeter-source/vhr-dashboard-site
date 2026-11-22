# Audit de fonctionnement — VHR Dashboard 1.0.5

**22 novembre 2026 · Windows · révision `c06acd4e633b`**

**Décision :** les parcours courants du site et du Dashboard Pro fonctionnent dans les conditions locales testées. L’audit ne donne pas de feu vert sans réserve pour la production : deux protections dépendent de secrets facultatifs ou distribués au client, une inscription ne reprend pas correctement en l’absence de SMTP, et les deux canaux Android ne livrent pas le même binaire.

## Ce qui a été exécuté

| Périmètre | Vérification | Résultat observé |
|---|---|---|
| Régression | `npm.cmd test`, cinq fichiers de tests | **30 réussis, 0 échec, 0 ignoré.** Cela inclut des tests de logique, des vérifications du code source et des services simulés ; ce ne sont pas 30 parcours de bout en bout. |
| Code et dépendances | `node --check` sur 60 fichiers JS (serveurs, services, configurations et scripts publics) ; `npm ls --depth=0 --offline` à la racine et dans `dist-client` | Aucune erreur de syntaxe ni anomalie des dépendances directes installées. Ce n’est pas une analyse des vulnérabilités de leurs versions. |
| Site et comptes | Serveur réel, sur stockage de repli JSON puis sur un cluster PostgreSQL 16.15 neuf. Inscription, réception SMTP locale, ouverture du lien de confirmation, connexion et lecture du bon profil par cookie | Inscription valide et confirmation : **200** ; doublon : **400** ; connexion avant confirmation : **403** ; mauvais mot de passe après confirmation : **401**. Le compte vérifié peut encore se connecter après redémarrage du serveur dans les deux modes. |
| Interface web | Accueil, tarifs et compte dans Chromium (Electron 29.4.6). Connexion par le formulaire, affichage du nom du compte, déconnexion | L’accueil s’affiche ; les trois boutons de tarif sont visibles et associés à leur gestionnaire ; l’espace personnel puis le formulaire de connexion s’affichent au bon moment. Aucun paiement déclenché. |
| API métier web | Accès anonyme, puis compte d’essai confirmé ; ajout, lecture, suppression d’un jeu et d’un favori ; statut d’essai, éligibilité au téléchargement, envoi du formulaire de contact | Ressources protégées refusées sans session. Les éléments ajoutés apparaissent dans la liste, puis en disparaissent après suppression. Les API de statut, d’éligibilité et de contact répondent **200**. |
| Dashboard Pro Windows | Serveur desktop sous le runtime Electron, compte SQLite de test, ADB désactivé. Ouverture de l’écran de connexion puis authentification dans l’interface | Tableau de bord déverrouillé. L’API des casques répond **401** sans session, puis **200** avec une liste vide pour le compte connecté. Les scripts, la feuille de style et le client Socket.IO sont servis. Cela ne valide pas un flux audio/vidéo. |
| Distribution Windows | Lecture de l’installeur local `VHR.Dashboard.Setup.1.0.5.exe`, extraction de son `app.asar`, comparaison puis chargement de l’adaptateur SQLite depuis l’archive correspondante | L’archive applicative est identique à celle de `win-unpacked`. Six fichiers clés, dont les entrées Electron/serveur et le JS du dashboard, sont identiques aux sources testées. Écriture et relecture SQLite réussies depuis l’archive. L’installeur n’a pas été exécuté. |
| Android | Lecture des deux manifestes par `aapt2`, empreintes SHA-256 et signatures par `apksigner` | Les deux APK ont une activité de lancement et une signature v2 valide. Ils ne sont pas interchangeables du point de vue de la compatibilité déclarée : voir ci-dessous. |
| Paiement | Tests du catalogue TTC, des modes, des intervalles et du statut payé ; requête Checkout incomplète sur le serveur de test | Les règles testées passent et la requête incomplète est rejetée (**400**). Aucun encaissement, événement Stripe réel ou renouvellement n’est attesté. |

## Constats et actions, par priorité

| Priorité | Constat et preuve | Action et critère de validation |
|---|---|---|
| **Haute — paiements** | **Revue du code, pas de test offensif.** Le [traitement du webhook](./server.js#L11748) vérifie la signature quand le secret est défini, mais prévoit aussi un traitement sans vérification quand il ne l’est pas, sans réserver cette branche au développement. La configuration effective de production n’a pas été inspectée. | Rendre le secret obligatoire en mode hébergé ou désactiver explicitement le webhook sans lui. Tester sur préproduction le refus en son absence et le passage d’un événement Stripe authentique en mode test. |
| **Haute — synchronisation des comptes** | **Revue du code.** Une même valeur de repli figure dans le [serveur](./server.js#L95) et le [JavaScript distribué au client](./dist-client/public/dashboard-pro.js#L2918). Le [contrôle serveur](./server.js#L5480) accorde à ce secret des droits de synchronisation. Une valeur livrée aux clients ne peut pas servir de preuve d’autorisation serveur. Aucun accès à un compte tiers n’a été tenté. | Retirer le secret commun du client et du mécanisme de repli, renouveler la valeur si elle a servi, et limiter les clients à des autorisations individuelles révocables. Vérifier que la synchronisation légitime fonctionne toujours avec ces droits limités. |
| **Haute pour les inscriptions si le courrier est indisponible** | **Reproduit** avec la vérification d’adresse active et sans identifiants SMTP : première inscription **500** (« réessayer »), nouvelle tentative **400** (« existe déjà »), renvoi immédiat **429**. Le compte a été enregistré, mais le client ne dispose pas du lien. Voir [création du compte](./server.js#L5982), [préparation du courrier](./server.js#L1763) et [horodatage de l’envoi](./server.js#L4096). | Expliquer que le compte est en attente, fournir un chemin de renvoi et ne démarrer le délai de renvoi qu’après acceptation du message. Critère : après rétablissement du SMTP, la même inscription aboutit à un compte utilisable sans recréation ni intervention administrateur. |
| **Moyenne — cohérence Android** | L’[APK du site](./public/downloads/vhr-voice.apk) et l’[APK du client](./dist-client/public/downloads/vhr-voice.apk) ont le même paquet `com.vhr.voice`, la même version `1.0.0` et le même `versionCode=1`, mais des contenus et des SDK minimaux différents. Le site déclare **API 23**, le client **API 26**. Tous deux ciblent l’API 34 et sont signés avec un certificat **Android Debug**. | Pour une même livraison, publier un binaire de référence et vérifier son empreinte dans les deux canaux. Si deux variantes sont intentionnelles, les distinguer et documenter les appareils compatibles. Prévoir une signature de distribution et tester la mise à niveau sur casque avant tout changement de clé. |
| **Moyenne — confiance Windows** | `Get-AuthenticodeSignature` renvoie **`NotSigned`** pour l’installeur local 1.0.5. La lisibilité de son contenu ne garantit pas l’identité de l’éditeur. | Signer et horodater la version distribuée ; vérifier la signature et faire une installation, une mise à niveau et une désinstallation sur une VM Windows propre. |
| **Prévention des régressions** | Aucun des six [workflows GitHub présents](./.github/workflows) n’appelle directement `npm test` ou `node --test`. Le test desktop SQLite actuel utilise un exécutable Electron Windows. | Exécuter la suite sur un runner Windows avec les dépendances des deux projets. Ajouter un scénario d’inscription avec panne puis reprise du SMTP. |

**Empreintes SHA-256 des fichiers locaux vérifiés** (elles n’attestent pas le contenu d’un téléchargement distant) :

| Fichier | SHA-256 |
|---|---|
| APK du site | `C2D687C61AA21E53AB30588DC9DCC4B098B8BB7C11EF7217B15D0F5C636E1825` |
| APK du client Windows | `C8BED5E9DBF9D00C8B1EB1354EB450ABFB306142066B630F132AC8C326C3333D` |
| Installeur Windows 1.0.5 | `D5988B3E1DBB8B897F8EC93D07CC686F89BC6E028B4B43368306870E0BFA737B` |

## Conditions et limites de la décision

Les parcours ont utilisé des copies de travail temporaires, des comptes fictifs, des ports de boucle locale et un récepteur SMTP sans livraison externe. Aucun fichier `.env` réel, base de production ou casque connecté n’a été utilisé. Le site a été exercé sous **Node 24.13.0**, pas dans l’image Docker Node 18 ; le test PostgreSQL portait sur **16.15**, pas sur une instance de production ni sur PostgreSQL 18. La vérification Windows porte sur le contenu du paquet et ses composants, pas sur le cycle d’installation de l’OS.

**Recette requise avant diffusion :**

1. **Préproduction :** après correction des deux protections, effectuer en mode test Stripe un achat, un renouvellement et une annulation ; vérifier le droit d’accès et l’absence de double attribution. Confirmer aussi la délivrabilité réelle d’un e-mail vers une boîte de recette.
2. **Windows propre + casque de test :** installer le fichier réellement publié, vérifier la connexion USB puis Wi-Fi, lancer une application, lire la batterie, transmettre voix et vidéo, puis débrancher et reconnecter le casque. Vérifier l’installation et la mise à niveau de l’APK distribué.
3. **Exploitation :** exécuter la suite dans l’environnement cible, restaurer une sauvegarde sur une base jetable et mesurer stabilité et latence avec plusieurs casques. Ces points ne sont pas couverts par les résultats locaux.

## Mise à jour après remédiations — 22 novembre 2026

Les corrections ci-dessous ont été apportées aux sources. La validation fonctionnelle demandée par l’utilisateur a ensuite été limitée à **VHR Dashboard 1.0.5 installé sur ce PC** ; les anciens essais sur copies temporaires, décrits plus haut, ne sont pas utilisés comme preuve pour ce test.

| Sujet | Correction / résultat actuel |
|---|---|
| Webhook Stripe | Le traitement exige une signature Stripe en production ; en l’absence de secret, la route est désactivée. Le comportement en production n’a pas été vérifié avec un événement Stripe réel. |
| Synchronisation | Le secret de repli distribué au client et la route qui le révélait ont été retirés. La route de synchronisation exige désormais un secret serveur configuré ; aucune synchronisation de production n’a été exécutée. |
| Inscription avec SMTP indisponible | Le compte reste en attente au lieu de renvoyer une erreur trompeuse après sa création. Le client propose une reprise, et un nouvel envoi ne démarre le délai qu’après disponibilité de la configuration SMTP. Correction vérifiée par analyse syntaxique uniquement ; aucun compte ni serveur de test externe n’a été utilisé dans cette phase. |
| APK | L’APK du site et celui du client ont maintenant la même empreinte SHA-256 (`C8BED5E9DBF9D00C8B1EB1354EB450ABFB306142066B630F132AC8C326C3333D`, 11 641 538 octets). |
| VHR Dashboard installé | Le paquet Windows 1.0.5 a été reconstruit, vérifié puis installé localement. Le logiciel a redémarré et affiché le casque « vhr 1 » connecté. Dans son interface, le choix de `vhr-voice.apk` depuis le PC a abouti au message **« APK envoyé avec succès »**. Après autorisation, l’action d’installation a été lancée ; l’écran du casque a ensuite listé `com.vhr.voice`, mais aucune confirmation finale de l’opération n’a pu être capturée. Aucun désinstallateur n’a été exécuté. |
| Contrôles effectués | `node --check` sur les fichiers JavaScript modifiés, construction Windows avec `electron-builder --dir`, inspection de l’archive créée et contrôle de l’empreinte installée. Aucun test automatisé ni serveur temporaire n’a été utilisé pour cette validation, conformément au périmètre demandé. |

**Limites restantes :** l’installeur Windows local reste non signé et l’APK utilise toujours le certificat de débogage relevé lors de l’audit. Les parcours Stripe de préproduction, la délivrabilité SMTP réelle et la confirmation finale d’une mise à niveau sur le casque restent à valider avant toute diffusion.
