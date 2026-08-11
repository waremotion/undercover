# Sketchy!

**Sketchy!** est un jeu mobile de déduction sociale à jouer autour d’une table avec **un seul téléphone**.

La majorité des joueurs reçoit le même mot, les Undercover reçoivent un mot proche, et Mr White ne reçoit aucun mot. Les joueurs donnent des indices, débattent puis éliminent les suspects.

## Jouer

Version web :

**https://waremotion.github.io/undercover/**

Le dépôt GitHub conserve pour l’instant le nom historique `undercover`, mais le jeu s’appelle **Sketchy!**.

## Langues

Sketchy! est disponible en :

- **Français**
- **English**

Un sélecteur `FR / EN` discret est affiché dans la barre supérieure.

Le changement de langue est **instantané** : aucun rechargement de page n’est nécessaire. Les textes statiques et les éléments dynamiques de l’interface sont réaffichés immédiatement dans la langue choisie.

La langue sélectionnée est mémorisée localement sur l’appareil.

### Architecture multilingue

Le multilingue est volontairement séparé du moteur de jeu afin de rester facile à maintenir :

```text
i18n-fr.js             # dictionnaire français
i18n-en.js             # dictionnaire anglais
i18n.js                # moteur de traduction
i18n.css               # style du sélecteur de langue
words.js               # 556 couples français
words-en.js            # initialisation de la banque anglaise
words-en-*.js          # couples anglais séparés par catégorie
game-core.js           # stockage, sessions et banques de mots
game-flow.js           # déroulement des parties et vues dynamiques
game-runtime.js        # reprise de session et rafraîchissement i18n
app.js                 # branchement des événements
```

Les éléments HTML utilisent des clés `data-i18n`, par exemple :

```html
<button data-i18n="home.start">Lancer une partie</button>
```

Les textes générés par JavaScript utilisent :

```js
t("home.start")
```

Pour ajouter ou modifier un libellé, il suffit donc de modifier la clé correspondante dans les dictionnaires `i18n-fr.js` et `i18n-en.js`.

## Couples de mots

Chaque langue possède sa propre banque de **556 couples**.

Les couples anglais ne reposent pas sur une traduction automatique au moment de jouer. Ils sont stockés localement par catégorie dans les fichiers `words-en-*.js` et ont été conçus pour fonctionner naturellement en anglais : les deux mots d’un couple restent suffisamment proches pour créer le doute, mais suffisamment différents pour permettre aux joueurs de se distinguer par leurs indices.

Exemples :

```text
FR : Chat / Tigre
EN : Cat / Tiger

FR : Plage / Piscine
EN : Beach / Swimming pool

EN : Pizza / Calzone
EN : Headphones / Earbuds
EN : Forest / Jungle
```

L’historique anti-répétition est séparé par langue. Une soirée jouée en français n’épuise donc pas les couples disponibles en anglais.

### Langue d’une partie en cours

La langue des **mots** est fixée au moment où une nouvelle partie démarre. Cela évite de changer les mots secrètement au milieu d’une manche.

L’interface, elle, peut être basculée entre français et anglais à tout moment. La partie suivante utilisera la langue actuellement sélectionnée.

## Fonctionnalités principales

- 4 à 20 joueurs.
- 556 couples français.
- 556 couples anglais.
- Catégories : cuisine/food, objets/objects, lieux/places, nature, culture et vie quotidienne/everyday life.
- Civils, Undercover et Mr White.
- Distribution dans l’ordre physique autour de la table.
- Saisie des prénoms en faisant circuler le téléphone.
- Mr White ne commence jamais une manche.
- Vote et élimination dans l’application.
- Le rôle du joueur éliminé est révélé, mais pas son mot.
- Dernière chance de Mr White pour deviner le mot des Civils.
- Fonction « J’ai oublié mon mot » / “I forgot my word”.
- Possibilité de continuer avec le même groupe et de retirer des joueurs.
- Historique local des couples déjà joués.
- Session persistante locale pour reprendre après une fermeture ou un rechargement.
- Mode hors ligne après une première ouverture complète.
- Interface bilingue sans rechargement.

