import type { On } from 'claude-code'
import { mock } from 'claude-code/testing'

export const TOP = '/work/app'
export const COMMON = '/work/app/.git'
export const DECISION = `decision:${COMMON}`
export const RECORD = `reviewer:${COMMON}`
export const LEASE = `spawning:${COMMON}`
export const FAILURE = `failure:${COMMON}`
export const SESSION_ID = 'sess-1'
export const NOW = new Date(2026, 9, 9, 12).getTime()
export const NOW_S = Math.floor(NOW / 1000)
// reviewerName(): 'reviewer-' + slug of the basename + '-' + 6 hex of FNV-1a of the repo key.
export const NAME = 'reviewer-app-14a482'
export const NAME_OTHER_REPO = 'reviewer-app-d559b1'

// Commit ids, seven or more hex characters so reply ranges can abbreviate them.
export const H = {
  a: 'a1a1a1a1a1a1a1a1a1a1',
  b: 'b2b2b2b2b2b2b2b2b2b2',
  c: 'c3c3c3c3c3c3c3c3c3c3',
  d: 'd4d4d4d4d4d4d4d4d4d4',
  e: 'e5e5e5e5e5e5e5e5e5e5',
}

export const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 10 }

export type Run = { argv: string[]; cwd?: string; env?: Readonly<Record<string, string>>; timeoutMs?: number }
export type Sent = { to: string; text: string }

export type World = {
  git: boolean
  top: string
  common: string
  heads: string[]
  branches: string[]
  // Pairs [older, newer]: the first is an ancestor of the second.
  ancestors: [string, string][]
  // Lines answered to `git log --format=%H %ct`, newest first: `<sha> <unix seconds>`.
  logLines: string[]
  // Parent of each commit, answered to `git rev-parse <sha>^`; a commit missing here has no parent to give.
  parents: Record<string, string>
  runs: Run[]
  sends: Sent[]
  toasts: string[]
  debugLogs: string[]
  delivered: boolean
  // How many of the next sends are refused as undelivered.
  failSends: number
  herdrPaneJson: string
  herdrStartFails: boolean
  // Stdout of `herdr agent start` when it exits 0.
  herdrAgentJson: string
  herdrBusy: number
  bgStdout: string
  bashText: string
  bashError: boolean
  settings: Record<string, unknown>
}

export function newWorld(overrides: Partial<World> = {}): World {
  return {
    git: true,
    top: TOP,
    common: COMMON,
    heads: [H.a, H.b],
    branches: ['main'],
    ancestors: [],
    logLines: [],
    parents: {},
    runs: [],
    sends: [],
    toasts: [],
    debugLogs: [],
    delivered: true,
    failSends: 0,
    herdrPaneJson: '{"result":{"pane":{"pane_id":"p9"}}}',
    herdrStartFails: false,
    herdrAgentJson: '{"result":{"type":"agent_started"}}',
    herdrBusy: 0,
    bgStdout: `backgrounded · bg-1 · ${NAME}\n`,
    bashText: 'ok',
    bashError: false,
    settings: {},
    ...overrides,
  }
}

const ok = (stdout = ''): Record<string, unknown> => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const exit = (code: number): Record<string, unknown> => ({ ...ok(), exitCode: code })

// Each read answers the next value; the last value sticks.
function nextOf(list: string[], fallback: string): string {
  if (list.length > 1) return list.shift() as string

  return list[0] ?? fallback
}

