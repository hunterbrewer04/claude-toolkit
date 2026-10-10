import { describe, expect, test } from 'claude-code/testing'

import { BAND_PROPS, COMMON, DECISION, H, NAME, NAME_OTHER_REPO, RECORD, beneath, newWorld, spawnsOf, stubs, watchSection } from './world'

const ALWAYS = { [DECISION]: 'always', [RECORD]: { name: NAME, day: '2026-10-09', mode: 'bg', bgId: 'bg-1' } }
const commit = (msg: string): any => ({ tool: 'Bash', command: `git commit -m "${msg}"` })

function peer(text: string, extra: Record<string, unknown> = {}): any {
  return { origin: { kind: 'peer' }, text, ...extra }
}

function sentHeads(w: { sends: { text: string }[] }): string[] {
  return w.sends.map(s => s.text.split('\n')[0] as string)
}

describe('review-pair receive routing', () => {
  test('BLOCKERS reaches the model; NITS and CLEAN are consumed', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('one') as any)
    const blockers = await $.session.receive(peer(`[review-pair] BLOCKERS ${H.a}..${H.b}\napp.ts:4 - null deref - guard it`) as any)
    expect(blockers.consumed).toBeUndefined()
    expect(w.toasts).toContain('review-pair: blockers found')

    await $.tool.call(commit('two') as any)
    const nits = await $.session.receive(peer(`[review-pair] NITS ${H.b}..${H.c}\nname.ts:2 - unclear name - rename it`) as any)
    expect(nits.consumed).toBeDefined()

    await $.tool.call(commit('three') as any)
    const clean = await $.session.receive(peer(`[review-pair] CLEAN ${H.c}..${H.d}`) as any)
    expect(clean.consumed).toBeDefined()
  })

  test('the sidebar section carries the reviews and the latest nits', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)
    const watch = watchSection(on)

    await $.tool.call(commit('one') as any)
    await $.session.receive(peer(`[review-pair] NITS ${H.a}..${H.b}\napp.ts:9 - long line - wrap it`) as any)

    const section = watch.latest()
    expect(section.title).toBe('Review')
    expect(section.isEmpty).toBe(false)
    expect(section.rows).toContainEqual(expect.objectContaining({ text: `app ${H.a}..${H.b} NITS` }))
    expect(section.rows).toContainEqual(expect.objectContaining({ text: 'app.ts:9 - long line - wrap it' }))
  })

  test('the third consecutive BLOCKERS round is consumed; the badge counts repos and the findings show', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)
    const watch = watchSection(on)

    await $.tool.call(commit('1') as any)
    expect((await $.session.receive(peer(`[review-pair] BLOCKERS ${H.a}..${H.b}\nx.ts:1 - bug - fix`) as any)).consumed).toBeUndefined()

    await $.tool.call(commit('2') as any)
    expect((await $.session.receive(peer(`[review-pair] BLOCKERS ${H.b}..${H.c}\nx.ts:1 - bug - fix`) as any)).consumed).toBeUndefined()

    await $.tool.call(commit('3') as any)
    const third = await $.session.receive(peer(`[review-pair] BLOCKERS ${H.c}..${H.d}\ny.ts:7 - still broken - fix it`) as any)
    expect(third.consumed).toBe('review-pair round cap')
    expect(w.toasts).toContain('review-pair: blockers persist after 2 rounds, needs you')

    const section = watch.latest()
    expect(section.tone).toBe('error')
    expect(section.badge).toBe('1 blocker')
    expect(section.rows).toContainEqual(expect.objectContaining({ text: 'app: needs you', tone: 'error' }))
    expect(section.rows).toContainEqual(expect.objectContaining({ text: 'y.ts:7 - still broken - fix it', tone: 'error' }))
  })

  test('a NITS or CLEAN reply resets the blocker rounds', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d, H.d, H.e] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('1') as any)
    await $.session.receive(peer(`[review-pair] BLOCKERS ${H.a}..${H.b}\nx.ts:1 - bug - fix`) as any)
    await $.tool.call(commit('2') as any)
    await $.session.receive(peer(`[review-pair] CLEAN ${H.b}..${H.c}`) as any)

    await $.tool.call(commit('3') as any)
    expect((await $.session.receive(peer(`[review-pair] BLOCKERS ${H.c}..${H.d}\nx.ts:1 - bug - fix`) as any)).consumed).toBeUndefined()
    await $.tool.call(commit('4') as any)
    expect((await $.session.receive(peer(`[review-pair] BLOCKERS ${H.d}..${H.e}\nx.ts:1 - bug - fix`) as any)).consumed).toBeUndefined()
  })

  test('messages that are not review-pair replies pass through untouched', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    const plain = await $.session.receive(peer('hello there') as any)
    expect(plain.consumed).toBeUndefined()
    expect(plain.text).toBe('hello there')
  })

  test('a framed or markdown-wrapped header is still read', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('one') as any)
    const framed = await $.session.receive({
      origin: { kind: 'peer-send-message' },
      text: `**\`[review-pair] NITS ${H.a}..${H.b}\`** (from reviewer)\napp.ts:3 - naming - rename`,
    } as any)
    expect(framed.consumed).toBe('review-pair nits')
  })

  test('a local peer reply wrapped in a cross-session-message tag is read (shape seen live)', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('one') as any)
    const wrapped = await $.session.receive({
      origin: { kind: 'peer' },
      text: `<cross-session-message from="uds:/tmp/cc-socks/1.sock" from-name="reviewer-app-abc123" from-mode="prompting">\n[review-pair] CLEAN ${H.a}..${H.b}\n</cross-session-message>`,
    } as any)
    expect(wrapped.consumed).toBeDefined()
  })

  test('a reply from a subagent is ignored even when it carries the header', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)
    const watch = watchSection(on)

    await $.tool.call(commit('one') as any)
    const fromAgent = await $.session.receive(peer(`[review-pair] CLEAN ${H.a}..${H.b}`, { agentId: 'agent-1' }) as any)
    expect(fromAgent.consumed).toBeUndefined()
    expect(watch.latest().rows).toContainEqual(expect.objectContaining({ text: `app ${H.a}..${H.b} in review` }))
  })

  test('a tagged delivery writes one debug line with its origin and the first 80 characters', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('one') as any)
    await $.session.receive(peer(`[review-pair] CLEAN ${H.a}..${H.b}`) as any)
    const lines = w.debugLogs.filter(line => line.startsWith('debug|') && line.includes('[review-pair]'))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('from peer')
  })

  test('a tagged reply whose range matches nothing passes through and leaves the outstanding range alone', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)
    const watch = watchSection(on)

    await $.tool.call(commit('one') as any)
    const stray = await $.session.receive(peer('[review-pair] CLEAN 0f0f0f0f..1e1e1e1e') as any)
    expect(stray.consumed).toBeUndefined()
    expect(stray.text).toBe('[review-pair] CLEAN 0f0f0f0f..1e1e1e1e')
    expect(watch.latest().rows).toContainEqual(expect.objectContaining({ text: `app ${H.a}..${H.b} in review` }))
  })

  test('a reply may abbreviate both SHAs to seven characters or more', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('one') as any)
    const short = await $.session.receive(peer(`[review-pair] CLEAN ${H.a.slice(0, 7)}..${H.b.slice(0, 9)}`) as any)
    expect(short.consumed).toBeDefined()
  })

  test('while a review is outstanding, further ranges merge into one send', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('1') as any)
    await $.tool.call(commit('2') as any)
    await $.tool.call(commit('3') as any)
    expect(sentHeads(w)).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`])

    await $.session.receive(peer(`[review-pair] CLEAN ${H.a}..${H.b}`) as any)
    expect(sentHeads(w)).toEqual([`[review-pair] REVIEW ${H.a}..${H.b}`, `[review-pair] REVIEW ${H.b}..${H.d}`])
  })

  test('a failed send retries on a new reviewer, and the queued range is not dropped', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b, H.b, H.c, H.c, H.d] })
    beneath(on, w)
    stubs(on, {}, ALWAYS)

    await $.tool.call(commit('1') as any)
    await $.tool.call(commit('2') as any)
    await $.tool.call(commit('3') as any)

    // The reply frees the queue, but the reviewer no longer takes messages: the send fails once.
    w.failSends = 1
    w.bgStdout = `backgrounded · bg-2 · ${NAME}\n`
    await $.session.receive(peer(`[review-pair] CLEAN ${H.a}..${H.b}`) as any)

    expect(sentHeads(w)).toEqual([
      `[review-pair] REVIEW ${H.a}..${H.b}`,
      `[review-pair] REVIEW ${H.b}..${H.d}`,
      `[review-pair] REVIEW ${H.b}..${H.d}`,
    ])
    expect(spawnsOf(w)).toHaveLength(1)
    expect(w.runs.find(r => r.argv[0] === 'claude' && r.argv[1] === 'stop')?.argv).toEqual(['claude', 'stop', 'bg-1'])
  })

  test('a CLEAN in one repo clears only that repo nits', async ($: any, on) => {
    const w = newWorld({ heads: [H.a, H.b] })
    beneath(on, w)
    stubs(on, {}, { ...ALWAYS, [`decision:/other/app/.git`]: 'always' })
    const watch = watchSection(on)

    await $.tool.call(commit('repo a') as any)
    await $.session.receive(peer(`[review-pair] NITS ${H.a}..${H.b}\na.ts:1 - a nit - fix`) as any)

    w.top = '/other/app'
    w.common = '/other/app/.git'
    w.heads = [H.c, H.d]
    await $.tool.call(commit('repo b') as any)
    await $.session.receive(peer(`[review-pair] NITS ${H.c}..${H.d}\nb.ts:1 - b nit - fix`) as any)
    expect(spawnsOf(w).map(r => r.argv[r.argv.indexOf('-n') + 1])).toEqual([NAME_OTHER_REPO])

    // Back in repo a, a clean review clears only its own nits.
    w.top = '/work/app'
    w.common = COMMON
    w.heads = [H.b, H.e]
    await $.tool.call(commit('repo a again') as any)
    await $.session.receive(peer(`[review-pair] CLEAN ${H.b}..${H.e}`) as any)

    const texts = (watch.latest().rows as { text?: string }[]).map(row => row.text)
    expect(texts).not.toContain('a.ts:1 - a nit - fix')
    expect(texts).toContain('b.ts:1 - b nit - fix')
  })

  test('band: a survey on the prompt holds the band, so the consent band is not drawn', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('1') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, hasSurvey: true } } as any)
    expect(await ui.find({ type: 'Button', key: 'review-pair:always' })).toBeUndefined()
    await ui.unmount()
  })

  test('the band shows for an unseen repo and a press of always starts the review', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on)

    await $.tool.call(commit('1') as any)
    const ui = await $.ui.mount({ plugin: 'review-pair', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS } as any)
    await ui.press({ plugin: 'review-pair', key: 'review-pair:always' } as any)
    await ui.unmount()
    expect(w.sends).toHaveLength(1)
  })
})
