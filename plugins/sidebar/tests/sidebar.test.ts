import { describe, expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'sidebar',
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

// Two stand-in widgets. Each publishes the section a test passes to its tool,
// and alpha answers a press on its own `alpha:go` key from the sidebar.
const ALPHA = {
  name: 'alpha',
  register(on: any) {
    on('tool.call', { tool: 'mcp__alpha__publish' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'alpha', key: 'section' }, e.section)
      return { result: 'published' }
    })
    on('ui.press', { plugin: 'sidebar', element: 'alpha:go' }, async ($: any, e: any, next: any) => {
      await $.state.set(
        { plugin: 'alpha', key: 'section' },
        { version: 1, title: 'Alpha', isEmpty: false, attention: 0, rows: [{ kind: 'text', text: 'pressed' }] },
      )
      return next(e)
    })
  },
}

const BETA = {
  name: 'beta',
  register(on: any) {
    on('tool.call', { tool: 'mcp__beta__publish' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'beta', key: 'section' }, e.section)
      return { result: 'published' }
    })
  },
}

const WIDGETS = [ALPHA, BETA] as any[]

function section(title: string, extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    title,
    isEmpty: false,
    attention: 0,
    rows: [{ kind: 'text', text: `${title} body` }],
    ...extra,
  }
}

async function publish($: any, widget: 'alpha' | 'beta', value: unknown): Promise<void> {
  const ran = await $.tool.call({ tool: `mcp__${widget}__publish`, section: value })
  expect(ran.deny).toBeUndefined()
}

async function texts(ui: any): Promise<string[]> {
  return (await ui.findAll({ type: 'Text' })).map((found: { text: string }) => found.text)
}