## Règles

### Civils

Tous les Civils reçoivent le même mot. Ils doivent identifier les intrus.

### Undercover

Tous les Undercover reçoivent le même second mot, proche du mot des Civils. Ils ne savent pas qui sont les autres Undercover.

### Mr White

Mr White ne reçoit aucun mot. Il doit déduire le thème grâce aux indices des autres joueurs.

S’il est éliminé, il peut tenter de deviner exactement le mot des Civils.

## Déroulement

1. Choisir le nombre de joueurs, d’Undercover et de Mr White.
2. Choisir une catégorie.
3. Faire circuler le téléphone dans l’ordre autour de la table pour saisir les prénoms.
4. Faire circuler à nouveau le téléphone pour révéler secrètement les mots.
5. Sketchy! désigne un premier joueur qui **ne peut jamais être Mr White**.
6. Chacun donne un indice.
7. Le groupe vote pour éliminer un suspect.
8. Recommencer jusqu’à la victoire d’une équipe.

## Session persistante

Une partie démarrée est sauvegardée automatiquement dans le stockage local du navigateur.

La session contient notamment :

- l’ordre et les prénoms des joueurs ;
- les rôles ;
- les mots de la partie ;
- les joueurs éliminés ;
- le numéro du vote ;
- le premier joueur de la manche ;
- l’avancement de la distribution ;
- la langue des mots de la partie.

Si Safari, Chrome ou l’application web est fermé, l’écran d’accueil propose **Reprendre la partie / Resume game**.

Les prénoms ne constituent pas un carnet permanent : ils sont supprimés lorsque l’utilisateur crée une nouvelle partie ou abandonne la session.

## Confidentialité

Aucun prénom, rôle, mot ou historique de partie n’est envoyé vers un serveur applicatif.

GitHub Pages ne sert que les fichiers statiques du jeu. Les données de partie restent dans le navigateur de l’appareil.

## Compatibilité

### iPhone / iPad

Prévu pour les versions récentes de Safari iOS et iPadOS, avec gestion :

- des safe areas ;
- de la Dynamic Island / encoche ;
- du tactile ;
- du clavier virtuel ;
- du mode portrait et paysage ;
- de l’installation sur l’écran d’accueil.

### Android

Prévu pour Chrome, Samsung Internet et les navigateurs Android modernes.

### Ordinateur

Fonctionne également avec les navigateurs modernes, même si l’ergonomie est conçue en priorité pour un téléphone qui circule autour de la table.

## WhatsApp

Partager l’URL GitHub Pages :

**https://waremotion.github.io/undercover/**

Il est déconseillé d’envoyer directement un fichier `.html`, notamment sur iOS où l’aperçu de pièce jointe peut empêcher certains scripts de fonctionner.

## Hors ligne

Lors de la première ouverture, une connexion est nécessaire.

Le service worker met ensuite en cache :

- l’interface ;
- les styles ;
- le moteur du jeu ;
- le moteur i18n ;
- les banques de mots française et anglaise ;
- le manifeste PWA.

La version actuelle du cache est `sketchy-v11-1`.

## Structure

```text
undercover/
├── index.html
├── styles.css
├── session.css
├── i18n.css
├── i18n-fr.js
├── i18n-en.js
├── i18n.js
├── words.js
├── words-en.js
├── words-en-food.js
├── words-en-objects.js
├── words-en-places.js
├── words-en-nature.js
├── words-en-culture.js
├── words-en-daily.js
├── game-core.js
├── game-flow.js
├── game-runtime.js
├── app.js
├── manifest.webmanifest
├── sw.js
└── README.md
```

## Développement local

Aucun framework ni compilation n’est nécessaire.

```bash
python3 -m http.server 8080
```

Puis ouvrir :

```text
http://localhost:8080
```

## Déploiement

GitHub Pages publie la branche `main`.

Les mises à jour gardent la même URL :

**https://waremotion.github.io/undercover/**
