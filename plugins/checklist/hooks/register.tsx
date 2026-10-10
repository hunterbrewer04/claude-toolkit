import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallInput, ToolCallResult } from 'claude-code'

import type {
  AgentRun,
  AgentRunStatus,
  Checklist,
  Item,
  ItemStatus,
  SidebarRow,
  SidebarSection,
  SidebarTone,
} from '../types'

const TOOL = 'mcp__checklist__checklist'
const EMPTY: Checklist = { title: '', items: [] }
const EMPTY_SECTION: SidebarSection = {
  version: 1,
  title: 'Checklist',
  isEmpty: true,
  attention: 0,
  rows: [],
}
const MAX_AGENTS = 30
const STATUSES: readonly ItemStatus[] = ['pending', 'in_progress', 'completed']

const MARK: Record<ItemStatus, string> = { pending: '[ ]', in_progress: '[>]', completed: '[x]' }
const ICON: Record<ItemStatus, string> = { pending: '○', in_progress: '▶', completed: '✔' }
const ITEM_TONE: Record<ItemStatus, SidebarTone> = {
  pending: 'muted',
  in_progress: 'accent',
  completed: 'done',
}
const RUN_ICON: Record<AgentRunStatus, string> = { running: '●', done: '✔', failed: '✗', stopped: '■' }
const RUN_TONE: Record<AgentRunStatus, SidebarTone> = {
  running: 'accent',
  done: 'done',
  failed: 'error',
  stopped: 'muted',
}

const list = atom({ plugin: 'checklist', key: 'list' } as const, EMPTY)
const agents = atom({ plugin: 'checklist', key: 'agents' } as const, [])
const section = atom({ plugin: 'checklist', key: 'section' } as const, EMPTY_SECTION)

const GUIDE = [
  'The person watches a live checklist in the sidebar, fed by the mcp__checklist__checklist tool.',
  'When the person hands you a plan, or a task will take three or more distinct steps, call it with action "set" and one item per step before you start.',
  'Mark a step in_progress when you start it and completed as soon as it is done, as you go, never in one batch at the end.',
  "When you hand a step to a subagent, set that step's agent to the exact description you pass to the Agent tool, and complete the step once its result is in.",
  'Skip the checklist for questions and one-step tasks.',
].join(' ')

const DESCRIPTION = [
  'Shows the person a live checklist of the current plan in the sidebar.',
  '"set" replaces the list with `items` (one short line per step, in order) and an optional `title`.',
  '"add" appends `items`.',
  '"update" changes steps by their 1-based number in `updates`: `status` (pending, in_progress, completed) and `agent`, the exact description given to the Agent tool for the subagent working the step ("" unlinks it).',
  '"clear" empties the list. Subagents may only use "update".',
].join(' ')

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['set', 'add', 'update', 'clear'] },
    title: { type: 'string', description: 'A short name for the plan, shown at the top of its sidebar section.' },
    items: {
      type: 'array',
      items: { type: 'string' },
      description: 'For set and add: one short line per step, in order.',
    },
    updates: {
      type: 'array',
      description: 'For update: the steps to change, by their 1-based number.',
      items: {
        type: 'object',
        properties: {
          item: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: STATUSES },
          agent: { type: 'string' },
        },
        required: ['item'],
      },
    },
  },
  required: ['action'],
}

type Update = { item: number; status?: ItemStatus; agent?: string }

type Request =
  | { action: 'set' | 'add'; title?: string; items: string[] }
  | { action: 'update'; title?: string; updates: Update[] }
  | { action: 'clear' }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'checklist',
      description: DESCRIPTION,
      inputSchema: INPUT_SCHEMA,
      isDeferred: false,
    })
    showStatus($, await read($, list))
    await $.command.register({
      name: 'checklist',
      description: 'Print the plan checklist, or clear it',
      argumentHint: '[clear]',
    })
    await publish($)

    return next(e)
  })

  on('command.run', { command: 'checklist' }, async ($, e) => {
    if (e.args.trim() === 'clear') {
      await reset($)
      return { text: 'Checklist cleared.' }
    }

    return { text: summarize(await read($, list)) }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.tools.includes(TOOL)) return composed

    return {
      sections: [...composed.sections, { id: 'checklist:guide', text: GUIDE, scope: 'session' }],
    }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const request = parse(e as unknown as Record<string, unknown>)
    if (typeof request === 'string') return { deny: request }
    if (e.agentId !== undefined && request.action !== 'update') {
      return { deny: 'Only the main session sets the checklist; a subagent may only update steps.' }
    }

    let error: string | undefined
    const current = await change(
      $,
      value => {
        const applied = apply(value, request)
        if (typeof applied === 'string') {
          error = applied
          return value
        }
        return applied
      },
      request.action === 'set',
    )
    if (error !== undefined) return { deny: error }
    if (request.action === 'set') {
      await update($, agents, runs => runs.filter(run => run.status === 'running'))
      await publish($)
    }

    return { result: summarize(current) }
  }).catch(() => ({ deny: 'The checklist could not be updated.' }))

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) await countTool($, e.agentId)
    const ran = await next(e)
    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await mirror($, e, ran)
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const id = spawned.agentId
    if (spawned.deny === undefined && id !== undefined) {
      const run: AgentRun = {
        id,
        description: e.description,
        type: e.subagentType,
        status: 'running',
        tools: 0,
      }
      await update($, agents, runs => [...runs.filter(one => one.id !== id), run].slice(-MAX_AGENTS))
      await publish($)
    }

    return spawned
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    if (id !== undefined) {
      const status: AgentRunStatus =
        e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'stopped' : 'failed'
      const runs = await read($, agents)
      if (runs.some(run => run.id === id)) {
        await update($, agents, all => all.map(run => (run.id === id ? { ...run, status } : run)))
        await publish($)
      }
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await reset($)

    return next(e)
  })
}

