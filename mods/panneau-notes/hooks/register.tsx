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

/** Lit les notes sauvegardées, en ignorant ce qui n'a pas la bonne forme. */
export const nettoyer = (brut: unknown): Note[] =>
  Array.isArray(brut)
    ? brut.filter(
        (n): n is Note =>
          typeof n === 'object' && n !== null &&
          typeof (n as Note).id === 'number' && typeof (n as Note).texte === 'string',
      )
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
  await sauver($, [...liste, { id, texte: propre }])
  return true
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
          <Text color={GRIS}>{liste.length} note{liste.length > 1 ? 's' : ''}</Text>
        </Box>
        {saisie}
        {liste.length === 0 && <Text color={GRIS} italic>Aucune note pour l'instant ✨</Text>}
        {liste.map(n => (
          <Box
            key={`note-${n.id}`}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            borderStyle="round"
            borderColor={VIOLET_FONCE}
            paddingX="sm"
          >
            <Text color="#e9d5ff">• {n.texte}</Text>
            <Button key={`suppr-${n.id}`} label="✕" onPress={() => supprimer($, n.id)} />
          </Box>
        ))}
      </Box>
    )
  })
}
