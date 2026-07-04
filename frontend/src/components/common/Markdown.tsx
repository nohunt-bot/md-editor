import { Fragment, type ReactNode } from 'react'
import './Markdown.css'

// Minimal, dependency-free markdown renderer for the read view (§6.4 left
// column). Supports the subset the editor toolbar produces: headings, fenced
// code blocks (monospaced via --font-mono), unordered/ordered lists, blockquote,
// horizontal rule, paragraphs, and inline bold/italic/code/link. Anything else
// falls through as plain text. Full CommonMark is out of scope (TODO(2.x): swap
// for a real renderer if richer content appears).

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'p'; text: string }

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(.*)$/)
    if (fence) {
      const lang = fence[1].trim()
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ kind: 'code', lang, code: code.join('\n') })
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() })
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ kind: 'quote', text: quote.join('\n') })
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — gather until blank or block start
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ kind: 'p', text: para.join(' ') })
  }
  return blocks
}

// Inline: `code`, **bold**, *italic*, [text](url). Order matters — code first
// so its contents are not further parsed.
function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const token = m[0]
    const key = `${keyBase}-${k++}`
    if (token.startsWith('`')) {
      nodes.push(<code key={key} className="md-inline-code">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        nodes.push(
          <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        )
      } else {
        nodes.push(token)
      }
    }
    last = m.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function Markdown({ content }: { content: string }) {
  const blocks = parse(content ?? '')
  return (
    <div className="markdown">
      {blocks.map((b, idx) => {
        const key = `b-${idx}`
        switch (b.kind) {
          case 'heading': {
            const Tag = `h${b.level}` as keyof JSX.IntrinsicElements
            return <Tag key={key}>{inline(b.text, key)}</Tag>
          }
          case 'code':
            return (
              <pre key={key} className="md-code" data-lang={b.lang || undefined}>
                <code>{b.code}</code>
              </pre>
            )
          case 'ul':
            return (
              <ul key={key}>
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key}>
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            )
          case 'quote':
            return <blockquote key={key}>{inline(b.text, key)}</blockquote>
          case 'hr':
            return <hr key={key} />
          case 'p':
            return <p key={key}>{inline(b.text, key)}</p>
          default:
            return <Fragment key={key} />
        }
      })}
    </div>
  )
}
