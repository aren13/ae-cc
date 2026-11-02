export type Block =
  | { kind: 'verdict'; label: string; text: string }
  | { kind: 'section'; label: string; body: string }
  | { kind: 'action'; body: string }
  | { kind: 'markdown'; text: string }

const VERDICT = /^\*\*(Verdict|Decision):\*\*\s*/
const LEAD_IN = /^\*\*([^*\n]{1,40})\*\*\s*$/
const ACTION = /^\*\*Action needed:\*\*\s*/

// Splits markdown into paragraphs, keeping fenced code (even unclosed while streaming) whole.
export function paragraphs(text: string): string[] {
  const out: string[] = []
  let current: string[] = []
  let inFence = false

  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
    }
    if (!inFence && line.trim() === '') {
      if (current.length > 0) {
        out.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) {
    out.push(current.join('\n'))
  }

  return out
}

// Strips inline markdown marks for text drawn on a filled background.
export function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
}

// Classifies a reply into styled blocks; plain paragraphs are merged so lists and tables stay intact.
export function parseReply(text: string): Block[] {
  const blocks: Block[] = []
  const paras = paragraphs(text)

  const pushMarkdown = (md: string) => {
    const last = blocks[blocks.length - 1]
    if (last?.kind === 'markdown') {
      last.text += '\n\n' + md
    } else {
      blocks.push({ kind: 'markdown', text: md })
    }
  }

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i]!

    if (p.trim() === '---' && ACTION.test(paras[i + 1] ?? '')) {
      continue
    }
    if (ACTION.test(p)) {
      blocks.push({ kind: 'action', body: [p.replace(ACTION, ''), ...paras.slice(i + 1)].filter(s => s.trim() !== '').join('\n\n') })
      break
    }

    const verdict = blocks.length === 0 ? VERDICT.exec(p) : null
    if (verdict) {
      blocks.push({ kind: 'verdict', label: verdict[1]!, text: p.slice(verdict[0].length) })
      continue
    }

    const [first = '', ...rest] = p.split('\n')
    const lead = LEAD_IN.exec(first)
    if (lead) {
      blocks.push({ kind: 'section', label: lead[1]!, body: rest.join('\n') })
      continue
    }

    pushMarkdown(p)
  }

  return blocks
}

const PROMPT_MAX_LINES = 8
const PROMPT_HEAD_LINES = 6
const PROMPT_HEAD_CHARS = 600

// The head of a long prompt and how many lines it hides, or null when it is short.
export function collapsePrompt(text: string): { head: string; hiddenLines: number } | null {
  const lines = text.split('\n')
  if (lines.length <= PROMPT_MAX_LINES && text.length <= PROMPT_HEAD_CHARS) {
    return null
  }

  let head = lines.slice(0, PROMPT_HEAD_LINES).join('\n')
  if (head.length > PROMPT_HEAD_CHARS) {
    head = head.slice(0, PROMPT_HEAD_CHARS)
  }
  const shownLines = head.split('\n').length

  return { head: head + '…', hiddenLines: Math.max(1, lines.length - shownLines) }
}

export type Run = { text: string; bold?: boolean; code?: boolean }

export type Piece =
  | { kind: 'prose'; runs: Run[] }
  | { kind: 'list'; items: { marker: string; runs: Run[] }[] }
  | { kind: 'markdown'; text: string }

// Links, images, HTML and bare URLs need the Markdown element to stay pressable or drawn.
const NEEDS_MARKDOWN = /\]\(|!\[|<[a-zA-Z/]|https?:\/\//
const BLOCK_START = /^(#{1,6}\s|>|\||```|~~~|\s{2,}\S|---\s*$|\*\*\*\s*$)/
const LIST_ITEM = /^([-*+]|\d{1,3}[.)])\s+(.*)$/

// Splits inline markdown into plain, bold and code runs, or null when it needs the Markdown element.
export function inlineRuns(text: string): Run[] | null {
  if (NEEDS_MARKDOWN.test(text)) {
    return null
  }

  const runs: Run[] = []
  const re = /`([^`\n]+)`|\*\*([^*\n]+)\*\*/g
  let last = 0
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    if (m.index > last) {
      runs.push({ text: text.slice(last, m.index) })
    }
    runs.push(m[1] !== undefined ? { text: m[1], code: true } : { text: m[2]!, bold: true })
    last = re.lastIndex
  }
  if (last < text.length) {
    runs.push({ text: text.slice(last) })
  }

  return runs
}

// Classifies markdown paragraphs into prose and flat lists drawn as Text, leaving the rest to Markdown.
export function bodyPieces(text: string): Piece[] {
  const pieces: Piece[] = []

  const pushMarkdown = (md: string) => {
    const last = pieces[pieces.length - 1]
    if (last?.kind === 'markdown') {
      last.text += '\n\n' + md
    } else {
      pieces.push({ kind: 'markdown', text: md })
    }
  }

  for (const p of paragraphs(text)) {
    const lines = p.split('\n')

    if (lines.every(l => LIST_ITEM.test(l))) {
      const items = lines.map(l => {
        const [, marker = '', rest = ''] = LIST_ITEM.exec(l)!
        return { marker: /^\d/.test(marker) ? marker : '•', runs: inlineRuns(rest) }
      })
      if (items.every(it => it.runs !== null)) {
        pieces.push({ kind: 'list', items: items.map(it => ({ marker: it.marker, runs: it.runs! })) })
        continue
      }
    }

    if (!lines.some(l => BLOCK_START.test(l) || LIST_ITEM.test(l))) {
      const runs = inlineRuns(lines.join(' '))
      if (runs !== null) {
        pieces.push({ kind: 'prose', runs })
        continue
      }
    }

    pushMarkdown(p)
  }

  return pieces
}