function parse(input: Record<string, unknown>): Request | string {
  const { action, title } = input
  if (title !== undefined && typeof title !== 'string') return '`title` must be a string.'
  const named = title === undefined ? {} : { title }

  if (action === 'clear') return { action }
  if (action === 'set' || action === 'add') {
    const { items } = input
    if (!Array.isArray(items) || items.length === 0 || !items.every(item => typeof item === 'string')) {
      return `"${action}" needs \`items\`: a non-empty list of strings.`
    }
    return { action, ...named, items: items.map(item => item.trim()) }
  }
  if (action === 'update') {
    const { updates } = input
    if (!Array.isArray(updates) || updates.length === 0) {
      return '"update" needs `updates`: a non-empty list of { item, status?, agent? }.'
    }
    const parsed: Update[] = []
    for (const raw of updates) {
      if (typeof raw !== 'object' || raw === null) return 'Each update must be an object.'
      const { item, status, agent } = raw as Record<string, unknown>
      if (typeof item !== 'number' || !Number.isInteger(item) || item < 1) {
        return 'Each update needs `item`: the 1-based step number.'
      }
      if (status !== undefined && !STATUSES.includes(status as ItemStatus)) {
        return '`status` must be pending, in_progress or completed.'
      }
      if (agent !== undefined && typeof agent !== 'string') return '`agent` must be a string.'
      parsed.push({
        item,
        ...(status === undefined ? {} : { status: status as ItemStatus }),
        ...(agent === undefined ? {} : { agent }),
      })
    }
    return { action, ...named, updates: parsed }
  }

  return '`action` must be set, add, update or clear.'
}

function apply(current: Checklist, request: Request): Checklist | string {
  if (request.action === 'clear') return EMPTY
  if (request.action === 'update') return applyUpdates(current, request.updates, request.title)
  if (request.action === 'set') {
    return {
      title: request.title ?? '',
      items: request.items.map((text, index) => ({ id: `c${index + 1}`, text, status: 'pending' })),
    }
  }

  const ids = new Set(current.items.map(item => item.id))
  let n = current.items.length + 1
  const added: Item[] = request.items.map(text => {
    while (ids.has(`c${n}`)) n += 1
    ids.add(`c${n}`)
    return { id: `c${n}`, text, status: 'pending' }
  })

  return { title: request.title ?? current.title, items: [...current.items, ...added] }
}

function applyUpdates(current: Checklist, updates: Update[], title?: string): Checklist | string {
  const missing = updates.find(one => one.item > current.items.length)
  if (missing !== undefined) {
    return `There is no step ${missing.item}; the list has ${current.items.length}.`
  }
  const items = current.items.map((item, index) => {
    let changed = item
    for (const one of updates) {
      if (one.item !== index + 1) continue
      if (one.status !== undefined) changed = { ...changed, status: one.status }
      if (one.agent !== undefined) {
        const { agent: _unlinked, ...rest } = changed
        changed = one.agent === '' ? rest : { ...rest, agent: one.agent }
      }
    }
    return changed
  })

  return { title: title ?? current.title, items }
}

async function change(
  $: EngineInterface,
  edit: (current: Checklist) => Checklist,
  isNewPlan = false,
): Promise<Checklist> {
  let wasEmpty = false
  const current = await update($, list, value => {
    wasEmpty = value.items.length === 0
    return edit(value)
  })
  showStatus($, current)
  await publish($, current.items.length > 0 && (wasEmpty || isNewPlan))

  return current
}

async function reset($: EngineInterface): Promise<void> {
  await update($, list, () => EMPTY)
  await update($, agents, () => [])
  showStatus($, EMPTY)
  await publish($)
}

async function publish($: EngineInterface, bump = false): Promise<void> {
  const current = await read($, list)
  const runs = await read($, agents)
  await update($, section, previous => build(current, runs, previous.attention + (bump ? 1 : 0)))
}

