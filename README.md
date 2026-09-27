# Anglais 365 🇬🇧

**Une application web pour passer de A1/A2/B1 à B2 ou C1, un jour après l'autre.**
Programme quotidien, répétition espacée, répertoire de mots, grammaire, lecture, écoute, prononciation — et un coach IA (Claude) pour parler et être corrigé.

## Ce que fait l'application

### 📅 Un programme quotidien (10 à 35 min)
Chaque jour, une session guidée en 4 étapes :
1. **Révisions** — les mots dont ta mémoire a besoin *aujourd'hui* (répétition espacée, algorithme type SM-2). Les erreurs reviennent en fin de série sous une autre forme.
2. **Nouveaux mots** — 5 à 16 mots selon ton rythme, avec audio, exemple et quiz de vérification.
3. **Focus du jour** — en rotation : grammaire (48 leçons expliquées en français), lecture (15 textes + textes générés par l'IA), dictée, expression écrite corrigée par l'IA, prononciation (reconnaissance vocale).
4. **Le tour** — une consolidation qui repioche dans *tout* ce que tu as déjà vu (mots fragiles ou anciens + exercices des leçons passées) pour que rien ne s'efface.

### 📚 Mon répertoire
Tous les mots appris avec leur statut (en cours / acquis / maîtrisé), leur prochaine date de révision, ton taux de réussite. Recherche, filtres par niveau, par statut, tri par mots fragiles, ajout de tes propres mots.

### 🔁 Réviser
Révisions dues, **grand tour** (15 mots de tout le répertoire + grammaire), flashcards, écriture, écoute, dictée, prononciation, mots fragiles, révision par thème.

### ✨ Coach IA (Claude)
- **Conversation** libre, adaptée à ton niveau, avec corrections en douceur
- **Correcteur** : version corrigée, explication de chaque erreur en français, version « niveau supérieur »
- **Explique-moi** : toutes tes questions de grammaire / vocabulaire
- **Jeux de rôle** : entretien d'embauche, restaurant, aéroport, médecin, négociation…
- Les mots utiles proposés par le coach s'ajoutent à ton répertoire en un clic
- Le coach connaît ton niveau, tes mots récents et ceux que tu oublies souvent, et les réutilise

> Le coach nécessite une clé API Anthropic (à créer sur [console.anthropic.com](https://console.anthropic.com/settings/keys)). Elle reste stockée dans ton navigateur et n'est envoyée qu'à l'API d'Anthropic. Tout le reste de l'app fonctionne sans clé.

### 📈 Progrès
Niveau estimé, parcours A1 → C1, date estimée d'atteinte de l'objectif, série de jours, XP, calendrier de régularité, mémorisation du vocabulaire, historique des textes écrits.

## Contenu pédagogique
| | A1 | A2 | B1 | B2 | C1 |
|---|---|---|---|---|---|
| Mots & expressions | ~200 | ~185 | ~190 | ~175 | ~175 |
| Leçons de grammaire | 10 | 10 | 10 | 10 | 8 |
| Lectures | 3 | 3 | 3 | 3 | 3 |

Soit **~930 mots et expressions** (dont phrasal verbs, idiomes, faux amis), tous avec traduction et phrase d'exemple.

## Design
Thème clair / sombre, interface pensée mobile d'abord (barre d'onglets flottante) et bureau (barre latérale), typographies *Bricolage Grotesque* / *Inter* / *Newsreader*, animations, confettis, raccourcis clavier (1-4 pour répondre, Entrée pour valider). Installable comme une app (PWA) et utilisable hors-ligne.

## Lancer le projet
```bash
npm install
npm run dev       # http://localhost:5173
npm test          # tests unitaires (répétition espacée, correction, intégrité du contenu)
npm run build     # version de production dans dist/
```

Stack : React 19, TypeScript, Vite, SDK Anthropic (chargé à la demande). Aucune base de données : la progression est enregistrée dans le navigateur (export / import JSON dans les Réglages).

## Déploiement
Le workflow `.github/workflows/deploy.yml` publie l'app sur GitHub Pages à chaque push sur `main` (activer *Settings → Pages → Source : GitHub Actions*). Le site est 100 % statique : il fonctionne aussi sur Netlify, Vercel, etc.
