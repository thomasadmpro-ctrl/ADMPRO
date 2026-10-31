import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BANDEAU = {
  plugin: 'bandeau-violet',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const moteur = (on: On) => {
  on('command.register', () => ({ value: { command: 'bandeau' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
}

test('affiche le projet et « aucun tour » au démarrage, sur terminal et desktop', async ($, on) => {
  moteur(on)
  await $.session.start({ cwd: '/home/user/ADMPRO', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BANDEAU, surface })
    expect((await ui.find({ type: 'Text', text: /ADMPRO/ }))?.text).toBe('💜 ADMPRO')
    expect(await ui.find({ type: 'Text', text: /Aucun tour/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /Prêt/ })).toBeTruthy()
    await ui.unmount()
  }
})

test('affiche la durée et le nombre d\'outils du dernier tour', async ($, on) => {
  moteur(on)
  await $.session.start({ cwd: '/home/user/ADMPRO', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'salut', wait: false, origin: { kind: 'composer' } } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'pwd' })
  await $.turn.complete({ answer: 'ok', durationMs: 75_000, isAborted: false, turnId: 't1', reason: 'answer' } as never)

  const ui = await $.ui.mount({ ...BANDEAU, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Dernier tour/ }))?.text).toBe('⏱️ Dernier tour : 1 min 15 s')
  expect((await ui.find({ type: 'Text', text: /Outils/ }))?.text).toBe('🛠️ Outils : 2')
  await ui.unmount()
})

test('le bouton Masquer cache le bandeau', async ($, on) => {
  moteur(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>moteur</Text>
  })
  await $.session.start({ cwd: '/x/projet', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BANDEAU, surface: 'desktop' })
  await ui.press({ key: 'masquer' })
  expect(await ui.find({ type: 'Text', text: /projet/ })).toBeFalsy()
  await ui.unmount()
})

test('affiche la branche git, et la met à jour après un tour', async ($, on) => {
  moteur(on)
  const fichiers: Record<string, string> = { '/home/user/ADMPRO/.git/HEAD': 'ref: refs/heads/main\n' }
  on('fs.read', (_, e) => {
    const c = fichiers[e.path]
    if (c === undefined) throw new Error('ENOENT')
    return { value: c }
  })
  await $.session.start({ cwd: '/home/user/ADMPRO', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BANDEAU, surface })
    expect((await ui.find({ type: 'Text', text: /🌿/ }))?.text).toBe('🌿 main')
    await ui.unmount()
  }

  fichiers['/home/user/ADMPRO/.git/HEAD'] = 'ref: refs/heads/nouvelle-page'
  await $.turn.complete({ answer: 'ok', durationMs: 3000, isAborted: false, turnId: 't2', reason: 'answer' } as never)
  const ui = await $.ui.mount({ ...BANDEAU, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /🌿/ }))?.text).toBe('🌿 nouvelle-page')
  await ui.unmount()
})

test('hors dépôt git : pas de branche affichée', async ($, on) => {
  moteur(on)
  on('fs.read', () => {
    throw new Error('ENOENT')
  })
  await $.session.start({ cwd: '/tmp/brouillon', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BANDEAU, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /🌿/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /brouillon/ })).toBeTruthy()
  await ui.unmount()
})
