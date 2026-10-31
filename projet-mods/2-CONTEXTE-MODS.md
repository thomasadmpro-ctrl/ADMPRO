# Contexte technique — comment fonctionnent les mods

> Fichier de connaissance du projet. Résumé fiable de l'API des mods ; la **source de vérité** reste le fichier de types
> livré par le skill `plugin-authoring` à chaque session (`claude-code.d.ts`, ~14 000 lignes : chercher le nom voulu avec grep,
> ex. `'tool.call'`, `Pane: {`, `export type ToolCallResult`). En cas de doute entre ce fichier et les types, **les types gagnent**.

## 1. Qu'est-ce qu'un mod ?

Un petit plugin (TypeScript/TSX) chargé par le moteur de Claude Code qui **accroche des hooks** sur des événements
(envoi d'un prompt, appel d'outil, fin de tour, rendu d'interface…) pour afficher des éléments ou changer un comportement.
Il fonctionne sur les surfaces : `desktop`, `mobile`, `terminal`, `vscode`.

## 2. Structure d'un mod (fichiers obligatoires)

```
<nom-du-mod>/
├── .claude-plugin/plugin.json   { "name": "<nom-du-mod>", "version": "0.1.0", "description": "<une ligne>" }
├── hooks/hooks.json             { "modules": ["./register.tsx"] }
├── hooks/register.tsx           le module de hooks
└── types/index.d.ts             (seulement si $.state est utilisé) + "types": "./types/index.d.ts" dans plugin.json
```

- Dossier d'écriture dans une session cloud : celui indiqué par le skill (`/root/.claude/dev-mods/<id>/<nom-du-mod>/`).
- Copie de sauvegarde : `mods/<nom-du-mod>/` dans ce dépôt (le conteneur est éphémère).

## 3. Le module en un paragraphe

```tsx
import type { Register } from 'claude-code'

export const register: Register = (on, options) => {
  on('prompt.submit', async ($, e, next) => {
    // $ = interface du moteur (nom puis méthode : $.ui.toast, $.clock.now…)
    // e = entrée de l'événement (valeur figée)
    // next(e) = laisse passer vers les autres plugins puis le comportement normal
    return next(e)
  })
}
```

- Retourner **sans** `next` = le hook répond seul (bloque/remplace).
- `next({ ...e, x })` = réécrit ce que voit la suite.
- Pas de DOM ni de Node : tout passe par `$`.
- JSX compilé avec le `h` global ; composants obtenus via `const { Box, Text, Button } = $.ui.resolve(e)`.

## 4. Tableau « demande → forme »

| L'utilisateur demande | Forme technique | Exemple de référence |
| --- | --- | --- |
| un panneau, une barre latérale, une vue live | `$.ui.open({ id, title })` + hook `ui.render` sur `{ component: 'Pane', requestId: id }` | `pane.tsx` |
| un bandeau au-dessus du prompt | hook `ui.render` sur `{ component: 'AbovePrompt' }` (retourner `next(e)` si rien à montrer) | `band.tsx` |
| une info dans la ligne de statut | `$.ui.status(texte)` ; `undefined` l'efface | `tool-call.ts` |
| une notification (toast) | `$.ui.toast(texte)` | `band.tsx` |
| bloquer / modifier / réagir à un outil | `on('tool.call', { tool }, hook)` → `{ deny }`, `next({...e})` ou `await next(e)` | `tool-call.ts` |
| modifier / réagir à un prompt envoyé | `on('prompt.submit', hook)` → `next({ ...e, text })` | `band.tsx` |
| changer le prompt système | `on('prompt.compose', hook)` : ajouter une section à `{ sections }` (`scope: 'session'`) | doc dans les types |
| jouer un son | `$.audio.play({ asset })` (fichier inclus dans le mod) | doc dans les types |
| une commande slash | `$.command.register({ name, description })` dans `session.start` + hook `command.run` qui retourne `{ text }` | `pane.tsx` |
| des valeurs affichées qui se mettent à jour | `atom(ref, initial)`, `read($, atom)` au rendu, `update($, atom, fn)` ailleurs | `pane-state.d.ts` |
| minuteur, outil appelable par Claude, sous-agent, appel modèle, fichiers, processus | `$.clock`, `$.tool`, `$.agent`, `$.model`, `$.fs`, `$.process` | `reference.md` |

Règle : tout ce qui doit **rester à côté du chat** = un pane (mod), pas une page web. Une page sert à un document à lire ou envoyer.

## 5. Mémoire du mod

- Variables du module : remises à zéro à chaque rechargement.
- `$.state` : persiste pendant la session (survit aux rechargements).
- `$.store` : persiste entre les sessions.
- Chaque clé utilisée doit être déclarée dans `types/index.d.ts` (`interface PluginState`, sous le nom du mod).
- Une nouvelle version peut lire des valeurs écrites par une ancienne : prévoir la compatibilité (voir `shape` dans `reference.md`).

## 6. Exemple complet (bandeau « durée du dernier tour »)

```tsx
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import type { Turn } from '../types'

const last = atom({ plugin: 'turn-band', key: 'last' } as const, null)
const isHidden = atom({ plugin: 'turn-band', key: 'isHidden' } as const, false)

export const register: Register = on => {
  let startedAt = 0
  let tools = 0

  on('prompt.submit', async ($, e, next) => { startedAt = await $.clock.now(); tools = 0; return next(e) })
  on('tool.call', ($, e, next) => { tools += 1; return next(e) })

  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    await update($, last, () => ({ seconds, tools }) as Turn)
    if (seconds > 120) $.ui.toast(`Ce tour a pris ${seconds}s`)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const turn = await read($, last)
    if (e.props.hasSurvey || turn === null || (await read($, isHidden))) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>Dernier tour : {turn.seconds}s, {turn.tools} outils </Text>
        <Button key="hide" label="Masquer" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
```

## 7. Vérification

| Étape | Commande |
| --- | --- |
| Valider manifeste + module | `claude plugin validate <dossier du mod>` |
| Vérifier les types | `tsc -p <dossier du mod>` (après le premier chargement, les types sont dans `.claude-plugin/types/`) |
| Tester | fichier `*.test.ts(x)` puis `claude plugin test <dossier du mod>` |

En cas d'échec d'un hook, une ligne grise apparaît dans la conversation (`<plugin>: ui.render hook skipped: …`) et revient à Claude au tour suivant.

## 8. Activation et cycle de vie

1. Le premier fichier écrit dans le dossier des mods déclenche la question : **« Turn on the mods Claude writes in this session? »** → `Turn them on`.
2. Le mod se charge **à la fin du tour** ; chaque modification ultérieure le recharge à la fin du tour qui l'a faite.
3. `Not now` : les mods sont écrits mais ne se chargeront qu'au prochain démarrage de session (on peut redemander la question).
4. Un rechargement relance `register` et `session.start`.

## 9. Partager / réinstaller un mod

Pour réutiliser un mod dans une autre session ou le partager : publier le dépôt GitHub avec `.claude-plugin/marketplace.json`,
puis installer avec :

```
/plugin install <mod> --marketplace <owner>/<repo>
```

Ce dépôt (`mods/`) peut servir de marketplace personnelle : demander à Claude « prépare la marketplace » le moment venu.

## 10. Dépannage (vécu)

| Symptôme | Cause | Solution |
| --- | --- | --- |
| `Failed to load hooks … expected record … path: hooks` | Claude Code trop ancien (ne connaît pas `"modules"`) | Mettre à jour Claude Code, puis relancer `claude` |
| `claude --version` récent mais `/status` ancien | Plusieurs installations sur le Mac (ex. npm via nvm + Homebrew) ou session ouverte avant la mise à jour | `which -a claude`, n'en garder qu'une (Thomas : **Homebrew** `/opt/homebrew/bin/claude`), rouvrir le terminal |
| `Unknown command: /bandeau` | Le mod n'est pas chargé | Vérifier `/plugin` (erreur ?), `/status` (version), réinstaller |
| `/plugin install … --marketplace …` : « not found » | Option non supportée ou mod pas encore sur `main` | `/plugin marketplace add thomasadmpro-ctrl/ADMPRO` puis `/plugin install <mod>@admpro-mods` ; fusionner la PR avant |
| Une nouvelle version ne s'affiche pas | Mod installé deux fois (portées `user` et `local`), l'ancienne gagne | `claude plugin list` ; `claude plugin uninstall <mod>@admpro-mods --scope local` puis `--scope user`, réinstaller avec `--scope user`. Toujours choisir la portée **user** |
| Mod non actif dans une session cloud | « Not now » répondu à la question d'activation | Redemander l'activation ; sinon installer en local |

Installation locale de Thomas : macOS, Claude Code via Homebrew (`brew upgrade --cask claude-code` pour mettre à jour).
Après chaque nouveau mod : fusionner la PR, puis `claude plugin marketplace update admpro-mods` et `claude plugin install <mod>@admpro-mods --scope user`.
Après une mise à jour d'un mod existant : `claude plugin marketplace update admpro-mods` puis `claude plugin update <mod>@admpro-mods`.