function respond(world: World, argv: readonly string[]): Record<string, unknown> {
  const [cmd, a, b] = argv
  if (cmd === 'git') {
    if (!world.git) return exit(128)
    if (a === 'rev-parse' && b === '--git-common-dir') return ok(`${world.common}\n`)
    if (a === 'rev-parse' && b === '--show-toplevel') return ok(`${world.top}\n`)
    if (a === 'rev-parse' && b === 'HEAD') return ok(`${nextOf(world.heads, H.a)}\n`)
    if (a === 'rev-parse' && b === '--abbrev-ref') return ok(`${nextOf(world.branches, 'main')}\n`)
    if (a === 'merge-base' && argv[2] === '--is-ancestor') {
      const found = world.ancestors.some(([older, newer]) => older === argv[3] && newer === argv[4])

      return exit(found ? 0 : 1)
    }
    if (a === 'rev-parse' && b?.endsWith('^')) {
      const parent = world.parents[b.slice(0, -1)]

      return parent === undefined ? exit(128) : ok(`${parent}\n`)
    }
    if (a === 'log' && argv[2] === '--format=%H %ct') {
      return ok(world.logLines.map(line => `${line}\n`).join(''))
    }
    if (a === 'log') return ok('feat: add thing\n')
  }
  if (cmd === 'herdr' && a === 'pane' && b === 'split') return ok(world.herdrPaneJson)
  if (cmd === 'herdr' && a === 'agent' && world.herdrBusy > 0) {
    world.herdrBusy--

    return { ...exit(1), stdout: '{"error":{"code":"agent_pane_busy","message":"agent target pane p9 is not an available shell"}}\n' }
  }
  if (cmd === 'herdr' && a === 'agent') return world.herdrStartFails ? exit(1) : ok(world.herdrAgentJson)
  if (cmd === 'claude' && a === '--bg') return ok(world.bgStdout)

  return ok()
}

// Stands beneath the mod: git, herdr and claude answers, session sends, toasts, settings, and a Bash stub.
export function beneath(on: On, world: World): void {
  on('process.run', (_$: any, e: any) => {
    world.runs.push({ argv: e.argv, cwd: e.init?.cwd, env: e.init?.env, timeoutMs: e.init?.timeoutMs })

    return { value: respond(world, e.argv) } as any
  })
  on('session.send', (_$: any, e: any) => {
    world.sends.push({ to: e.to, text: e.text })

    if (world.failSends > 0) {
      world.failSends -= 1

      return { isDelivered: false, reason: 'no such session' }
    }

    return world.delivered ? { isDelivered: true } : { isDelivered: false, reason: 'no such session' }
  })
  on('ui.toast', ((_$: any, e: any) => {
    world.toasts.push(e.text)

    return { value: undefined }
  }) as any)
  on('ui.log', ((_$: any, e: any) => {
    world.debugLogs.push(`${e.to ?? 'transcript'}|${e.text}`)

    return { value: undefined }
  }) as any)
  on('tool.call', { tool: 'Bash' }, (() => ({ result: world.bashText, isError: world.bashError })) as any)
  on('settings.read', (() => ({ value: world.settings })) as any)
  on('session.cwd', (() => ({ value: world.top })) as any)
  on('session.id', (() => ({ value: SESSION_ID })) as any)
  on('session.end', ((_$: any, e: any) => ({ sessionId: e.sessionId })) as any)
  // The bottom of the session: a receive is queued as given, and an AbovePrompt draws nothing beneath the mod's band.
  on('session.receive', ((_$: any, e: any) => ({ text: e.text })) as any)
  on('ui.render', { component: 'AbovePrompt' }, (($: any, e: any) => $.ui.resolve(e).Box({ children: [] })) as any)
}

// Records the latest sidebar section the mod publishes, read as the section a Pane would draw.
export function watchSection(on: On): { latest: () => any } {
  let latest: any
  on('state.set', { plugin: 'review-pair', key: 'section' }, ((_$: any, e: any, next: any) => {
    latest = e.value

    return next(e)
  }) as any)

  return { latest: () => latest }
}

// What /review-pair status says, which is how a test reads the decision and the reviewer record back.
export async function statusOf($: any): Promise<string> {
  const answered = await $.command.run({ command: 'review-pair', args: 'status' } as any)

  return String(answered.text)
}

// Time, the store, and the env the mod reads, all in memory.
export function stubs(on: On, env: Record<string, string> = {}, store: Record<string, unknown> = {}): ReturnType<typeof mock.clock> {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on, store)
  mock.env(on, env)

  return clock
}

export function spawnsOf(w: World): Run[] {
  return w.runs.filter(r => r.argv[0] === 'claude' && r.argv[1] === '--bg')
}
