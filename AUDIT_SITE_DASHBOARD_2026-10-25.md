# Audit du site vitrine et de VHR Dashboard

Date : 25 octobre 2026. Révision de référence : `8cc5805fe9771eb4b17ff867028663d39d602e00`.

## Conclusion

**Avis défavorable à une validation commerciale sans corrections.**

La création de compte avec validation d'email fonctionne sur le serveur du site. La connexion, l'essai de sept jours et l'activation d'un abonnement mensuel par webhook signé fonctionnent dans les scénarios locaux testés.

En revanche, deux anomalies touchent directement le client payant :

1. Le parcours de licence à vie peut recevoir le paiement simulé sans délivrer l'accès.
2. Le bouton de résiliation annonce un succès sans transmettre la résiliation à Stripe.

L'application embarque en outre une version du serveur différente de celle du site : routes d'administration cassées, contrôles d'accès incomplets, contrat de compte différent et défauts spécifiques à SQLite.

Ce rapport est un **audit local fonctionnel et technique**, pas une certification de production, de conformité juridique, de sécurité exhaustive ou de fonctionnement matériel.

## 1. Périmètre et précautions

Le périmètre autorisé était : **local isolé uniquement**.

- Copies des sources dans le répertoire de session, jamais de lancement direct des serveurs sur les données existantes.
- Aucun chargement des fichiers `.env` du projet, aucune copie des bases clients existantes.
- Comptes et mots de passe synthétiques ; adresses sous `example.invalid`.
- Serveurs liés à `127.0.0.1`, ports dédiés `43170`, `43171` et `43172`.
- Stripe simulé : appels et paramètres capturés, sans requête vers Stripe.
- Vérification des signatures de webhook avec le véritable SDK Stripe et un secret synthétique.
- E-mails générés par les véritables templates, puis capturés par un transport simulé. Aucun envoi réel.
- Connexions externes et commandes système des serveurs bloquées par le dispositif de test.
- ADB désactivé. Aucun accès, installation ou changement sur les casques.
- Binaires volumineux, APK, installateurs et vidéos exclus des copies : leur absence dans les copies ne constitue pas un défaut du produit.
- Aucune correction fonctionnelle appliquée au logiciel pendant cet audit.

### Configurations exécutées

| Configuration | Sources | Stockage | Runtime |
|---|---|---|---|
| Site | [server.js](./server.js) | JSON isolé | Node.js 24.13.0 |
| Application, repli JSON | [dist-client/server.js](./dist-client/server.js) | JSON isolé | Node.js 24.13.0 |
| Application, SQLite | [dist-client/server.js](./dist-client/server.js) et [adaptateur](./dist-client/db.js) | Véritable base SQLite isolée | Electron 29.4.6, Node.js 20.9.0, ABI 121 |

Le module natif SQLite installé pour Electron ne se charge pas sous Node.js 24 : ABI 121 contre ABI 137. Il a donc été testé avec le runtime Electron correspondant, **sans réinstallation ni recompilation**. Ce décalage n'est pas, à lui seul, la preuve d'un défaut de l'installateur livré.

## 2. Résultats mesurés

### API et parcours métier

| Lot | Assertions | Conformes | Écarts |
|---|---:|---:|---:|
| Site, JSON | 92 | 71 | 21 |
| Application, JSON | 88 | 53 | 35 |
| Application, SQLite | 88 | 50 | 38 |
| Contrôles complémentaires : contacts, téléchargements, contrats API, concurrence, Socket.IO | 51 | 49 | 2 |
| **Total** | **319** | **223** | **96** |

**Interprétation importante : 96 écarts d'assertions ne signifient pas 96 bugs distincts.** Un même défaut fait échouer plusieurs contrôles. La matrice sonde également des routes présentes sur le site mais absentes de l'application, des différences de contrat et des politiques à clarifier. Les constats prioritaires sont regroupés en section 4.

Dans les fichiers de résultats, le code synthétique `599` signifie **expiration du délai du client de test**, et non un statut HTTP renvoyé par le serveur. Les journaux expliquent les timeouts d'administration par une `ReferenceError`.

### Interfaces et ressources

- **20 affichages Chromium** : dix pages/configurations, chacune en fenêtre de 1440 puis 390 pixels.
- Scénarios UI : inscription locale, tentative de routage de test, bouton d'abonnement, formulaire de contact, dashboard anonyme et connexion depuis son vrai formulaire.
- **23 liens locaux vérifiés** dans le lot complémentaire ; **5 en erreur 404**, tous issus de la navigation de la page compte de l'application.
- **43 fichiers JavaScript** vérifiés avec `node --check` : **42 valides, 1 invalide**.
- Aucun script `test`, lint ou build web n'est déclaré dans le [manifeste racine](./package.json). Les anciens scripts de test ont été inspectés avant tout lancement.
- Les dépendances de premier niveau ont été inventoriées hors ligne avec `npm ls --depth=0 --offline`.

### Concurrence et temps réel

- Vingt requêtes `/ping` simultanées ont réussi sur chacun des trois serveurs.
- Durée totale du lot local : respectivement **11 ms, 9 ms et 11 ms**. Ce contrôle de santé ne mesure ni la capacité de production ni les performances de streaming.
- **18 assertions Socket.IO réussies** : connexion de deux clients, génération du code à six caractères, rejet d'un code invalide, jonction, diffusion d'une action synthétique et maintien de la session après départ de l'hôte.

