# Sketchy!

**Sketchy!** est un jeu mobile de déduction sociale pour soirées entre amis. Le principe est simple : la majorité des joueurs reçoit le même mot, les Undercover reçoivent un mot proche, et Mr White ne reçoit aucun mot.

Le jeu se joue avec **un seul téléphone qui circule autour de la table**.

## Jouer

Version web :

**https://waremotion.github.io/undercover/**

Le nom du dépôt reste actuellement `undercover`, mais le jeu et l’application web portent désormais le nom **Sketchy!**.

## Fonctionnalités principales

- 4 à 20 joueurs.
- 556 couples de mots.
- Plusieurs catégories de mots.
- Civils, Undercover et Mr White.
- Distribution des rôles dans l’ordre physique autour de la table.
- Saisie des prénoms en faisant passer le téléphone de voisin en voisin.
- Mr White ne commence jamais une manche.
- Vote et élimination directement dans l’application.
- Le rôle du joueur éliminé est révélé, mais pas son mot.
- Dernière chance de Mr White pour deviner le mot des Civils.
- Fonction « J’ai oublié mon mot » avec affichage secret pendant l’appui.
- Possibilité de continuer avec le même groupe et de retirer les joueurs qui quittent la table.
- Historique local des couples déjà joués afin de limiter les répétitions.
- Session persistante locale pour reprendre une partie après fermeture ou rechargement.
- Mode hors ligne après une première ouverture complète.

## Rôles

### Civils

Tous les Civils reçoivent le même mot. Leur objectif est d’identifier et d’éliminer tous les intrus.

Ils voient uniquement leur mot et ne voient pas explicitement le rôle « Civil » pendant la distribution.

### Undercover

Les Undercover reçoivent tous un second mot, proche de celui des Civils. Ils doivent se fondre dans le groupe et éviter l’élimination.

Ils voient uniquement leur mot et ne connaissent pas directement l’identité des autres Undercover.

### Mr White

Mr White ne reçoit aucun mot. Il doit improviser à partir des indices donnés par les autres joueurs.

S’il est éliminé, il peut tenter de deviner exactement le mot des Civils pour remporter la partie.

Mr White n’est jamais choisi comme premier joueur pour donner un indice.

## Déroulement d’une partie

### 1. Configuration

Choisissez :

- le nombre de joueurs ;
- le nombre d’Undercover ;
- le nombre de Mr White ;
- la catégorie de mots.

Le jeu conserve toujours au moins trois Civils dans les configurations autorisées.

### 2. Ordre autour de la table

Le premier joueur saisit son prénom puis passe le téléphone à son voisin. Chaque joueur fait la même chose, toujours dans le même sens.

Cet ordre devient l’ordre physique de la table. La distribution des rôles suit exactement cette séquence, ce qui permet à chacun de simplement passer le téléphone à son voisin après avoir vu son information.

### 3. Distribution secrète

Chaque joueur :

1. attend que son prénom apparaisse ;
2. vérifie que personne ne regarde ;
3. consulte son mot ou son statut Mr White ;
4. mémorise l’information ;
5. cache l’écran ;
6. passe le téléphone à son voisin.

### 4. Indices

Une fois la distribution terminée, Sketchy! choisit un premier joueur parmi les Civils et Undercover encore en jeu.

**Mr White est toujours exclu de ce tirage.**

Chaque joueur donne ensuite un indice court sans prononcer directement son mot.

### 5. Vote et élimination

Le groupe discute puis choisit un joueur à éliminer.

L’application révèle uniquement son rôle :

- Civil ;
- Undercover ;
- Mr White.

Son mot reste secret jusqu’à la fin de la partie.

### 6. Mr White

Lorsqu’un Mr White est éliminé, il peut proposer le mot exact des Civils.

S’il trouve le bon mot, il gagne immédiatement.

## Conditions de victoire

### Civils

Les Civils gagnent lorsque tous les Undercover et tous les Mr White sont éliminés.

### Undercover

Les Undercover gagnent lorsqu’ils deviennent au moins aussi nombreux que tous leurs adversaires encore en vie.

### Mr White

Mr White gagne s’il trouve le mot des Civils après son élimination ou s’il atteint une situation de contrôle final prévue par les règles du jeu.

## Continuer avec le groupe

À la fin d’une partie, le bouton **« Continuer avec ce groupe »** permet de préparer immédiatement la suivante.

Avant de relancer :

