import { describe, expect, test } from 'claude-code/testing'

import {
  BAND_PROPS,
  COMMON,
  DECISION,
  FAILURE,
  H,
  LEASE,
  NAME,
  NAME_OTHER_REPO,
  NOW,
  NOW_S,
  RECORD,
  SESSION_ID,
  TOP,
  beneath,
  newWorld,
  spawnsOf,
  statusOf,
  stubs,
  watchSection,
} from './world'

const ALWAYS = { [DECISION]: 'always', [RECORD]: { name: NAME, day: '2026-10-09', mode: 'bg', bgId: 'bg-1' } }
const commit = (msg: string): any => ({ tool: 'Bash', command: `git commit -m "${msg}"` })

describe('review-pair builder', () => {
  test('a commit that moves HEAD sends the range; no HEAD change sends nothing', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('add thing') as any)
    expect(w.sends.map(s => s.text)).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}\nmain: feat: add thing`])

    await $.tool.call({ tool: 'Bash', command: 'git status' } as any)
    await $.tool.call({ tool: 'Bash', command: 'git log --oneline' } as any)
    expect(w.sends).toHaveLength(1)
  })

  test('a plain command that is not git runs no git probes', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    const ran = await $.tool.call({ tool: 'Bash', command: 'ls -la' } as any)
    expect(ran.deny).toBeUndefined()
    expect(w.runs).toHaveLength(0)
  })

  test('outside a git repo the mod does nothing', async ($: any, on) => {
    const w = newWorld({ git: false })
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    const ran = await $.tool.call(commit('x') as any)
    expect(ran.deny).toBeUndefined()
    expect(w.sends).toHaveLength(0)
    expect(spawnsOf(w)).toHaveLength(0)
  })

  test('the first range in an unseen repo shows the band and sends nothing', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('x') as any)
    expect(w.sends).toHaveLength(0)
    expect(spawnsOf(w)).toHaveLength(0)

    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    expect(await ui.find({ type: 'Text', text: 'Start a reviewer for app?' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'review-pair:always' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'review-pair:not-now' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'review-pair:never' })).toBeDefined()
    await ui.unmount()
  })

  test('always stores the decision, spawns a background reviewer, and sends the pending range', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('x') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    await ui.press({ plugin: 'review-pair', key: 'review-pair:always' } as any)
    await ui.unmount()

    expect(await statusOf($)).toContain('decision: always')
    const spawn = spawnsOf(w)[0]
    expect(spawn?.argv.slice(0, 6)).toEqual(['claude', '--bg', '-n', NAME, '--model', 'sonnet'])
    expect(spawn?.argv).not.toContain('--permission-mode')
    expect(spawn?.cwd).toBe(TOP)
    expect(spawn?.env).toEqual({ REVIEW_PAIR_ROLE: 'reviewer', REVIEW_PAIR_REPO: COMMON })
    expect(w.sends[0]?.to).toBe(NAME)
    expect(w.sends[0]?.text.startsWith(`[review-pair] REVIEW ${H.a}..${H.b}\n`)).toBe(true)
    expect(w.toasts).toContain('review-pair: reviewer started for app')
    expect(await statusOf($)).toContain(`reviewer: ${NAME} (bg, 2026-10-09)`)
  })

  test('the reviewer always gets --plugin-dir from the mod root, and no env switch', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, { REVIEW_PAIR_PLUGIN_DIR: '/elsewhere' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const argv = spawnsOf(w)[0]?.argv ?? []
    const at = argv.indexOf('--plugin-dir')
    expect(at).toBeGreaterThan(-1)
    expect(argv[at + 1]).toMatch(/^\//)
    expect(argv).not.toContain('/elsewhere')
  })

  test('a configured default permission mode is passed to the reviewer', async ($: any, on) => {
    const w = newWorld({ settings: { permissions: { defaultMode: 'acceptEdits' } } })
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const argv = spawnsOf(w)[0]?.argv ?? []
    const at = argv.indexOf('--permission-mode')
    expect(at).toBeGreaterThan(-1)
    expect(argv[at + 1]).toBe('acceptEdits')
  })

  test('no permission mode is passed when settings do not set one', async ($: any, on) => {
    const w = newWorld({ settings: { permissions: {} } })
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    expect(spawnsOf(w)[0]?.argv).not.toContain('--permission-mode')
  })

  test('the spawn carries a 70 second process timeout', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    expect(spawnsOf(w)[0]?.timeoutMs).toBe(70000)
  })

  test('inside herdr the reviewer is split beside the builder and started as an agent', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const split = w.runs.find(r => r.argv[0] === 'herdr' && r.argv[1] === 'pane' && r.argv[2] === 'split')
    expect(split?.argv).toEqual([
      'herdr', 'pane', 'split', 'p1',
      '--direction', 'right', '--ratio', '0.65', '--cwd', TOP, '--no-focus',
      '--env', 'REVIEW_PAIR_ROLE=reviewer', '--env', `REVIEW_PAIR_REPO=${COMMON}`,
    ])
    const start = w.runs.find(r => r.argv[0] === 'herdr' && r.argv[1] === 'agent')
    expect(start?.timeoutMs).toBe(70000)
    expect(start?.argv.slice(0, 11)).toEqual([
      'herdr', 'agent', 'start', NAME, '--kind', 'claude', '--pane', 'p9', '--timeout', '60000', '--',
    ])
    expect(start?.argv.slice(11, 15)).toEqual(['-n', NAME, '--model', 'sonnet'])
    expect(start?.argv[15]).toBe('--plugin-dir')
    expect(start?.argv[16]).toMatch(/^\//)
    expect(spawnsOf(w)).toHaveLength(0)
    expect(await statusOf($)).toContain(`reviewer: ${NAME} (herdr, 2026-10-09)`)
  })

  test('a failed herdr agent start closes the pane it split', async ($: any, on) => {
    const w = newWorld({ herdrStartFails: true })
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const close = w.runs.find(r => r.argv[0] === 'herdr' && r.argv[1] === 'pane' && r.argv[2] === 'close')
    expect(close?.argv).toEqual(['herdr', 'pane', 'close', 'p9'])
    expect(w.sends).toHaveLength(0)
    expect(w.toasts.some((t) => t.startsWith('review-pair: could not start a reviewer for app ('))).toBe(true)
  })

  test('an agent_not_ready reply keeps the pane and the reviewer record, and toasts the trust prompt', async ($: any, on) => {
    const notReady = `{"error":{"code":"agent_not_ready","message":"agent ${NAME} is blocked during startup and is not ready for prompts"}}`
    const w = newWorld({ herdrAgentJson: notReady })
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    expect(w.runs.some(r => r.argv[0] === 'herdr' && r.argv[1] === 'pane' && r.argv[2] === 'close')).toBe(false)
    expect(w.toasts).toContain('review-pair: reviewer for app is waiting on a trust prompt in the right pane')
    expect(w.toasts.some(t => t.includes('could not start'))).toBe(false)
    expect(await statusOf($)).toContain(`reviewer: ${NAME} (herdr, 2026-10-09)`)
    expect(w.sends[0]?.to).toBe(NAME)
  })

  test('an error reply other than agent_not_ready closes the pane and fails, even with exit 0', async ($: any, on) => {
    const w = newWorld({ herdrAgentJson: '{"error":{"code":"pane_busy","message":"pane p9 is busy"}}' })
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const close = w.runs.find(r => r.argv[0] === 'herdr' && r.argv[1] === 'pane' && r.argv[2] === 'close')
    expect(close?.argv).toEqual(['herdr', 'pane', 'close', 'p9'])
    expect(w.sends).toHaveLength(0)
    expect(w.toasts.some((t) => t.startsWith('review-pair: could not start a reviewer for app ('))).toBe(true)
    expect(await statusOf($)).toContain('reviewer: none')
  })

  test('a reviewer recorded for an earlier day is closed and replaced', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, {
      [DECISION]: 'always',
      [RECORD]: { name: NAME, day: '2026-10-08', mode: 'bg', bgId: 'old-1' },
    })

    await $.tool.call(commit('x') as any)
    expect(w.runs.find(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')?.argv).toEqual(['claude', 'stop', 'old-1'])
    expect(spawnsOf(w)).toHaveLength(1)
  })

  test('agent start is retried while the new pane shell is still starting', async ($: any, on) => {
    const w = newWorld()
    w.herdrBusy = 2
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    const starts = w.runs.filter(r => r.argv[0] === 'herdr' && r.argv[1] === 'agent')
    expect(starts).toHaveLength(3)
    expect(w.runs.filter(r => r.argv[0] === 'sleep')).toHaveLength(2)
    expect(w.runs.some(r => r.argv[0] === 'herdr' && r.argv[2] === 'close')).toBe(false)
    expect(await statusOf($)).toContain(`reviewer: ${NAME} (herdr, 2026-10-09)`)
  })

  test('a pane shell that never becomes ready fails and closes the pane', async ($: any, on) => {
    const w = newWorld()
    w.herdrBusy = 100
    beneath(on, w)
    stubs(on, { HERDR_ENV: '1', HERDR_PANE_ID: 'p1' }, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    expect(w.runs.filter(r => r.argv[0] === 'herdr' && r.argv[1] === 'agent')).toHaveLength(13)
    expect(w.runs.some(r => r.argv[0] === 'herdr' && r.argv[2] === 'close')).toBe(true)
  })

  test('two repos named app get different reviewer names', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always', 'decision:/other/app/.git': 'always' })
    await $.tool.call(commit('one') as any)

    w.top = '/other/app'
    w.common = '/other/app/.git'
    w.heads = [H.c, H.d]
    await $.tool.call(commit('two') as any)

    const names = spawnsOf(w).map(r => r.argv[r.argv.indexOf('-n') + 1])
    expect(names).toEqual([NAME, NAME_OTHER_REPO])
  })

  test('a long repo name still gives a reviewer name herdr accepts', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    w.top = '/work/review-pair-sandbox-with-a-long-name'
    w.common = '/work/review-pair-sandbox-with-a-long-name/.git'
    beneath(on, w)
    stubs(on, {}, { [`decision:${w.common}`]: 'always' })
    await $.tool.call(commit('one') as any)

    const name = spawnsOf(w).map(r => r.argv[r.argv.indexOf('-n') + 1])[0]
    expect(name.length).toBeLessThanOrEqual(32)
    expect(name).toMatch(/^reviewer-review-pair-sand-[0-9a-f]{6}$/)
  })

  test('a lease held by another session queues the range instead of spawning', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.c] })
    beneath(on, w)
    const clock = stubs(on, {}, { [DECISION]: 'always', [LEASE]: { by: 'other-sess', at: NOW - 1000 } })
    const watch = watchSection(on)

    await $.tool.call(commit('one') as any)
    expect(spawnsOf(w)).toHaveLength(0)
    expect(w.sends).toHaveLength(0)
    expect(watch.latest().rows.some((r: any) => String(r.text).includes('in review'))).toBe(false)

    // The lease runs out: the next commit takes it, spawns, and sends the queued range merged with the new one.
    await clock.advance(91_000)
    await $.tool.call(commit('two') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.c}`])
  })

  test('an expired lease is taken over and the reviewer is spawned', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always', [LEASE]: { by: 'other-sess', at: NOW - 91_000 } })

    await $.tool.call(commit('one') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.sends).toHaveLength(1)
  })

  test('a failed spawn backs off for ten minutes and toasts once', async ($: any, on) => {
    const w = newWorld({ bgStdout: 'no backgrounded line here', heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    const clock = stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('one') as any)
    await $.tool.call(commit('two') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.toasts.filter(t => t.startsWith('review-pair: could not start'))).toHaveLength(1)

    await clock.advance(11 * 60_000)
    await $.tool.call(commit('three') as any)
    expect(spawnsOf(w)).toHaveLength(2)
  })

  test('not now lasts the session, never persists, and the range is dropped', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c] })
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('x') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    await ui.press({ plugin: 'review-pair', key: 'review-pair:not-now' } as any)
    await ui.unmount()
    expect(await statusOf($)).toContain('decision: not set')

    await $.tool.call(commit('y') as any)
    expect(w.sends).toHaveLength(0)
    expect(spawnsOf(w)).toHaveLength(0)
  })

  test('not now, then /review-pair on, then the next commit spawns and sends', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c] })
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('x') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    await ui.press({ plugin: 'review-pair', key: 'review-pair:not-now' } as any)
    await ui.unmount()

    await $.command.run({ command: 'review-pair', args: 'on' } as any)
    await $.tool.call(commit('y') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.b}..${H.c}`])
  })

  test('never stores the decision and later commits do nothing', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c] })
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('x') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    await ui.press({ plugin: 'review-pair', key: 'review-pair:never' } as any)
    await ui.unmount()
    expect(await statusOf($)).toContain('decision: never')

    await $.tool.call(commit('y') as any)
    expect(w.sends).toHaveLength(0)
    expect(spawnsOf(w)).toHaveLength(0)
  })

  test('a successful gh pr create sends the PR URL to the reviewer', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.a], bashText: 'https://github.com/hunter/app/pull/12' })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'gh pr create --title x' } as any)
    expect(w.sends.map(s => s.text)).toEqual(['[review-pair] PR https://github.com/hunter/app/pull/12'])
  })

  test('/review-pair status reports the record, and off stops the reviewer', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    const status = await $.command.run({ command: 'review-pair', args: 'status' } as any)
    expect(status.text).toContain('decision: always')
    expect(status.text).toContain(`reviewer: ${NAME} (bg, 2026-10-09)`)

    await $.command.run({ command: 'review-pair', args: 'off' } as any)
    expect(await statusOf($)).toContain('decision: never')
    expect(await statusOf($)).toContain('reviewer: none')
    expect(w.runs.find(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')?.argv).toEqual(['claude', 'stop', 'bg-1'])
  })

  test('stop keeps unreviewed commits queued for the next reviewer', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.c] })
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always', [FAILURE]: { at: NOW } })

    await $.tool.call(commit('one') as any)
    expect(spawnsOf(w)).toHaveLength(0)

    await $.command.run({ command: 'review-pair', args: 'stop' } as any)
    await $.tool.call(commit('two') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.c}`])
  })

  test('forget clears the lease and the spawn backoff, so the next commit spawns', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always', [LEASE]: { by: 'other', at: NOW }, [FAILURE]: { at: NOW } })

    await $.command.run({ command: 'review-pair', args: 'forget' } as any)
    await $.command.run({ command: 'review-pair', args: 'on' } as any)
    await $.tool.call(commit('x') as any)
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.sends).toHaveLength(1)
  })

  test('session end removes this builder and closes the reviewer when none remain', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    await $.session.end({ reason: 'prompt_input_exit', sessionId: SESSION_ID, resume: { id: SESSION_ID } } as any)
    expect(await statusOf($)).toContain('reviewer: none')
    expect(w.runs.find(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')?.argv).toEqual(['claude', 'stop', 'bg-1'])
  })

  test('session end keeps the reviewer when another live builder remains', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always', [`builders:${COMMON}:other-sess`]: { at: NOW } })

    await $.tool.call(commit('x') as any)
    await $.session.end({ reason: 'prompt_input_exit', sessionId: SESSION_ID, resume: { id: SESSION_ID } } as any)
    expect(w.runs.some(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')).toBe(false)
  })

  test('a /clear session end does not tear the reviewer down', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, { [DECISION]: 'always' })

    await $.tool.call(commit('x') as any)
    await $.session.end({ reason: 'clear', sessionId: SESSION_ID, resume: { id: SESSION_ID } } as any)
    expect(w.runs.some(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')).toBe(false)
    expect(await statusOf($)).toContain(`reviewer: ${NAME} (bg, 2026-10-09)`)
  })

  test('cd into another repo yields no bogus range; the probes run in the repo top', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.a] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'cd /work/other && git commit -m "x"' } as any)
    expect(w.sends).toHaveLength(0)
    const probes = w.runs.filter(r => r.argv[0] === 'git' && r.argv[1] === 'rev-parse' && r.argv[2] === 'HEAD')
    expect(probes.length).toBeGreaterThan(0)
    expect(probes.every(r => r.cwd === TOP)).toBe(true)
  })

  test('checking out an older commit yields no range', async ($: any, on) => {
    const w = newWorld({ heads: [H.b, H.a], ancestors: [[H.a, H.b]] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: `git checkout ${H.a}` } as any)
    expect(w.sends).toHaveLength(0)
  })

  test('a switch to another branch yields no range', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b], branches: ['main', 'feature'] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git switch feature' } as any)
    expect(w.sends).toHaveLength(0)
  })

  test('a chained checkout -b and commit reviews parent..after once, and the next git call does not resend', async ($: any, on) => {
    const w = newWorld({
      heads: [H.a, H.b],
      branches: ['main', 'feat'],
      ancestors: [[H.a, H.b]],
      logLines: [`${H.b} ${NOW_S}`],
      parents: { [H.b]: H.a },
    })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git checkout -b feat && git commit -m x' } as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`])

    await $.tool.call({ tool: 'Bash', command: 'git status' } as any)
    expect(w.sends).toHaveLength(1)
  })

  test('a plain checkout of an ahead branch sends nothing when no commit was made during the call', async ($: any, on) => {
    const w = newWorld({
      heads: [H.a, H.b],
      branches: ['main', 'feat'],
      ancestors: [[H.a, H.b]],
      logLines: [`${H.b} ${NOW_S - 3600}`],
      parents: { [H.b]: H.a },
    })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git checkout feat' } as any)
    expect(w.sends).toHaveLength(0)
  })

  test('a checkout of an ahead branch plus a commit in the same call sends only the new commit', async ($: any, on) => {
    const w = newWorld({
      heads: [H.a, H.c],
      branches: ['main', 'feat'],
      ancestors: [[H.a, H.c]],
      logLines: [`${H.c} ${NOW_S}`, `${H.b} ${NOW_S - 3600}`],
      parents: { [H.c]: H.b },
    })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git checkout feat && git commit -m x' } as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.b}..${H.c}`])
  })

  test('a failed chained call still detects the commit', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b], bashError: true })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git commit -m x && git push' } as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`])
  })

  test('a commit made in the background is picked up by the next git call', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.a, H.b, H.b], ancestors: [[H.a, H.b]] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call({ tool: 'Bash', command: 'git commit -m x &' } as any)
    expect(w.sends).toHaveLength(0)
    await $.tool.call({ tool: 'Bash', command: 'git status' } as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`])
  })

  test('a stale outstanding range resends merged with the queue and the new range', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    const clock = stubs(on, {}, ALWAYS)

    await $.tool.call(commit('1') as any)
    await $.tool.call(commit('2') as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`])

    // The next day the reviewer is replaced by another background session; the range sent to the old one is dead.
    await clock.advance(24 * 60 * 60_000)
    w.bgStdout = `backgrounded · bg-2 · ${NAME}\n`
    await $.tool.call(commit('3') as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([
      `[review-pair] REVIEW ${H.a}..${H.b}`,
      `[review-pair] REVIEW ${H.a}..${H.d}`,
    ])
    expect(w.runs.find(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')?.argv).toEqual(['claude', 'stop', 'bg-1'])
  })

  test('an outstanding range older than fifteen minutes is resent merged', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c] })
    beneath(on, w)
    const clock = stubs(on, {}, ALWAYS)

    await $.tool.call(commit('1') as any)
    await clock.advance(16 * 60_000)
    await $.tool.call(commit('2') as any)
    expect(w.sends.map(s => s.text.split('\n')[0])).toEqual([
      `[review-pair] REVIEW ${H.a}..${H.b}`,
      `[review-pair] REVIEW ${H.a}..${H.c}`,
    ])
  })
})
