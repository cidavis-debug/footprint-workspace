import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/components/page-head'
import { Landing } from '@/components/landing/landing'

export const Route = createFileRoute('/')({
  head: () => pageHead('Footprint AI — Complex Engineering. Connected Intelligence.', 'Footprint AI helps hardware engineering teams organize information, ask questions across sources, and identify potential inconsistencies.'),
  component: Landing,
})
