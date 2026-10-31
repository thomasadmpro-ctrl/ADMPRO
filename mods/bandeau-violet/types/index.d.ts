export type Tour = { secondes: number; outils: number }

declare module 'claude-code' {
  interface PluginState {
    'bandeau-violet': { projet: string; branche: string | null; dernier: Tour | null; masque: boolean }
  }
}
