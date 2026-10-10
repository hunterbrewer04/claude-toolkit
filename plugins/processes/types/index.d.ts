export type SidebarTone = 'accent' | 'done' | 'muted' | 'error' | 'warn' | 'text'

export type SidebarRow =
  | { kind: 'progress'; fraction: number; label?: string }
  | {
      kind: 'item'
      icon: string
      tone?: SidebarTone
      number?: number
      text: string
      state?: 'normal' | 'active' | 'done'
      sub?: { icon?: string; tone?: SidebarTone; text: string }
      action?: { key: string; label: string }
    }
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

export type ProcessEntry = {
  id: string
  command: string
  source: 'background' | 'detached'
  /** The Bash background task id, for background entries. */
  taskId?: string
  pid?: number
  pgid?: number
  /** The ps command line of `pid` when it was found, checked again before any signal. */
  processCommand?: string
  ports: number[]
  startedAt: number
  endedAt?: number
  status: 'running' | 'exited'
}

export type ProcessBook = {
  /** Last id handed out; ids are never reused within a session. */
  seq: number
  entries: ProcessEntry[]
}

declare module 'claude-code' {
  interface PluginState {
    processes: { book: ProcessBook; section: SidebarSection }
  }
}
