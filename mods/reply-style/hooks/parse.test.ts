import { expect, test } from 'claude-code/testing'

import { collapsePrompt, paragraphs, parseReply } from './parse'

const REPLY = [
  '**Verdict:** Ship it.',
  '**Findings**\nAll good.',
  '| a | b |\n|---|---|\n| 1 | 2 |',
  'More prose.',
  '---',
  '**Action needed:** Run this.',
  '```bash\nnpm test\n```',
].join('\n\n')

test('classifies every part of a full reply', () => {
  expect(parseReply(REPLY).map(b => b.kind)).toEqual(['verdict', 'section', 'markdown', 'action'])
})

test('keeps the action command in the action block', () => {
  const action = parseReply(REPLY).at(-1)
  expect(action).toEqual({ kind: 'action', body: 'Run this.\n\n```bash\nnpm test\n```' })
})

test('keeps an unclosed fence whole while streaming', () => {
  expect(paragraphs('Text\n\n```\na\n\nb')).toEqual(['Text', '```\na\n\nb'])
})

test('a verdict only counts as the first block', () => {
  expect(parseReply('Hi.\n\n**Verdict:** late').map(b => b.kind)).toEqual(['markdown'])
})

test('short prompts are not collapsed', () => {
  expect(collapsePrompt('one\ntwo')).toBeNull()
})

test('long prompts keep six lines and count the rest', () => {
  const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
  expect(collapsePrompt(text)).toEqual({ head: text.split('\n').slice(0, 6).join('\n') + '…', hiddenLines: 14 })
})
