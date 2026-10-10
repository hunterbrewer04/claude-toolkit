import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { ProcessBook, ProcessEntry, SidebarRow, SidebarSection } from '../types'

const SIDEBAR = 'sidebar'
const KILL_PREFIX = 'processes:kill:'
const EMPTY: ProcessBook = { seq: 0, entries: [] }
const DETACHED: readonly RegExp[] = [/&\s*$/, /&\s*;/, /\bnohup\b/, /\bdisown\b/, /\bsetsid\b/]

const POLL_MS = 3000
// Offsets from the Bash call at which a detached server is looked for.
const SCANS_MS: readonly number[] = [2000, 5000, 10000]
const BEFORE_MS = 1500
const LINGER_MS = 30000
const FORCE_AFTER_MS = 3000
const UNRESOLVED_MS = 30000
const NAME_WIDTH = 30
const ANCESTRY_DEPTH = 64

const book = atom({ plugin: 'processes', key: 'book' } as const, EMPTY)
const section = { plugin: 'processes', key: 'section' } as const

type Row = { pid: number; ppid: number; pgid: number; command: string }
type Listener = { pid: number; port: number }
type Snapshot = { rows: Map<number, Row>; listeners: Listener[]; claude: number | undefined }
type Before = { listeners: Set<string>; groups: Set<number> }
type Draft = {
  command: string
  source: ProcessEntry['source']
  taskId?: string
  pid?: number
  pgid?: number
  processCommand?: string
  ports?: number[]
}

// The poll timer is not drawn, so it lives in the module. A hot reload cancels
// it and resets this, so any hook below restarts it on demand (see resume).
let poller: Timer | undefined
// Found once from the spawning process of `$.process.run`; see claudeOf.
let claudePid: number | undefined
// PIDs alive just before a background Bash call, by task id. The task's own
// processes are new, so findTask skips these. Lost on reload, which only widens the search.
const taskPids = new Map<string, Set<number>>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await publish($)
    await resume($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await resume($).catch(() => undefined)
    const command = squash(typeof e.command === 'string' ? e.command : '')
    const detaching = DETACHED.some(re => re.test(command))
    const before = detaching ? await beforeDetach($) : undefined
    const pids = e.run_in_background === true ? await pidSet($) : undefined
    const ran = await next(e)
    try {
      const taskId = (ran.result as { backgroundTaskId?: unknown } | undefined)?.backgroundTaskId
      if (ran.deny === undefined && typeof taskId === 'string') {
        if (pids !== undefined) taskPids.set(taskId, pids)
        await track($, { command, source: 'background', taskId })
      } else if (before !== undefined) {
        scanDetached($, command, before, 0, 0)
      }
    } catch {
      // Tracking is best effort; the Bash result already stands.
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.press', { plugin: SIDEBAR }, async ($, e, next) => {
    if (!e.element.startsWith(KILL_PREFIX)) return next(e)
    await resume($)
    await kill($, e.element.slice(KILL_PREFIX.length))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    const { entries } = await read($, book)
    const running = entries.filter(isRunning)
    if (running.length > 0) $.ui.toast(`Still running: ${running.map(describe).join(', ')}`)
    if (e.reason === 'clear') await clearExited($)

    return next(e)
  }).catch(($, e, next) => next(e))
}

function isRunning(entry: ProcessEntry): boolean {
  return entry.status === 'running'
}

// Starts the poller when entries are running and no timer is active, which
// also covers a hot reload, after which `session.start` does not fire.
async function resume($: EngineInterface): Promise<void> {
  if (poller !== undefined) return
  const { entries } = await read($, book)
  if (entries.some(isRunning)) startPolling($)
}

async function track($: EngineInterface, draft: Draft): Promise<void> {
  const now = await $.clock.now()
  await update($, book, current => {
    const seq = current.seq + 1
    const entry: ProcessEntry = {
      id: `p${seq}`,
      command: draft.command,
      source: draft.source,
      ports: draft.ports ?? [],
      startedAt: now,
      status: 'running',
      ...(draft.taskId === undefined ? {} : { taskId: draft.taskId }),
      ...(draft.pid === undefined ? {} : { pid: draft.pid }),
      ...(draft.pgid === undefined ? {} : { pgid: draft.pgid }),
      ...(draft.processCommand === undefined ? {} : { processCommand: draft.processCommand }),
    }
    return { seq, entries: [...current.entries, entry] }
  })
  await publish($)
  startPolling($)
}

