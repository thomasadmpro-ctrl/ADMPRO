import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'panneau-notes',
  component: 'Pane',
  requestId: 'notes',
  props: {
    title: '💜 Notes',
    isFocused: false,
    bodyColumns: 50,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const moteur = (on: On) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
}

test('panneau vide puis note ajoutée par /note, visible sur toutes les surfaces', async ($, on) => {
  moteur(on)
  mock.store(on)
  await $.session.start({ cwd: '/Users/tom/mon-site', surface: 'desktop', isInteractive: true })

  const vide = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await vide.find({ type: 'Text', text: /Aucune note/ })).toBeTruthy()
  await vide.unmount()

  const { text } = await $.command.run({ command: 'note', args: 'penser au logo' } as never)
  expect(text).toBe('📝 Note ajoutée.')

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /logo/ }))?.text).toBe('penser au logo')
    expect((await ui.find({ type: 'Text', text: /mon-site/ }))?.text).toBe('📁 mon-site')
    await ui.unmount()
  }
})

test('ajout par le champ de saisie et suppression avec ✕', async ($, on) => {
  moteur(on)
  mock.store(on)
  await $.session.start({ cwd: '/x/projet', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.input({ key: 'nouvelle', text: 'acheter un écran' })
    expect(await ui.find({ type: 'Text', text: /écran/ })).toBeTruthy()
    await ui.press({ key: 'suppr-1' })
    expect(await ui.find({ type: 'Text', text: /écran/ })).toBeFalsy()
    await ui.unmount()
  }
})

test('les notes sauvegardées reviennent à la session suivante', async ($, on) => {
  moteur(on)
  mock.store(on, { 'notes:projet': [{ id: 1, texte: 'déjà là' }, { bad: true }] })
  await $.session.start({ cwd: '/x/projet', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  expect(await ui.find({ type: 'Text', text: /déjà là/ }), 'note').toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /\/note/ }), 'aide').toBeTruthy()
  await ui.unmount()
})

test('/note sans texte explique comment faire', async ($, on) => {
  moteur(on)
  mock.store(on)
  await $.session.start({ cwd: '/x/projet', surface: 'desktop', isInteractive: true })
  const { text } = await $.command.run({ command: 'note', args: '  ' } as never)
  expect(text).toMatch(/Écris le texte/)
})

test('cocher une tâche, la décocher, puis retirer les faites', async ($, on) => {
  moteur(on)
  mock.store(on)
  await $.session.start({ cwd: '/x/site', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'note', args: 'faire le menu' } as never)
  await $.command.run({ command: 'note', args: 'choisir les couleurs' } as never)

  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /faite/ }))?.text).toBe('0/2 faite')
    await ui.press({ key: 'coche-1' })
    expect((await ui.find({ type: 'Text', text: /faite/ }))?.text).toBe('1/2 faite')
    expect(await ui.find({ key: 'vider' })).toBeTruthy()
    await ui.press({ key: 'coche-1' })
    expect((await ui.find({ type: 'Text', text: /faite/ }))?.text).toBe('0/2 faite')
    expect(await ui.find({ key: 'vider' })).toBeFalsy()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'coche-2' })
  await ui.press({ key: 'vider' })
  expect(await ui.find({ type: 'Text', text: /couleurs/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /menu/ })).toBeTruthy()
  await ui.unmount()
})

test('les notes de la version 0.1 deviennent des tâches à faire', async ($, on) => {
  moteur(on)
  mock.store(on, { 'notes:site': [{ id: 1, texte: 'ancienne note' }] })
  await $.session.start({ cwd: '/x/site', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /ancienne note/ })).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /faite/ }))?.text).toBe('0/1 faite')
  await ui.unmount()
})
