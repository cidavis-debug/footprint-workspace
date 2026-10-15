import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/components/page-head'
import { CinematicLanding } from '@/ui/marketing/cinematic-landing'

const FONTS = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Sora:wght@300;400;500;600&family=Zen+Dots&display=swap'

export const Route = createFileRoute('/')({
  head: () => ({
    ...pageHead('Footprint — Complex engineering. Connected intelligence.', 'Footprint connects the drawings, specifications and reports behind every engineering decision and shows where they disagree.'),
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: FONTS },
      { rel: 'preload', as: 'image', href: '/landing/hero.jpg' },
    ],
  }),
  component: CinematicLanding,
})
