import { expect, test } from 'claude-code/testing'

import { bodyPieces, collapsePrompt, inlineRuns, paragraphs, parseReply } from './parse'

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

test('splits bold and code runs', () => {
  expect(inlineRuns('Run `npm test` **now** please')).toEqual([
    { text: 'Run ' },
    { text: 'npm test', code: true },
    { text: ' ' },
    { text: 'now', bold: true },
    { text: ' please' },
  ])
})

test('https links become link runs', () => {
  expect(inlineRuns('See [the PR](https://github.com/a/b/pull/1) or https://x.y/z.')).toEqual([
    { text: 'See ' },
    { text: 'the PR', href: 'https://github.com/a/b/pull/1' },
    { text: ' or ' },
    { text: 'https://x.y/z', href: 'https://x.y/z' },
    { text: '.' },
  ])
})

test('non-https links stay with the Markdown element', () => {
  expect(inlineRuns('Open [the file](file:///tmp/a.md).')).toBeNull()
  expect(inlineRuns('Plain http://x.y')).toBeNull()
})

test('prose and flat lists become Text pieces; tables and code stay Markdown', () => {
  const md = ['One\ntwo.', '- **A:** x\n- B', '| a |\n|---|', '```\ncode\n```'].join('\n\n')
  expect(bodyPieces(md).map(p => p.kind)).toEqual(['prose', 'list', 'markdown'])
  expect(bodyPieces(md)[0]).toEqual({ kind: 'prose', runs: [{ text: 'One two.' }] })
})

test('a list item with a file link keeps its markdown; the others stay runs', () => {
  const [list] = bodyPieces('- see [x](file:///a.b)\n- y')
  expect(list).toEqual({
    kind: 'list',
    items: [
      { marker: '•', runs: null, text: 'see [x](file:///a.b)' },
      { marker: '•', runs: [{ text: 'y' }], text: 'y' },
    ],
  })
})
