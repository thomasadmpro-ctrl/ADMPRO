import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Tour } from '../types'

// Palette noir / violet
const VIOLET = '#a78bfa'
const VIOLET_FONCE = '#7c3aed'
const NOIR = '#0b0b10'
const GRIS = '#9ca3af'

const projet = atom({ plugin: 'bandeau-violet', key: 'projet' } as const, '')
const dernier = atom({ plugin: 'bandeau-violet', key: 'dernier' } as const, null)
const masque = atom({ plugin: 'bandeau-violet', key: 'masque' } as const, false)

/** Dernier segment d'un chemin : /home/user/ADMPRO -> ADMPRO */
export const nomProjet = (cwd: string): string =>
  cwd.split('/').filter(Boolean).pop() ?? 'projet'

/** 75 -> "1 min 15 s", 8 -> "8 s" */
export const duree = (s: number): string =>
  s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`

export const register: Register = on => {
  let outils = 0

  on('session.start', async ($, e, next) => {
    await update($, projet, () => nomProjet(e.cwd))
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
