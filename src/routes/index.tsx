import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/components/page-head'
import { Landing } from '@/components/landing/landing'

export const Route = createFileRoute('/')({
  head: () => pageHead('Footprint AI — Complex Engineering. Connected Intelligence.', 'Footprint AI connects Drive, Jira, Slack and your PLM into one source of truth for hardware teams, answers with citations, and catches conflicts before they become redesigns.'),
  component: Landing,
})
