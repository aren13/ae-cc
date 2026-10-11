import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { collapsePrompt, parseReply, plain } from './parse'

// Muted green read off the person's reference screenshot (approximate).
const BUBBLE_GREEN = '#3B6637'

// Past this many characters the bubble stops growing and wraps at 70% of the row.
const BUBBLE_WRAP_AT = 60

// Which long prompts the person opened, one member per transcript row.
const isPromptOpen = atom({ plugin: 'reply-style', key: 'isPromptOpen' } as const, false)

// The desktop app stamps the person's prompts as `sdk`; the terminal as `composer`.
const PROMPT_KINDS = new Set(['composer', 'sdk', 'bridge'])

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.isSummary) {
      return next(e)
    }

    const blocks = parseReply(e.props.text)
    if (!blocks.some(b => b.kind !== 'markdown')) {
      return next(e)
    }

    const { Box, Text, Markdown } = $.ui.resolve(e)

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
                    {`  ${plain(b.text)}`}
                  </Text>
                </Box>
              )
            case 'section':
              return (
                <Box key={`b${i}`} flexDirection="column">
                  <Text bold color="claude">
                    {b.label}
                  </Text>
                  {b.body.trim() === '' ? null : <Markdown text={b.body} />}
                </Box>
              )
            case 'action':
              return (
                <Box key={`b${i}`} flexDirection="column" borderStyle="bold" borderColor="warning" paddingX={1}>
                  <Text bold color="warning">
                    ACTION NEEDED
                  </Text>
                  {b.body.trim() === '' ? null : <Markdown text={b.body} />}
                </Box>
              )
            case 'markdown':
              return <Markdown key={`b${i}`} text={b.text} />
          }
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !PROMPT_KINDS.has(e.props.origin.kind)) {
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
            <Text color="#FFFFFF">{text}</Text>
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
