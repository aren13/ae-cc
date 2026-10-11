export type PromptOpen = boolean

declare module 'claude-code' {
  interface PluginState {
    'reply-style': { isPromptOpen: StateFamily<PromptOpen> }
  }
}
