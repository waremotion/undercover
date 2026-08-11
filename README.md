# Sketchy!

**Sketchy!** est un jeu mobile de déduction sociale à jouer autour d’une table avec **un seul téléphone**.

La majorité des joueurs reçoit le même mot, les Undercover reçoivent un mot proche, et Mr White ne reçoit aucun mot. Les joueurs donnent des indices, débattent puis éliminent les suspects.

## Jouer

Version web :

**https://waremotion.github.io/undercover/**

Le dépôt GitHub conserve pour l’instant le nom historique `undercover`, mais le jeu s’appelle **Sketchy!**.

## Langues

Sketchy! est disponible en **Français** et **English**.

Un sélecteur `FR / EN` discret est affiché dans la barre supérieure avant le lancement d’une partie. Le changement est instantané, sans rechargement, et la préférence est mémorisée localement.

### Langue verrouillée pendant une partie

La langue est choisie avant le démarrage de la partie puis **verrouillée pour toute la session active**. Cela garantit qu’une partie ne mélange jamais une interface anglaise avec des mots français, ou inversement.

Dès que la distribution des rôles commence :

- la langue de la session est enregistrée ;
- le sélecteur devient un indicateur compact non modifiable (`FR` ou `EN`) ;
- toute l’interface reste dans cette langue jusqu’à la fin ;
- `Continuer avec ce groupe` conserve cette même langue ;
- une session reprise après fermeture restaure automatiquement sa langue d’origine.

Pour changer de langue, il faut choisir **Créer une nouvelle partie** ou abandonner la session actuelle. Le sélecteur redevient alors disponible avant la prochaine partie.

### Architecture multilingue

Le multilingue est séparé du moteur de jeu afin de rester facile à maintenir :

```text
i18n-fr.js             # dictionnaire français
i18n-en.js             # dictionnaire anglais
i18n.js                # moteur de traduction
i18n.css               # sélecteur et état verrouillé
words.js               # 556 couples français
words-en.js            # initialisation de la banque anglaise
words-en-*.js          # couples anglais séparés par catégorie
game-core.js           # stockage, sessions et banques de mots
game-flow.js           # déroulement des parties et vues dynamiques
game-runtime.js        # reprise de session et verrouillage de langue
app.js                 # branchement des événements
```

Les éléments HTML utilisent des clés `data-i18n` et les textes dynamiques utilisent `t("clé")`.

## Couples de mots

Chaque langue possède sa propre banque de **556 couples**.

Les couples anglais ne sont pas traduits automatiquement pendant le jeu. Ils sont stockés dans une banque dédiée et ont été choisis pour rester naturels en anglais : les deux mots d’un couple sont suffisamment proches pour créer le doute, mais suffisamment distincts pour permettre aux joueurs de se différencier par leurs indices.

Exemples :

```text
FR : Chat / Tigre
EN : Cat / Tiger

FR : Plage / Piscine
EN : Beach / Swimming pool
```

L’historique anti-répétition est séparé par langue.

## Fonctionnalités principales

- 4 à 20 joueurs.
- 556 couples français et 556 couples anglais.
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
- Interface bilingue sans rechargement avant le démarrage de la partie.

## Règles

### Civils

Tous les Civils reçoivent le même mot. Ils doivent identifier les intrus.

### Undercover

Tous les Undercover reçoivent le même second mot, proche du mot des Civils. Ils ne savent pas qui sont les autres Undercover.

### Mr White

Mr White ne reçoit aucun mot. Il doit déduire le thème grâce aux indices des autres joueurs.

S’il est éliminé, il peut tenter de deviner exactement le mot des Civils.

## Déroulement

1. Choisir la langue.
2. Choisir le nombre de joueurs, d’Undercover et de Mr White.
3. Choisir une catégorie.
4. Faire circuler le téléphone dans l’ordre autour de la table pour saisir les prénoms.
5. Faire circuler à nouveau le téléphone pour révéler secrètement les mots.
6. Sketchy! désigne un premier joueur qui **ne peut jamais être Mr White**.
7. Chacun donne un indice.
8. Le groupe vote pour éliminer un suspect.
9. Recommencer jusqu’à la victoire d’une équipe.

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
- la langue verrouillée de la partie.

Si Safari, Chrome ou l’application web est fermé, l’écran d’accueil propose **Reprendre la partie / Resume game**. Lors de la reprise, Sketchy! replace automatiquement l’interface dans la langue enregistrée avec la session.

Les prénoms ne constituent pas un carnet permanent : ils sont supprimés lorsque l’utilisateur crée une nouvelle partie ou abandonne la session.

## Confidentialité

Aucun prénom, rôle, mot ou historique de partie n’est envoyé vers un serveur applicatif.

GitHub Pages ne sert que les fichiers statiques du jeu. Les données de partie restent dans le navigateur de l’appareil.

## Compatibilité

### iPhone / iPad

Prévu pour les versions récentes de Safari iOS et iPadOS, avec gestion des safe areas, de la Dynamic Island / encoche, du tactile, du clavier virtuel, du portrait/paysage et de l’installation sur l’écran d’accueil.

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

Le service worker met ensuite en cache l’interface, les styles, le moteur du jeu, le moteur i18n, les banques de mots française et anglaise et le manifeste PWA.

## Développement local

Aucun framework ni compilation n’est nécessaire.

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Déploiement

GitHub Pages publie la branche `main` et conserve la même URL après chaque mise à jour.
