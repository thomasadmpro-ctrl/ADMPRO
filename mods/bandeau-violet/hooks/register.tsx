import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Tour } from '../types'

// Palette noir / violet
const VIOLET = '#a78bfa'
const VIOLET_FONCE = '#7c3aed'
const NOIR = '#0b0b10'
const GRIS = '#9ca3af'

const projet = atom({ plugin: 'bandeau-violet', key: 'projet' } as const, '')
const branche = atom({ plugin: 'bandeau-violet', key: 'branche' } as const, null as string | null)
const dernier = atom({ plugin: 'bandeau-violet', key: 'dernier' } as const, null)
const masque = atom({ plugin: 'bandeau-violet', key: 'masque' } as const, false)

/** Dernier segment d'un chemin : /home/user/ADMPRO -> ADMPRO */
export const nomProjet = (cwd: string): string =>
  cwd.split('/').filter(Boolean).pop() ?? 'projet'

/** 75 -> "1 min 15 s", 8 -> "8 s" */
export const duree = (s: number): string =>
  s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`

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
const trouverBranche = async ($: EngineInterface, cwd: string): Promise<string | null> => {
  const parts = cwd.split('/').filter(Boolean)
  for (let i = parts.length; i >= 0; i--) {
    const base = i === 0 ? '' : '/' + parts.slice(0, i).join('/')
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
  return null
}

const majBranche = async ($: EngineInterface, cwd: string) => {
  if (cwd === '') return
  const b = await trouverBranche($, cwd)
  await update($, branche, () => b)
}

export const register: Register = on => {
  let outils = 0
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await update($, projet, () => nomProjet(e.cwd))
    await majBranche($, cwd)
    await $.command.register({
      name: 'bandeau',
      description: 'Afficher ou masquer le bandeau violet (/bandeau)',
    })
    return next(e)
  })

  on('command.run', { command: 'bandeau' }, async $ => {
    const etait = await read($, masque)
    await update($, masque, () => !etait)
    return { text: etait ? '💜 Bandeau affiché.' : '🙈 Bandeau masqué. Tape /bandeau pour le réafficher.' }
  })

  on('prompt.submit', ($, e, next) => {
    outils = 0
    return next(e)
  })

  on('tool.call', ($, e, next) => {
    outils += 1
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // On ignore les tours des sous-agents : seul le tour principal compte.
    if (e.agentId === undefined) {
      const tour: Tour = { secondes: Math.round(e.durationMs / 1000), outils }
      await update($, dernier, () => tour)
      // La branche peut avoir changé pendant le tour (git checkout…).
      await majBranche($, cwd)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, masque))) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const nom = (await read($, projet)) || 'projet'
    const tour = await read($, dernier)
    const b = await read($, branche)
    const etat = e.props.isWorking ? '⚡ En cours…' : '✅ Prêt'

    return (
      <Box
        flexDirection="row"
        flexWrap="wrap"
        alignItems="center"
        columnGap="md"
        paddingX="sm"
        borderStyle="round"
        borderColor={VIOLET_FONCE}
        backgroundColor={NOIR}
      >
        <Text color={VIOLET} weight="bold">💜 {nom}</Text>
        {b !== null && <Text color={GRIS}>🌿 <Text color={VIOLET}>{b}</Text></Text>}
        <Text color={e.props.isWorking ? VIOLET : GRIS}>{etat}</Text>
        {tour === null ? (
          <Text color={GRIS} italic>Aucun tour pour l'instant</Text>
        ) : (
          <>
            <Text color={GRIS}>⏱️ Dernier tour : <Text color={VIOLET}>{duree(tour.secondes)}</Text></Text>
            <Text color={GRIS}>🛠️ Outils : <Text color={VIOLET}>{tour.outils}</Text></Text>
          </>
        )}
        <Button key="masquer" label="Masquer" onPress={() => update($, masque, () => true)} />
      </Box>
    )
  })
}
