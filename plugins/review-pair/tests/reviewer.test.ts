import { describe, expect, test } from 'claude-code/testing'

import { COMMON, DECISION, beneath, newWorld, spawnsOf, stubs } from './world'

const READER = { REVIEW_PAIR_ROLE: 'reviewer', REVIEW_PAIR_REPO: COMMON }

describe('review-pair reviewer role', () => {
  test('edit tools are denied', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, READER)

    for (const tool of ['Edit', 'Write', 'NotebookEdit']) {
      const ran = await $.tool.call({ tool, file_path: '/work/app/a.ts', old_string: 'a', new_string: 'b' } as any)
      expect(ran.deny).toContain('read-only')
    }
  })

  test('the reviewer role runs no builder behavior', async ($: any, on) => {
    const w = newWorld({ heads: ['a1a1a1a1', 'b2b2b2b2'] })
    beneath(on, w)
    stubs(on, READER, { [DECISION]: 'always' })

    await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"' } as any)
    expect(spawnsOf(w)).toHaveLength(0)
    expect(w.runs.some(r => r.argv[0] === 'herdr')).toBe(false)
    expect(w.sends).toHaveLength(0)
  })

  test('the reviewer system prompt names the repo, the protocol, and the no-edit rule', async ($: any, on) => {
    const w = newWorld()
    beneath(on, w)
    stubs(on, READER)
    on('prompt.compose', (() => ({ sections: [] })) as any)

    const composed: { sections: { id: string; text: string; scope: string }[] } = await $.prompt.compose({ model: 'claude-haiku-5-5', promptModel: 'claude-haiku-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
    const section = composed.sections.find(s => s.id === 'review-pair:reviewer')
    expect(section?.scope).toBe('session')
    expect(section?.text).toContain(COMMON)
    expect(section?.text).toContain('[review-pair] BLOCKERS <range>')
    expect(section?.text).toContain('gh pr comment')
    expect(section?.text).toContain('never edit files')
    expect(section?.text).toContain('never change git or GitHub state')
  })
})
