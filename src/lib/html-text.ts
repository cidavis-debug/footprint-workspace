import { parse, HTMLElement, TextNode, type Node } from 'node-html-parser'

const DROP = 'script, style, noscript, svg, iframe, template, nav, footer, aside, button, select, option, canvas'
const BLOCK = new Set(['p', 'div', 'section', 'article', 'main', 'header', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr', 'blockquote', 'pre', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'details', 'summary'])

export type PageText = { title: string | null; text: string }

function walk(node: Node, out: string[]) {
  if (node instanceof TextNode) { out.push(node.text.replace(/\s+/g, ' ')); return }
  if (!(node instanceof HTMLElement)) return
  const tag = node.tagName?.toLowerCase() ?? ''
  if (tag === 'br') { out.push('\n'); return }
  if (tag === 'li') out.push('\n- ')
  else if (tag === 'td' || tag === 'th') out.push(' | ')
  else if (/^h[1-6]$/.test(tag)) out.push('\n\n')
  else if (BLOCK.has(tag)) out.push('\n')
  for (const child of node.childNodes) walk(child, out)
  if (BLOCK.has(tag)) out.push('\n')
}

/** Readable text from an HTML page: main/article content when present, navigation and scripts removed. */
export function htmlToText(html: string): PageText {
  const root = parse(html, { comment: false })
  const title = root.querySelector('title')?.text.replace(/\s+/g, ' ').trim() || root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() || null
  root.querySelectorAll(DROP).forEach(n => n.remove())
  const main = root.querySelector('main') ?? root.querySelector('article') ?? root.querySelector('[role=main]') ?? root.querySelector('body') ?? root
  const out: string[] = []
  walk(main, out)
  const text = out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return { title, text }
}
