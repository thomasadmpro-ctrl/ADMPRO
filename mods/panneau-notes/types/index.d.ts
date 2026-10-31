export type Note = { id: number; texte: string }

declare module 'claude-code' {
  interface PluginState {
    'panneau-notes': { projet: string; notes: Note[] }
  }
}
