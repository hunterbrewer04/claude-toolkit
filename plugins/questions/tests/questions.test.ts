import { describe, expect, test } from 'claude-code/testing'

const TOOL = 'mcp__questions__ask'

const PANE = {
  component: 'Pane',
  requestId: 'sidebar',
  props: {
    title: 'Sidebar',
    isFocused: false,
    bodyColumns: 50,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

// Stands in for the sidebar: keeps the latest questions section in its own state, draws it as
// text, and draws the Input the sidebar would draw for Q1.
const SIDEBAR = {
  name: 'sidebar',
  register(on: any) {
    const probe = { plugin: 'sidebar', key: 'last' } as const
    on('state.set', { plugin: 'questions', key: 'section' }, async ($: any, e: any, next: any) => {
      await $.state.set(probe, e.value)
      return next(e)
    })
    // Toasts have no engine beneath a test; the sidebar stands in and swallows them.
    on('ui.toast', () => undefined)
    on('ui.render', { component: 'Pane', requestId: 'sidebar' }, async ($: any, e: any, next: any) => {
      if (e.surface === 'mobile') return next(e)
      const { Box, Text, Input } = $.ui.resolve(e)
      const section = (await $.state.get(probe)).value
      return Box({
        flexDirection: 'column',
        children: [
          Text({ children: `badge=${section?.badge ?? 'none'}` }),
          Text({ children: `rows=${JSON.stringify(section?.rows ?? [])}` }),
          Input({ key: 'questions:q1', label: 'Answer', value: '', onSubmit: () => undefined }),
        ],
      })
    })
  },
}

// Stands in for another plugin that makes its own tool call (here TaskStop) when an answer lands.
const STOPPER = {
  name: 'stopper',
  register(on: any) {
    on('state.set', { plugin: 'questions', key: 'section' }, async ($: any, e: any, next: any) => {
      if (e.value?.badge === '0 open') await $.tool.call({ tool: 'TaskStop', task_id: 'task-1' }).catch(() => undefined)
      return next(e)
    })
  },
}

describe('questions', () => {
  test('ask returns the default text', { plugins: [SIDEBAR as any] }, async $ => {
    const ran = await $.tool.call({
      tool: TOOL,
      question: 'Use SQLite or Postgres?',
      default: 'SQLite',
    })
    expect(ran.deny).toBeUndefined()
    expect(String(ran.result)).toContain('Posted as Q1. Going with: SQLite.')
  })

  test('bad input is denied', { plugins: [SIDEBAR as any] }, async $ => {
    const blank = await $.tool.call({ tool: TOOL, question: '   ', default: 'x' })
    expect(blank.deny).toContain('needs `question`')

    const noDefault = await $.tool.call({ tool: TOOL, question: 'Which?' } as any)
    expect(noDefault.deny).toContain('needs `default`')
  })

  test('an answer submitted in the sidebar marks the question answered', { plugins: [SIDEBAR as any] }, async $ => {
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: TOOL, question: 'Keep the old route?', default: 'keep it' })
    expect(await ui.find({ type: 'Text', text: 'badge=1 open' })).toBeDefined()

    await ui.input({ key: 'questions:q1', text: '  drop it  ' })
    expect(await ui.find({ type: 'Text', text: 'badge=0 open' })).toBeDefined()
    const rows = (await ui.find({ type: 'Text', text: /^rows=/ }))?.text ?? ''
    expect(rows).toContain('Q1 → drop it')
    await ui.unmount()
  })

  test('the answer rides the next main-loop tool result exactly once', { plugins: [SIDEBAR as any] }, async $ => {
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: TOOL, question: 'Ship on Friday?', default: 'yes' })
    await ui.input({ key: 'questions:q1', text: 'no, Monday' })

    const next = await $.tool.call({ tool: TOOL, question: 'Second question?', default: 'maybe' })
    const carried = (next.context ?? []).filter(text => text.includes('The person answered Q1'))
    expect(carried).toHaveLength(1)
    expect(carried[0]).toContain('"Ship on Friday?"')
    expect(carried[0]).toContain('(you went with "yes"): no, Monday.')

    const after = await $.tool.call({ tool: TOOL, question: 'Third question?', default: 'fine' })
    expect((after.context ?? []).some(text => text.includes('The person answered Q1'))).toBe(false)
    await ui.unmount()
  })

  test('a tool call from another plugin does not take an answer meant for the model', { plugins: [SIDEBAR as any, STOPPER as any] }, async ($, on) => {
    // Nothing sits beneath a test's tool.call but the test, so it answers TaskStop as the engine would.
    on('tool.call', { tool: 'TaskStop' }, (() => ({ result: 'Successfully stopped task' })) as any)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: TOOL, question: 'Stop the build?', default: 'no' })
    // The answer's publish makes the stopper call TaskStop; the model's next call must still carry it.
    await ui.input({ key: 'questions:q1', text: 'yes' })

    const next = await $.tool.call({ tool: TOOL, question: 'Next?', default: 'ok' })
    const carried = (next.context ?? []).filter(text => text.includes('The person answered Q1'))
    expect(carried).toHaveLength(1)
    expect(carried[0]).toContain('"Stop the build?"')
    await ui.unmount()
  })

  test('a prompt the hooks drop does not mark the answer delivered', { plugins: [SIDEBAR as any] }, async ($, on) => {
    let dropping = true
    const submitted: string[][] = []
    on('prompt.submit', ($: any, e: any) => {
      submitted.push([...(e.context ?? [])])
      return dropping ? { drop: 'held for review' } : { text: e.text, context: e.context, origin: e.origin }
    })
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: TOOL, question: 'Use tabs?', default: 'spaces' })
    await ui.input({ key: 'questions:q1', text: 'tabs' })

    await $.prompt.submit({ text: 'first', wait: false, origin: { kind: 'composer' } })
    dropping = false
    await $.prompt.submit({ text: 'second', wait: false, origin: { kind: 'composer' } })
    expect(submitted).toHaveLength(2)
    expect(submitted[0]?.filter(text => text.includes('The person answered Q1'))).toHaveLength(1)
    expect(submitted[1]?.filter(text => text.includes('The person answered Q1'))).toHaveLength(1)
    await ui.unmount()
  })

  test('a prompt typed while idle carries the answer as context', { plugins: [SIDEBAR as any] }, async ($, on) => {
    const submitted: string[][] = []
    // Nothing sits beneath a test's prompt.submit, so the test answers it as the engine would.
    on('prompt.submit', ($: any, e: any) => {
      submitted.push([...(e.context ?? [])])
      return { text: e.text, context: e.context, origin: e.origin }
    })
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: TOOL, question: 'Dark mode too?', default: 'no' })
    await ui.input({ key: 'questions:q1', text: 'yes' })

    await $.prompt.submit({ text: 'what next?', wait: false, origin: { kind: 'composer' } })
    await $.prompt.submit({ text: 'and then?', wait: false, origin: { kind: 'composer' } })
    expect(submitted).toHaveLength(2)
    expect(submitted[0]?.filter(text => text.includes('The person answered Q1'))).toHaveLength(1)
    expect(submitted[1]?.some(text => text.includes('The person answered Q1'))).toBe(false)
    await ui.unmount()
  })

  test('a question from a subagent is tagged with its description', { plugins: [SIDEBAR as any] }, async ($, on) => {
    on('agent.spawn', () => ({ model: 'haiku', agentId: 'agent-1' }))

    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.agent.spawn({
      tool_use_id: 'toolu-1',
      prompt: 'go',
      description: 'Write the tests',
      subagentType: 'general-purpose',
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'claude-opus-5-5',
      background: false,
      fork: false,
    })
    await $.tool.call({
      tool: TOOL,
      question: 'Which fixture style?',
      default: 'inline',
      agentId: 'agent-1',
    } as any)

    const rows = (await ui.find({ type: 'Text', text: /^rows=/ }))?.text ?? ''
    expect(rows).toContain('asked by Write the tests')
    await ui.unmount()
  })
})
