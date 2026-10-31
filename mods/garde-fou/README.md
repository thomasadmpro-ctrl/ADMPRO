# garde-fou 🛡️

Avant que Claude lance une commande risquée, la fenêtre de permission s'affiche avec la raison, et **c'est toi qui confirmes**.

Commandes surveillées : `rm`/`rmdir`/`unlink`/`shred`, `find … -delete`, `git push`, `git reset --hard`, `git clean`, `git branch -D`, `git checkout -- …`/`git restore .`, `git stash drop|clear`, `sudo`, `DROP/TRUNCATE TABLE|DATABASE`, `mkfs`/`dd if=`, `chmod -R 777`.

- Les autres commandes ne changent pas.
- Une règle de refus déjà en place reste un refus.
- Si plus personne ne peut répondre (mode sans écran), la commande risquée est refusée.

## Installation

Dans Claude Code (terminal) :

```
/plugin marketplace update admpro-mods
/plugin install garde-fou@admpro-mods
```

Puis relancer `claude`.
