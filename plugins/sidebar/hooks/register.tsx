import { update } from 'claude-code'
import type { Elements, EngineInterface, Register, UiPane } from 'claude-code'

import type { SidebarRow, SidebarSection, SidebarTone } from '../types'

const PANE = 'sidebar'
const TAB = 'sidebar-'
const TITLE = 'Sidebar'
const DEFAULT_ORDER = 'checklist,questions,processes'
const ANSWER_PLACEHOLDER = 'type an answer…'

const THEME = {
  accent: '#60A5FA',
  done: '#4ADE80',
  track: '#2A3F66',
  activeRow: '#1E3A8A',
  activeText: '#FFFFFF',
  activeMuted: '#BFD4FF',
  warn: '#FBBF24',
}
const TONE: Record<SidebarTone, string> = {
  accent: THEME.accent,
  done: THEME.done,
  warn: THEME.warn,
  error: 'error',
  muted: 'inactive',
  text: 'text',
}
const TONES = Object.keys(TONE)
const ITEM_STATES = ['normal', 'active', 'done']

const sections = { plugin: 'sidebar', key: 'sections' } as const
const seen = { plugin: 'sidebar', key: 'seen' } as const
const seenAttention = { plugin: 'sidebar', key: 'seenAttention' } as const
const hasHinted = { plugin: 'sidebar', key: 'hasHinted' } as const

type Layout = 'tabs' | 'stacked'

type Kit = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'> & {
  Input: Elements['terminal']['Input'] | undefined
}

type Entry = { name: string; section: SidebarSection | undefined }

// The sidebar only draws: each widget hooks ui.press / ui.input on its own keys.
const noop = (): void => undefined