async function kill($: EngineInterface, id: string): Promise<void> {
  const { entries } = await read($, book)
  const entry = entries.find(one => one.id === id && isRunning(one))
  if (entry === undefined) return

  if (entry.source === 'background' && entry.taskId !== undefined) {
    if (await stopTask($, entry.taskId)) {
      await markExited($, id)
      return
    }
  }

  const snap = await snapshot($)
  const check = verify(entry, snap)
  if (check === 'gone') {
    await markExited($, id)
    return
  }
  if (check === 'unsafe' || entry.pgid === undefined) {
    $.ui.toast(`Could not stop ${clip(entry.command, NAME_WIDTH)}`)
    return
  }
  await $.process.run(['kill', '-TERM', '--', `-${entry.pgid}`]).catch(() => undefined)
  // The entry stays running until a poll sees it gone.
  startPolling($)
  $.clock.after(FORCE_AFTER_MS, () => void forceGroup($, id))
}

// Whether the entry's stored process is still the one found: same pid, same
// group, same command line. A reused pid reads as gone, and nothing is signalled
// without knowing Claude Code's own pid.
function verify(entry: ProcessEntry, snap: Snapshot): 'ok' | 'gone' | 'unsafe' {
  if (entry.pid === undefined || entry.pgid === undefined || entry.processCommand === undefined) return 'unsafe'
  if (!isSafeGroup(entry.pgid, snap)) return 'unsafe'
  const row = snap.rows.get(entry.pid)
  if (row === undefined || row.pgid !== entry.pgid || row.command !== entry.processCommand) return 'gone'

  return 'ok'
}

async function stopTask($: EngineInterface, taskId: string): Promise<boolean> {
  const ran = await $.tool.call({ tool: 'TaskStop', task_id: taskId }).catch(() => undefined)

  return ran !== undefined && ran.deny === undefined && ran.isError !== true
}

async function forceGroup($: EngineInterface, id: string): Promise<void> {
  const { entries } = await read($, book)
  const entry = entries.find(one => one.id === id && isRunning(one))
  if (entry?.pgid === undefined) return
  const snap = await snapshot($)
  if (verify(entry, snap) !== 'ok') return
  await $.process.run(['kill', '-KILL', '--', `-${entry.pgid}`]).catch(() => undefined)
}

async function markExited($: EngineInterface, id: string): Promise<void> {
  const now = await $.clock.now()
  const after = await update($, book, current => ({
    ...current,
    entries: current.entries.map(entry => (entry.id === id && isRunning(entry) ? exited(entry, now) : entry)),
  }))
  lingerExited($, after.entries, now)
  await publish($)
}

// `/clear` drops what has exited; processes still running stay listed.
async function clearExited($: EngineInterface): Promise<void> {
  const after = await update($, book, current => ({ ...current, entries: current.entries.filter(isRunning) }))
  if (after.entries.length === 0) stopPolling()
  await publish($)
}

function startPolling($: EngineInterface): void {
  if (poller !== undefined) return
  poller = $.clock.every(POLL_MS, () => void poll($))
}

function stopPolling(): void {
  poller?.cancel()
  poller = undefined
}

async function poll($: EngineInterface): Promise<void> {
  try {
    const { entries } = await read($, book)
    if (!entries.some(isRunning)) {
      stopPolling()
      return
    }
    const snap = await snapshot($)
    const now = await $.clock.now()
    const after = await update($, book, current => {
      const claimed = new Set(current.entries.flatMap(entry => (isRunning(entry) && entry.pgid !== undefined ? [entry.pgid] : [])))
      return { ...current, entries: current.entries.map(entry => refresh(entry, snap, now, claimed)) }
    })
    for (const entry of after.entries) {
      if (entry.taskId !== undefined && (entry.pgid !== undefined || !isRunning(entry))) taskPids.delete(entry.taskId)
    }
    lingerExited($, after.entries, now)
    await publish($)
    if (!after.entries.some(isRunning)) stopPolling()
  } catch {
    // A failed poll leaves the entries as they were; the next tick tries again.
  }
}

