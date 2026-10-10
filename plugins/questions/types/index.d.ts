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

export type Question = {
  /** `q<n>`: the key suffix the sidebar's Input is drawn with. */
  id: string
  n: number
  question: string
  default: string
  /** The subagent's description when the question came from a subagent. */
  askedBy?: string
  status: 'open' | 'answered'
  answer?: string
  /** When the answer was submitted; orders the Answered list. */
  answeredAt?: number
  delivered: boolean
  askedAt: number
}

export type QuestionAgent = {
  id: string
  description: string
}

declare module 'claude-code' {
  interface PluginState {
    questions: {
      items: Question[]
      agents: QuestionAgent[]
      attention: number
      section: SidebarSection
    }
  }
}
