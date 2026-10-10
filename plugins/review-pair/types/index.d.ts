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

/** The repository a builder works in: its common git dir (the identity), its top level and name. */
export type Repo = { key: string; top: string; name: string }

/** One range of commits waiting for, or under, review. */
export type Pending = { before: string; after: string; branch: string; subject: string }

/** The reviewer session the mod started for a repo, recorded in $.store per repo. */
export type Reviewer =
  | { name: string; day: string; mode: 'herdr'; paneId: string }
  | { name: string; day: string; mode: 'bg'; bgId: string }

/** Which reviewer a range was sent to: its name and its bgId or paneId. */
export type ReviewerRef = { name: string; id: string }

/** A range sent to a reviewer and not yet answered. */
export type Outstanding = Pending & { sentAt: number; reviewer: ReviewerRef | null }

/** The last HEAD this builder saw in a repo, with its branch. */
export type Seen = { head: string; branch: string }

export type Verdict = 'BLOCKERS' | 'NITS' | 'CLEAN'

export type Review = { repo: string; range: string; verdict: Verdict; at: number }

/** Per repo state of this builder session. */
export type RepoRun = {
  name: string
  top: string
  /** Session-level "not now" from the consent band. */
  notNow: boolean
  /** The range sent to the reviewer and not yet answered. */
  outstanding: Outstanding | null
  /** Ranges that arrived while a review was outstanding or a reviewer was busy, merged into one range. */
  queue: Pending | null
  /** Consecutive BLOCKERS rounds. */
  rounds: number
  /** True once the round cap was hit; the tab says "needs you". */
  capped: boolean
  /** Finding lines of the latest BLOCKERS reply. */
  findings: string[]
  /** The last HEAD and branch seen by a git probe in this repo. */
  seen: Seen | null
}

export type SessionState = {
  repos: Record<string, RepoRun>
  reviews: Review[]
  /** Latest nits per repo key. */
  nits: Record<string, string[]>
}

/** A repo whose first range is waiting for the always / not now / never answer. */
export type Consent = { repo: Repo; pending: Pending }

declare module 'claude-code' {
  interface PluginState {
    'review-pair': {
      section: SidebarSection
      session: SessionState
      consents: Consent[]
    }
  }
}
