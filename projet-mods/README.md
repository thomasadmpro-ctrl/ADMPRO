# Projet Mods — mode d'emploi

Ce dossier contient tout ce qu'il faut pour que chaque conversation sur tes mods donne le meilleur résultat.

| Fichier | Rôle | Où le mettre |
| --- | --- | --- |
| `../CLAUDE.md` | Instructions permanentes (rôle, méthode, règles, format) | Déjà en place : chargé automatiquement par Claude Code sur ce dépôt |
| `1-INSTRUCTIONS-PROJET.md` | Même chose, en bloc à copier | Projet claude.ai → **Instructions** |
| `2-CONTEXTE-MODS.md` | Fonctionnement technique des mods | Projet claude.ai → **Connaissances** (fichier) |
| `3-PROFIL-ET-PREFERENCES.md` | **Tes** goûts et besoins — à remplir | Projet claude.ai → **Connaissances** + à jour dans le dépôt |
| `4-PROMPTS-DE-DEMARRAGE.md` | Modèles de messages pour démarrer une conversation | Pour toi, à copier-coller |
| `../mods/` | Sauvegarde de tous tes mods + `INDEX.md` | Dans le dépôt (le conteneur cloud est effacé à la fin) |

## Installation (5 minutes)

1. **Remplis `3-PROFIL-ET-PREFERENCES.md`** (le plus important pour la qualité des résultats).
2. **Claude Code (recommandé — c'est là que les mods se construisent et se testent)** : ouvre les sessions sur le dépôt
   `thomasadmpro-ctrl/ADMPRO`. `CLAUDE.md` est lu automatiquement, rien d'autre à faire.
3. **Projet claude.ai (optionnel, pour réfléchir / concevoir sans exécuter)** :
   - Créer un projet nommé **Mods** ;
   - coller le bloc de `1-INSTRUCTIONS-PROJET.md` dans *Instructions* ;
   - ajouter `2-CONTEXTE-MODS.md` et `3-PROFIL-ET-PREFERENCES.md` dans *Connaissances*.
4. Démarre chaque conversation avec un modèle de `4-PROMPTS-DE-DEMARRAGE.md`.

## Bonnes pratiques

- **Une conversation = un mod (ou une modification).** Les conversations courtes et ciblées donnent de meilleurs résultats.
- Décris **ce que tu veux voir** et **quand**, avec un exemple concret.
- À la fin du tour, réponds **« Turn them on »** pour activer les mods.
- Mets à jour ton profil quand tes goûts changent.
