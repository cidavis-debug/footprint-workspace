import { Link } from '@tanstack/react-router'
import { Icon } from '@/design-system/footprint-0a8b1a'
import { NavigationButton } from '@/components/navigation-button'
import { Illustration, type IllustrationName } from '@/components/illustration'

export function PageIntroduction({ kicker, title, description, illustration }: { kicker: string; title: string; description: string; illustration?: IllustrationName }) {
  return <section className={illustration ? 'content-intro illustrated-intro' : 'content-intro'}><div><p className="section-kicker">{kicker}</p><h1>{title}</h1><p className="content-lead">{description}</p></div>{illustration && <Illustration name={illustration} size="wide" eager />}</section>
}

export function PageInvitation() {
  return <section className="content-invitation"><div className="invitation-copy"><Illustration name="insight" /><div><p className="section-kicker">A little more clarity</p><h2 className="section-title">Give your knowledge a home.</h2><p>Explore the workspace preview. Live accounts, uploads, and answers are not connected yet.</p></div></div><div className="invitation-actions"><NavigationButton to="/app">Open Footprint <Icon name="ArrowUpRight" /></NavigationButton><Link to="/pricing" className="site-link">Explore proposed plans ↗</Link></div></section>
}