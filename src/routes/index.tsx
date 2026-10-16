import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/components/page-head'
import { Landing } from '@/components/landing/landing'

export const Route = createFileRoute('/')({
  head: () => pageHead('Footprint — Complex Engineering. Connected Intelligence.', 'Footprint helps hardware engineering teams organize information, ask questions across sources, and identify potential inconsistencies.'),
  component: Landing,
})
