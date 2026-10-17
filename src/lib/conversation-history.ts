import type { Citation } from './ask.functions'

export type StoredMessage = { role: string; content: string; citations: unknown; created_at: string }
export type ThreadTurn = { question: string; answer: string; citations: Citation[]; pending: boolean }
export type ConversationSummary = { id: string; title: string; updated_at: string }

const isCitation = (c: unknown): c is Citation => !!c && typeof c === 'object' && typeof (c as Citation).id === 'string' && typeof (c as Citation).title === 'string'

/** Turns stored user/assistant rows back into chat turns. A question and its answer are saved in one insert, so they share a timestamp; user rows sort first. */
export function pairMessages(rows: StoredMessage[]): ThreadTurn[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || Number(b.role === 'user') - Number(a.role === 'user'))
  const turns: ThreadTurn[] = []
  let question: string | null = null
  for (const row of sorted) {
    if (row.role === 'user') { question = row.content; continue }
    if (row.role === 'assistant' && question !== null) {
      turns.push({ question, answer: row.content, citations: Array.isArray(row.citations) ? row.citations.filter(isCitation) : [], pending: false })
      question = null
    }
  }
  return turns
}

/** "Today", "Yesterday", or a short date — for the history list. */
export function historyDate(iso: string, now = new Date()): string {
  const d = new Date(iso), startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