## 3. Parcours qui fonctionnent dans le périmètre testé

### Site vitrine et compte

- Inscription avec compte en attente de vérification.
- Génération d'un email contenant un lien de vérification.
- Refus de connexion avant vérification.
- Validation du lien ; refus d'un lien invalide ou déjà consommé.
- Temporisation du renvoi de l'email.
- Refus des doublons de nom et d'email, y compris la casse de l'email dans le stockage JSON du site.
- Échec SMTP signalé à l'inscription ; reprise possible par renvoi de vérification.
- Connexion par identifiant et par email sur le site.
- Cookie de session `HttpOnly` ; suppression du cookie à la déconnexion.
- Refus des JWT invalides et expirés.
- Refus des accès anonymes aux principales API de compte et de facturation.
- Refus des API d'administration du site à un utilisateur ordinaire.
- Suppression de son propre compte avec mot de passe, puis refus de son ancien JWT.

### Paiement mensuel simulé

- Checkout lié au compte authentifié ; les champs d'identité fournis par le client ne remplacent pas ce compte.
- Rejet d'un type de prix incompatible et d'un plan inconnu.
- Erreur de création Stripe remontée, sans URL de succès fictive.
- Signature de webhook invalide refusée.
- Webhook signé avec le **même client Stripe que celui du checkout** : abonnement activé dans les trois configurations.
- Rejeu du même événement d'abonnement sans second email de confirmation dans le scénario testé.
- Prise en compte HTTP des événements de cycle de vie ; disponibilité des listes de facturation et du portail simulé.

Ces contrôles ne prouvent pas un paiement bancaire, un parcours 3-D Secure, la délivrabilité d'un email ou un remboursement.

### Application et support

- Dashboard Chromium chargé, formulaire de connexion affiché.
- Connexion locale par le vrai formulaire : utilisateur affiché, formulaire masqué et jeton stocké.
- Affichage explicite de l'absence de casque.
- Statut d'essai actif/expiré disponible ; éligibilité au téléchargement cohérente dans les cas nominaux.
- Formulaire de contact : message enregistré et notification capturée quand une boîte de réception synthétique est configurée.
- Réponse explicite `501` pour les fonctions ADB désactivées, sans prétendre avoir testé le matériel.

## 4. Constats à corriger

Priorités : **P0** = parcours commercial bloquant ; **P1** = défaut majeur ; **P2** = qualité, cohérence ou dette technique.

### F01 — P0 — Licence à vie non délivrée par le parcours testé

**Confirmé sur le site et les deux configurations de l'application.**

Le checkout dédié accepte `PERPETUAL`, mais écrit `metadata.purchaseId = "perpetual_pro"`. Le webhook cherche ensuite `PURCHASE_OPTIONS[purchaseId]`, alors que la clé de configuration est `PERPETUAL`. Le produit n'est donc pas retrouvé.

Avec le même client Stripe que le checkout, un événement signé `checkout.session.completed`, `mode: payment`, `payment_status: paid`, montant de 499 euros :

- reçoit un accusé de réception HTTP 200 ;
- ne donne pas de licence active au client expiré ;
- laisse l'historique d'achat vide.

Le checkout générique utilisé par les boutons tarifaires ne transmet par ailleurs pas d'identifiant d'achat : il ne fournit que l'identité du compte. Son contrat doit aussi être raccordé à la délivrance du produit.

