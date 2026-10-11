import { expect, test } from 'claude-code/testing'

test('a full reply draws its styled blocks on the desktop', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'AssistantMessage',
    props: { text: '**Verdict:** Ship it.\n\n**Findings**\nAll good.\n\n---\n\n**Action needed:** Run it.', isFirstOfReply: true },
  })
  expect(await ui.find({ type: 'Text', text: /VERDICT/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Findings/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ACTION NEEDED/ })).toBeDefined()
})

test('a prompt draws as a bubble', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'hello', origin: { kind: 'composer' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /^h(ello|i)$/ })).toBeDefined()
})

test('a desktop prompt (sdk origin) draws as a bubble', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'hi', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /^h(ello|i)$/ })).toBeDefined()
})

test('the terminal is left alone', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine reply</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: '**Verdict:** x', isFirstOfReply: true },
  })
  expect(await ui.find({ type: 'Text', text: /VERDICT/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /engine reply/ })).toBeDefined()
})

test('a long prompt opens and closes with its button', async $ => {
  const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text, origin: { kind: 'sdk' }, isExpanded: false },
  })
  expect(await ui.find({ type: 'Text', text: /line 19/ })).toBeUndefined()
  await ui.press({ key: 'toggle' })
  expect(await ui.find({ type: 'Text', text: /line 19/ })).toBeDefined()
  await ui.press({ key: 'toggle' })
  expect(await ui.find({ type: 'Text', text: /line 19/ })).toBeUndefined()
})

test('a decision gets its own verdict box', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'AssistantMessage',
    props: { text: '**Decision:** Pick one.', isFirstOfReply: true },
  })
  expect(await ui.find({ type: 'Text', text: /DECISION/ })).toBeDefined()
})
