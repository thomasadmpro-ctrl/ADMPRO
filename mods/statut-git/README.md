# statut-git 🌿

Ligne de statut sous le prompt, toujours visible : **📁 projet · 🌿 branche git**.

- Mise à jour au démarrage et après chaque réponse de Claude (si la branche change).
- Fonctionne depuis un sous-dossier et dans un worktree git ; affiche « 🚫 pas de dépôt git » sinon.
- Lecture seule : ne lance aucune commande git, ne modifie rien.

## Installation

Dans Claude Code (terminal) :

```
/plugin marketplace update admpro-mods
/plugin install statut-git@admpro-mods
```

Puis relancer `claude`.