export const register: Register = (on, options) => {
  const order = parseOrder(typeof options.order === 'string' ? options.order : DEFAULT_ORDER)
  const layout: Layout = options.layout === 'stacked' ? 'stacked' : 'tabs'

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sidebar',
      description: 'Open the sidebar (close hides it)',
      argumentHint: '[close]',
    })
    // A layout change reloads the module: swap the old layout's panes for this one's.
    await swapLayout($, layout, order).catch(noop)

    return next(e)
  })

  on('command.run', { command: 'sidebar' }, async ($, e) => {
    if (e.args.trim() === 'close') {
      for (const pane of await ownPanes($)) await $.ui.close({ id: pane.id })
      return { text: 'Sidebar closed.' }
    }
    if (layout === 'stacked') {
      await $.ui.open({ id: PANE, title: TITLE })
      return { text: 'Sidebar opened.' }
    }
    const shown = (await entries($, order)).filter(isShownEntry)
    if (shown.length === 0) return { text: 'Sidebar: nothing going on.' }
    for (const entry of shown) {
      await $.ui.open({ id: tabId(entry.name), title: tabTitle(entry.name, entry.section) })
    }

    return { text: 'Sidebar opened.' }
  })

  on('state.set', async ($, e, next) => {
    const ran = await next(e)
    const write = e as unknown as { plugin: string; key: string; value: unknown }
    // A write that lost its ifVersion race changed nothing, so the winner's value must stay.
    const landed = ran.value?.isSet === true
    if (landed && write.plugin !== 'sidebar' && write.key === 'section' && isVersionOne(write.value)) {
      await mirror($, layout, write.plugin, write.value as SidebarSection)
    }

    return ran
  }).catch(($, e, next) => next(e))

  // Draws the stacked pane and every widget's tab, whichever layout is set, so a
  // pane left up by the other layout still draws until it is closed.
  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    const isStacked = e.requestId === PANE
    if (!isStacked && !e.requestId.startsWith(TAB)) return next(e)

    const table = $.ui.resolve(e)
    const kit: Kit = {
      Box: table.Box,
      Text: table.Text,
      Button: table.Button,
      // Mobile draws no fields yet, so an input row shows as dim text there.
      Input: e.surface === 'mobile' ? undefined : $.ui.resolve(e).Input,
    }
    const { Box, Text } = kit
    const all = await entries($, order)
    const visible = isStacked
      ? all.filter(isShownEntry)
      : all.filter(entry => tabId(entry.name) === e.requestId && isShownEntry(entry))
    const inner = Math.max(12, e.props.bodyColumns - 4)

    if (visible.length === 0) {
      return (
        <Box paddingX={1}>
          <Text dimColor>Nothing going on.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {visible.map((entry, index) => (
          <Box key={entry.name} flexDirection="column" {...(index > 0 ? { marginTop: 1 } : {})}>
            {drawEntry(kit, entry, inner)}
          </Box>
        ))}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}

async function entries($: EngineInterface, order: string[]): Promise<Entry[]> {
  const { value: names = [] } = await $.state.get(seen)
  const found: Entry[] = []
  for (const name of drawOrder(order, names)) {
    const { value } = await $.state.get({ ...sections, id: name })
    found.push({ name, section: isSection(value) ? value : undefined })
  }

  return found
}

async function mirror(
  $: EngineInterface,
  layout: Layout,
  name: string,
  section: SidebarSection,
): Promise<void> {
  const member = { ...sections, id: name }
  const { value: before } = await $.state.get(member)
  await $.state.set(member, section)
  await update($, seen, (names = []) => (names.includes(name) ? names : [...names, name]))
  const rose = await noteAttention($, name, section)

  if (layout === 'stacked') {
    if (rose) await reveal($, PANE, TITLE, false)
    return
  }

  const id = tabId(name)
  const pane = (await ownPanes($)).find(open => open.id === id)
  if (!isShown(section)) {
    if (pane !== undefined) await $.ui.close({ id }).catch(noop)
    return
  }
  const title = tabTitle(name, isSection(section) ? section : undefined)
  const wasShown = before !== undefined && isShown(before)
  if (rose || !wasShown) {
    await reveal($, id, title, rose)
    return
  }
  // Retitle only a tab that is up: a tab the person closed stays closed.
  if (pane !== undefined && pane.title !== title) {
    await $.ui.open({ id, title }).catch(noop)
  }
}

// Records the widget's attention and says whether it rose. A drop means the widget
// started its count over (a /clear); only a rise asks to be seen.
async function noteAttention($: EngineInterface, name: string, section: SidebarSection): Promise<boolean> {
  const attention = section.attention
  if (typeof attention !== 'number' || !Number.isFinite(attention)) return false
  const member = { ...seenAttention, id: name }
  const { value: last = 0 } = await $.state.get(member)
  if (attention === last) return false
  await $.state.set(member, attention)

  return attention > last
}

async function reveal($: EngineInterface, id: string, title: string, focus: boolean): Promise<void> {
  const opened = await $.ui
    .open({ id, title, ...(focus ? { focus: true as const } : {}) })
    .catch(() => undefined)
  if (opened === undefined || opened.isPlaced) return
  const { value: isHinted = false } = await $.state.get(hasHinted)
  if (isHinted) return
  await $.state.set(hasHinted, true)
  $.ui.toast('Sidebar: run /sidebar to open')
}

async function swapLayout($: EngineInterface, layout: Layout, order: string[]): Promise<void> {
  const stale = (await ownPanes($)).filter(pane => (layout === 'tabs') === (pane.id === PANE))
  if (stale.length === 0) return
  for (const pane of stale) await $.ui.close({ id: pane.id })
  // The sidebar was up in the old layout, so put it up in the new one.
  if (layout === 'stacked') {
    await $.ui.open({ id: PANE, title: TITLE })
    return
  }
  for (const entry of (await entries($, order)).filter(isShownEntry)) {
    await $.ui.open({ id: tabId(entry.name), title: tabTitle(entry.name, entry.section) })
  }
}

// A surface with no pane record lists none, so a write still opens what it should.
async function ownPanes($: EngineInterface): Promise<UiPane[]> {
  const panes = await $.ui.panes().catch((): readonly UiPane[] => [])
  return panes.filter(pane => pane.id === PANE || pane.id.startsWith(TAB))
}

function tabId(name: string): string {
  return `${TAB}${name.replace(/[^A-Za-z0-9_-]/g, '_')}`.slice(0, 64)
}

function tabTitle(name: string, section: SidebarSection | undefined): string {
  const label = name.charAt(0).toUpperCase() + name.slice(1)
  const badge = section?.badge ? ` ${section.badge}` : ''
  // A control character in a title is refused, so a badge never carries one.
  return `${label}${badge}`.replace(/[\u0000-\u001f\u007f]/g, ' ')
}

// A bad section still shows (as its error line); only a good one can be empty.
function isShown(value: unknown): boolean {
  return !isSection(value) || !value.isEmpty
}

function isShownEntry(entry: Entry): boolean {
  return entry.section === undefined || !entry.section.isEmpty
}

function drawEntry(kit: Kit, entry: Entry, inner: number) {
  const { Box, Text } = kit
  if (entry.section === undefined) {
    return (
      <Box paddingX={1}>
        <Text dimColor>{`${entry.name}: bad section`}</Text>
      </Box>
    )
  }

  return drawSection(kit, entry.section, inner)
}

function drawSection(kit: Kit, section: SidebarSection, inner: number) {
  const { Box, Text } = kit
  const color = TONE[section.tone ?? 'accent']
  const lead = section.rows.findIndex(row => row.kind !== 'progress')
  const headed = lead === -1 ? section.rows : section.rows.slice(0, lead)
  const rest = lead === -1 ? [] : section.rows.slice(lead)
  const numberWidth = Math.max(
    0,
    ...section.rows.map(row =>
      row.kind === 'item' && row.number !== undefined ? String(row.number).length : 0,
    ),
  )

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
        <Box justifyContent="space-between">
          <Box flexShrink={1}>
            <Text bold color="text" wrap="truncate-end">
              {section.title}
            </Text>
          </Box>
          {section.badge ? <Text bold color={color}>{` ${section.badge}`}</Text> : null}
        </Box>
        {headed.map((row, index) =>
          row.kind === 'progress' ? (
            <Box key={`progress-${index}`}>{drawProgress(kit, row, color, inner)}</Box>
          ) : null,
        )}
      </Box>
      {rest.map((row, index) => {
        const previous = index === 0 ? undefined : rest[index - 1]
        const isSpaced =
          index === 0 ||
          row.kind === 'divider' ||
          (row.kind === 'text' && previous?.kind !== 'text' && previous?.kind !== 'divider')
        return (
          <Box key={`row-${index}`} flexDirection="column" {...(isSpaced ? { marginTop: 1 } : {})}>
            {drawRow(kit, row, color, inner, numberWidth)}
          </Box>
        )
      })}
    </Box>
  )
}

