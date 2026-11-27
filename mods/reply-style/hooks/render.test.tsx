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

test('plain reply prose draws in the soft reply color', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'AssistantMessage',
    props: { text: 'Plain answer with `code`.\n\n- one\n- two', isFirstOfReply: true },
  })
  expect((await ui.find({ type: 'Text', text: /Plain answer/ }))?.props.color).toBe('#D6D4CC')
  expect((await ui.find({ type: 'Text', text: /^two$/ }))?.props.color).toBe('#D6D4CC')
})

test('a paragraph with an https link stays soft and keeps the link', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'AssistantMessage',
    props: { text: 'Merged in [the PR](https://github.com/a/b/pull/1) today.', isFirstOfReply: true },
  })
  expect((await ui.find({ type: 'Text', text: /Merged in/ }))?.props.color).toBe('#D6D4CC')
  expect((await ui.find({ type: 'Link' }))?.props.href).toBe('https://github.com/a/b/pull/1')
})

test('a prompt sent with an attachment keeps the desktop drawing', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  await $.prompt.submit({ text: 'see this file', wait: false, origin: { kind: 'sdk' }, attachments: [{ type: 'image', mediaType: 'image/png', id: 'a1' }] })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'see this file', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^see this file$/ })).toBeUndefined()
})

test('an image-only prompt keeps the desktop drawing', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: '', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
})

test('a prompt stored with a document keeps the desktop drawing', async ($, on) => {
  on('session.messages', () => ({
    value: [
    {
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AA==' } },
        { type: 'text', text: '<system-reminder>context</system-reminder>' },
        { type: 'text', text: 'read this pdf' },
      ],
    },
    ],
  }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'read this pdf', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^read this pdf$/ })).toBeUndefined()
})

test('a text-only prompt in history still draws as a bubble', async ($, on) => {
  on('session.messages', () => ({ value: [{ role: 'user', content: [{ type: 'text', text: 'just words' }] }] }))
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'just words', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /^just words$/ })).toBeDefined()
})

test('a prompt with an attached file mention keeps the desktop drawing', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: '@"/Users/me/Downloads/Gift Catalog.pdf"\ntest attachment', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
})

test('an email address in a prompt still draws as a bubble', async $ => {
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'mail me at a@b.com', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /^mail me at a@b\.com$/ })).toBeDefined()
})

test('a prompt stored as text with a file mention keeps the desktop drawing without the mention', async ($, on) => {
  on('session.messages', () => ({
    value: [{ role: 'user', content: [{ type: 'text', text: '@"/Users/me/Downloads/Gift Catalog.pdf"\ntest attachment' }] }],
  }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'test attachment', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
})

test('a submitted prompt with a file mention keeps the desktop drawing without the mention', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  await $.prompt.submit({ text: '@"/Users/me/a b.pdf"\nlook at it', wait: false, origin: { kind: 'sdk' } })
  const ui = await $.ui.mount({
    plugin: 'reply-style',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'look at it', origin: { kind: 'sdk' }, isExpanded: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
})
