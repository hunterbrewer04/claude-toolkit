import type { EngineInterface, Register } from 'claude-code'

import type {
  Consent,
  Outstanding,
  Pending,
  Repo,
  RepoRun,
  Reviewer,
  ReviewerRef,
  SessionState,
  SidebarRow,
  SidebarSection,
  Verdict,
} from '../types'

const TAG = '[review-pair]'
const COMMAND = 'review-pair'
const SECTION = { plugin: 'review-pair', key: 'section' } as const
const SESSION = { plugin: 'review-pair', key: 'session' } as const
const CONSENTS = { plugin: 'review-pair', key: 'consents' } as const
const ROUND_CAP = 2
const KEEP_REVIEWS = 20
const RECENT = 5
const LEASE_MS = 90_000
const STALE_MS = 15 * 60_000
const BACKOFF_MS = 10 * 60_000
const BUILDER_TTL_MS = 12 * 60 * 60_000
const SPAWN_TIMEOUT_MS = 70_000
const UPDATE_TRIES = 20
const SHELL_WAIT_TRIES = 12
const REVIEWER_PROMPT = 'You are the review-pair reviewer for this repo. Wait for review requests.'
const GIT_WORD = /\bgit\b/
const PR_CREATE = /\bgh\s+pr\s+create\b/
const PR_URL = /https:\/\/github\.com\/[^\s"')]+\/pull\/\d+/
const HEADER = /\[review-pair\][*`\s]*(BLOCKERS|NITS|CLEAN)[*`\s]+([^\s*`]+)/
const EDIT_TOOLS = ['Edit', 'Write', 'NotebookEdit']
const EDIT_REASON = 'review-pair reviewer is read-only: it never edits files.'
const BUSY = 'busy'

type Lease = { by: string; at: number }
type Found = Reviewer | typeof BUSY | undefined
type Head = { head: string; branch: string }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    if (!(await isReviewer($))) {
      await $.command.register({
        name: COMMAND,
        description: 'Show or change the review-pair reviewer for this repo',
        argumentHint: 'status|on|off|forget|stop',
      })
      await publish($)
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (await isReviewer($)) {
      return EDIT_TOOLS.includes(e.tool) ? { deny: EDIT_REASON } : next(e)
    }
    if (e.tool !== 'Bash') return next(e)

    const isGit = GIT_WORD.test(e.command)
    const isPr = PR_CREATE.test(e.command)
    if (!isGit && !isPr) return next(e)

    const repo = await safe(() => repoOf($))
    if (repo === undefined) return next(e)
    const before = await safe(() => probe($, repo.top))

    const started = await $.clock.now()
    const ran = await next(e)
    if (ran.deny !== undefined) return ran

    await safe(async () => {
      if (isPr && ran.isError !== true) {
        const url = PR_URL.exec(outputOf(ran))?.[0]
        if (url !== undefined) await sendPr($, repo, url)
      }
      const after = await safe(() => probe($, repo.top))
      if (before !== undefined && after !== undefined) await observe($, repo, before, after, started)
    })

    return ran
  }).catch((_$, e, next) => (next.called ? next(e) : { deny: 'review-pair: its guard failed.' }))

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!(await isReviewer($))) return composed
    const repo = (await $.env.get('REVIEW_PAIR_REPO')) ?? 'this repo'

    return {
      sections: [...composed.sections, { id: 'review-pair:reviewer', text: reviewerGuide(repo), scope: 'session' }],
    }
  })

  on('session.receive', async ($, e, next) => {
    if (await isReviewer($)) return next(e)
    if (!e.text.includes(TAG)) return next(e)
    $.ui.log(`review-pair delivery from ${e.origin.kind}: ${e.text.slice(0, 80)}`, { to: 'debug' })
    if (e.origin.kind !== 'peer' && e.origin.kind !== 'peer-send-message') return next(e)
    if (e.agentId !== undefined) return next(e)

    // Peer deliveries arrive wrapped in a <cross-session-message ...> tag line; the header is the first line inside.
    const lines = e.text.split('\n').filter(line => !/^\s*<\/?cross-session-message\b/.test(line))
    const first = lines.findIndex(line => line.trim() !== '')
    const head = HEADER.exec(lines[first] ?? '')
    if (head === null) return next(e)
    const verdict = head[1] as Verdict
    const range = head[2] ?? ''
    const [left, right] = range.split('..')
    if (left === undefined || right === undefined || left === '' || right === '') return next(e)
    const body = lines.slice(first + 1).map(line => line.trim()).filter(line => line !== '')
    const now = await $.clock.now()

    const matched = await update($, s => {
      const key = matchRepo(s, left, right)
      if (key === undefined) return undefined
      const run = s.repos[key] as RepoRun
      const queued = run.queue
      run.queue = null
      run.outstanding = null
      let pass = false
      if (verdict === 'BLOCKERS') {
        run.rounds += 1
        run.findings = body
        if (run.rounds <= ROUND_CAP) {
          pass = true
        } else {
          run.capped = true
        }
      } else {
        run.rounds = 0
        run.capped = false
        run.findings = []
        s.nits[key] = verdict === 'NITS' ? body : []
      }
      s.reviews = [{ repo: run.name, range, verdict, at: now }, ...s.reviews].slice(0, KEEP_REVIEWS)

      return { repo: { key, top: run.top, name: run.name } as Repo, queued, pass }
    })
    if (matched === undefined) return next(e)

    if (matched.queued !== null) await sendReview($, matched.repo, matched.queued)
    await publish($)

    if (verdict === 'BLOCKERS') {
      if (matched.pass) {
        $.ui.toast('review-pair: blockers found')
        return next(e)
      }
      $.ui.toast('review-pair: blockers persist after 2 rounds, needs you')
      return { consumed: 'review-pair round cap' }
    }

    return { consumed: `review-pair ${verdict.toLowerCase()}` }
  }).catch((_$, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const consents = await readConsents($)
    const first = consents[0]
    if (first === undefined) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const press = (choice: 'always' | 'not now' | 'never'): (() => void) => () =>
      void answer($, choice).catch(() => $.ui.toast('review-pair: could not save that answer'))

    return Box({
      children: [
        Text({ children: `Start a reviewer for ${first.repo.name}?` }),
        Button({ key: 'review-pair:always', label: 'always', onPress: press('always') }),
        Button({ key: 'review-pair:not-now', label: 'not now', onPress: press('not now') }),
        Button({ key: 'review-pair:never', label: 'never', onPress: press('never') }),
      ],
    })
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    if (await isReviewer($)) return { text: 'this is the reviewer session.' }

    return { text: await runCommand($, e.args) }
  }).catch(() => ({ text: 'the command failed.' }))

  on('session.end', async ($, e, next) => {
    if (!(await isReviewer($)) && e.reason !== 'clear') await teardown($, e.sessionId)

    return next(e)
  })
}

async function isReviewer($: EngineInterface): Promise<boolean> {
  return (await $.env.get('REVIEW_PAIR_ROLE')) === 'reviewer'
}

async function safe<T>(work: () => Promise<T>): Promise<T | undefined> {
  try {
    return await work()
  } catch {
    return undefined
  }
}

async function quiet(work: () => Promise<unknown>): Promise<void> {
  await safe(work)
}

// Repo identity: the absolute common git dir, so worktrees share one reviewer.
async function repoOf($: EngineInterface): Promise<Repo | undefined> {
  const cwd = await $.session.cwd()
  const common = await $.process.run(['git', 'rev-parse', '--git-common-dir'], { cwd })
  if (common.exitCode !== 0) return undefined
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd })
  if (top.exitCode !== 0) return undefined
  const topDir = top.stdout.trim()

  return { key: resolveFrom(cwd, common.stdout.trim()), top: topDir, name: basename(topDir) }
}

// HEAD and branch of the repo at its top level, whatever the session's cwd is.
async function probe($: EngineInterface, top: string): Promise<Head | undefined> {
  const head = await $.process.run(['git', 'rev-parse', 'HEAD'], { cwd: top })
  const branch = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd: top })
  if (head.exitCode !== 0 || branch.exitCode !== 0) return undefined

  return { head: head.stdout.trim(), branch: branch.stdout.trim() }
}

async function isAncestor($: EngineInterface, older: string, newer: string, cwd: string): Promise<boolean> {
  const run = await $.process.run(['git', 'merge-base', '--is-ancestor', older, newer], { cwd })

  return run.exitCode === 0
}

// Commits in before..after whose commit time falls in the call (two seconds of slack). Newest first, as git lists them.
async function commitsMadeSince(
  $: EngineInterface,
  repo: Repo,
  before: string,
  after: string,
  started: number,
): Promise<string[]> {
  const log = await $.process.run(['git', 'log', '--format=%H %ct', `${before}..${after}`], { cwd: repo.top })
  if (log.exitCode !== 0) return []
  const floor = Math.floor(started / 1000) - 2
  const made: string[] = []
  for (const line of log.stdout.split('\n')) {
    const match = /^([0-9a-f]+) (\d+)$/.exec(line.trim())
    if (match === null) continue
    if (Number(match[2]) >= floor) made.push(match[1] as string)
  }

  return made
}

// The parent of the oldest new commit is where the range starts; a root commit or a failed lookup falls back to the old head.
async function rangeStartOf($: EngineInterface, cwd: string, oldest: string, fallback: string): Promise<string> {
  const parent = await $.process.run(['git', 'rev-parse', `${oldest}^`], { cwd })
  const sha = parent.stdout.trim()

  return parent.exitCode === 0 && sha !== '' ? sha : fallback
}

async function subjectOf($: EngineInterface, cwd: string): Promise<string> {
  const subject = await $.process.run(['git', 'log', '-1', '--format=%s'], { cwd })

  return subject.exitCode === 0 ? subject.stdout.trim() : ''
}

// Decides whether this git call moved HEAD in a way that is a new range to review.
async function observe($: EngineInterface, repo: Repo, before: Head, after: Head, started: number): Promise<void> {
  const s = await getSession($)
  const seen = s.repos[repo.key]?.seen ?? null
  let start = before.head
  if (
    seen !== null &&
    seen.branch === after.branch &&
    seen.head !== before.head &&
    (await isAncestor($, seen.head, before.head, repo.top))
  ) {
    start = seen.head
  }

  const sameBranch = before.branch === after.branch
  const movedBack = after.head !== before.head && (await isAncestor($, after.head, before.head, repo.top))
  // A switch that also commits (git checkout -b feat && git commit) reviews only the commits this call made; a plain checkout reviews nothing.
  const newBranchCommit =
    !sameBranch && after.head !== before.head && (await isAncestor($, before.head, after.head, repo.top))
  if (newBranchCommit) {
    const made = await commitsMadeSince($, repo, before.head, after.head, started)
    if (made.length > 0) {
      const from = await rangeStartOf($, repo.top, made[made.length - 1] as string, before.head)
      const subject = await subjectOf($, repo.top)
      await newRange($, repo, { before: from, after: after.head, branch: after.branch, subject })
    }
  } else if (sameBranch && !movedBack && after.head !== start) {
    const subject = await subjectOf($, repo.top)
    await newRange($, repo, { before: start, after: after.head, branch: after.branch, subject })
  }

  await update($, next => {
    runOf(next, repo).seen = { head: after.head, branch: after.branch }
  })
}

async function sendPr($: EngineInterface, repo: Repo, url: string): Promise<void> {
  const reviewer = await readReviewer($, repo)
  if (reviewer === undefined) return
  if (!(await sendTo($, reviewer.name, `${TAG} PR ${url}`))) {
    $.ui.toast(`review-pair: could not reach the reviewer for ${repo.name}`)
  }
}

function outputOf(ran: { text?: string; result?: unknown }): string {
  if (typeof ran.text === 'string') return ran.text
  return typeof ran.result === 'string' ? ran.result : JSON.stringify(ran.result ?? '')
}

function resolveFrom(base: string, path: string): string {
  const joined = path.startsWith('/') ? path : `${base}/${path}`
  const parts: string[] = []
  for (const part of joined.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }

  return `/${parts.join('/')}`
}

function basename(path: string): string {
  return path.split('/').filter(part => part !== '').pop() ?? path
}

function rangeOf(pending: Pending): string {
  return `${pending.before}..${pending.after}`
}

function mergePending(first: Pending | null, latest: Pending): Pending {
  if (first === null) return latest

  return { before: first.before, after: latest.after, branch: latest.branch, subject: latest.subject }
}

// Merges ranges in the order given, oldest first.
function mergeAll(ranges: (Pending | null | undefined)[]): Pending | null {
  let merged: Pending | null = null
  for (const range of ranges) {
    if (range === null || range === undefined) continue
    merged = mergePending(merged, range)
  }

  return merged
}

function isDead(outstanding: Outstanding, reviewer: Reviewer | undefined, now: number): boolean {
  if (now - outstanding.sentAt > STALE_MS) return true
  if (reviewer === undefined || outstanding.reviewer === null) return true

  return outstanding.reviewer.name !== reviewer.name || outstanding.reviewer.id !== idOf(reviewer)
}

function idOf(reviewer: Reviewer): string {
  return reviewer.mode === 'herdr' ? reviewer.paneId : reviewer.bgId
}

function decisionKey(key: string): string {
  return `decision:${key}`
}

function reviewerKey(key: string): string {
  return `reviewer:${key}`
}

function spawningKey(key: string): string {
  return `spawning:${key}`
}

function failureKey(key: string): string {
  return `failure:${key}`
}

function builderKey(key: string, sessionId: string): string {
  return `builders:${key}:${sessionId}`
}

function localDay(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

// Reviewer name: the repo's basename plus a stable hash of its key, so two repos named app differ.
function reviewerName(repo: Repo): string {
  // herdr agent names are at most 32 characters: 9 for the prefix, 7 for the hash, 16 for the repo.
  const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 16).replace(/-+$/, '') || 'repo'

  return `reviewer-${slug}-${fnv1a(repo.key).slice(0, 6)}`
}

function emptySession(): SessionState {
  return { repos: {}, reviews: [], nits: {} }
}

async function getSession($: EngineInterface): Promise<SessionState> {
  const read = await $.state.get(SESSION)

  return read.value ?? emptySession()
}

// Read, decide and write in one state update: a write that lost a race is read again and decided again.
async function update<T>($: EngineInterface, change: (s: SessionState) => T): Promise<T> {
  for (let tries = 0; tries < UPDATE_TRIES; tries += 1) {
    const read = await $.state.get(SESSION)
    const s = read.value ?? emptySession()
    const result = change(s)
    const written = await $.state.set(SESSION, s, { ifVersion: read.version })
    if (written.isSet) return result
  }
  throw new Error('review-pair: session state kept changing')
}

async function readConsents($: EngineInterface): Promise<Consent[]> {
  const read = await $.state.get(CONSENTS)

  return read.value ?? []
}

function runOf(s: SessionState, repo: Repo): RepoRun {
  const existing = s.repos[repo.key]
  if (existing !== undefined) return existing
  const created: RepoRun = {
    name: repo.name,
    top: repo.top,
    notNow: false,
    outstanding: null,
    queue: null,
    rounds: 0,
    capped: false,
    findings: [],
    seen: null,
  }
  s.repos[repo.key] = created

  return created
}

function matchRepo(s: SessionState, left: string, right: string): string | undefined {
  const hit = Object.entries(s.repos).find(
    ([, run]) =>
      run.outstanding !== null && shaMatch(run.outstanding.before, left) && shaMatch(run.outstanding.after, right),
  )

  return hit?.[0]
}

// Two SHAs match when the shorter is a prefix of the longer; both must be at least 7 characters.
function shaMatch(full: string, given: string): boolean {
  const a = given.toLowerCase()
  const b = full.toLowerCase()
  if (a.length < 7 || b.length < 7) return false

  return b.startsWith(a) || a.startsWith(b)
}

async function readReviewer($: EngineInterface, repo: Repo): Promise<Reviewer | undefined> {
  return (await $.store.get(reviewerKey(repo.key))) as Reviewer | undefined
}

async function newRange($: EngineInterface, repo: Repo, pending: Pending): Promise<void> {
  const decision = await $.store.get(decisionKey(repo.key))
  if (decision === 'never') return

  const s = await getSession($)
  if (s.repos[repo.key]?.notNow === true) return

  if (decision !== 'always') {
    await addConsent($, { repo, pending })

    return
  }

  const now = await $.clock.now()
  const reviewer = await readReviewer($, repo)
  const outstanding = s.repos[repo.key]?.outstanding ?? null
  if (outstanding !== null && !isDead(outstanding, reviewer, now)) {
    await update($, next => {
      const run = runOf(next, repo)
      run.queue = mergeAll([run.queue, pending])
    })
    await publish($)

    return
  }

  await sendReview($, repo, pending)
}

async function addConsent($: EngineInterface, consent: Consent): Promise<void> {
  const consents = await readConsents($)
  const index = consents.findIndex(one => one.repo.key === consent.repo.key)
  const next =
    index === -1
      ? [...consents, consent]
      : consents.map((one, at) =>
          at === index ? { repo: one.repo, pending: mergePending(one.pending, consent.pending) } : one,
        )
  await $.state.set(CONSENTS, next)
  await publish($)
}

async function answer($: EngineInterface, choice: 'always' | 'not now' | 'never'): Promise<void> {
  const consents = await readConsents($)
  const first = consents[0]
  if (first === undefined) return
  await $.state.set(CONSENTS, consents.slice(1))

  if (choice === 'not now') {
    await update($, s => {
      runOf(s, first.repo).notNow = true
    })
  } else {
    await $.store.set(decisionKey(first.repo.key), choice)
  }

  if (choice === 'always') await sendReview($, first.repo, first.pending)
  await publish($)
}

// Sends the merged range to a reviewer. A range that cannot go out is parked in the queue, never dropped.
async function sendReview($: EngineInterface, repo: Repo, pending: Pending): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const found = await ensureReviewer($, repo)
    if (found === BUSY || found === undefined) {
      await park($, repo, pending)

      return
    }

    const merged = await reserve($, repo, pending, found)
    const text = `${TAG} REVIEW ${rangeOf(merged)}\n${merged.branch}: ${merged.subject}`
    if (await sendTo($, found.name, text)) {
      await addBuilder($, repo)
      await publish($)

      return
    }
    await dropReviewer($, repo, found)
  }

  await park($, repo, pending)
  $.ui.toast(`review-pair: the reviewer for ${repo.name} is not reachable`)
  await publish($)
}

// Records the outstanding range with the reviewer it went to, merging outstanding, queue and new range.
async function reserve($: EngineInterface, repo: Repo, pending: Pending, reviewer: Reviewer): Promise<Pending> {
  const now = await $.clock.now()
  const ref: ReviewerRef = { name: reviewer.name, id: idOf(reviewer) }

  return update($, s => {
    const run = runOf(s, repo)
    const merged = mergeAll([run.outstanding, run.queue, pending]) ?? pending
    run.outstanding = { ...merged, sentAt: now, reviewer: ref }
    run.queue = null

    return merged
  })
}

async function park($: EngineInterface, repo: Repo, pending: Pending): Promise<void> {
  await update($, s => {
    const run = runOf(s, repo)
    run.queue = mergeAll([run.outstanding, run.queue, pending])
    run.outstanding = null
  })
  await publish($)
}

async function sendTo($: EngineInterface, name: string, text: string): Promise<boolean> {
  try {
    const sent = await $.session.send({ to: name, text })

    return sent.isDelivered
  } catch {
    return false
  }
}

async function addBuilder($: EngineInterface, repo: Repo): Promise<void> {
  const id = await $.session.id()
  await $.store.set(builderKey(repo.key, id), { at: await $.clock.now() })
}

async function otherBuilders($: EngineInterface, repoKey: string, selfId: string, now: number): Promise<number> {
  const prefix = `builders:${repoKey}:`
  let count = 0
  for (const key of await $.store.keys()) {
    if (!key.startsWith(prefix) || key === `${prefix}${selfId}`) continue
    const row = (await $.store.get(key)) as { at?: number } | undefined
    if (row !== undefined && typeof row.at === 'number' && now - row.at < BUILDER_TTL_MS) count += 1
  }

  return count
}

async function backingOff($: EngineInterface, repo: Repo, now: number): Promise<boolean> {
  const failure = (await $.store.get(failureKey(repo.key))) as { at?: number } | undefined

  return typeof failure?.at === 'number' && now - failure.at < BACKOFF_MS
}

// Returns a live reviewer, BUSY when another session holds the spawn lease, or undefined when none can start.
async function ensureReviewer($: EngineInterface, repo: Repo): Promise<Found> {
  const me = await $.session.id()
  const now = await $.clock.now()
  const day = localDay(now)
  const current = await readReviewer($, repo)
  if (current !== undefined && current.day === day) return current

  const lease = (await $.store.get(spawningKey(repo.key))) as Lease | undefined
  if (lease !== undefined && lease.by !== me && now - lease.at < LEASE_MS) return BUSY
  if (await backingOff($, repo, now)) return undefined

  await $.store.set(spawningKey(repo.key), { by: me, at: now })
  const held = (await $.store.get(spawningKey(repo.key))) as Lease | undefined
  if (held?.by !== me) return BUSY

  try {
    if (current !== undefined) await dropReviewer($, repo, current)
    const started = await spawnReviewer($, repo, day, now)
    if (started !== undefined) {
      await $.store.set(reviewerKey(repo.key), started)
      await $.store.delete(failureKey(repo.key))
    }

    return started
  } finally {
    await $.store.delete(spawningKey(repo.key))
  }
}

async function permissionMode($: EngineInterface): Promise<string | undefined> {
  const settings = await $.settings.read()
  const permissions = settings.permissions
  if (typeof permissions !== 'object' || permissions === null) return undefined
  const mode = (permissions as Record<string, unknown>).defaultMode

  return typeof mode === 'string' && mode !== '' ? mode : undefined
}

async function spawnReviewer($: EngineInterface, repo: Repo, day: string, now: number): Promise<Reviewer | undefined> {
  const name = reviewerName(repo)
  const mode = await permissionMode($)
  const claudeArgs = [
    '-n', name, '--model', 'sonnet', '--plugin-dir', $.plugin.root,
    ...(mode === undefined ? [] : ['--permission-mode', mode]),
  ]
  const env = { REVIEW_PAIR_ROLE: 'reviewer', REVIEW_PAIR_REPO: repo.key }
  const herdr = (await $.env.get('HERDR_ENV')) === '1'
  const herdrPane = await $.env.get('HERDR_PANE_ID')

  try {
    if (herdr && herdrPane) return await spawnInHerdr($, repo, herdrPane, name, claudeArgs, day, now)

    const bg = await $.process.run(['claude', '--bg', ...claudeArgs, REVIEWER_PROMPT], {
      cwd: repo.top,
      env,
      timeoutMs: SPAWN_TIMEOUT_MS,
    })
    const bgId = bg.exitCode === 0 ? /backgrounded\s*·\s*(\S+)\s*·/.exec(bg.stdout)?.[1] : undefined
    if (bgId === undefined) return failed($, repo, now, `bg exit ${bg.exitCode}: ${(bg.stderr || bg.stdout).slice(0, 160)}`)
    $.ui.toast(`review-pair: reviewer started for ${repo.name}`)

    return { name, day, mode: 'bg', bgId }
  } catch (error) {
    return failed($, repo, now, `threw: ${String(error).slice(0, 160)}`)
  }
}

async function spawnInHerdr(
  $: EngineInterface,
  repo: Repo,
  herdrPane: string,
  name: string,
  claudeArgs: string[],
  day: string,
  now: number,
): Promise<Reviewer | undefined> {
  let paneId: string | undefined
  let started = false
  try {
    const split = await $.process.run([
      'herdr', 'pane', 'split', herdrPane,
      '--direction', 'right', '--ratio', '0.65', '--cwd', repo.top, '--no-focus',
      '--env', 'REVIEW_PAIR_ROLE=reviewer', '--env', `REVIEW_PAIR_REPO=${repo.key}`,
    ])
    paneId = split.exitCode === 0 ? paneIdOf(split.stdout) : undefined
    if (paneId === undefined) return failed($, repo, now, `split exit ${split.exitCode}: ${(split.stderr || split.stdout).slice(0, 160)}`)

    // A freshly split pane's shell may still be starting: herdr answers agent_pane_busy until it is.
    const startArgv = ['herdr', 'agent', 'start', name, '--kind', 'claude', '--pane', paneId, '--timeout', '60000', '--', ...claudeArgs]
    let start = await $.process.run(startArgv, { timeoutMs: SPAWN_TIMEOUT_MS })
    let outcome = agentStartOf(start)
    for (let tries = 0; outcome === 'busy' && tries < SHELL_WAIT_TRIES; tries++) {
      await $.process.run(['sleep', '0.5'])
      start = await $.process.run(startArgv, { timeoutMs: SPAWN_TIMEOUT_MS })
      outcome = agentStartOf(start)
    }
    if (outcome === 'failed' || outcome === 'busy') return failed($, repo, now, `agent start exit ${start.exitCode}: ${(start.stdout || start.stderr).slice(0, 160)}`)

    // A reviewer waiting on a workspace trust prompt keeps its pane; the queued message is delivered once it answers.
    started = true
    if (outcome === 'not-ready') {
      $.ui.toast(`review-pair: reviewer for ${repo.name} is waiting on a trust prompt in the right pane`)
    } else {
      $.ui.toast(`review-pair: reviewer started for ${repo.name}`)
    }

    return { name, day, mode: 'herdr', paneId }
  } finally {
    if (!started && paneId !== undefined) {
      const orphan = paneId
      await quiet(() => $.process.run(['herdr', 'pane', 'close', orphan]))
    }
  }
}

async function failed($: EngineInterface, repo: Repo, now: number, reason: string): Promise<undefined> {
  await $.store.set(failureKey(repo.key), { at: now, reason })
  $.ui.toast(`review-pair: could not start a reviewer for ${repo.name} (${reason})`)

  return undefined
}

type AgentStart = 'started' | 'not-ready' | 'busy' | 'failed'

// Only an agent_started result is a start. agent_not_ready means the agent is up but blocked on a prompt;
// agent_pane_busy means the pane's shell is not ready yet. herdr exits non-zero on errors, so the JSON decides.
function agentStartOf(run: { exitCode: number; stdout: string }): AgentStart {
  try {
    const parsed = JSON.parse(run.stdout) as { result?: { type?: unknown }; error?: { code?: unknown } }
    if (parsed.result?.type === 'agent_started') return run.exitCode === 0 ? 'started' : 'failed'
    if (parsed.error?.code === 'agent_not_ready') return 'not-ready'
    if (parsed.error?.code === 'agent_pane_busy') return 'busy'
  } catch {
    return 'failed'
  }

  return 'failed'
}

function paneIdOf(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { result?: { pane?: { pane_id?: unknown } } }
    const id = parsed.result?.pane?.pane_id

    return typeof id === 'string' ? id : undefined
  } catch {
    return undefined
  }
}

async function closeReviewer($: EngineInterface, reviewer: Reviewer): Promise<void> {
  if (reviewer.mode === 'herdr') {
    await quiet(() => $.process.run(['herdr', 'pane', 'close', reviewer.paneId]))
  } else {
    await quiet(() => $.process.run(['claude', 'stop', reviewer.bgId]))
  }
}

async function dropReviewer($: EngineInterface, repo: Repo, reviewer: Reviewer): Promise<void> {
  await closeReviewer($, reviewer)
  await $.store.delete(reviewerKey(repo.key))
}

async function teardown($: EngineInterface, sessionId: string): Promise<void> {
  const now = await $.clock.now()
  const s = await getSession($)
  for (const [key, run] of Object.entries(s.repos)) {
    await $.store.delete(builderKey(key, sessionId))
    if ((await otherBuilders($, key, sessionId, now)) > 0) continue

    await stopReviewer($, { key, top: run.top, name: run.name })
  }
  await publish($)
}

async function runCommand($: EngineInterface, args: string): Promise<string> {
  const repo = await repoOf($)
  if (repo === undefined) return 'this session is not in a git repo.'
  const word = args.trim().split(/\s+/)[0] ?? ''
  const decision = (await $.store.get(decisionKey(repo.key))) as string | undefined

  if (word === '' || word === 'status') {
    const reviewer = await readReviewer($, repo)
    const s = await getSession($)
    const run = s.repos[repo.key]
    return [
      `review-pair for ${repo.name}`,
      `decision: ${decision ?? 'not set'}`,
      `reviewer: ${reviewer === undefined ? 'none' : `${reviewer.name} (${reviewer.mode}, ${reviewer.day})`}`,
      `rounds: ${run?.rounds ?? 0}`,
      `outstanding: ${run?.outstanding === null || run?.outstanding === undefined ? 'none' : rangeOf(run.outstanding)}`,
    ].join('\n')
  }

  if (word === 'on') {
    await $.store.set(decisionKey(repo.key), 'always')
    await dropConsent($, repo, true)

    return `always for ${repo.name}. The reviewer starts at the next commit.`
  }

  if (word === 'off') {
    await $.store.set(decisionKey(repo.key), 'never')
    await dropConsent($, repo, false)
    await stopReviewer($, repo)

    return `never for ${repo.name}. Reviewer stopped.`
  }

  if (word === 'forget') {
    await $.store.delete(decisionKey(repo.key))
    await dropConsent($, repo, false)
    await stopReviewer($, repo)

    return `decision and reviewer record cleared for ${repo.name}.`
  }

  if (word === 'stop') {
    await stopReviewer($, repo, true)

    return `reviewer stopped for ${repo.name}.`
  }

  return 'Usage: /review-pair [status|on|off|forget|stop]'
}

// Removes the repo's pending consent band. `lift` also clears a session-level "not now" so the next range can start a reviewer.
async function dropConsent($: EngineInterface, repo: Repo, lift: boolean): Promise<void> {
  const consents = await readConsents($)
  const kept = consents.filter(one => one.repo.key !== repo.key)
  if (kept.length !== consents.length) await $.state.set(CONSENTS, kept)
  if (lift) {
    await update($, s => {
      const run = s.repos[repo.key]
      if (run !== undefined) run.notNow = false
    })
  }
  await publish($)
}

// Closes the reviewer and clears the lease, backoff, outstanding range and queue for the repo.
// `keep` parks unreviewed commits for the next reviewer (stop); without it they are dropped (off, forget).
async function stopReviewer($: EngineInterface, repo: Repo, keep = false): Promise<void> {
  const reviewer = await readReviewer($, repo)
  if (reviewer !== undefined) await dropReviewer($, repo, reviewer)
  await $.store.delete(spawningKey(repo.key))
  await $.store.delete(failureKey(repo.key))
  await update($, s => {
    const run = s.repos[repo.key]
    if (run !== undefined) {
      run.queue = keep ? mergeAll([run.outstanding, run.queue]) : null
      run.outstanding = null
    }
  })
  await publish($)
}

async function publish($: EngineInterface): Promise<void> {
  const s = await getSession($)
  const consents = await readConsents($)
  await $.state.set(SECTION, build(s, consents))
}

function build(s: SessionState, consents: readonly Consent[]): SidebarSection {
  const runs = Object.values(s.repos)
  const blocked = runs.filter(run => run.rounds > 0).length
  const pendingCount = runs.filter(run => run.outstanding !== null).length
  const rows: SidebarRow[] = []

  for (const consent of consents) {
    rows.push({ kind: 'item', icon: '?', tone: 'accent', text: `Start a reviewer for ${consent.repo.name}?` })
  }
  for (const run of runs) {
    if (run.outstanding !== null) {
      rows.push({
        kind: 'item',
        icon: '…',
        tone: 'muted',
        state: 'active',
        text: `${run.name} ${rangeOf(run.outstanding)} in review`,
      })
    }
    if (run.capped) {
      rows.push({ kind: 'text', text: `${run.name}: needs you`, tone: 'error', bold: true })
      for (const finding of run.findings) rows.push({ kind: 'text', text: finding, tone: 'error' })
    }
  }
  for (const review of s.reviews.slice(0, RECENT)) {
    rows.push({
      kind: 'item',
      icon: verdictIcon(review.verdict),
      tone: verdictTone(review.verdict),
      text: `${review.repo} ${review.range} ${review.verdict}`,
    })
  }
  for (const nits of Object.values(s.nits)) {
    for (const nit of nits) rows.push({ kind: 'text', text: nit, tone: 'muted' })
  }

  const isEmpty = s.reviews.length === 0 && pendingCount === 0 && consents.length === 0
  let badge: string | undefined
  if (blocked > 0) badge = blocked === 1 ? '1 blocker' : `${blocked} blockers`
  else if (pendingCount > 0) badge = `${pendingCount} pending`

  return {
    version: 1,
    title: 'Review',
    ...(badge === undefined ? {} : { badge }),
    ...(blocked > 0 ? { tone: 'error' as const } : {}),
    isEmpty,
    attention: blocked,
    rows,
  }
}

function verdictIcon(verdict: Verdict): string {
  if (verdict === 'BLOCKERS') return '!'
  if (verdict === 'NITS') return '~'

  return '✓'
}

function verdictTone(verdict: Verdict): 'error' | 'warn' | 'done' {
  if (verdict === 'BLOCKERS') return 'error'
  if (verdict === 'NITS') return 'warn'

  return 'done'
}

function reviewerGuide(repo: string): string {
  return [
    `You are the review-pair reviewer for the repo at ${repo}. You never edit files and never change git or GitHub state beyond the one summary comment described below.`,
    'On a message starting with "[review-pair] REVIEW <range>", run `git log <range>` and `git diff <range>` in the repo and review those changes.',
    'For a diff over about 400 changed lines, spawn a fresh dev-flow:code-reviewer subagent on the range and review its output before you reply.',
    'A blocker is a bug, a security issue, data loss, a broken build or tests, or a broken API contract. Everything else is a nit.',
    'Reply with SendMessage to the `from` address of the request. The first line must be exactly "[review-pair] BLOCKERS <range>", "[review-pair] NITS <range>" or "[review-pair] CLEAN <range>".',
    'After the first line, list each finding on its own line as `file:line - problem - fix`. Send CLEAN with no findings when there is nothing to report.',
    'On a message starting with "[review-pair] PR <url>", post ONE summary comment of the outstanding nits with `gh pr comment <url> --body "..."`. The comment carries no attribution text.',
    'Keep earlier decisions in mind: do not re-flag a nit the builder has accepted.',
  ].join(' ')
}