- les joueurs encore présents sont affichés dans leur ordre autour de la table ;
- un joueur peut être retiré ;
- un joueur retiré par erreur peut être rajouté ;
- il faut conserver au moins quatre joueurs ;
- la composition des rôles est automatiquement ajustée si nécessaire.

Une nouvelle distribution complète des rôles et un nouveau couple de mots sont ensuite générés.

## Session persistante

Sketchy! sauvegarde automatiquement la **session active** dans le stockage local du téléphone.

La sauvegarde contient notamment :

- les joueurs et leur ordre ;
- les rôles ;
- le couple de mots courant ;
- les joueurs éliminés ;
- le numéro du vote ;
- l’avancement de la distribution ;
- le joueur qui commence la manche ;
- l’état de la gestion du groupe.

Si l’onglet, Safari, Chrome ou l’application web est fermé, l’écran d’accueil propose **« Reprendre la partie »**.

Pour éviter une révélation accidentelle, une reprise effectuée pendant un écran secret revient sur un écran sécurisé plutôt que de réafficher directement le mot.

La session active est supprimée lorsqu’on choisit volontairement de créer une nouvelle partie ou d’abandonner la session.

## Données et confidentialité

Sketchy! ne possède pas de compte utilisateur et ne transmet pas les prénoms à un serveur applicatif.

Les données de partie sont stockées uniquement dans le navigateur du téléphone utilisé pour lancer la partie.

L’historique des couples déjà joués est lui aussi local à l’appareil et au navigateur.

Il peut être perdu si l’utilisateur efface les données du site, utilise une navigation privée, change de navigateur ou réinitialise son appareil.

## Anti-répétition des mots

Sketchy! contient 556 couples de mots.

À chaque partie, un couple inédit est choisi parmi ceux encore disponibles dans la catégorie sélectionnée. Une fois tous les couples utilisés, un nouveau cycle peut recommencer.

Le bouton **« Réinitialiser l’historique des mots »** permet de recommencer manuellement le cycle.

## Compatibilité

### iPhone et iPad

Sketchy! est conçu pour fonctionner dans les versions récentes de Safari sur iOS et iPadOS.

L’interface prend en compte :

- les zones de sécurité de l’écran ;
- l’encoche et la Dynamic Island ;
- la barre d’accueil ;
- les événements tactiles ;
- le clavier virtuel ;
- le portrait et le paysage.

Pour l’ajouter comme application :

1. ouvrir le site dans Safari ;
2. toucher **Partager** ;
3. choisir **Sur l’écran d’accueil** ;
4. valider.

### Android

Sketchy! est conçu pour les navigateurs Android modernes, notamment Chrome et Samsung Internet.

Dans Chrome, utilisez **Installer l’application** ou **Ajouter à l’écran d’accueil** lorsque l’option est proposée.

### Ordinateur

Le jeu fonctionne également dans les navigateurs modernes sur ordinateur, même si l’expérience est prioritairement pensée pour un téléphone partagé autour d’une table.

## WhatsApp et partage

Partagez le lien web :

**https://waremotion.github.io/undercover/**

Il vaut mieux éviter d’envoyer directement le fichier HTML comme pièce jointe. Certains aperçus intégrés, notamment sur iOS, peuvent afficher la page sans exécuter correctement toute la logique JavaScript.

## Mode hors ligne

La première ouverture nécessite une connexion Internet pour récupérer les fichiers de Sketchy!.

Un service worker met ensuite les ressources principales en cache. Le jeu peut alors fonctionner hors ligne tant que le navigateur conserve ces données.

## Mises à jour

Le jeu est publié depuis la branche `main` avec GitHub Pages.

Les nouvelles versions conservent la même adresse publique :

**https://waremotion.github.io/undercover/**

Le cache du service worker est versionné afin que les téléphones récupèrent les nouvelles ressources après une mise à jour.

## Structure du projet

```text
undercover/
├── index.html
├── styles.css
├── session.css
├── app.js
├── branding.js
├── words.js
├── manifest.webmanifest
├── sw.js
└── README.md
```

## Développement local

Aucun framework ni processus de compilation n’est requis.

Un petit serveur HTTP est recommandé pour tester correctement le service worker :

```bash
python3 -m http.server 8080
```

Puis ouvrir :

```text
http://localhost:8080
```

## Hébergement

Le projet est un site statique compatible GitHub Pages : HTML, CSS et JavaScript uniquement.

Le dépôt public actuel est `waremotion/undercover` et l’application publiée s’appelle **Sketchy!**.
