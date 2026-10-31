import { expect, test } from 'claude-code/testing'

import { risques } from '../hooks/register'

const verifier = (cmd: string) => ({ tool: 'Bash', input: { command: cmd } }) as const

test('commandes risquées : confirmation demandée', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  for (const cmd of [
    'rm -rf dist',
    'cd app && rm fichier.txt',
    'git push origin main',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git branch -D vieille',
    'git checkout -- src/app.ts',
    'sudo npm install -g truc',
    'find . -name "*.log" -delete',
  ]) {
    const r = await $.tool.check(verifier(cmd))
    expect(r.decision, cmd).toBe('ask')
    expect(r.reason, cmd).toMatch(/Garde-fou/)
  }
})

test('commandes normales : rien ne change', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  for (const cmd of ['ls -la', 'npm run build', 'git status', 'git commit -m "x"', 'docker run --rm img', 'git checkout -b nouvelle', 'echo "rm"']) {
    expect((await $.tool.check(verifier(cmd))).decision, cmd).toBe('allow')
  }
})

test('un refus déjà décidé reste un refus', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'règle' }))
  expect((await $.tool.check(verifier('rm -rf /'))).decision).toBe('deny')
})

test('les autres outils ne sont pas touchés', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  expect((await $.tool.check({ tool: 'Read', input: { file_path: 'rm -rf' } })).decision).toBe('allow')
})

test('liste des raisons', () => {
  expect(risques('rm a && git push')).toEqual(['suppression de fichiers', 'envoi sur GitHub (git push)'])
})