function build(current: Checklist, runs: AgentRun[], attention: number): SidebarSection {
  const total = current.items.length
  const done = current.items.filter(item => item.status === 'completed').length
  const active = current.items.filter(item => item.status === 'in_progress').length
  const isFinished = total > 0 && done === total
  const linked = new Set(current.items.flatMap(item => (item.agent ? [item.agent] : [])))
  const others = runs.filter(run => !linked.has(run.description))
  const rows: SidebarRow[] = []

  if (total > 0) rows.push({ kind: 'progress', fraction: done / total, label: `${done} of ${total}` })
  current.items.forEach((item, index) => {
    const run = item.agent ? runs.filter(one => one.description === item.agent).pop() : undefined
    rows.push({
      kind: 'item',
      icon: ICON[item.status],
      tone: ITEM_TONE[item.status],
      number: index + 1,
      text: item.text,
      state: item.status === 'completed' ? 'done' : item.status === 'in_progress' ? 'active' : 'normal',
      ...(item.agent ? { sub: subOf(item.agent, run) } : {}),
    })
  })
  if (others.length > 0) {
    rows.push({ kind: 'divider', label: 'Subagents' })
    for (const run of others) {
      rows.push({
        kind: 'item',
        icon: RUN_ICON[run.status],
        tone: RUN_TONE[run.status],
        text: `${run.description}  ${describeRun(run)}`,
        state: run.status === 'running' ? 'normal' : 'done',
      })
    }
  }
  if (total > 0) {
    rows.push(
      isFinished
        ? { kind: 'text', text: `✔ All ${total} steps done`, tone: 'done', bold: true }
        : { kind: 'text', text: `${done} done · ${active} active · ${total - done - active} to go` },
    )
  }

  return {
    version: 1,
    title: current.title || 'Checklist',
    ...(total > 0 ? { badge: `${Math.round((done / total) * 100)}%` } : {}),
    tone: isFinished ? 'done' : 'accent',
    isEmpty: total === 0 && runs.length === 0,
    attention,
    rows,
  }
}

function subOf(agent: string, run: AgentRun | undefined): { icon: string; tone: SidebarTone; text: string } {
  if (run === undefined) return { icon: '○', tone: 'muted', text: `${agent} · waiting to start` }

  return { icon: RUN_ICON[run.status], tone: RUN_TONE[run.status], text: describeRun(run) }
}

async function countTool($: EngineInterface, id: string): Promise<void> {
  const runs = await read($, agents)
  if (!runs.some(run => run.id === id)) return
  await update($, agents, all =>
    all.map(run =>
      run.id === id ? { ...run, status: 'running' as const, tools: run.tools + 1 } : run,
    ),
  )
  await publish($)
}

async function mirror($: EngineInterface, e: ToolCallInput, ran: ToolCallResult): Promise<void> {
  if (e.tool === 'TodoWrite') {
    const items: Item[] = e.todos.map((todo, index) => ({
      id: `w${index + 1}`,
      text: todo.content,
      status: todo.status,
    }))
    await change($, current => ({ title: current.title, items }))
  } else if (e.tool === 'TaskCreate') {
    const id = (ran.result as { task?: { id?: unknown } } | undefined)?.task?.id
    if (typeof id !== 'string') return
    const item: Item = { id: `t${id}`, text: e.subject, status: 'pending' }
    await change($, current => ({ ...current, items: [...current.items, item] }))
  } else if (e.tool === 'TaskUpdate') {
    if ((ran.result as { success?: unknown } | undefined)?.success !== true) return
    const id = `t${e.taskId}`
    const { status, subject } = e
    await change($, current => ({
      ...current,
      items:
        status === 'deleted'
          ? current.items.filter(item => item.id !== id)
          : current.items.map(item =>
              item.id === id
                ? {
                    ...item,
                    ...(subject === undefined ? {} : { text: subject }),
                    ...(status === undefined ? {} : { status }),
                  }
                : item,
            ),
    }))
  }
}

function showStatus($: EngineInterface, current: Checklist): void {
  const total = current.items.length
  if (total === 0) {
    $.ui.status(undefined)
    return
  }
  const done = current.items.filter(item => item.status === 'completed').length
  const active = current.items.find(item => item.status === 'in_progress')
  if (done === total) {
    $.ui.status(`checklist ${done}/${total} done`)
  } else {
    $.ui.status(`checklist ${done}/${total}${active ? `: ${clip(active.text, 40)}` : ''}`)
  }
}

function summarize(current: Checklist): string {
  if (current.items.length === 0) return 'The checklist is empty.'
  const done = current.items.filter(item => item.status === 'completed').length
  const head = `${current.title || 'Checklist'}: ${done}/${current.items.length} done`
  const lines = current.items.map(
    (item, index) =>
      `${index + 1}. ${MARK[item.status]} ${item.text}${item.agent ? ` (agent: ${item.agent})` : ''}`,
  )

  return [head, ...lines].join('\n')
}

function describeRun(run: AgentRun): string {
  return `${run.type} · ${run.status} · ${run.tools} tool call${run.tools === 1 ? '' : 's'}`
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
