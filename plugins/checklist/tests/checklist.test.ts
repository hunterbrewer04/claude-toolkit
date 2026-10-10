import { describe, expect, test } from 'claude-code/testing'
import type { Plugin, TestBody } from 'claude-code/testing'

import type { SidebarSection } from '../types'

declare module 'claude-code' {
  interface PluginState {
    probe: { last: string }
  }
}

const TOOL = 'mcp__checklist__checklist'

type Engine = Parameters<TestBody>[0]

// Stands in for the sidebar: keeps the last section checklist published and
// hands it back through a tool result, since the test engine has no $.state.
const PROBE: Plugin = {
  name: 'probe',
  register(on) {
    on('state.set', { plugin: 'checklist', key: 'section' }, async ($, e, next) => {
      const ran = await next(e)
      await $.state.set({ plugin: 'probe', key: 'last' }, JSON.stringify(e.value))
      return ran
    })
    on('tool.call', async ($, e, next) => {
      if (e.tool !== 'mcp__probe__section') return next(e)

      return { result: (await $.state.get({ plugin: 'probe', key: 'last' })).value ?? '' }
    })
  },
}

async function sectionOf($: Engine): Promise<SidebarSection> {
  const ran = await $.tool.call({ tool: 'mcp__probe__section' } as never)
  return JSON.parse(String(ran.result)) as SidebarSection
}

describe('checklist', () => {
  test('set and update publish the section the sidebar draws', { plugins: [PROBE] }, async $ => {
    await $.tool.call({ tool: TOOL, action: 'set', title: 'Ship it', items: ['one', 'two', 'three'] })
    let section = await sectionOf($)
    expect(section).toMatchObject({ title: 'Ship it', badge: '0%', tone: 'accent', isEmpty: false, attention: 1 })

    const ran = await $.tool.call({
      tool: TOOL,
      action: 'update',
      updates: [
        { item: 1, status: 'completed' },
        { item: 2, status: 'in_progress' },
      ],
    })
    expect(ran.deny).toBeUndefined()
    expect(String(ran.result)).toContain('Ship it: 1/3 done')
    expect(String(ran.result)).toContain('2. [>] two')

    section = await sectionOf($)
    expect(section.badge).toBe('33%')
    expect(section.attention).toBe(1)
    expect(section.rows).toEqual([
      { kind: 'progress', fraction: 1 / 3, label: '1 of 3' },
      { kind: 'item', icon: '✔', tone: 'done', number: 1, text: 'one', state: 'done' },
      { kind: 'item', icon: '▶', tone: 'accent', number: 2, text: 'two', state: 'active' },
      { kind: 'item', icon: '○', tone: 'muted', number: 3, text: 'three', state: 'normal' },
      { kind: 'text', text: '1 done · 1 active · 1 to go' },
    ])

    await $.tool.call({
      tool: TOOL,
      action: 'update',
      updates: [
        { item: 2, status: 'completed' },
        { item: 3, status: 'completed' },
      ],
    })
    section = await sectionOf($)
    expect(section.tone).toBe('done')
    expect(section.badge).toBe('100%')
    expect(section.rows.at(-1)).toEqual({ kind: 'text', text: '✔ All 3 steps done', tone: 'done', bold: true })

    await $.tool.call({ tool: TOOL, action: 'add', items: ['four'] })
    expect((await sectionOf($)).attention).toBe(1)

    await $.tool.call({ tool: TOOL, action: 'set', items: ['fresh'] })
    expect((await sectionOf($)).attention).toBe(2)

    await $.tool.call({ tool: TOOL, action: 'clear' })
    section = await sectionOf($)
    expect(section).toMatchObject({ isEmpty: true, rows: [], attention: 2 })
  })

  test('bad input is refused', async $ => {
    const noItems = await $.tool.call({ tool: TOOL, action: 'set', items: [] })
    expect(noItems.deny).toContain('needs `items`')

    await $.tool.call({ tool: TOOL, action: 'set', items: ['only'] }).catch(() => undefined)
    const outOfRange = await $.tool.call({ tool: TOOL, action: 'update', updates: [{ item: 4 }] })
    expect(outOfRange.deny).toContain('There is no step 4')
  })

  test('a linked subagent shows under its step', { plugins: [PROBE] }, async ($, on) => {
    on('agent.spawn', () => ({ model: 'haiku', agentId: 'agent-1' }))
    on('turn.complete', ($, e) => ({ text: e.answer }))

    await $.tool.call({ tool: TOOL, action: 'set', items: ['write tests'] })
    await $.tool.call({
      tool: TOOL,
      action: 'update',
      updates: [{ item: 1, status: 'in_progress', agent: 'Write the tests' }],
    })
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
    await $.turn.complete({
      answer: 'done',
      durationMs: 5,
      isAborted: false,
      turnId: 'turn-1',
      agentId: 'agent-1',
      reason: 'answer',
    })

    const section = await sectionOf($)
    expect(section.rows).toContainEqual({
      kind: 'item',
      icon: '▶',
      tone: 'accent',
      number: 1,
      text: 'write tests',
      state: 'active',
      sub: { icon: '✔', tone: 'done', text: 'general-purpose · done · 0 tool calls' },
    })
    expect(section.rows.some(row => row.kind === 'divider')).toBe(false)
  })

  test('checklist never opens a pane', { plugins: [PROBE] }, async ($, on) => {
    const opened: string[] = []
    on('ui.open', (_, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } }
    })

    await $.tool.call({ tool: TOOL, action: 'set', title: 'Ship it', items: ['one'] })
    await $.tool.call({ tool: TOOL, action: 'update', updates: [{ item: 1, status: 'completed' }] })
    const ran = await $.command.run({
      command: 'checklist',
      args: '',
      origin: { kind: 'plugin', name: 'probe' },
      presentation: { isFullscreen: false, columns: 80 },
    })

    expect(String(ran.text)).toContain('Ship it: 1/1 done')
    expect(opened).toEqual([])
  })
})
