import { describe, expect, mock, test } from 'claude-code/testing'

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

// Stands in for the sidebar host: draws the processes section it reads from state.
const SIDEBAR = {
  name: 'sidebar',
  register(on: any) {
    on('ui.render', { component: 'Pane', requestId: 'sidebar' }, async ($: any, e: any) => {
      const { Box, Text, Button } = $.ui.resolve(e)
      const { value } = await $.state.get({ plugin: 'processes', key: 'section' })
      if (value === undefined || value.isEmpty) return h(Box, {}, h(Text, {}, 'none'))
      const items = value.rows.map((row: any, index: number) =>
        h(
          Box,
          { key: `row${index}` },
          h(Text, {}, row.text),
          row.action === undefined
            ? null
            : h(Button, { key: row.action.key, label: row.action.label, onPress: () => undefined }),
        ),
      )

      return h(Box, { flexDirection: 'column' }, h(Text, {}, `${value.title} · ${value.badge}`), ...items)
    })
  },
}

type Lab = {
  claude: number
  cwd: string
  table: string[]
  listeners: string
  kills: string[][]
  stops: string[]
  toasts: string[]
  /** `sh -c 'echo $PPID'` prints nothing, so Claude Code's pid is unknown. */
  noClaude: boolean
  /** TaskStop refuses, so a kill falls back to signalling. */
  stopFails: boolean
}

function lab(): Lab {
  return {
    claude: 100,
    cwd: '/Users/hunterbrewer/Code/app',
    table: ['100 1 100 claude'],
    listeners: '',
    kills: [],
    stops: [],
    toasts: [],
    noClaude: false,
    stopFails: false,
  }
}

function done(stdout: string) {
  return {
    value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }
}

// Answers the host commands the plugin runs, and the Bash, TaskStop and toast events beneath it.
function world(on: any, state: Lab, taskIds: Record<string, string> = {}) {
  on('process.run', (_$: any, e: any) => {
    const [cmd, ...args] = e.argv as string[]
    if (cmd === 'sh') return done(state.noClaude ? '' : `${state.claude}\n`)
    if (cmd === 'pwd') return done(`${state.cwd}\n`)
    if (cmd === 'ps') return done(state.table.join('\n'))
    if (cmd === 'kill') {
      state.kills.push([...e.argv])
      // A KILL ends the whole group; a TERM is ignored, so the force step shows.
      if (args[0] === '-KILL') state.table = state.table.filter(line => line.split(/\s+/)[2] !== args[2]?.slice(1))
      return done('')
    }
    if (cmd === 'lsof') return done(args.includes('cwd') ? `p1\nfcwd\nn${state.cwd}\n` : state.listeners)

    return done('')
  })
  on('tool.call', { tool: 'Bash' }, (_$: any, e: any) => {
    const taskId = taskIds[e.command]
    return {
      result: { stdout: '', stderr: '', interrupted: false, ...(taskId === undefined ? {} : { backgroundTaskId: taskId }) },
      text: '',
    } as any
  })
  on('tool.call', { tool: 'TaskStop' }, (_$: any, e: any) => {
    state.stops.push(e.task_id)
    if (state.stopFails) return { deny: 'no such task' } as any
    return { result: { message: `Successfully stopped task: ${e.task_id}`, task_id: e.task_id }, text: 'stopped' } as any
  })
  on('ui.toast', (_$: any, e: any) => {
    state.toasts.push(e.text)
    return { value: undefined }
  })
}

