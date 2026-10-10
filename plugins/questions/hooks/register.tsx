import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Question, QuestionAgent, SidebarRow, SidebarSection } from '../types'

const TOOL = 'mcp__questions__ask'
const SECTION = { plugin: 'questions', key: 'section' } as const
const INPUT_PREFIX = 'questions:q'
const MAX_AGENTS = 30
const RECENT = 5
const KEEP_ANSWERED = 20
const CLIP = 60

const items = atom({ plugin: 'questions', key: 'items' } as const, [])
const agents = atom({ plugin: 'questions', key: 'agents' } as const, [])
const attention = atom({ plugin: 'questions', key: 'attention' } as const, 0)

const GUIDE = [
  'Use mcp__questions__ask for a decision that has a sensible default and should not stop the work.',
  'It takes `question` (one line) and `default`, the choice you go with until the person answers.',
  'Use AskUserQuestion instead when the work cannot sensibly continue without the answer.',
  'When an answer arrives as context, redo anything built on the default if the answer differs.',
].join(' ')

const DESCRIPTION = [
  'Posts a question for the person to answer from the sidebar without stopping your work.',
  '`question` is what to ask, in one line.',
  '`default` is the choice you go with until they answer; their answer arrives as context when they send it.',
].join(' ')

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string', description: 'What to ask, in one line.' },
    default: {
      type: 'string',
      description: 'The choice you go with until the person answers.',
    },
  },
  required: ['question', 'default'],
}

type Request = { question: string; default: string }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'ask',
      description: DESCRIPTION,
      inputSchema: INPUT_SCHEMA,
      isDeferred: false,
    })
    await publish($)

    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.tools.includes(TOOL)) return composed

    return {
      sections: [...composed.sections, { id: 'questions:guide', text: GUIDE, scope: 'session' }],
    }
  })

  on('tool.call', async ($, e, next) => {
    // Only the engine's own call reaches the model; another plugin's $.tool.call would take the answer and drop it.
    const forModel = next.origin.plugin === 'engine'
    const ran = await next(e)
    if (!forModel || e.agentId !== undefined || ran.deny !== undefined) return ran

    const text = await takeUndelivered($)
    if (text === undefined) return ran

    return { ...ran, context: [...(ran.context ?? []), text] }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const request = parse(e as unknown as Record<string, unknown>)
    if (typeof request === 'string') return { deny: request }

    const current = await read($, items)
    const n = current.reduce((most, one) => Math.max(most, one.n), 0) + 1
    const askedBy = e.agentId === undefined ? undefined : await askerOf($, e.agentId)
    const question: Question = {
      id: `q${n}`,
      n,
      question: request.question,
      default: request.default,
      ...(askedBy === undefined ? {} : { askedBy }),
      status: 'open',
      delivered: false,
      askedAt: Date.now(),
    }
    await update($, items, all => [...all, question])
    await update($, attention, count => count + 1)
    await publish($)
    $.ui.toast(`New question: ${clip(question.question, CLIP)}`)

    return {
      result: `Posted as Q${n}. Going with: ${question.default}. If the person answers, the answer arrives as context; revisit anything built on the default then.`,
    }
  }).catch(() => ({ deny: 'The question could not be posted.' }))

  on('prompt.submit', async ($, e, next) => {
    const fresh = await undelivered($)
    if (fresh.length === 0) return next(e)

    const result = await next({ ...e, context: [...(e.context ?? []), render(fresh)] })
    if (result.drop === undefined) await markDelivered($, fresh)

    return result
  }).catch(($, e, next) => next(e))

  on('ui.input', { plugin: 'sidebar' }, async ($, e, next) => {
    if (e.kind !== 'submit' || !e.element.startsWith(INPUT_PREFIX)) return next(e)
    const text = e.value.trim()
    if (text === '') return next(e)

    const id = e.element.slice('questions:'.length)
    const at = Date.now()
    await update($, items, all =>
      prune(
        all.map(one =>
          one.id === id
            ? { ...one, status: 'answered' as const, answer: text, answeredAt: at, delivered: false }
            : one,
        ),
      ),
    )
    await publish($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const id = spawned.agentId
    if (spawned.deny === undefined && id !== undefined) {
      const run: QuestionAgent = { id, description: e.description }
      await update($, agents, runs => [...runs.filter(one => one.id !== id), run].slice(-MAX_AGENTS))
    }

    return spawned
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const open = (await read($, items)).filter(one => one.status === 'open').length
      if (open > 0) $.ui.toast(`${open} ${open === 1 ? 'question' : 'questions'} still open`)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await reset($)

    return next(e)
  })
}

