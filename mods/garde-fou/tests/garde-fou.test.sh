#!/usr/bin/env bash
# Tests du script garde-fou : bash tests/garde-fou.test.sh
cd "$(dirname "$0")/.." || exit 1
ok=0; ko=0
appel() { # JSON comme Claude Code l'envoie
  local cmd="$1"
  cmd="${cmd//\\/\\\\}"; cmd="${cmd//\"/\\\"}"
  printf '{"session_id":"s","transcript_path":"/Users/tom/.claude/t.jsonl","cwd":"/Users/tom/site","permission_mode":"auto","hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"%s","description":"Commande de test"}}' "$cmd" | bash hooks/garde-fou.sh
}
attendre_ask() {
  local sortie; sortie="$(appel "$1")"
  if [[ "$sortie" == *'"permissionDecision":"ask"'* && "$sortie" == *"$2"* ]]; then ok=$((ok+1)); else ko=$((ko+1)); echo "ÉCHEC (devait demander) : $1 -> $sortie"; fi
}
attendre_rien() {
  local sortie; sortie="$(appel "$1")"
  if [[ -z "$sortie" ]]; then ok=$((ok+1)); else ko=$((ko+1)); echo "ÉCHEC (ne devait rien dire) : $1 -> $sortie"; fi
}
attendre_ask 'rm ~/test.txt' 'suppression de fichiers'
attendre_ask 'rm -rf dist' 'suppression de fichiers'
attendre_ask 'cd app && rm fichier.txt' 'suppression de fichiers'
attendre_ask 'ls; rmdir vide' 'suppression de fichiers'
attendre_ask 'git push origin main' 'git push'
attendre_ask 'git reset --hard HEAD~1' 'reset --hard'
attendre_ask 'git clean -fd' 'git clean'
attendre_ask 'git branch -D vieille' 'branch -D'
attendre_ask 'git checkout -- src/app.ts' 'abandon'
attendre_ask 'git restore .' 'abandon'
attendre_ask 'git stash drop' 'stash'
attendre_ask 'sudo npm install -g truc' 'sudo'
attendre_ask 'find . -name "*.log" -delete' 'find -delete'
attendre_ask 'psql -c "drop table clients"' 'base'
attendre_ask 'chmod -R 777 site' '777'
attendre_ask 'rm a && git push' 'suppression de fichiers, envoi sur GitHub'
attendre_rien 'ls -la'
attendre_rien 'npm run build'
attendre_rien 'git status'
attendre_rien 'git commit -m "ajout du menu"'
attendre_rien 'docker run --rm image'
attendre_rien 'git checkout -b nouvelle-page'
attendre_rien 'git pushd'
attendre_rien 'npm run format'
attendre_rien 'echo terminé'
echo "$ok réussis, $ko échoués"
[ "$ko" -eq 0 ]
