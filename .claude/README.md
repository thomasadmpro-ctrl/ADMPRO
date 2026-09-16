# Skills installés dans ce projet

Les skills ci-dessous sont vendorisés (copiés) dans `.claude/` et versionnés avec le projet,
pour qu'ils soient disponibles sans installation locale supplémentaire.

## impeccable — v4.3.1

Source : https://github.com/pbakaus/impeccable (commit `f2c7051`)

- `.claude/skills/impeccable/` — le skill et ses 24 commandes (`/impeccable init`, `polish`,
  `audit`, `critique`, `craft`, `animate`, …)
- `.claude/agents/impeccable-*.md` — 4 sous-agents utilisés par le skill
- `.claude/settings.json` — hooks `PostToolUse` (Edit/Write) et `Stop` qui lancent le
  détecteur de design. Le hook est protégé par un test de présence du binaire : si le
  lanceur est absent, il ne fait rien.

Le lanceur `.claude/skills/impeccable/scripts/impeccable` télécharge le moteur Impeccable
(binaire autonome) au premier lancement dans `~/.impeccable/bin/`. Aucun runtime Node ou
Python n'est requis.

Commencer par : `/impeccable init` (écrit `PRODUCT.md` à la racine du projet).

Mise à jour : `npx impeccable update`, ou recopier `.claude/skills/impeccable`,
`.claude/agents/impeccable-*.md` et `.claude/settings.json` depuis le dépôt source.

## ui-ux-pro-max — v2.13.0

Source : https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (commit `15de38f`)

Les 7 skills livrés par l'installeur officiel (`uipro init --ai claude`) :

- `ui-ux-pro-max` — base de données de design consultable (79 styles, 192 palettes,
  74 paires de polices, 119 règles UX, 25 types de graphiques, 22 stacks)
- `design`, `design-system`, `brand`, `ui-styling`, `slides`, `banner-design`

Les scripts de recherche requièrent **Python 3** :

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --domain style
```

Mise à jour : `npx ui-ux-pro-max-cli init --ai claude`, ou recopier les dossiers de skills
depuis `.claude/skills/` du dépôt source.

---

# Serveurs MCP

Déclarés dans `.mcp.json` à la racine du projet (portée projet : disponibles pour
quiconque ouvre ce dépôt avec Claude Code).

## magicuidesign-mcp

[Magic UI](https://magicui.design) — composants React/Tailwind animés, prêts à l'emploi.
Lancé à la demande via `npx` (Node requis, aucune clé d'API).

Claude Code demande une approbation au premier démarrage : les serveurs MCP définis dans
un dépôt ne sont jamais exécutés sans accord explicite.