function drawRow(kit: Kit, row: SidebarRow, color: string, inner: number, numberWidth: number) {
  const { Box, Text, Button, Input } = kit

  if (row.kind === 'progress') {
    return <Box paddingX={1}>{drawProgress(kit, row, color, inner)}</Box>
  }
  if (row.kind === 'divider') {
    return (
      <Box paddingX={1}>
        <Text color={THEME.accent}>{rule(row.label, inner)}</Text>
      </Box>
    )
  }
  if (row.kind === 'text') {
    const tone = row.tone ?? 'text'
    return (
      <Box paddingX={1}>
        <Text
          bold={row.bold === true}
          {...(tone === 'muted' ? { dimColor: true } : { color: TONE[tone] })}
        >
          {row.text}
        </Text>
      </Box>
    )
  }
  if (row.kind === 'button') {
    return (
      <Box paddingX={1}>
        <Button
          key={row.key}
          label={row.label}
          {...(row.primary ? { variant: 'primary' as const } : {})}
          onPress={noop}
        />
      </Box>
    )
  }
  if (row.kind === 'input') {
    // Lines up under the item text: past the icon column, and the number column when shown.
    const indent = numberWidth > 0 ? numberWidth + 4 : 2
    return (
      <Box flexDirection="column" paddingX={1}>
        {Input === undefined ? (
          <Text dimColor>{row.placeholder ?? row.key}</Text>
        ) : (
          <Box paddingLeft={indent}>
            <Box flexGrow={1} borderStyle="round" borderColor={THEME.track} paddingX={1}>
              <Input
                key={row.key}
                label="›"
                placeholder={row.placeholder ?? ANSWER_PLACEHOLDER}
                submitLabel="send"
                onSubmit={noop}
              />
            </Box>
          </Box>
        )}
        {row.hint ? (
          <Box paddingLeft={Input === undefined ? 0 : indent + 2}>
            <Text dimColor>{row.hint}</Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  const isDone = row.state === 'done'
  const isActive = row.state === 'active'
  const hasNumber = row.number !== undefined
  const muted = isActive ? THEME.activeMuted : 'inactive'
  return (
    <Box
      flexDirection="column"
      paddingX={1}
      {...(isActive ? { backgroundColor: THEME.activeRow } : {})}
    >
      <Box>
        <Text color={isActive ? THEME.activeText : TONE[row.tone ?? 'text']}>{`${row.icon} `}</Text>
        {hasNumber ? (
          <Text color={muted}>{`${String(row.number).padStart(numberWidth)}  `}</Text>
        ) : null}
        <Box flexShrink={1} {...(row.action ? { flexGrow: 1 } : {})}>
          <Text
            strikethrough={isDone}
            dimColor={isDone}
            bold={isActive}
            color={isActive ? THEME.activeText : 'text'}
          >
            {row.text}
          </Text>
        </Box>
        {row.action ? (
          <Box marginLeft={1}>
            <Button key={row.action.key} plain label={row.action.label} onPress={noop} />
          </Box>
        ) : null}
      </Box>
      {row.sub ? (
        <Box paddingLeft={hasNumber ? numberWidth + 4 : 2}>
          <Text color={muted}>{'└ '}</Text>
          {row.sub.icon ? (
            <Text color={TONE[row.sub.tone ?? 'muted']}>{`${row.sub.icon} `}</Text>
          ) : null}
          <Box flexShrink={1}>
            <Text color={muted}>{row.sub.text}</Text>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

function drawProgress(
  kit: Kit,
  row: Extract<SidebarRow, { kind: 'progress' }>,
  color: string,
  inner: number,
) {
  const { Box, Text } = kit
  const tally = row.label ? ` ${row.label}` : ''
  const bar = progressBar(row.fraction, Math.max(4, inner - tally.length))

  return (
    <Box>
      <Text color={color}>{bar.filled}</Text>
      <Text color={THEME.track}>{bar.empty}</Text>
      {tally ? <Text dimColor>{tally}</Text> : null}
    </Box>
  )
}

function parseOrder(text: string): string[] {
  return text
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
}

function drawOrder(order: string[], names: string[]): string[] {
  return [...order.filter(name => names.includes(name)), ...names.filter(name => !order.includes(name))]
}

function isVersionOne(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { version?: unknown }).version === 1
}

function isSection(value: unknown): value is SidebarSection {
  if (!isVersionOne(value)) return false
  const section = value as Record<string, unknown>
  return (
    typeof section.title === 'string' &&
    isOptional(section.badge, 'string') &&
    isTone(section.tone) &&
    typeof section.isEmpty === 'boolean' &&
    typeof section.attention === 'number' &&
    Array.isArray(section.rows) &&
    section.rows.every(isRow)
  )
}

function isRow(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  switch (row.kind) {
    case 'progress':
      return typeof row.fraction === 'number' && isOptional(row.label, 'string')
    case 'item':
      return (
        typeof row.icon === 'string' &&
        typeof row.text === 'string' &&
        isTone(row.tone) &&
        isOptional(row.number, 'number') &&
        (row.state === undefined || ITEM_STATES.includes(row.state as string)) &&
        (row.sub === undefined || isSub(row.sub)) &&
        (row.action === undefined || isAction(row.action))
      )
    case 'input':
      return (
        typeof row.key === 'string' &&
        isOptional(row.placeholder, 'string') &&
        isOptional(row.hint, 'string')
      )
    case 'button':
      return (
        typeof row.key === 'string' &&
        typeof row.label === 'string' &&
        isOptional(row.primary, 'boolean')
      )
    case 'text':
      return typeof row.text === 'string' && isTone(row.tone) && isOptional(row.bold, 'boolean')
    case 'divider':
      return typeof row.label === 'string'
    default:
      return false
  }
}

function isSub(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const sub = value as Record<string, unknown>
  return typeof sub.text === 'string' && isOptional(sub.icon, 'string') && isTone(sub.tone)
}

function isAction(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const action = value as Record<string, unknown>
  return typeof action.key === 'string' && typeof action.label === 'string'
}

function isTone(value: unknown): boolean {
  return value === undefined || TONES.includes(value as string)
}

function isOptional(value: unknown, type: 'string' | 'number' | 'boolean'): boolean {
  return value === undefined || typeof value === type
}

function progressBar(fraction: number, width: number): { filled: string; empty: string } {
  const halves = Math.round(Math.min(1, Math.max(0, fraction)) * width * 2)
  const full = Math.floor(halves / 2)
  const hasHalf = halves % 2 === 1

  return {
    filled: '━'.repeat(full) + (hasHalf ? '╸' : ''),
    empty: '─'.repeat(width - full - (hasHalf ? 1 : 0)),
  }
}

function rule(label: string, width: number): string {
  return `── ${label} ${'─'.repeat(Math.max(0, width - label.length - 4))}`
}
