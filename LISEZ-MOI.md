# Correcteur de Maths CSP/ASSO : version autonome

Ce dossier contient tout pour avoir ta propre appli, avec ta propre clé d'API.

| Fichier | Rôle |
|---|---|
| `index.html` | L'appli : connexion (nom et classe), discussion façon Photomath, étapes dépliables, correction notée sur 20, exercices d'entraînement |
| `worker.js` | Le petit serveur qui garde ta clé d'API secrète et appelle Claude |
| `sw.js` | Le service worker : l'appli s'ouvre même sans réseau et peut devenir un APK |
| `manifest.json`, `icon-192.png`, `icon-512.png` | Nom, couleurs et icônes pour l'écran d'accueil ou l'APK |

Pourquoi un serveur ? Si la clé d'API était dans l'appli, n'importe qui pourrait la copier et dépenser ton argent. Le serveur est la seule chose qui la connaît.

## Comment ça marche pour l'élève

1. Au premier lancement, l'élève écrit son nom et choisit sa classe (6e à Supérieur, ou « Autre » pour écrire la sienne). Cela reste sur son téléphone, sans mot de passe ni compte.
2. L'IA adapte ses explications, son vocabulaire et la difficulté à la classe. Le nom n'est jamais envoyé à l'IA : seule la classe l'est.
3. L'élève envoie un exercice en photo ou au clavier : il reçoit la solution étape par étape. S'il envoie aussi sa résolution, il reçoit une correction et une note sur 20.
4. Pour s'entraîner, il touche « Je veux un exercice » et dit lui-même sur quoi. L'IA propose alors un exercice adapté à sa classe et à ses dernières notes, puis corrige sa réponse.
5. Le bouton avec son nom, en haut, permet de changer de classe. Si le nom change, une nouvelle discussion commence (pratique quand plusieurs élèves partagent un téléphone).

## Étape 1 : la clé d'API

1. Va dans la Claude Console (platform.claude.com), crée un compte et une clé d'API.
2. Ajoute un peu de crédit et fixe une limite de dépense mensuelle. C'est ta protection si quelqu'un abuse de l'appli.

## Étape 2 : le serveur (Cloudflare Workers, gratuit pour commencer)

1. Sur dash.cloudflare.com : Workers & Pages, Create, Hello World, puis Deploy.
2. Ouvre le Worker créé, Edit code, remplace tout par le contenu de `worker.js`, puis Deploy.
3. Dans Settings, Variables and Secrets, ajoute :
   - `ANTHROPIC_API_KEY` (type Secret) : ta clé d'API.
   - `APP_CODE` (type Secret) : un code de ton choix, par exemple 12 caractères au hasard.
4. Note l'adresse du Worker, elle ressemble à `https://nom.ton-compte.workers.dev`.

## Étape 3 : relier l'appli au serveur

Ouvre `index.html` et cherche ces deux lignes, tout près du début du script :

```js
var BACKEND_URL = 'https://REMPLACE-MOI.workers.dev';
var APP_CODE = '';
```

Remplace par l'adresse de ton Worker et par le même code que dans Cloudflare.
Attention : ce code est lisible par quiconque ouvre l'appli. Il écarte les curieux, mais la vraie protection reste la limite de dépense de l'étape 1.

## Étape 4 : publier l'appli

Mets les 5 fichiers de l'appli (`index.html`, `sw.js`, `manifest.json` et les deux icônes) dans le même dossier, sur un hébergement HTTPS, par exemple Cloudflare Pages ou GitHub Pages. Ouvre l'adresse sur ton téléphone : l'appli marche déjà.
Dans Chrome, menu, Ajouter à l'écran d'accueil pour l'installer comme une appli.

## Étape 5 : en faire un APK

Une fois l'appli en ligne en HTTPS, utilise l'outil que tu préfères pour transformer un site en APK (par exemple PWABuilder). Donne-lui l'adresse de ton site : le manifest, les icônes et le service worker sont déjà prêts.

## Coût : exercices gratuits pour les élèves

Les élèves ne paient rien, c'est donc ton compte d'API qui paie chaque échange. Pour garder une bonne qualité sans dépenser trop :
- Les exercices proposés par l'IA utilisent automatiquement le modèle le plus puissant, car un exercice mal posé ou sans solution propre est le pire défaut. Il est réglé dans `MODEL_COMPLEX` (par défaut `claude-opus-5-5`). Pour dépenser moins, mets le même modèle que `MODEL` : l'appli marche pareil.
- Les solutions et corrections utilisent `MODEL` (par défaut `claude-sonnet-5-5`). Le bouton « Mode précis » les passe sur `MODEL_COMPLEX`.
- Fixe une limite de dépense mensuelle dans la Console, et regarde la consommation après la première semaine.

## Autres réglages

- Limiter le site autorisé à appeler le serveur : variable `ALLOWED_ORIGIN` avec l'adresse de ton site.
- Les photos sont réduites et compressées dans l'appli avant l'envoi, pour aller plus vite et coûter moins cher.
- Le nom, la classe, l'historique de la discussion et la moyenne des notes restent sur le téléphone de l'élève, rien n'est enregistré sur ton serveur.

## Ce qui a été testé

Dans un vrai navigateur (Chromium, écran de téléphone, clair et sombre), avec une fausse IA : écran de connexion et ses erreurs, changement de classe et d'élève, envoi de texte et de photos, solution, correction et note, boutons rapides, demande d'exercice avec choix du sujet, mode précis, erreurs avec réessai, réponses inattendues de l'IA, rechargement de la page, Nouvelle discussion, barre de symboles, absence de débordement sur 360 px de large, service worker et ouverture hors ligne, et envoi vers le serveur avec code d'accès.
Pas encore testé : un échange réel avec Claude via ton serveur et ta clé, ni la qualité des exercices générés. Fais un premier essai après l'étape 3.
