export type SidebarTone = 'accent' | 'done' | 'muted' | 'error' | 'warn' | 'text'

export type SidebarRow =
  | { kind: 'progress'; fraction: number; label?: string }
  | { kind: 'item'; icon: string; tone?: SidebarTone; number?: number; text: string;
      state?: 'normal' | 'active' | 'done';
      sub?: { icon?: string; tone?: SidebarTone; text: string };
      action?: { key: string; label: string } }
  | { kind: 'input'; key: string; placeholder?: string; hint?: string }
  | { kind: 'button'; key: string; label: string; primary?: boolean }
  | { kind: 'text'; text: string; tone?: SidebarTone; bold?: boolean }
  | { kind: 'divider'; label: string }

export type SidebarSection = {
  version: 1
  title: string
  badge?: string
  tone?: SidebarTone
  isEmpty: boolean
  attention: number
  rows: SidebarRow[]
}

declare module 'claude-code' {
  interface PluginState {
    sidebar: {
      /** Each widget's latest section, keyed by the widget's plugin name. */
      sections: StateFamily<SidebarSection>
      /** Widget names in the order their first section arrived. */
      seen: string[]
      /** The highest `attention` acted on per widget, so a reload never reopens the pane. */
      seenAttention: StateFamily<number>
      /** Whether the "run /sidebar" toast has shown this session. */
      hasHinted: boolean
    }
  }
}
