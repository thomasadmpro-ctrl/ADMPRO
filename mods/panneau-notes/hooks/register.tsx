import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Note } from '../types'

const PANE = 'notes'
const VIOLET = '#a78bfa'
const VIOLET_FONCE = '#7c3aed'
const NOIR = '#0b0b10'
const GRIS = '#9ca3af'

const projet = atom({ plugin: 'panneau-notes', key: 'projet' } as const, '')
const notes = atom({ plugin: 'panneau-notes', key: 'notes' } as const, [] as Note[])

export const nomProjet = (cwd: string): string =>
  cwd.split('/').filter(Boolean).pop() ?? 'projet'

const cle = (p: string) => `notes:${p}`

/**
 * Lit les notes sauvegardées, en ignorant ce qui n'a pas la bonne forme.
 * Les notes de la version 0.1 (sans « fait ») deviennent des tâches à faire.
 */
export const nettoyer = (brut: unknown): Note[] =>
  Array.isArray(brut)
    ? brut.flatMap((n): Note[] => {
        if (typeof n !== 'object' || n === null) return []
        const { id, texte, fait } = n as Partial<Record<keyof Note, unknown>>
        return typeof id === 'number' && typeof texte === 'string'
          ? [{ id, texte, fait: fait === true }]
          : []
      })
    : []

const sauver = async ($: EngineInterface, liste: Note[]) => {
  await update($, notes, () => liste)
  await $.store.set(cle(await read($, projet)), liste)
}

const ajouter = async ($: EngineInterface, texte: string) => {
  const propre = texte.trim()
  if (propre === '') return false
  const liste = await read($, notes)
  const id = liste.reduce((max, n) => Math.max(max, n.id), 0) + 1
  await sauver($, [...liste, { id, texte: propre, fait: false }])
  return true
}

const cocher = async ($: EngineInterface, id: number) => {
  await sauver($, (await read($, notes)).map(n => (n.id === id ? { ...n, fait: !n.fait } : n)))
}

const viderFaites = async ($: EngineInterface) => {
  await sauver($, (await read($, notes)).filter(n => !n.fait))
}

const supprimer = async ($: EngineInterface, id: number) => {
  await sauver($, (await read($, notes)).filter(n => n.id !== id))
}

const ouvrir = ($: EngineInterface) => $.ui.open({ id: PANE, title: '💜 Notes', backgroundColor: NOIR })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const p = nomProjet(e.cwd)
    await update($, projet, () => p)
    const enregistrees = nettoyer(await $.store.get(cle(p)))
    await update($, notes, () => enregistrees)
    await $.command.register({ name: 'notes', description: 'Ouvrir le panneau des notes du projet' })
    await $.command.register({
      name: 'note',
      description: 'Ajouter une note au projet (ex. /note penser au logo)',
      argumentHint: '<texte de la note>',
    })
    void ouvrir($)
    return next(e)
  })

  on('command.run', { command: 'notes' }, async $ => {
    await ouvrir($)
    return { text: '💜 Panneau des notes ouvert.' }
  })

  on('command.run', { command: 'note' }, async ($, e) => {
    const ok = await ajouter($, e.args)
    if (ok) void ouvrir($)
    return { text: ok ? '📝 Note ajoutée.' : 'Écris le texte après la commande, ex. /note penser au logo' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const liste = await read($, notes)
    const p = (await read($, projet)) || 'projet'
    const faites = liste.filter(n => n.fait).length
    // À faire d'abord, puis les tâches terminées.
    const triees = [...liste.filter(n => !n.fait), ...liste.filter(n => n.fait)]
    const saisie =
      e.surface !== 'mobile' && 'Input' in table ? (
        <table.Input
          key="nouvelle"
          placeholder="Nouvelle note…"
          submitLabel="ajouter"
          onSubmit={texte => void ajouter($, texte)}
        />
      ) : (
        <Text color={GRIS} italic>Ajoute une note avec /note ton texte</Text>
      )

    return (
      <Box flexDirection="column" gap="sm" paddingX="sm">
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={VIOLET} weight="bold" size="heading">📁 {p}</Text>
          <Text color={GRIS}>
            {faites}/{liste.length} faite{faites > 1 ? 's' : ''}
          </Text>
        </Box>
        {saisie}
        {liste.length === 0 && <Text color={GRIS} italic>Aucune note pour l'instant ✨</Text>}
        {triees.map(n => (
          <Box
            key={`note-${n.id}`}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            borderStyle="round"
            borderColor={n.fait ? GRIS : VIOLET_FONCE}
            borderDimColor={n.fait}
            paddingX="sm"
            gap="sm"
          >
            <Button key={`coche-${n.id}`} label={n.fait ? '☑' : '☐'} onPress={() => cocher($, n.id)} />
            <Box flexGrow={1}>
              <Text color={n.fait ? GRIS : '#e9d5ff'} strikethrough={n.fait}>
                {n.texte}
              </Text>
            </Box>
            <Button key={`suppr-${n.id}`} label="✕" onPress={() => supprimer($, n.id)} />
          </Box>
        ))}
        {faites > 0 && (
          <Button key="vider" label={`🧹 Retirer les ${faites} faite${faites > 1 ? 's' : ''}`} onPress={() => viderFaites($)} />
        )}
      </Box>
    )
  })
}