Sources : [checkout générique](./server.js), l. 2303 ; [checkout d'achat](./server.js), l. 7194 et 7237 ; [webhook](./server.js), l. 11559 ; [configuration](./config/purchase.config.js), l. 10. Équivalents : [serveur embarqué](./dist-client/server.js), l. 7112 et 11412.

**Correction attendue :** identifiant canonique commun aux checkouts et au webhook, produit validé côté serveur, création persistante de l'achat et de la licence, traitement idempotent. Vérifier l'accès et l'historique après rechargement, pas seulement le statut HTTP.

### F02 — P0 — Résiliation non transmise à Stripe

**Confirmé dans les trois configurations.**

`POST /api/subscriptions/cancel` répond avec succès mais ne fait que modifier les enregistrements locaux. La capture montre **zéro appel** de mise à jour ou de résiliation d'abonnement chez Stripe.

La fenêtre de confirmation indique pourtant au client qu'il conservera son accès jusqu'à l'échéance. Le serveur passe immédiatement le statut local à `cancelled`, sans planifier la fin de période chez le prestataire.

Sources : [résiliation du site](./server.js), l. 6832 ; [résiliation embarquée](./dist-client/server.js), l. 6595 ; [confirmation affichée](./public/js/account.js), l. 548.

**Correction attendue :** demander à Stripe l'arrêt en fin de période, conserver l'accès jusqu'à l'échéance et réconcilier l'état avec les webhooks. Ne pas annoncer une résiliation réussie si Stripe la refuse.

### F03 — P1 — Routes d'administration de l'application en exception

**Confirmé en JSON et SQLite.**

Les routes appellent `ensureAllowedAdmin`, mais cette fonction n'est pas définie dans le serveur embarqué. Des requêtes authentifiées sur les utilisateurs et abonnements restent sans réponse jusqu'au timeout du test. Les journaux contiennent :

```text
Unhandled Rejection: ReferenceError: ensureAllowedAdmin is not defined
```

Le serveur du site ne présente pas cette erreur sur les mêmes contrôles.

Source : [serveur embarqué](./dist-client/server.js), notamment l. 7286 et 7432.

**Correction attendue :** remettre en place le garde d'administration partagé, puis tester les réponses d'un anonyme, d'un client et d'un administrateur. Aucune requête ne doit rester suspendue.

### F04 — P1 — Droits de l'application non appliqués à toutes les routes

**Confirmé en JSON et SQLite, ADB toujours désactivé.**

Pour un compte dont l'essai est expiré, `/api/demo/status` indique bien le blocage, mais `/api/devices`, `/api/games` et `/api/favorites` répondent 200. Le site bloque `/api/devices`, mais laisse les deux autres listes accessibles dans la même situation.

Source : [routes de l'application](./dist-client/server.js), l. 9063, 9628 et 9675 ; comparaison avec le [garde du site](./server.js), l. 9715.

**Correction attendue :** définir les listes volontairement publiques et protéger de façon homogène les opérations et informations réservées. Les essais ci-dessus ne prouvent pas qu'une commande matérielle peut être exécutée : le matériel n'a pas été activé.

### F05 — P1 — Compte désactivé encore accepté par l'application

**Confirmé en JSON et SQLite.**

Un JWT synthétique valide d'un compte initialement marqué `disabled` est refusé par le site, mais accepté par `/api/me` de l'application. Le middleware embarqué consulte les identifiants supprimés, pas l'ensemble des états de désactivation. Les chemins de persistance ne conservent pas tous ces champs.

Sources : [middleware embarqué](./dist-client/server.js), l. 3726 ; [sauvegarde JSON](./dist-client/server.js), l. 2688 ; [schéma SQLite](./dist-client/db.js), l. 16.

**Correction attendue :** conserver les états de compte et appliquer le même refus à la connexion et aux requêtes munies d'un JWT déjà émis.

### F06 — P1 — Statuts Stripe non payés considérés comme un accès valide

**Confirmé sur le serveur du site avec des réponses Stripe simulées.**

Un essai expiré est débloqué pour `incomplete` et `incomplete_expired`. Ces états ne doivent pas être assimilés sans distinction à un abonnement actif. Les cas `unpaid` et `past_due` débloquent aussi l'accès.

Sources : [calcul d'accès](./server.js), l. 1284 ; [normalisation locale](./server.js), l. 1109 ; [affichage de compte](./public/js/account.js), l. 486.

**Correction attendue :** table de droits explicite par statut. La durée d'une éventuelle tolérance pour `past_due` doit faire l'objet d'une décision métier ; cet audit ne présume pas qu'une suspension immédiate est obligatoire.

### F07 — P1 — Validation insuffisante des comptes et profils

**Confirmé sur les trois configurations.**

- `/api/register` accepte un email mal formé et un mot de passe d'un caractère.
- `/api/me` accepte un email invalide ou l'email déjà utilisé par un autre client.
- Le changement de mot de passe accepte un caractère après présentation du mot de passe actuel.
- Le site a deux routes d'inscription avec des règles différentes : le contrôle de longueur de `/api/auth/register` n'est pas repris par `/api/register`.

Sources : [inscription du site](./server.js), l. 11657 ; [autre inscription](./server.js), l. 5759 ; [profil](./server.js), l. 7281 ; [profil embarqué](./dist-client/server.js), l. 7187.

**Correction attendue :** mêmes validations côté serveur sur toutes les entrées, unicité normalisée de l'email et nouvelle vérification lorsqu'il change.

### F08 — P1 — Renommage pouvant dupliquer l'identité persistée

**Confirmé sur le site en JSON et sur l'application en SQLite.**

Après renommage, l'ancien nom et le nouveau coexistent dans le stockage. L'upsert est effectué avec le nouveau nom au lieu d'une mise à jour par identifiant stable.

La vérification sur le JSON de l'application ne retrouve, elle, que le nouveau nom : ce constat ne doit donc pas être généralisé à tous les stockages.

Sources : [mutation de profil](./server.js), l. 7287 ; [adaptateur SQLite embarqué](./dist-client/db.js), l. 86.

**Correction attendue :** modification atomique par identifiant stable, migration des références dépendantes et contrôle des jetons de l'ancien identifiant.

### F09 — P1 — Recherche par email manquante en SQLite embarqué

**Confirmé avec le véritable module SQLite sous Electron.**

La connexion par email d'un compte existant répond 401, alors que la connexion par nom fonctionne. La création d'un second compte avec le même email, en changeant la casse, est acceptée.

Le serveur appelle `findUserByEmail?.(...)`, mais cette fonction n'existe pas dans l'adaptateur embarqué. L'appel optionnel masque l'absence de la fonctionnalité.

Sources : [recherche côté serveur](./dist-client/server.js), l. 3461 ; [adaptateur](./dist-client/db.js), l. 131.

**Correction attendue :** implémenter la recherche normalisée et une contrainte d'unicité adaptée, après traitement explicite des éventuels doublons déjà présents.

### F10 — P1 — Liens et contrats différents entre site et application

**Confirmé ; certaines différences peuvent être intentionnelles, mais doivent être assumées.**

- Le serveur racine ne trouve pas les ressources Dashboard Pro attendues par ses routes : HTML, JS et CSS répondent 404.
- L'application sert son dashboard, mais les liens de sa page compte vers accueil, fonctionnalités, tarifs, contact et guide développeur répondent 404.
- `/api/me` du site fournit email et droits ; celui de l'application ne fournit que `username`, `role` et `isPrimary`, malgré des consommateurs attendant davantage de champs.
- Les API de vérification d'email et `/api/auth/register` du site ne sont pas disponibles sur le serveur embarqué.
- L'inscription locale embarquée délivre immédiatement un jeton et reste en succès même si l'email échoue. Ce n'est pas le même contrat que l'inscription du site.

Sources : [routes du site](./server.js), l. 1821 ; [page compte de l'application](./dist-client/account.html) ; [API compte embarquée](./dist-client/server.js), l. 5066 ; [inscription embarquée](./dist-client/server.js), l. 11509.

**Correction attendue :** définir les capacités de chaque distribution, retirer ou rediriger les liens impossibles et faire évoluer serveur, stockage et consommateurs ensemble. Une simple mise à jour du serveur racine ne corrige pas automatiquement l'application distribuée.

### F11 — P2 — Pages racine et compte embarqué débordent sur mobile

**Mesuré avec Chromium, pas seulement déduit du CSS.**

Dans une fenêtre de 390 pixels :

- tarifs, compte et contact à la racine : largeur de document d'environ 425 pixels ;
- compte de l'application : largeur de document d'environ 867 pixels ;
- les pages sous `/site-vitrine/` utilisent un autre style et doivent être distinguées de ces anciennes pages racine.

Sources : [style public](./public/style.css), notamment l. 30 ; [style vitrine](./site-vitrine/style.css), l. 1 ; [compte embarqué](./dist-client/account.html).

**Correction attendue :** harmoniser les styles réellement servis, supprimer les débordements de navigation/formulaires et vérifier les accès envoyés par email ainsi que les anciennes URL.

### F12 — P2 — Ancien JavaScript public invalide

`node --check` échoue dès le premier caractère de [public/dashboard.js](./public/dashboard.js), avec `SyntaxError: Invalid or unexpected token`. Les 42 autres fichiers du lot sont valides, dont le dashboard actuellement embarqué.

**Correction attendue :** vérifier l'encodage et les références de ce fichier ; le réparer s'il est encore utilisé, sinon le retirer de la distribution. Ce résultat ne prouve pas que le dashboard actuel charge ce fichier.

### F13 — P2 — Informations commerciales et légales à harmoniser

**Constats documentaires, pas avis juridique.**

- Tarifs présentés en HT dans le site, configuration de facturation décrite en TTC.
- CGV indiquant encore « HT ou TTC selon régime fiscal applicable ».
- Champ « Nom / Dénomination sociale » non renseigné.
- Mentions d'hébergement contenant encore « Nom de l'hébergeur », « Adresse », « Téléphone ».
- Promesse de mises à jour de licence à vie à harmoniser avec les exclusions des versions majeures et modules premium.

Sources : [tarifs](./site-vitrine/pricing.html), l. 47 ; [configuration d'achat](./config/purchase.config.js), l. 14 ; [conditions](./site-vitrine/conditions.html), l. 40, 67 et 96 ; [mentions](./site-vitrine/mentions.html), l. 36.

**Correction attendue :** validation commerciale et juridique des textes, informations réelles et règle de TVA unique affichée aux endroits pertinents.

### F14 — P2 — Les anciens tests ne forment pas une barrière de qualité fiable

- [test-registration-flow.js](./test-registration-flow.js) cible directement le domaine public.
- [test-complete-checkout.js](./test-complete-checkout.js) peut envoyer des emails réels selon l'environnement.
- [test-payment-flow.js](./test-payment-flow.js) attend un champ `success`, alors que l'API renvoie `ok`, et son résumé final n'interroge pas réellement les droits activés.
- Les workflows consultés déploient ou construisent des livrables sans exécuter une matrice comparable à cet audit.

**Correction attendue :** tests isolés avec assertions sur les droits persistés, paiement de test exclusivement, codes de sortie exploitables en CI et absence d'identifiants de destinataires réels dans les fixtures.

## 5. Limites et contrôles restant à réaliser

### Services externes

Non exécutés, conformément au périmètre :

- Création et paiement d'une session Stripe Test réelle.
- Carte refusée, authentification 3-D Secure, reprise d'un checkout abandonné.
- Livraison/rejeu/ordre réel des webhooks Stripe.
- Renouvellement, impayé, reprise de paiement, résiliation effective, avoir et remboursement.
- Portail client et factures réellement générées chez Stripe.
- E-mails Brevo/SMTP, SPF/DKIM/DMARC, classement en spam et réception des liens.
- Site public, DNS, certificat TLS, en-têtes du proxy d'hébergement et configuration de production.

Les API de la page compte ciblent explicitement le domaine central, même quand la page est servie localement. Le navigateur de test a bloqué ces requêtes externes. L'inscription UI complète sur le site central **n'a donc pas été validée** ; la création, confirmation et connexion ont été testées sur les API locales. Une tentative de redirection technique de l'API dans le navigateur n'a pas donné un parcours exploitable et n'est pas comptabilisée comme preuve de fonctionnement.

Sources : [client du site](./public/js/account.js), l. 4 ; [client embarqué](./dist-client/public/js/account.js), l. 6 ; [boutons de paiement](./public/js/pricing-stripe.js), l. 8.

### Base, distribution et matériel

- PostgreSQL non exercé contre une véritable instance isolée.
- Synchronisation site/application non validée avec les services centraux réels.
- Installateur NSIS, signature Windows, SmartScreen, installation/désinstallation et mise à jour non exécutés.
- Compilation Android et installation APK non exécutées.
- USB/Wi-Fi, découverte ADB, batterie, lancement/arrêt de jeux, scrcpy et streaming non validés avec des casques.
- Audio bidirectionnel, permissions microphone/caméra, latence et dégradation réseau non validés.
- Tests de charge de production, endurance et restauration d'une sauvegarde non réalisés.
- Pas d'audit CVE en ligne, de scan d'intrusion ou de certification d'accessibilité.
- Chromium Electron uniquement : pas de matrice Safari/Firefox ni d'appareil mobile physique.
- Pas de capture visuelle exploitable sur l'affichage sans surface graphique ; les contrôles UI utilisent le DOM, les événements et les mesures de mise en page.

## 6. Ordre de correction recommandé

1. **Licence à vie et résiliation**, avec preuve des effets persistés et du comportement Stripe.
2. **Administration embarquée, désactivation de compte et contrôles d'accès**.
3. **Validation des comptes, renommage et recherche/unicité d'email SQLite**.
4. **Contrat partagé site/application et ressources réellement distribuées**.
5. **Mobile, textes commerciaux/légaux et nettoyage des anciens scripts**.
6. **Recette réelle sur Stripe Test, PostgreSQL isolé, installateur Windows et au moins deux casques**, puis automatisation CI.

### Critères de validation avant mise en vente

- Une licence payée donne un droit unique, persistant et visible dans l'historique.
- Une résiliation arrête bien le renouvellement chez Stripe et maintient l'accès jusqu'au terme prévu.
- Les statuts refusés ne débloquent pas un essai expiré.
- Un compte désactivé ou supprimé ne peut plus utiliser un ancien JWT.
- Les opérations réservées contrôlent les droits côté serveur.
- Le renommage ne crée pas de second compte.
- Connexion par email et unicité cohérentes en JSON, SQLite et PostgreSQL.
- Aucun lien important en 404 ; compte et paiement utilisables sur mobile.
- Aucune exception non traitée ni requête d'administration suspendue.

## 7. Preuves et reproductibilité

Les pièces jointes de la session conservent :

- `audit-results.json` : 268 assertions principales et leurs observations ;
- `audit-extra-results.json` : 51 assertions complémentaires et 23 liens ;
- `audit-browser-results.json` : DOM, largeurs, navigation et scénarios Chromium ;
- `audit-local.cjs`, `audit-preload.cjs`, `audit-extra.cjs` et `audit-browser.cjs` : dispositif de reproduction local.

Les résultats des essais de mise au point ne sont pas mélangés au bilan final. En particulier, le test final de paiement réutilise le client Stripe capturé au checkout ; un événement visant un autre client n'est pas considéré comme une preuve d'échec d'activation.

Pour reproduire sur ce poste, extraire les pièces jointes dans un répertoire neuf. Le chemin du dépôt et les ports dédiés sont définis dans les scripts. Dans un premier terminal :

```powershell
node .\audit-local.cjs --serve
```

Attendre le message `READY_FOR_BROWSER`. Dans un second terminal, depuis le même répertoire :

```powershell
$env:ELECTRON_RUN_AS_NODE = $null
& 'C:\Users\peter\VR-Manager\dist-client\node_modules\electron\dist\electron.exe' .\audit-browser.cjs
node .\audit-extra.cjs
```

Terminer le premier terminal avec Ctrl+C. Ne pas relancer ces scripts sur des ports occupés ni remplacer les fixtures par des données réelles. Le lot principal sans `--serve` s'arrête seul et utilise un code de sortie non nul en présence d'écarts.

Les serveurs et profils temporaires sont arrêtés et les copies de travail sont supprimées après collecte des preuves. Les sources et données existantes du projet ne sont pas modifiées.

## 8. Corrections et mise à jour locale réalisées après l'audit

Cette section décrit les interventions postérieures au constat initial ; les résultats historiques des sections précédentes ne sont pas des résultats de la version corrigée.

### Application de référence et sauvegarde

L'application retenue est **VHR Dashboard 1.0.1**, installée dans
`C:\Users\peter\AppData\Local\Programs\VHR Dashboard`.
Les empreintes initiales de son serveur, de son adaptateur et de son point d'entrée Electron correspondaient aux sources de [dist-client](./dist-client).
Le serveur du site n'a pas été substitué au serveur embarqué.

Une sauvegarde complète de l'archive et de ses binaires dépaquetés, des raccourcis modifiés et de l'ancienne inscription de désinstallation a été créée dans :

```text
C:\Users\peter\AppData\Local\VHR-Dashboard-maintenance\20261025-205351
```

L'archive initiale `app.asar.original` a été vérifiée par SHA-256 :
`4b983b7d2a7546fbde02ce11e3b276b37c5f8a8ad18824ea617675013cc69581`.
Le dossier de sauvegarde préexistant `VHR Dashboard.backup-pre-local-fix` a été conservé.
La configuration existante, les fichiers non modifiés et les binaires externes ont été comparés par empreinte lors du réassemblage. Les données utilisateur réelles n'ont pas servi aux tests et n'ont pas été nettoyées.
Ces sauvegardes locales peuvent contenir la configuration d'origine : ne pas les publier.

### Correctifs apportés

- **Paiements :** identifiant d'achat canonique, contrôle du statut payé, licence perpétuelle unique et historique durable ; le rejeu d'un même paiement ne crée pas une deuxième licence. La clé de l'historique et celle de la licence concordent.
- **Résiliation :** demande de fin de période chez Stripe avant confirmation ; un échec du prestataire reste un échec explicite. Les droits sont conservés jusqu'au terme prévu, puis refusés.
- **Droits :** refus des statuts `past_due`, `unpaid`, `incomplete`, `incomplete_expired` et annulés ; contrôle de l'échéance desktop, des comptes désactivés et des API appareils/jeux/favoris. Le contrôle administrateur embarqué manquant est implémenté.
- **Comptes :** validation homogène des emails, identifiants et mots de passe ; renommage sans deuxième compte ; conservation des références et des mots de passe dans SQLite ; recherche email insensible à la casse ; réponse `/api/me` desktop enrichie.
- **Email desktop :** le changement d'adresse est explicitement renvoyé vers l'espace client central, qui assure la vérification. Le serveur local ne prétend plus avoir vérifié une nouvelle adresse.
- **Interface :** confirmation d'inscription correctement présentée, rafraîchissement du jeton après modification du profil, liens desktop rétablis et absence de débordement mobile sur les pages contrôlées. Le site utilise son origine pour ses API ; le compte embarqué conserve l'API centrale.
- **Ressources :** l'ancienne URL des conditions est servie ; les ressources Dashboard Pro manquantes du serveur du site utilisent les fichiers canoniques de [dist-client/public](./dist-client/public), sans deuxième copie. L'ancien [script dashboard](./public/dashboard.js) a été converti de UTF-16LE vers UTF-8 et passe le contrôle syntaxique.
- **Exécution desktop :** suppression de la mise à mort automatique de tout processus occupant le port ; suppression des gestionnaires d'arrêt globaux par nom de programme. Le gestionnaire de processus déjà suivis est conservé. Le démarrage sans clé Stripe est possible et les paiements indisponibles répondent explicitement 503.
- **Packaging futur :** exclusion des anciennes distributions embarquées, de la configuration secrète, des certificats locaux et des bases de données dans [la configuration desktop](./dist-client/package.json). Cette exclusion ne supprime pas rétroactivement la configuration préexistante de l'installation conservée.

### Installation et nettoyage effectués

Le paquet corrigé a été testé avec l'exécutable installé, puis remplacé à son emplacement réel et retesté.
L'archive active passe de **644 511 271 à 15 913 676 octets**.
Les 253 fichiers retirés sont d'anciennes distributions embarquées dans `locked-release`, `extracted-app` et `public/dashboard-pro-latest` ; aucune référence depuis les fichiers d'exécution conservés n'a été trouvée.
Ils restent récupérables dans la sauvegarde originale.
La réduction concerne le paquet actif, pas l'espace total tant que les sauvegardes sont conservées.

L'inscription Windows obsolète `vhr-dashboard-site 0.1.0`, son répertoire vide et le raccourci de menu Démarrer redondant ont été archivés avant suppression.
Le raccourci du bureau cible désormais l'exécutable 1.0.1 existant.
Les autres copies du dépôt, les fichiers vidéo et les modifications Gradle préexistantes n'ont pas été supprimés.

### Vérifications de la version corrigée

- Tests persistants : [politique client du site](./tests/website-customer.test.cjs) et [droits/persistance desktop](./tests/desktop-customer.test.cjs).
- **147 contrôles d'intégration réussis** sur site JSON, desktop JSON et desktop SQLite : validation, paiement non payé/payé/rejoué, historique, licence, panne prestataire, résiliation, échéance, statuts refusés, mot de passe et renommage.
- **13 contrôles réussis** pour inscription, confirmation à usage unique, connexions et récupération après panne SMTP.
- **58 contrôles API desktop réussis** sur les deux stockages pendant la correction.
- **13 contrôles API/ressources réussis sur le paquet réellement installé**, après remplacement, avec l'exécutable installé et des données isolées.
- Chromium : inscription naturelle du site jusqu'au message de vérification, quatre pages mobiles sans débordement, compte embarqué sans débordement aux tailles mobile et bureau.
- **5 contrôles de ressources du site réussis**, dont les conditions et les ressources Dashboard Pro auparavant absentes.
- Contrôles syntaxiques des fichiers corrigés et `git diff --check`.

Les scénarios d'intégration utilisent des identités synthétiques, Stripe et SMTP simulés et le blocage des commandes système et du réseau externe.
Les erreurs de connexion à `/ping` avant disponibilité correspondent à l'attente de démarrage des instances, pas à un succès simulé.
Les nombres ci-dessus décrivent des lots distincts et ne doivent pas être additionnés aux 319 assertions historiques pour annoncer un score global.

Commande des tests persistants :

```powershell
node --test .\tests\website-customer.test.cjs .\tests\desktop-customer.test.cjs
```

Le test SQLite utilise Electron et le module natif déjà présents sous [dist-client/node_modules](./dist-client/node_modules), afin de respecter l'ABI de l'application.
Les scripts et résultats d'intégration complémentaires sont conservés dans l'archive de validation jointe à la session.

### Retour arrière et limites restantes

Pour revenir au paquet initial : fermer l'application, puis restaurer `app.asar.original` en `resources\app.asar` dans l'installation ; restaurer aussi `app.asar.original.unpacked` en `resources\app.asar.unpacked` si ce dossier a été changé ultérieurement. Les manifests de sauvegarde, de nettoyage et de déploiement sont dans le dossier de maintenance.

**Le site public n'a pas été déployé.** Les correctifs du site sont dans les sources locales.
Les tests Stripe Test réels, PostgreSQL isolé, SMTP réel, renouvellement et remboursements réels, installateur NSIS et fonctions casque/audio/streaming restent à effectuer.
Le test du paquet installé n'est pas une ouverture de session sur les données réelles de l'utilisateur.
Les informations légales réelles et le régime de TVA restent à fournir et valider : aucune identité commerciale ni règle fiscale n'a été inventée.

## 9. Version 1.0.2 et correctifs du démarrage hébergé

À la demande de publication, un nouvel installateur **Windows x64 1.0.2** a été construit à partir des sources desktop corrigées. Sa release est `v1.0.2-client` et son fichier `VHR.Dashboard.Setup.1.0.2.exe`.
Les liens de la vitrine, du lanceur et de `/download/client-full` utilisent cette release, sans remplacer le binaire historique 1.0.1.
Un fichier SHA-256 accompagne le livrable. L'installateur n'est pas signé numériquement ; Windows peut afficher un avertissement SmartScreen.

Le paquet 1.0.2 a été contrôlé : version correcte, correspondance des fichiers corrigés, absence de `.env`, clés/certificats et données client, absence des anciennes distributions imbriquées. Contrairement à l'ancienne configuration de packaging, le module SQLite natif est inclus et a été chargé avec succès par l'exécutable construit.
Les 13 vérifications API/ressources du paquet et les contrôles Chromium du compte ont réussi.
Les raccourcis sont maintenant gérés par NSIS ; le script personnalisé retire les anciens raccourcis « Pro » au lieu d'en créer un second jeu.

Pour le site hébergé :

- Le mode web/Render impose `NO_ADB=1`, même si une ancienne variable vaut `0`.
- Aucune recherche de processus Windows, compilation Android, écriture `local.properties`, installation Java/Gradle ni initialisation ADB n'est exécutée dans ce mode.
- Les traces de protocole SMTP sont désactivées en production et l'identifiant SMTP n'est plus journalisé au démarrage.
- PostgreSQL est initialisé avant le chargement des comptes ; JSON et SQLite ne sont pas migrés en parallèle. Une configuration PostgreSQL invalide ou une initialisation échouée empêche le démarrage hébergé, au lieu de présenter un service apparemment sain avec un stockage de secours.
- Les tombstones locaux continuent à refuser l'accès aux comptes supprimés, mais ne déclenchent plus de purge automatique de PostgreSQL au démarrage. Aucune ligne supprimée antérieurement n'a été recréée.
- Le conteneur web ne contient plus les outils Android et Gradle inutiles ; les données/configurations locales sont exclues de son contexte de construction.
- `/ping` publie la version et, lorsqu'elle est fournie par Render, la révision Git pour vérifier le déploiement.
- Le workflow Render manuel utilise les secrets GitHub et vérifie les erreurs HTTP ; les pushes sur `main` utilisent l'auto-déploiement Render configuré.

Validation complémentaire : **15 tests persistants réussis**, nouvelle exécution des **147 contrôles métier**, démarrage simulé Render sans messages ADB/Windows/SMTP debug et refus de démarrer après échec PostgreSQL simulé.
Ces simulations ne constituent toujours pas une recette Stripe réelle ni une restauration de PostgreSQL.
La mise à jour du site et la publication de la release sont vérifiées séparément après l'envoi Git ; le seul succès du build n'est pas une preuve de déploiement.

## 10. Présentation du site vitrine sans émoticônes

À la demande de l'utilisateur, les décorations emoji ont été retirées de l'accueil, du guide, des pages compte et téléchargement, ainsi que des messages contact, facturation et assistant de discussion.
Les commandes de visibilité des mots de passe utilisent désormais les libellés « Afficher » et « Masquer ». Les niveaux d'importance du guide restent présents sous forme de notes numériques.
L'application desktop, ses sources et son installateur ne sont pas modifiés par cette retouche.

Validation locale : **16 tests persistants réussis**, syntaxe des six scripts modifiés vérifiée, sept pages contrôlées dans Chromium aux largeurs 390 et 1440 pixels sans émoticônes ni débordement horizontal. Le basculement des mots de passe et six réponses du chatbot ont également été vérifiés. Les appels externes et API étaient bloqués ou simulés pendant ces contrôles.
Ces résultats locaux ne constituent pas une preuve de déploiement en production.

## 11. Tarifs TTC et version 1.0.3

Tarifs autorisés le 25/10/2026 : **19,90 euros TTC/mois**, **199 euros TTC/an** et **499 euros TTC** pour la licence définitive.
Les trois prix Stripe de production sont configurés avec `tax_behavior=inclusive`. Les nouveaux checkouts ne rajoutent pas de taxe aux montants annoncés.
Le catalogue versionné [pricing](./config/pricing.js), identique dans l'application, remplace les anciennes variables de prix qui pouvaient imposer 29 euros ou remplacer le tarif annuel par le mensuel.
Les prix récupérés chez Stripe sont contrôlés avant création du checkout : identifiant, montant, devise, périodicité, activité et taxes incluses.

Les pages tarifs racine et vitrine, l'accueil, les conditions, le chatbot, les offres de déblocage de l'application et les comptes ont été harmonisés.
La formule annuelle possède son propre bouton, plan et prix Stripe. Les emails de confirmation affichent le montant récurrent réel et une facturation mensuelle ou annuelle ; ils ne promettent plus systématiquement un renouvellement à 29 euros par mois.

L'utilisateur a demandé le nouveau tarif au prochain renouvellement sans prorata pour les abonnés existants. La consultation exhaustive Stripe a trouvé **zéro abonnement en cours** : aucune migration, facture ni modification de période existante n'a été nécessaire.
Aucun lien de paiement Stripe actif ne référençait les anciens tarifs ; les changements de formule par portail Stripe étaient désactivés.

Validation :

- **22 tests persistants**, **147 contrôles métier** et **93 contrôles tarifaires intégrés** réussis sur site JSON, desktop JSON et desktop SQLite.
- Trois sessions Checkout de production ont confirmé des totaux exacts de 1990, 19900 et 49900 centimes EUR, sans taxe ajoutée. Ces sessions ont été expirées immédiatement, sans paiement ni envoi d'email.
- Contrôle navigateur des deux pages tarifs, de l'accueil et des conditions à 390 et 1440 pixels, sans débordement horizontal.
- Paquet Windows 1.0.3 : huit fichiers modifiés identiques aux sources, SQLite natif inclus, secrets et données locales exclus.
- Installation NSIS silencieuse sur ce PC réussie, exécutable **1.0.3**, archive identique au paquet construit. **279 fichiers utilisateur inchangés** après comparaison des empreintes.
- Treize contrôles API/ressources et contrôles Chromium du compte réussis sur le paquet puis sur l'installation réelle avec des données synthétiques isolées.

Une sauvegarde privée de l'installation et des données antérieures est conservée dans le répertoire local de maintenance `pre-1.0.3-20261025`. L'installateur demeure non signé.
Le succès du build et des tests locaux ne constitue pas une preuve du déploiement Render ; la révision publique, les prix servis et le téléchargement doivent être vérifiés après publication.

## 12. Journaux, connexions et référencement technique - version 1.0.4

Correctifs du 27/10/2026 :

- Les requêtes de connexion ne journalisent plus leur corps, qui pouvait contenir un mot de passe. Le serveur hébergé ne tente plus de s'authentifier contre lui-même ; l'authentification distante du mode local reste disponible.
- Le formulaire compte bloque les soumissions simultanées, réactive son bouton après erreur et conserve les espaces des mots de passe, sur le site et dans l'application.
- La suppression d'un identifiant d'abonnement factice conserve les valeurs `null` lors de la normalisation et dans les champs PostgreSQL. La réconciliation attend l'écriture et signale un échec.
- Les sessions administrateur émises avant le 27/10/2026 à 19:46:17 UTC sont refusées. Ce seuil ponctuel ne déconnecte pas les clients ni les nouvelles sessions.
- L'accueil canonique `https://www.vhr-dashboard-site.com/` sert directement le contenu en HTTP 200, sans redirection HTML. Ses anciennes adresses redirigent en 301 vers cette URL, en conservant les paramètres.
- Les sept pages publiques secondaires ont chacune une balise canonique vers leur adresse sous `/site-vitrine/`. Les anciennes adresses racine redirigent en 301 vers ces pages.
- Les routes du sitemap et des robots passent avant les fichiers statiques pour éviter de servir des copies périmées. Le sitemap contient uniquement les huit pages publiques canoniques ; les comptes et l'application sont signalés `noindex`.

Validation locale : **27 tests persistants**, **147 contrôles métier** et **93 contrôles tarifaires** réussis. Une requête avec un mot de passe synthétique a confirmé son absence des journaux ; une ancienne session administrateur est refusée tandis qu'une nouvelle session et une session client sont acceptées.
Dans Chromium, cinq pages ont été contrôlées à 390 et 1440 pixels : styles chargés, aucune image cassée ni débordement horizontal. Une double soumission ne produit qu'un appel de connexion et le bouton est réactivé après rejet.

Le paquet Windows 1.0.4 et l'installation réelle ont chacun passé treize contrôles API/ressources et la vérification navigateur du compte. L'installation silencieuse a conservé les **279 fichiers utilisateur** comparés par empreinte. Leur sauvegarde privée est conservée dans `pre-1.0.4-20261027`, dans le répertoire local de maintenance. L'installateur reste non signé.

### Actions d'exploitation restant à effectuer par le propriétaire

- Remplacer le mot de passe administrateur exposé dans les variables d'environnement Render puis redéployer. `ADMIN_PASSWORD_HASH`, s'il est défini, est prioritaire sur `ADMIN_PASSWORD` : ne pas conserver un ancien hash lorsque le mot de passe est géré par cette dernière variable. La rotation n'a pas été effectuée par ces changements de code.
- Restreindre l'accès aux anciens journaux contenant le secret. Pour invalider toutes les sessions, remplacer également `JWT_SECRET` dans Render.
- Soumettre `https://www.vhr-dashboard-site.com/sitemap.xml` dans Google Search Console, inspecter l'accueil canonique et les pages publiques puis demander leur indexation. Les URL redirigées et les pages privées n'ont pas vocation à être indexées.

Les sondes automatisées en 404 ne prouvent ni une intrusion réussie ni une pénalité Google. Le libellé précis d'exclusion Search Console n'a pas été fourni ; la correction technique ne garantit ni l'indexation immédiate ni une position sur des mots-clés. Une vérification de la révision Render, des réponses SEO et de l'installateur public doit suivre la publication.
