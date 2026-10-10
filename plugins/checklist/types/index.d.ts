export type ItemStatus = 'pending' | 'in_progress' | 'completed'

export type Item = {
  id: string
  text: string
  status: ItemStatus
  /** The description given to the Agent tool for the subagent working this step. */
  agent?: string
}

export type Checklist = {
  title: string
  items: Item[]
}

export type AgentRunStatus = 'running' | 'done' | 'failed' | 'stopped'

export type AgentRun = {
  id: string
  description: string
  type: string
  status: AgentRunStatus
  tools: number
}

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
    checklist: { list: Checklist; agents: AgentRun[]; section: SidebarSection }
  }
}