// Exited entries drop 30 seconds after they exited. Only entries that ended at
// `now` are scheduled, so an earlier exit is never scheduled twice.
function lingerExited($: EngineInterface, entries: ProcessEntry[], now: number): void {
  for (const entry of entries) {
    if (entry.status === 'exited' && entry.endedAt === now) {
      $.clock.after(LINGER_MS, () => void drop($, entry.id, now))
    }
  }
}

async function drop($: EngineInterface, id: string, endedAt: number): Promise<void> {
  await update($, book, current => ({
    ...current,
    entries: current.entries.filter(entry => !(entry.id === id && entry.endedAt === endedAt)),
  }))
  await publish($)
}

// What a detached server is compared against: the listeners and process groups
// that existed before the Bash call. Undefined when either look-up does not
// finish in time, and that call then adopts nothing.
async function beforeDetach($: EngineInterface): Promise<Before | undefined> {
  const [ps, lsof] = await Promise.all([
    attempt($, ['ps', '-axwwo', 'pid=,ppid=,pgid=,command='], BEFORE_MS),
    attempt($, ['lsof', '-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pcn'], BEFORE_MS),
  ])
  if (ps === undefined || lsof === undefined) return undefined
  const groups = new Set([...parseRows(ps).values()].map(row => row.pgid))

  return { listeners: new Set(parseListeners(lsof).map(listenerKey)), groups }
}

async function pidSet($: EngineInterface): Promise<Set<number> | undefined> {
  const ps = await attempt($, ['ps', '-axwwo', 'pid=,ppid=,pgid=,command='], BEFORE_MS)

  return ps === undefined ? undefined : new Set(parseRows(ps).keys())
}

// Scans at each offset in SCANS_MS, stopping at the first scan that adopts something.
function scanDetached($: EngineInterface, command: string, before: Before, index: number, elapsed: number): void {
  const at = SCANS_MS[index]
  if (at === undefined) return
  $.clock.after(at - elapsed, async () => {
    const found = await settleDetached($, command, before)
    if (!found) scanDetached($, command, before, index + 1, at)
  })
}

async function settleDetached($: EngineInterface, command: string, before: Before): Promise<boolean> {
  try {
    const cwd = await sessionCwd($)
    if (cwd === undefined) return false
    const snap = await snapshot($)
    if (snap.claude === undefined) return false
    const { entries } = await read($, book)
    const fresh = snap.listeners.filter(
      listener =>
        !before.listeners.has(listenerKey(listener)) &&
        !entries.some(entry => isRunning(entry) && entry.pid === listener.pid),
    )
    let found = false
    for (const pid of [...new Set(fresh.map(listener => listener.pid))]) {
      const row = snap.rows.get(pid)
      if (row === undefined || before.groups.has(row.pgid) || !isSafeGroup(row.pgid, snap)) continue
      if (!isBashGroup(row, snap)) continue
      const dir = await cwdOf($, pid)
      if (dir === undefined || !(dir === cwd || dir.startsWith(`${cwd}/`))) continue
      const ports = uniquePorts(fresh.filter(listener => listener.pid === pid).map(listener => listener.port))
      await track($, { command, source: 'detached', pid, pgid: row.pgid, processCommand: row.command, ports })
      found = true
    }

    return found
  } catch {
    // The scan is best effort; a failed scan adds no entry.
    return false
  }
}

// A Bash tool shell leads its own process group, and what it detaches keeps
// that group with init as its parent once the shell exits. So the group's
// leader must be under Claude Code or gone, and the topmost process of the
// group above this one must be under Claude Code or orphaned to init. A server
// started from the person's own terminal fails both.
function isBashGroup(row: Row, snap: Snapshot): boolean {
  const leader = snap.rows.get(row.pgid)
  if (leader !== undefined && !isUnder(leader, snap)) return false
  let top = row
  for (let depth = 0; depth < ANCESTRY_DEPTH; depth += 1) {
    const parent = snap.rows.get(top.ppid)
    if (parent === undefined || parent.pgid !== row.pgid) break
    top = parent
  }

  return top.ppid === 1 || isUnder(top, snap)
}

