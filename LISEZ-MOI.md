# Correcteur de Maths CSP/ASSO : version autonome

Ce dossier contient tout pour avoir ta propre appli, avec ta propre clé d'API.

| Fichier | Rôle |
|---|---|
| `index.html` | L'appli : connexion (nom et classe), discussion façon Photomath, étapes dépliables, correction notée sur 20, exercices d'entraînement |
| `worker.js` | Le petit serveur qui garde ta clé d'API secrète et appelle Gemini (gratuit) ou Claude |
| `sw.js` | Le service worker : l'appli s'ouvre même sans réseau et peut devenir un APK |
| `manifest.json`, `icon-192.png`, `icon-512.png` | Nom, couleurs et icônes pour l'écran d'accueil ou l'APK |

Le serveur (`worker.js`) est facultatif : il sert à cacher la clé. Sans lui, la clé Gemini gratuite va directement dans `index.html`.

## Comment ça marche pour l'élève

1. Au premier lancement, l'élève écrit son nom et choisit sa classe (6e à Supérieur, ou « Autre » pour écrire la sienne). Cela reste sur son téléphone, sans mot de passe ni compte.
2. L'IA adapte ses explications, son vocabulaire et la difficulté à la classe. Le nom n'est jamais envoyé à l'IA : seule la classe l'est.
3. L'élève envoie un exercice en photo ou au clavier : il reçoit la solution étape par étape. S'il envoie aussi sa résolution, il reçoit une correction et une note sur 20.
4. Pour s'entraîner, il touche « Je veux un exercice » et dit lui-même sur quoi. L'IA propose alors un exercice adapté à sa classe et à ses dernières notes, puis corrige sa réponse.
5. Le bouton avec son nom, en haut, permet de changer de classe. Si le nom change, une nouvelle discussion commence (pratique quand plusieurs élèves partagent un téléphone).

## Mise en route simple (sans serveur, gratuit)

1. **La clé Gemini.** Va sur aistudio.google.com avec ton compte Google, touche « Get API key » puis « Create API key », et copie la clé. Pas de carte bancaire.
2. **La clé dans l'appli.** Ouvre `index.html`, cherche la ligne `var GEMINI_KEY = '';` (tout près du début du script) et colle ta clé entre les deux guillemets. Enregistre.
3. **La mise en ligne.** Mets `index.html`, `sw.js`, `manifest.json` et les deux icônes (`worker.js` n'est pas nécessaire) dans le même dépôt GitHub, puis Settings, Pages, branche `main`, dossier `/ (root)`, Save. L'appli est à `https://ton-pseudo.github.io/nom-du-depot/`.
4. **L'APK (facultatif).** Donne cette adresse à PWABuilder : le manifest, les icônes et le service worker sont prêts.

Attention : avec ce mode, la clé est écrite dans `index.html`, donc lisible par quiconque ouvre le code de la page. Tant que tu n'as pas activé la facturation sur ton compte Google, le pire qui puisse arriver est que quelqu'un use tes quotas gratuits : tu ne paies rien. Pour t'en protéger davantage, utilise le mode avec serveur ci-dessous.

Le niveau gratuit a des limites de requêtes par minute et par jour (visibles dans AI Studio). Si beaucoup d'élèves écrivent en même temps, certains verront « Trop de demandes ». Google peut aussi utiliser les échanges du niveau gratuit pour améliorer ses produits : dis aux élèves de ne pas écrire d'informations personnelles.
Tu peux changer de modèle avec `GEMINI_MODEL` (par exemple `gemini-3.5-flash-lite`, plus léger).

## Limites d'usage (pour protéger le quota gratuit)

Elles sont réglées au début du script de `index.html`, dans la ligne `var LIM = { ... }` :
- `daily: 30` : 30 demandes à l'IA par jour et par téléphone. Au-delà, l'élève voit un message clair et reprend le lendemain. Une demande qui échoue ne compte pas.
- `cooldown: 4000` : 4 secondes minimum entre deux messages.
- `chars: 3000` : longueur maximale d'un message.
- `photos: 2` : 2 photos au maximum par message.
- `turns: 16` : l'IA ne relit que les 16 derniers messages de la discussion (moins de quota consommé).

Ces limites sont dans l'appli, donc un élève très motivé peut les contourner (en vidant les données du site, par exemple). Elles servent à éviter les excès normaux, pas à bloquer un abus volontaire. Le quota de Google, lui, est partagé entre tous les élèves.

Pour rendre l'IA plus rigoureuse, la consigne demande maintenant de contrôler chaque résultat d'une autre façon, de refaire chaque ligne de l'élève avant de la juger, et d'avouer quand elle n'est pas sûre.

## Mode avec serveur (clé cachée, plus sûr)

À utiliser si tu veux que la clé reste secrète, ou pour utiliser Claude à la place de Gemini. Laisse `GEMINI_KEY` vide dans `index.html`.

1. Sur dash.cloudflare.com : Workers & Pages, Create, Hello World, puis Deploy.
2. Ouvre le Worker créé, Edit code, remplace tout par le contenu de `worker.js`, puis Deploy.
3. Dans Settings, Variables and Secrets, ajoute `GEMINI_API_KEY` (Secret, ta clé Google) ou `ANTHROPIC_API_KEY` (Secret, une clé Claude, payante), et `APP_CODE` (Secret, un code de ton choix). Si les deux clés existent, Gemini est utilisé.
4. Dans `index.html`, remplace `https://REMPLACE-MOI.workers.dev` par l'adresse de ton Worker et mets le même code dans `APP_CODE`. Ce code est lisible par quiconque ouvre l'appli : il écarte les curieux, mais la vraie protection est le niveau gratuit sans facturation (ou, avec Claude, une limite de dépense mensuelle dans la Console).
5. Variables facultatives du Worker : `MODEL`, `MODEL_COMPLEX` (modèle du « Mode précis » et des exercices ; par défaut le même que `MODEL` avec Gemini), `ALLOWED_ORIGIN` (l'adresse de ton site).

Avec Claude, les exercices et le « Mode précis » utilisent `claude-opus-5-5` par défaut et le reste `claude-sonnet-5-5` : c'est ton compte qui paie chaque échange.

## Autres réglages

- Les photos sont réduites et compressées dans l'appli avant l'envoi, pour aller plus vite et coûter moins cher.
- Le nom, la classe, l'historique de la discussion et la moyenne des notes restent sur le téléphone de l'élève, rien n'est enregistré sur ton serveur.

## Ce qui a été testé

Dans un vrai navigateur (Chromium, écran de téléphone, clair et sombre), avec une fausse IA : écran de connexion et ses erreurs, changement de classe et d'élève, envoi de texte et de photos, solution, correction et note, boutons rapides, demande d'exercice avec choix du sujet, mode précis, erreurs avec réessai, réponses inattendues de l'IA, rechargement de la page, Nouvelle discussion, barre de symboles, absence de débordement sur 360 px de large, service worker et ouverture hors ligne, et envoi vers le serveur avec code d'accès.
L'appli et le serveur ont été testés avec de fausses réponses de Gemini et de Claude. Pas encore testé : un échange réel avec Gemini ou Claude via ta clé, ni la qualité des exercices générés. Fais un premier essai avec quelques exercices que tu connais avant de la donner aux élèves.
