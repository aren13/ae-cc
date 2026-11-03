import { atom, memberOf, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { bodyPieces, collapsePrompt, parseReply, plain } from './parse'
import type { Run } from './parse'

// Darker, less saturated green and an off-white text: lower glare for astigmatism than white on #3B6637.
const BUBBLE_GREEN = '#2F4A2C'
const BUBBLE_TEXT = '#E6E4DC'

// Reply prose in the same off-white family, softer than the app's #EFEFEF on #191919.
const REPLY_TEXT = '#D6D4CC'
const CODE_BG = '#2A2A28'

// Past this many characters the bubble stops growing and wraps at 70% of the row.
const BUBBLE_WRAP_AT = 60

// Which long prompts the person opened, one member per transcript row.
const isPromptOpen = atom({ plugin: 'reply-style', key: 'isPromptOpen' } as const, false)

// The desktop app stamps the person's prompts as `sdk`; the terminal as `composer`.
const PROMPT_KINDS = new Set(['composer', 'sdk', 'bridge'])

// Prompts sent with images or documents, by their text. Their row props carry no attachments and the
// desktop draws those only in its own row, so such a prompt keeps the engine's drawing.
const sentWithMedia = new Set<string>()
let history: Promise<void> | undefined

const isMedia = (b: { type: string }) => b.type === 'image' || b.type === 'document'

const hasMedia = async ($: EngineInterface, text: string) => {
  history ??= $.session
    .messages({ as: 'api' })
    .then(ms => {
      for (const m of ms) {
        if (m.role !== 'user' || !m.content.some(isMedia)) continue
        for (const b of m.content) {
          if (b.type === 'text' && typeof b.text === 'string') sentWithMedia.add(b.text.trim())
        }
      }
    })
    .catch(() => undefined)
  await history
  return sentWithMedia.has(text.trim())
}

export const register: Register = on => {
  on('prompt.submit', ($, e, next) => {
    if (e.attachments?.length) sentWithMedia.add(e.text.trim())
    // Read the history again on the next draw, so a prompt stored with media is found either way.
    history = undefined
    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.isSummary) {
      return next(e)
    }

    const blocks = parseReply(e.props.text)
    const { Box, Text, Markdown, Link } = $.ui.resolve(e)

    const runs = (rs: Run[]) =>
      rs.map(r =>
        r.href !== undefined ? (
          <Link href={r.href}>{r.text}</Link>
        ) : r.code ? (
          <Text mono backgroundColor={CODE_BG}>
            {r.text}
          </Text>
        ) : r.bold ? (
          <Text weight="semibold">{r.text}</Text>
        ) : (
          r.text
        ),
      )

    // Prose and flat lists draw as soft Text; tables, code and links keep the Markdown element.
    const body = (md: string, key: string) => (
      <Box key={key} flexDirection="column" gap={1}>
        {bodyPieces(md).map((p, j) => {
          switch (p.kind) {
            case 'prose':
              return (
                <Text key={`p${j}`} color={REPLY_TEXT} weight="medium">
                  {runs(p.runs)}
                </Text>
              )
            case 'list':
              return (
                <Box key={`p${j}`} flexDirection="column">
                  {p.items.map((it, k) => (
                    <Box key={`i${k}`} flexDirection="row" alignItems="flex-start" gap={1}>
                      <Text color={REPLY_TEXT}>{it.marker}</Text>
                      <Box flexShrink={1}>
                        {it.runs === null ? (
                          <Markdown text={it.text} />
                        ) : (
                          <Text color={REPLY_TEXT} weight="medium">
                            {runs(it.runs)}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )
            case 'markdown':
              return <Markdown key={`p${j}`} text={p.text} />
          }
        })}
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {blocks.map((b, i) => {
          switch (b.kind) {
            case 'verdict':
              return (
                <Box key={`b${i}`} borderStyle="bold" borderColor={b.label === 'Decision' ? 'permission' : 'claude'} paddingX={1}>
                  <Text>
                    <Text bold color={b.label === 'Decision' ? 'permission' : 'claude'}>
                      {b.label.toUpperCase()}
                    </Text>
                    <Text color={REPLY_TEXT} weight="medium">{`  ${plain(b.text)}`}</Text>
                  </Text>
                </Box>
              )
            case 'section':
              return (
                <Box key={`b${i}`} flexDirection="column">
                  <Text bold color="claude">
                    {b.label}
                  </Text>
                  {b.body.trim() === '' ? null : body(b.body, 'body')}
                </Box>
              )
            case 'action':
              return (
                <Box key={`b${i}`} flexDirection="column" borderStyle="bold" borderColor="warning" paddingX={1}>
                  <Text bold color="warning">
                    ACTION NEEDED
                  </Text>
                  {b.body.trim() === '' ? null : body(b.body, 'body')}
                </Box>
              )
            case 'markdown':
              return body(b.text, `b${i}`)
          }
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !PROMPT_KINDS.has(e.props.origin.kind) || (await hasMedia($, e.props.text))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const open = memberOf(isPromptOpen, e)
    const isOpen = await read($, open)
    const collapsed = collapsePrompt(e.props.text)
    const text = collapsed && !isOpen ? collapsed.head : e.props.text

    return (
      <Box flexDirection="row" justifyContent="flex-end" width="100%">
        <Box
          width={e.props.text.length > BUBBLE_WRAP_AT ? '70%' : undefined}
          flexShrink={1}
          backgroundColor={BUBBLE_GREEN}
          borderStyle="round"
          borderColor={BUBBLE_GREEN}
          paddingX={2}
          paddingY={1}
        >
          <Box flexDirection="column" gap={1}>
            <Text color={BUBBLE_TEXT} weight="medium">
              {text}
            </Text>
            {collapsed === null ? null : (
              <Button
                key="toggle"
                label={isOpen ? 'Show less' : `Show all (${collapsed.hiddenLines} more lines)`}
                onPress={() => update($, open, v => !v)}
              />
            )}
          </Box>
        </Box>
      </Box>
    )
  })

}