// Stands beneath the plugins as the surface's pane record: what is open, under which
// title, and every open and close the sidebar asked for.
function trackPanes(on: any) {
  const open = new Map<string, string>()
  const log: Array<{ op: 'open' | 'close'; id: string; title?: string; focus: boolean }> = []
  on('ui.open', (_: any, e: any) => {
    log.push({ op: 'open', id: e.id, title: e.title, focus: e.focus === true })
    open.set(e.id, e.title ?? e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_: any, e: any) => {
    log.push({ op: 'close', id: e.id, focus: false })
    open.delete(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: [...open].map(([id, title]) => ({ id, title, isShown: false, isFocused: false, isPlaced: true })),
  }))
  return { open, log }
}

function tab(id: string) {
  return { ...PANE, requestId: id }
}

async function runSidebar($: any, args: string) {
  return $.command.run({
    command: 'sidebar',
    args,
    origin: { kind: 'plugin', name: 'probe' },
    presentation: { isFullscreen: false, columns: 200 },
  })
}

describe('sidebar', () => {
  test('sections draw in config order', { plugins: WIDGETS, options: { order: 'beta,alpha' } }, async $ => {
    await publish($, 'alpha', section('Alpha'))
    await publish($, 'beta', section('Beta'))

    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const drawn = await texts(ui)
    expect(drawn.indexOf('Beta')).toBeGreaterThan(-1)
    expect(drawn.indexOf('Beta')).toBeLessThan(drawn.indexOf('Alpha'))
    await ui.unmount()
  })

  test('a widget missing from the order is appended', { plugins: WIDGETS, options: { order: 'beta' } }, async $ => {
    await publish($, 'alpha', section('Alpha'))
    await publish($, 'beta', section('Beta'))

    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const drawn = await texts(ui)
    expect(drawn.indexOf('Alpha')).toBeGreaterThan(drawn.indexOf('Beta'))
    await ui.unmount()
  })

  test('empty sections hide, and all empty says so', { plugins: WIDGETS }, async $ => {
    const before = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await before.find({ type: 'Text', text: 'Nothing going on.' })).toBeDefined()
    await before.unmount()

    await publish($, 'alpha', section('Alpha', { isEmpty: true }))
    await publish($, 'beta', section('Beta'))
    const one = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await one.find({ type: 'Text', text: 'Alpha' })).toBeUndefined()
    expect(await one.find({ type: 'Text', text: 'Beta' })).toBeDefined()
    await one.unmount()

    await publish($, 'beta', section('Beta', { isEmpty: true }))
    const none = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await none.find({ type: 'Text', text: 'Nothing going on.' })).toBeDefined()
    expect(await none.find({ type: 'Text', text: 'Beta' })).toBeUndefined()
    await none.unmount()
  })

  test('a bad section draws one error line', { plugins: WIDGETS }, async $ => {
    await publish($, 'alpha', { version: 1, title: 5, isEmpty: false, attention: 0, rows: [] })
    await publish($, 'beta', section('Beta', { rows: [{ kind: 'nope' }] }))

    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: 'alpha: bad section' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'beta: bad section' })).toBeDefined()
    await ui.unmount()
  })

  test('tabs is the default: two widgets get two titled tabs', { plugins: WIDGETS }, async ($, on) => {
    const panes = trackPanes(on)

    await publish($, 'alpha', section('Alpha', { badge: '93%' }))
    await publish($, 'beta', section('Beta', { badge: '1 open' }))
    expect([...panes.open]).toEqual([
      ['sidebar-alpha', 'Alpha 93%'],
      ['sidebar-beta', 'Beta 1 open'],
    ])
    expect(panes.log.every(entry => !entry.focus)).toBe(true)

    // A new badge retitles an open tab.
    await publish($, 'alpha', section('Alpha', { badge: '95%' }))
    expect(panes.open.get('sidebar-alpha')).toBe('Alpha 95%')

    // A tab the person closed is not reopened just to retitle it.
    panes.open.delete('sidebar-beta')
    await publish($, 'beta', section('Beta', { badge: '2 open' }))
    expect(panes.open.has('sidebar-beta')).toBe(false)

    // Each tab draws its own widget alone.
    const ui = await $.ui.mount({ ...tab('sidebar-alpha'), surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: 'Alpha' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Beta' })).toBeUndefined()
    await ui.unmount()
  })

  test('/sidebar opens a tab per busy widget in config order', { plugins: WIDGETS, options: { order: 'beta,alpha' } }, async ($, on) => {
    const panes = trackPanes(on)
    await publish($, 'alpha', section('Alpha'))
    await publish($, 'beta', section('Beta'))
    panes.open.clear()
    panes.log.length = 0

    const ran = await runSidebar($, '')
    expect(String(ran.text)).toBe('Sidebar opened.')
    expect(panes.log.map(entry => entry.id)).toEqual(['sidebar-beta', 'sidebar-alpha'])

    await runSidebar($, 'close')
    expect(panes.open.size).toBe(0)
  })

  test('an empty widget gets no tab, and going empty closes it', { plugins: WIDGETS }, async ($, on) => {
    const panes = trackPanes(on)

    await publish($, 'alpha', section('Alpha', { isEmpty: true }))
    expect(panes.log).toHaveLength(0)

    await publish($, 'alpha', section('Alpha'))
    expect(panes.open.has('sidebar-alpha')).toBe(true)

    await publish($, 'alpha', section('Alpha', { isEmpty: true }))
    expect(panes.open.has('sidebar-alpha')).toBe(false)
    expect(panes.log.at(-1)).toMatchObject({ op: 'close', id: 'sidebar-alpha' })
  })

  test('an attention rise opens the tab with focus', { plugins: WIDGETS }, async ($, on) => {
    const panes = trackPanes(on)

    await publish($, 'beta', section('Beta', { attention: 0 }))
    expect(panes.log).toEqual([{ op: 'open', id: 'sidebar-beta', title: 'Beta', focus: false }])

    await publish($, 'beta', section('Beta', { attention: 1 }))
    expect(panes.log.at(-1)).toEqual({ op: 'open', id: 'sidebar-beta', title: 'Beta', focus: true })

    await publish($, 'beta', section('Beta', { attention: 1 }))
    expect(panes.log).toHaveLength(2)
  })

  test('stacked: an attention bump opens the one pane once', { plugins: WIDGETS, options: { layout: 'stacked' } }, async ($, on) => {
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } }
    })

    await publish($, 'alpha', section('Alpha', { attention: 0 }))
    expect(opened).toHaveLength(0)
    await publish($, 'alpha', section('Alpha', { attention: 1 }))
    expect(opened).toEqual(['sidebar'])
    await publish($, 'alpha', section('Alpha', { attention: 1 }))
    expect(opened).toHaveLength(1)
    await publish($, 'beta', section('Beta', { attention: 1 }))
    expect(opened).toEqual(['sidebar', 'sidebar'])

    const ran = await runSidebar($, '')
    expect(String(ran.text)).toBe('Sidebar opened.')
    expect(opened).toEqual(['sidebar', 'sidebar', 'sidebar'])
  })

  test('a pane that cannot place hints once', { plugins: WIDGETS }, async ($, on) => {
    const toasts: string[] = []
    on('ui.open', () => ({ value: { isPlaced: false, reason: 'narrow' } }))
    on('ui.toast', ($, e) => {
      toasts.push(e.text)
      return { value: undefined }
    })

    await publish($, 'alpha', section('Alpha', { attention: 1 }))
    await publish($, 'alpha', section('Alpha', { attention: 2 }))
    expect(toasts).toEqual(['Sidebar: run /sidebar to open'])
  })

  test('rows draw with the checklist look on every surface', { plugins: WIDGETS }, async $ => {
    await publish(
      $,
      'alpha',
      section('Ship it', {
        badge: '33%',
        rows: [
          { kind: 'progress', fraction: 1 / 3, label: '1 of 3' },
          { kind: 'item', icon: '✔', tone: 'done', number: 1, text: 'one', state: 'done' },
          {
            kind: 'item',
            icon: '▶',
            tone: 'accent',
            number: 2,
            text: 'two',
            state: 'active',
            sub: { icon: '●', tone: 'accent', text: 'general-purpose · running · 2 tool calls' },
          },
          { kind: 'item', icon: '○', tone: 'muted', number: 3, text: 'three', action: { key: 'alpha:go', label: '[x]' } },
          { kind: 'divider', label: 'More' },
          { kind: 'input', key: 'alpha:answer', placeholder: 'answer', hint: 'going with: yes' },
          { kind: 'text', text: '1 done · 1 active · 1 to go', tone: 'muted' },
        ],
      }),
    )

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...PANE, surface })
      expect((await ui.find({ type: 'Text', text: 'one' }))?.props).toMatchObject({ strikethrough: true })
      expect((await ui.find({ type: 'Text', text: 'two' }))?.props).toMatchObject({ bold: true })
      expect(await ui.find({ type: 'Text', text: ' 33%' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: ' 1 of 3' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: 'general-purpose · running · 2 tool calls' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /── More ─/ })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'alpha:go' })).toBeDefined()
      expect((await ui.find({ type: 'Input', key: 'alpha:answer' }))?.props).toMatchObject({
        label: '›',
        placeholder: 'answer',
        submitLabel: 'send',
      })
      const boxes = await ui.findAll({ type: 'Box' })
      const field = boxes.find(
        (box: any) => box.props.borderStyle === 'round' && box.props.borderColor === '#2A3F66',
      )
      expect(JSON.stringify(field?.children)).toContain('alpha:answer')
      expect(await ui.find({ type: 'Text', text: 'going with: yes' })).toBeDefined()
      expect(JSON.stringify(field?.children)).not.toContain('going with: yes')
      await ui.unmount()
    }

    const mobile = await $.ui.mount({ ...PANE, surface: 'mobile' })
    expect(await mobile.find({ type: 'Input' })).toBeUndefined()
    expect(await mobile.find({ type: 'Text', text: 'answer' })).toBeDefined()
    await mobile.unmount()
  })

  test("a press on a widget's key reaches the widget", { plugins: WIDGETS }, async $ => {
    await publish(
      $,
      'alpha',
      section('Alpha', { rows: [{ kind: 'button', key: 'alpha:go', label: 'Go' }] }),
    )

    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await ui.press({ key: 'alpha:go' })
    expect(await ui.find({ type: 'Text', text: 'pressed' })).toBeDefined()
    await ui.unmount()
  })

  test('a section write that loses its version race is not mirrored', { plugins: WIDGETS }, async ($, on) => {
    // Stands beneath the plugins: answers alpha's write as a lost ifVersion race.
    const below: any = on
    below('state.set', { plugin: 'alpha', key: 'section' }, () => ({ value: { isSet: false, version: 1 } }))

    await publish($, 'alpha', section('Alpha'))
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: 'Alpha' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Nothing going on.' })).toBeDefined()
    await ui.unmount()
  })
})