function refresh(entry: ProcessEntry, snap: Snapshot, now: number, claimed: Set<number>): ProcessEntry {
  if (!isRunning(entry)) return entry

  let root = entry.pid
  let group = entry.pgid
  let processCommand = entry.processCommand
  if (entry.source === 'background' && group === undefined) {
    const found = findTask(entry, snap, claimed)
    if (found === undefined) return now - entry.startedAt > UNRESOLVED_MS ? exited(entry, now) : entry
    root = found.pid
    group = found.pgid
    processCommand = found.command
    claimed.add(found.pgid)
  }

  const own = root === undefined ? undefined : snap.rows.get(root)
  const roots =
    entry.source === 'background' && group !== undefined
      ? [...snap.rows.values()].filter(row => row.pgid === group).map(row => row.pid)
      : own !== undefined && (group === undefined || own.pgid === group)
        ? [own.pid]
        : []
  if (roots.length === 0) return exited(entry, now)

  const tree = descendants(roots, snap.rows)
  const ports = uniquePorts(snap.listeners.filter(listener => tree.has(listener.pid)).map(listener => listener.port))

  return {
    ...entry,
    pid: root,
    pgid: group,
    ports,
    ...(processCommand === undefined ? {} : { processCommand }),
  }
}

// A background task is the earliest new process under Claude Code, in a group
// no other entry holds, whose command line (with the Bash tool's `eval '...'`
// quoting undone) contains the task's whole command.
function findTask(entry: ProcessEntry, snap: Snapshot, claimed: Set<number>): Row | undefined {
  if (entry.command === '' || snap.claude === undefined) return undefined
  const old = entry.taskId === undefined ? undefined : taskPids.get(entry.taskId)
  const hits = [...snap.rows.values()]
    .filter(
      row =>
        row.pid !== snap.claude &&
        !claimed.has(row.pgid) &&
        !(old?.has(row.pid) ?? false) &&
        isUnder(row, snap) &&
        unquote(row.command).includes(entry.command),
    )
    .sort((a, b) => a.pid - b.pid)

  return hits[0]
}

// The Bash tool runs a command as `eval '<command>'`, writing each `'` in it
// as `'"'"'`. Undo that so ps text compares with the command as Claude wrote it.
function unquote(text: string): string {
  return squash(text.split(`'"'"'`).join(`'`).split(`'\\''`).join(`'`))
}

// Without Claude Code's pid nothing counts as under it.
function isUnder(row: Row, snap: Snapshot): boolean {
  if (snap.claude === undefined) return false
  let pid = row.ppid
  for (let depth = 0; depth < ANCESTRY_DEPTH && pid > 1; depth += 1) {
    if (pid === snap.claude) return true
    pid = snap.rows.get(pid)?.ppid ?? 0
  }

  return false
}

// Never signal the process group Claude Code itself is in, or init's, or any
// group while Claude Code's pid is unknown.
function isSafeGroup(group: number, snap: Snapshot): boolean {
  if (snap.claude === undefined || group <= 1 || group === snap.claude) return false
  const claudeGroup = snap.rows.get(snap.claude)?.pgid

  return group !== claudeGroup
}

function descendants(roots: number[], rows: Map<number, Row>): Set<number> {
  const children = new Map<number, number[]>()
  for (const row of rows.values()) {
    children.set(row.ppid, [...(children.get(row.ppid) ?? []), row.pid])
  }
  const seen = new Set<number>(roots)
  const queue = [...roots]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const child of children.get(next) ?? []) {
      if (!seen.has(child)) {
        seen.add(child)
        queue.push(child)
      }
    }
  }

  return seen
}

async function snapshot($: EngineInterface): Promise<Snapshot> {
  const rows = parseRows(await output($, ['ps', '-axwwo', 'pid=,ppid=,pgid=,command=']))
  const listeners = parseListeners(await output($, ['lsof', '-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pcn']))

  return { rows, listeners, claude: await claudeOf($, rows) }
}

