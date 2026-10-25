import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/components/page-head'
import { Landing } from '@/components/landing/landing'

export const Route = createFileRoute('/')({
  head: () => pageHead('Footprint AI — The future, built together', 'Superfolders connect local documents, Drive, Jira, Slack and your PLM into one source of truth, so hardware teams catch conflicts early, build faster and scale without the roadblocks.'),
  component: Landing,
})
