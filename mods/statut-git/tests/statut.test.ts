import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const monter = (on: On, fichiers: Record<string, string>) => {
  const statuts: (string | undefined)[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.status', (_, e) => {
    statuts.push(e.text)
    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    const contenu = fichiers[e.path]
    if (contenu === undefined) throw new Error('ENOENT')
    return { value: contenu }
  })
  return statuts
}

test('affiche le projet et la branche', async ($, on) => {
  const statuts = monter(on, { '/Users/tom/site/.git/HEAD': 'ref: refs/heads/main\n' })
  await $.session.start({ cwd: '/Users/tom/site', surface: 'terminal', isInteractive: true })
  expect(statuts.at(-1)).toBe('📁 site  ·  🌿 main')
})

test('trouve le dépôt depuis un sous-dossier', async ($, on) => {
  const statuts = monter(on, { '/Users/tom/site/.git/HEAD': 'ref: refs/heads/feature/menu' })
  await $.session.start({ cwd: '/Users/tom/site/src/app', surface: 'desktop', isInteractive: true })
  expect(statuts.at(-1)).toBe('📁 app  ·  🌿 feature/menu')
})

test('worktree : suit le fichier gitdir', async ($, on) => {
  const statuts = monter(on, {
    '/w/wt/.git': 'gitdir: /repo/.git/worktrees/wt\n',
    '/repo/.git/worktrees/wt/HEAD': 'ref: refs/heads/essai',
  })
  await $.session.start({ cwd: '/w/wt', surface: 'desktop', isInteractive: true })
  expect(statuts.at(-1)).toBe('📁 wt  ·  🌿 essai')
})

test('hors dépôt git, et HEAD détaché', async ($, on) => {
  const fichiers: Record<string, string> = {}
  const statuts = monter(on, fichiers)
  await $.session.start({ cwd: '/tmp/brouillon', surface: 'desktop', isInteractive: true })
  expect(statuts.at(-1)).toBe('📁 brouillon  ·  🚫 pas de dépôt git')

  fichiers['/tmp/brouillon/.git/HEAD'] = '3d39270abcdef1234567890\n'
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(statuts.at(-1)).toBe('📁 brouillon  ·  🌿 détachée @ 3d39270')
})
