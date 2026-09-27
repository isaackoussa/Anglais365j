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

### ✨ Coach IA (Gemini ou Claude)
- **Conversation** libre, adaptée à ton niveau, avec corrections en douceur
- **Correcteur** : version corrigée, explication de chaque erreur en français, version « niveau supérieur »
- **Explique-moi** : toutes tes questions de grammaire / vocabulaire
- **Jeux de rôle** : entretien d'embauche, restaurant, aéroport, médecin, négociation…
- Les mots utiles proposés par le coach s'ajoutent à ton répertoire en un clic
- Le coach connaît ton niveau, tes mots récents et ceux que tu oublies souvent, et les réutilise

> Le coach fonctionne avec **Gemini** (Google, par défaut) ou **Claude** (Anthropic), au choix dans les Réglages.
> - Gemini : crée une clé gratuite sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (offre gratuite avec limites par minute et par jour).
> - Claude : crée une clé sur [console.anthropic.com](https://console.anthropic.com/settings/keys).
>
> La clé reste stockée dans ton navigateur et n'est envoyée qu'au fournisseur choisi. Tout le reste de l'app fonctionne sans clé.

### 📈 Progrès
Niveau estimé, parcours A1 → C1, date estimée d'atteinte de l'objectif, série de jours, XP, calendrier de régularité, mémorisation du vocabulaire, historique des textes écrits.

### 🔐 Compte, rappels & e-mails (Brevo)
Comme MasterGraf : on entre avec son **e-mail + un code à 6 chiffres** envoyé par Brevo, sans mot de passe.
- **Progression sauvegardée en ligne** (Netlify Blobs) : elle suit l'élève sur tous ses appareils. Les clés d'IA et les conversations restent sur l'appareil.
- **Rappels aux jours et à l'heure choisis** (Réglages → Rappels) : notification sur le téléphone/ordinateur et/ou e-mail, envoyés *seulement si la session du jour n'est pas faite*. Le message est personnalisé : série en cours, nombre de mots à réviser, niveau.
- **Bilan hebdomadaire** chaque dimanche : sessions, nouveaux mots, XP, précision, progression vers l'objectif, date estimée.
- **E-mails de paliers** : première session, 7/30/100/200/365 jours de série, 100/250/500/750/900 mots, niveau validé.
- **Contacts Brevo enrichis** : chaque élève est ajouté (ou mis à jour) dans Brevo avec ses attributs de progression (`PRENOM`, `NIVEAU`, `NIVEAU_EN_COURS`, `OBJECTIF`, `PROGRESSION`, `SERIE`, `MOTS`, `XP`, `SESSIONS`, `DERNIERE_SESSION`) : tu peux créer tes propres campagnes et automatisations dans Brevo. Crée ces attributs dans Brevo (Contacts → Paramètres → Attributs) pour qu'ils soient remplis.
- **Console admin** sur `/#/admin` (clé `ADMIN_KEY`) : élèves, niveau, série, mots, sessions, rappels, blocage d'un compte.

## Contenu pédagogique
| | A1 | A2 | B1 | B2 | C1 |
|---|---|---|---|---|---|
| Mots & expressions | ~200 | ~185 | ~190 | ~175 | ~175 |
| Leçons de grammaire | 10 | 10 | 10 | 10 | 8 |
| Lectures | 3 | 3 | 3 | 3 | 3 |

Soit **~930 mots et expressions** (dont phrasal verbs, idiomes, faux amis), tous avec traduction et phrase d'exemple.

## Design
Thème clair / sombre, interface pensée mobile d'abord (barre d'onglets flottante) et bureau (barre latérale), typographies *Bricolage Grotesque* / *Inter* / *Newsreader*, animations, confettis, raccourcis clavier (1-4 pour répondre, Entrée pour valider). Installable comme une app (PWA) et utilisable hors-ligne.

## Lancer le projet sur ton ordinateur
Il faut [Node.js](https://nodejs.org) (version 20 ou plus) et [Git](https://git-scm.com).

```bash
git clone https://github.com/isaackoussa/Anglais365j.git
cd Anglais365j
git checkout claude/english-learning-web-app-yuo3l1   # tant que le code n'est pas fusionné dans main
npm install
npm run dev       # http://localhost:5173
npm test          # tests unitaires (répétition espacée, correction, intégrité du contenu)
npm run build     # version de production dans dist/
```

Stack : React 19, TypeScript, Vite ; Netlify Functions + Netlify Blobs (compte, sauvegarde, rappels planifiés), Brevo (e-mails), Web Push ; API Gemini ou SDK Anthropic pour le coach.

Pour tester le compte et les e-mails en local, copie `.env.example` en `.env` : avec `MAIL_DRY_RUN=1`, les e-mails (et le code de connexion) s'affichent dans le terminal au lieu d'être envoyés. `npm run dev` fait aussi tourner les fonctions serveur.

## Déploiement (GitHub → Netlify, comme tes autres apps)
1. Relie le site Netlify **anglais365** au dépôt GitHub (Project configuration → Build & deploy → Link repository). `netlify.toml` règle la construction.
2. Dans Netlify → Project configuration → **Environment variables**, ajoute :
   - `BREVO_API_KEY` : ta clé API Brevo (app.brevo.com → SMTP & API → API Keys). Tu peux réutiliser celle de MasterGraf / SMC Lab.
   - `MAIL_FROM` : l'adresse expéditrice validée dans Brevo (Senders & Domains).
   - `ADMIN_KEY` : un mot de passe long de ton choix pour la console admin.
   - facultatif : `MAIL_FROM_NAME`, `BREVO_LIST_ID`, `APP_URL` (si domaine personnalisé).
   - seulement si les fonctions affichent « MissingBlobsEnvironmentError » (même souci que MasterGraf) : `NETLIFY_SITE_ID` et `NETLIFY_BLOBS_TOKEN`.
3. Redéploie. Les rappels partent automatiquement (fonction planifiée toutes les 15 minutes, uniquement sur le site publié). Les clés des notifications push sont générées toutes seules au premier usage.

Tant que `BREVO_API_KEY` et `MAIL_FROM` ne sont pas configurées, personne ne peut se connecter : c'est voulu (comme MasterGraf).

Sur iPhone, les notifications fonctionnent une fois l'app **ajoutée à l'écran d'accueil** (Safari → Partager → Sur l'écran d'accueil).