describe('processes', () => {
  test('a background Bash task becomes a running entry in the section', { plugins: [SIDEBAR] }, async ($, on) => {
    mock.clock(on)
    world(on, lab(), { 'npm run dev': 'bg1' })
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    expect(await ui.find({ type: 'Text', text: 'none' })).toBeDefined()

    await $.tool.call({ tool: 'Bash', command: 'npm run dev', description: 'dev server', run_in_background: true } as any)

    expect(await ui.find({ type: 'Text', text: 'Processes · 1 up' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^npm run dev/ })).toBeDefined()
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()
    await ui.unmount()
  })

  test('a non-Bash tool and a plain Bash command create no entry', { plugins: [SIDEBAR] }, async ($, on) => {
    mock.clock(on)
    world(on, lab(), { 'npm run dev': 'bg1' })
    on('tool.call', { tool: 'Read' }, () => ({ result: {}, text: '' }) as any)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })

    await $.tool.call({ tool: 'Read', file_path: 'README.md' } as any)
    await $.tool.call({ tool: 'Bash', command: 'echo hi', description: 'say hi' } as any)

    expect(await ui.find({ type: 'Text', text: 'none' })).toBeDefined()
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeUndefined()
    await ui.unmount()
  })

  test('a press on processes:kill:<id> stops that task and no other', { plugins: [SIDEBAR] }, async ($, on) => {
    mock.clock(on)
    const state = lab()
    world(on, state, { 'npm run dev': 'bg1', 'sleep 60': 'bg2' })
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'npm run dev', description: 'dev' } as any)
    await $.tool.call({ tool: 'Bash', command: 'sleep 60', description: 'wait' } as any)

    await ui.press({ key: 'processes:kill:p1' })

    expect(state.stops).toEqual(['bg1'])
    expect(state.kills).toEqual([])
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeUndefined()
    expect(await ui.find({ key: 'processes:kill:p2' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Processes · 1 up' })).toBeDefined()
    await ui.unmount()
  })

  test('session end toasts what is still running, and clear keeps only running entries', { plugins: [SIDEBAR] }, async ($, on) => {
    mock.clock(on)
    const state = lab()
    world(on, state, { 'npm run dev': 'bg1', 'sleep 60': 'bg2' })
    on('session.end', () => ({ sessionId: 's1' }) as any)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'npm run dev', description: 'dev' } as any)
    await $.tool.call({ tool: 'Bash', command: 'sleep 60', description: 'wait' } as any)
    await ui.press({ key: 'processes:kill:p2' })
    expect(await ui.find({ type: 'Text', text: /exited/ })).toBeDefined()

    await $.session.end({ reason: 'prompt_input_exit', sessionId: 's1', resume: { id: 's1' } } as any)

    expect(state.toasts).toEqual(['Still running: npm run dev'])
    expect(state.stops).toEqual(['bg2'])
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()

    await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } } as any)

    expect(state.toasts).toEqual(['Still running: npm run dev', 'Still running: npm run dev'])
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /exited/ })).toBeUndefined()
    await ui.unmount()
  })

  test('a detached server under the session cwd appears with its port after 2s', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    world(on, state)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'node server.js &', description: 'serve' } as any)
    state.table = ['100 1 100 claude', '4242 100 4242 node server.js']
    state.listeners = 'p4242\ncnode\nf23\nn*:3000\n'

    await clock.advance(2000)

    expect(await ui.find({ type: 'Text', text: 'Processes · 1 up' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ':3000' })).toBeDefined()
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()
    await ui.unmount()
  })

  test('a detached kill sends TERM to its own group, then KILL if it lives', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    world(on, state)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'node server.js &', description: 'serve' } as any)
    state.table = ['100 1 100 claude', '4242 100 4242 node server.js']
    state.listeners = 'p4242\ncnode\nf23\nn*:3000\n'
    await clock.advance(2000)

    await ui.press({ key: 'processes:kill:p1' })

    expect(state.kills).toEqual([['kill', '-TERM', '--', '-4242']])
    expect(state.stops).toEqual([])
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()

    await clock.advance(3000)

    expect(state.kills).toEqual([
      ['kill', '-TERM', '--', '-4242'],
      ['kill', '-KILL', '--', '-4242'],
    ])
    await clock.advance(3000)
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeUndefined()
    await ui.unmount()
  })

  test('a listener whose group is not under Claude is never adopted', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    world(on, state)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'node server.js &', description: 'serve' } as any)
    // The person's own terminal: login -> zsh -> their dev server, in its own group.
    state.table = ['100 1 100 claude', '50 1 50 login', '60 50 60 -zsh', '4242 60 4242 node server.js']
    state.listeners = 'p4242\ncnode\nf23\nn*:3000\n'

    await clock.advance(10000)

    expect(await ui.find({ type: 'Text', text: 'none' })).toBeDefined()
    expect(state.kills).toEqual([])
    await ui.unmount()
  })

  test('an orphan left by a Bash shell is adopted by the 5s scan', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    world(on, state)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'npm run dev &', description: 'serve' } as any)
    await clock.advance(2000)
    expect(await ui.find({ type: 'Text', text: 'none' })).toBeDefined()
    // The shell (pgid 4300) is gone; npm is orphaned to init and node listens under it.
    state.table = ['100 1 100 claude', '4301 1 4300 npm run dev', '4302 4301 4300 node next dev']
    state.listeners = 'p4302\ncnode\nf23\nn*:3000\n'

    await clock.advance(3000)

    expect(await ui.find({ type: 'Text', text: ':3000' })).toBeDefined()
    await ui.unmount()
  })

  test('with Claude pid unknown nothing is adopted and nothing is signalled', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    state.noClaude = true
    state.stopFails = true
    world(on, state, { 'sleep 60': 'bg1' })
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'node server.js &', description: 'serve' } as any)
    state.table = ['100 1 100 claude', '4242 100 4242 node server.js', "5000 100 5000 /bin/zsh -c eval 'sleep 60'"]
    state.listeners = 'p4242\ncnode\nf23\nn*:3000\n'
    await clock.advance(10000)
    expect(await ui.find({ type: 'Text', text: 'none' })).toBeDefined()

    await $.tool.call({ tool: 'Bash', command: 'sleep 60', description: 'wait', run_in_background: true } as any)
    await clock.advance(3000)
    await ui.press({ key: 'processes:kill:p1' })

    expect(state.stops).toEqual(['bg1'])
    expect(state.kills).toEqual([])
    expect(state.toasts).toEqual(['Could not stop sleep 60'])
    await ui.unmount()
  })

  test("a command with a single quote matches its eval-wrapped ps line", { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    state.stopFails = true
    const command = "python3 -c 'print(1)'; sleep 60"
    world(on, state, { [command]: 'bg1' })
    state.table = ['100 1 100 claude', '4000 100 4000 python3 -c print(1)']
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command, description: 'run', run_in_background: true } as any)
    state.table = [
      '100 1 100 claude',
      // Present before the call, so it is not the task even though it is older.
      `4000 100 4000 /bin/zsh -c eval 'python3 -c '"'"'print(1)'"'"'; sleep 60'`,
      `5000 100 5000 /bin/zsh -c source /tmp/snap.sh && eval 'python3 -c '"'"'print(1)'"'"'; sleep  60' < /dev/null`,
      '5001 5000 5000 sleep 60',
    ]

    await clock.advance(3000)
    await ui.press({ key: 'processes:kill:p1' })

    expect(state.stops).toEqual(['bg1'])
    expect(state.kills).toEqual([['kill', '-TERM', '--', '-5000']])
    await ui.unmount()
  })

  test('a kill on a pid that changed group sends no signal and marks it exited', { plugins: [SIDEBAR] }, async ($, on) => {
    const clock = mock.clock(on)
    const state = lab()
    world(on, state)
    const ui = await $.ui.mount({ plugin: 'sidebar', surface: 'terminal', ...PANE })
    await $.tool.call({ tool: 'Bash', command: 'node server.js &', description: 'serve' } as any)
    state.table = ['100 1 100 claude', '4242 100 4242 node server.js']
    state.listeners = 'p4242\ncnode\nf23\nn*:3000\n'
    await clock.advance(2000)
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeDefined()
    // The server died and its pid now belongs to something else in another group.
    state.table = ['100 1 100 claude', '4242 1 7777 /usr/sbin/other']

    await ui.press({ key: 'processes:kill:p1' })
    await clock.advance(3000)

    expect(state.kills).toEqual([])
    expect(await ui.find({ key: 'processes:kill:p1' })).toBeUndefined()
    await ui.unmount()
  })
})