function parse(input: Record<string, unknown>): Request | string {
  const { question, default: fallback } = input
  if (typeof question !== 'string' || question.trim() === '') {
    return '"ask" needs `question`: a non-empty string.'
  }
  if (typeof fallback !== 'string' || fallback.trim() === '') {
    return '"ask" needs `default`: the choice you go with, a non-empty string.'
  }

  return { question: question.trim(), default: fallback.trim() }
}

async function askerOf($: EngineInterface, agentId: string): Promise<string> {
  const runs = await read($, agents)

  return runs.find(run => run.id === agentId)?.description ?? 'a subagent'
}

// Picks and marks in one update, so parallel calls cannot both take the same answer.
async function takeUndelivered($: EngineInterface): Promise<string | undefined> {
  let fresh: Question[] = []
  await update($, items, all => {
    fresh = all.filter(one => one.status === 'answered' && !one.delivered)
    const ids = new Set(fresh.map(one => one.id))
    return all.map(one => (ids.has(one.id) ? { ...one, delivered: true } : one))
  })

  return fresh.length === 0 ? undefined : render(fresh)
}

async function undelivered($: EngineInterface): Promise<Question[]> {
  return (await read($, items)).filter(one => one.status === 'answered' && !one.delivered)
}

async function markDelivered($: EngineInterface, fresh: readonly Question[]): Promise<void> {
  const ids = new Set(fresh.map(one => one.id))
  await update($, items, all => all.map(one => (ids.has(one.id) ? { ...one, delivered: true } : one)))
}

function render(fresh: readonly Question[]): string {
  return fresh
    .map(
      one =>
        `The person answered Q${one.n} "${one.question}" (you went with "${one.default}"): ${one.answer ?? ''}. Redo anything built on the default if the answer differs.`,
    )
    .join('\n')
}

// Keeps at most KEEP_ANSWERED answered questions, dropping the oldest. The newest question is never
// dropped, so the next question number cannot repeat one the model has already seen.
function prune(all: readonly Question[]): Question[] {
  const answered = all.filter(one => one.status === 'answered')
  const excess = answered.length - KEEP_ANSWERED
  if (excess <= 0) return [...all]

  const newest = all.reduce((most, one) => Math.max(most, one.n), 0)
  const drop = new Set(
    answered
      .filter(one => one.n !== newest)
      .sort((a, b) => (a.answeredAt ?? 0) - (b.answeredAt ?? 0))
      .slice(0, excess)
      .map(one => one.id),
  )

  return all.filter(one => !drop.has(one.id))
}

async function publish($: EngineInterface): Promise<void> {
  const all = await read($, items)
  const count = await read($, attention)
  await $.state.set(SECTION, build(all, count))
}

async function reset($: EngineInterface): Promise<void> {
  await update($, items, () => [])
  await update($, agents, () => [])
  await publish($)
}

function build(all: readonly Question[], count: number): SidebarSection {
  const open = all.filter(one => one.status === 'open')
  const answered = all
    .filter(one => one.status === 'answered')
    .sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0))
    .slice(0, RECENT)

  const rows: SidebarRow[] = []
  for (const one of open) {
    rows.push({
      kind: 'item',
      icon: '?',
      tone: 'accent',
      number: one.n,
      text: one.question,
      ...(one.askedBy === undefined ? {} : { sub: { text: `asked by ${one.askedBy}` } }),
    })
    rows.push({ kind: 'input', key: `questions:${one.id}`, placeholder: 'answer', hint: `going with: ${one.default}` })
  }
  if (answered.length > 0) {
    rows.push({ kind: 'divider', label: 'Answered' })
    for (const one of answered) {
      rows.push({
        kind: 'item',
        icon: '✓',
        tone: 'done',
        state: 'done',
        text: `Q${one.n} → ${one.answer ?? ''}`,
      })
    }
  }

  return {
    version: 1,
    title: 'Questions',
    badge: `${open.length} open`,
    isEmpty: all.length === 0,
    attention: count,
    rows,
  }
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
