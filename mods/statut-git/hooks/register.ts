import type { EngineInterface, Register } from 'claude-code'

export const nomProjet = (cwd: string): string =>
  cwd.split('/').filter(Boolean).pop() ?? 'projet'

/** Contenu de .git/HEAD -> nom de branche (ou commit court si HEAD détaché). */
export const brancheDepuisHead = (head: string): string => {
  const t = head.trim()
  const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(t)
  if (ref?.[1]) return ref[1]
  return /^[0-9a-f]{7,}$/i.test(t) ? `détachée @ ${t.slice(0, 7)}` : '?'
}

const lire = async ($: EngineInterface, chemin: string): Promise<string | undefined> => {
  try {
    return await $.fs.read(chemin)
  } catch {
    return undefined
  }
}

/** Remonte depuis cwd jusqu'à trouver .git (dossier, ou fichier « gitdir: » d'un worktree). */
export const trouverBranche = async ($: EngineInterface, cwd: string): Promise<string | undefined> => {
  const parts = cwd.split('/').filter(Boolean)
  for (let i = parts.length; i >= 0; i--) {
    const dossier = '/' + parts.slice(0, i).join('/')
    const base = dossier === '/' ? '' : dossier
    const head = await lire($, `${base}/.git/HEAD`)
    if (head !== undefined) return brancheDepuisHead(head)
    const fichier = await lire($, `${base}/.git`)
    const gitdir = fichier && /^gitdir:\s*(.+)$/m.exec(fichier.trim())?.[1]
    if (gitdir) {
      const abs = gitdir.startsWith('/') ? gitdir : `${base}/${gitdir}`
      const h = await lire($, `${abs}/HEAD`)
      if (h !== undefined) return brancheDepuisHead(h)
    }
  }
  return undefined
}

const rafraichir = async ($: EngineInterface, cwd: string) => {
  if (cwd === '') return
  const branche = await trouverBranche($, cwd)
  $.ui.status(`📁 ${nomProjet(cwd)}  ·  ${branche ? `🌿 ${branche}` : '🚫 pas de dépôt git'}`)
}

export const register: Register = on => {
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await rafraichir($, cwd)
    return next(e)
  })

  // La branche peut changer pendant un tour (git checkout…) : on relit à la fin.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await rafraichir($, cwd)
    return r
  })
}
