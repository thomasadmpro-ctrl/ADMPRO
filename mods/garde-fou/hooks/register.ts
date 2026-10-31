import type { Register } from 'claude-code'

/** Début de commande : début de ligne, ou après ; & | ( ` ou $( */
const D = String.raw`(?:^|[;&|(\x60\n]\s*|\$\(\s*)(?:sudo\s+)?`

const REGLES: readonly { motif: RegExp; raison: string }[] = [
  { motif: new RegExp(`${D}(?:rm|rmdir|unlink|shred)\\s`), raison: 'suppression de fichiers' },
  { motif: /\bfind\b[^\n]*\s-delete\b/, raison: 'suppression de fichiers (find -delete)' },
  { motif: /\bgit\s+push\b/, raison: 'envoi sur GitHub (git push)' },
  { motif: /\bgit\s+reset\s+[^\n]*--hard\b/, raison: 'annulation définitive de modifications (git reset --hard)' },
  { motif: /\bgit\s+clean\b/, raison: 'suppression des fichiers non suivis (git clean)' },
  { motif: /\bgit\s+branch\s+[^\n]*-D\b/, raison: 'suppression forcée de branche (git branch -D)' },
  { motif: /\bgit\s+(?:checkout|restore)\s+(?:[^\n]*\s)?(?:--\s|\.(?:\s|$))/, raison: 'abandon de modifications non enregistrées' },
  { motif: /\bgit\s+stash\s+(?:drop|clear)\b/, raison: 'suppression de modifications mises de côté (git stash)' },
  { motif: new RegExp(`${D}sudo\\s`), raison: 'commande administrateur (sudo)' },
  { motif: /\b(?:DROP|TRUNCATE)\s+(?:TABLE|DATABASE|SCHEMA)\b/i, raison: 'suppression de données en base' },
  { motif: /\b(?:mkfs|dd\s+if=)/, raison: 'écriture directe sur un disque' },
  { motif: /\bchmod\s+-R\s+777\b/, raison: 'permissions ouvertes à tous (chmod -R 777)' },
]

/** Raisons pour lesquelles une commande est risquée (vide = sans risque connu). */
export const risques = (commande: string): string[] =>
  REGLES.filter(r => r.motif.test(commande)).map(r => r.raison)

const commandeDe = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

export const register: Register = on => {
  on('tool.check', { tool: 'Bash' }, async ($, e, next) => {
    const trouves = risques(commandeDe(e.input))
    if (trouves.length === 0) return next(e)
    const avant = await next(e)
    // Une règle plus stricte (refus) l'emporte toujours.
    if (avant.decision === 'deny') return avant
    return { decision: 'ask', reason: `🛡️ Garde-fou : ${trouves.join(', ')}. Tu confirmes ?` }
  }).catch(($, e, next) =>
    next.called ? next(e) : { decision: 'ask', reason: '🛡️ Garde-fou : vérification impossible, confirme toi-même.' },
  )
}