// `$.process.run` spawns `sh` from the Claude Code process, so the `sh` reports
// that process as its parent. Walk up from there until a command names claude,
// which covers any wrapper in between. Falls back to the spawning process.
async function claudeOf($: EngineInterface, rows: Map<number, Row>): Promise<number | undefined> {
  if (claudePid !== undefined) return claudePid
  const spawned = Number.parseInt((await output($, ['sh', '-c', 'echo $PPID'])).trim(), 10)
  if (!Number.isInteger(spawned) || spawned <= 1) return undefined
  if (rows.size === 0) return spawned

  let pid = spawned
  for (let depth = 0; depth < 8; depth += 1) {
    const row = rows.get(pid)
    if (row === undefined) break
    if (/claude/i.test(row.command)) {
      claudePid = pid
      return pid
    }
    if (row.ppid <= 1) break
    pid = row.ppid
  }
  claudePid = spawned

  return spawned
}

function parseRows(out: string): Map<number, Row> {
  const rows = new Map<number, Row>()
  for (const line of out.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line)
    if (match === null) continue
    const pid = Number(match[1])
    rows.set(pid, { pid, ppid: Number(match[2]), pgid: Number(match[3]), command: match[4] ?? '' })
  }

  return rows
}

function parseListeners(out: string): Listener[] {
  const found: Listener[] = []
  let pid: number | undefined
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1))
    } else if (line.startsWith('n') && pid !== undefined) {
      const port = /:(\d+)$/.exec(line)
      if (port?.[1] !== undefined) found.push({ pid, port: Number(port[1]) })
    }
  }

  return found
}

function listenerKey(listener: Listener): string {
  return `${listener.pid}:${listener.port}`
}

async function cwdOf($: EngineInterface, pid: number): Promise<string | undefined> {
  const out = await output($, ['lsof', '-a', '-p', String(pid), '-d', 'cwd', '-Fn'])
  const line = out.split('\n').find(one => one.startsWith('n'))

  return line === undefined ? undefined : line.slice(1)
}

async function sessionCwd($: EngineInterface): Promise<string | undefined> {
  const dir = (await output($, ['pwd', '-P'])).trim()

  return dir === '' ? undefined : dir
}

// Runs a host command and returns its stdout. A command that cannot run gives ''.
async function output($: EngineInterface, argv: string[]): Promise<string> {
  return (await attempt($, argv, 10000)) ?? ''
}

// Runs a host command within `timeoutMs`; undefined when it fails or times out.
async function attempt($: EngineInterface, argv: string[], timeoutMs: number): Promise<string | undefined> {
  try {
    const ran = await $.process.run(argv, { timeoutMs })

    return ran.stdout
  } catch {
    return undefined
  }
}

function exited(entry: ProcessEntry, now: number): ProcessEntry {
  return { ...entry, status: 'exited', endedAt: now, ports: [] }
}

async function publish($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const { entries } = await read($, book)
  await $.state.set(section, toSection(entries, now))
}

function toSection(entries: ProcessEntry[], now: number): SidebarSection {
  const up = entries.filter(isRunning).length
  const rows = entries.map((entry): SidebarRow => {
    const running = isRunning(entry)
    const ports = entry.ports.map(port => `:${port}`).join(' ')
    const uptime = running ? formatUptime(now - entry.startedAt) : 'exited'
    const text = [clip(entry.command, NAME_WIDTH), ports, uptime].filter(part => part !== '').join('  ')

    return {
      kind: 'item',
      icon: running ? '●' : '○',
      tone: running ? 'accent' : 'muted',
      text,
      ...(running ? { action: { key: `${KILL_PREFIX}${entry.id}`, label: 'x' } } : {}),
    }
  })

  return {
    version: 1,
    title: 'Processes',
    badge: `${up} up`,
    isEmpty: entries.length === 0,
    attention: 0,
    rows,
  }
}

function describe(entry: ProcessEntry): string {
  return `${clip(entry.command, NAME_WIDTH)}${entry.ports.map(port => ` :${port}`).join('')}`
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function uniquePorts(ports: number[]): number[] {
  return [...new Set(ports)].sort((a, b) => a - b)
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
