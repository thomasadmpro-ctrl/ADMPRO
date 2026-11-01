#!/usr/bin/env bash
# garde-fou : hook PreToolUse (outil Bash).
# Lit l'appel d'outil (JSON) sur l'entrée standard. Si la commande est risquée,
# répond « ask » : Claude Code affiche la fenêtre de permission avec la raison,
# même en auto mode. Sinon, ne dit rien (le fonctionnement normal continue).
# Compatible macOS (grep BSD) et Linux : uniquement des expressions POSIX étendues.

entree="$(cat)"

# Début de commande : début, guillemet (JSON), espace, ; & | ( ` , \n (JSON) ou $(
D='(^|["[:space:];&|(`]|\\n|\$\()'
F='([^[:alnum:]_-]|$)'

raisons=()
verifier() { # $1 = motif (ERE), $2 = raison, $3 = options grep en plus
  if printf '%s' "$entree" | grep -Eq $3 -- "$1"; then raisons+=("$2"); fi
}

verifier "${D}(sudo[[:space:]]+)?(rm|rmdir|unlink|shred)[[:space:]]" "suppression de fichiers"
verifier "find[[:space:]].*[[:space:]]-delete${F}"                      "suppression de fichiers (find -delete)"
verifier "git[[:space:]]+push${F}"                                        "envoi sur GitHub (git push)"
verifier "git[[:space:]]+reset[[:space:]].*--hard${F}"                   "annulation définitive de modifications (git reset --hard)"
verifier "git[[:space:]]+clean${F}"                                       "suppression des fichiers non suivis (git clean)"
verifier "git[[:space:]]+branch[[:space:]].*-D${F}"                      "suppression forcée de branche (git branch -D)"
verifier "git[[:space:]]+(checkout|restore)[[:space:]]+([^\"]*[[:space:]])?(--[[:space:]]|\.([[:space:]\"]|$))" "abandon de modifications non enregistrées"
verifier "git[[:space:]]+stash[[:space:]]+(drop|clear)${F}"              "suppression de modifications mises de côté (git stash)"
verifier "${D}sudo[[:space:]]"                                           "commande administrateur (sudo)"
verifier "(DROP|TRUNCATE)[[:space:]]+(TABLE|DATABASE|SCHEMA)${F}"        "suppression de données en base" "-i"
verifier "(${D}mkfs|${D}dd[[:space:]]+if=)"                              "écriture directe sur un disque"
verifier "chmod[[:space:]]+-R[[:space:]]+777${F}"                        "permissions ouvertes à tous (chmod -R 777)"

[ ${#raisons[@]} -eq 0 ] && exit 0

liste="${raisons[0]}"
for r in "${raisons[@]:1}"; do liste="$liste, $r"; done

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"🛡️ Garde-fou : %s. Tu confirmes ?"}}\n' "$liste"
exit 0
