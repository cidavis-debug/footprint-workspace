import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { pageHead } from '@/components/page-head'

export const Route = createFileRoute('/login')({ head: () => pageHead('Log in — Footprint', 'Account access for your Footprint workspace.'), component: Login })
function Login() {
  return <SiteLayout><main className="site-width"><section className="simple-page"><p className="section-kicker">Your Footprint account</p><h1>Welcome back.</h1><p>Sign-in and signup aren’t available yet.</p><div className="connection-notice"><div className="flex items-center gap-2 mb-4"><Icon name="Link2" /><strong>Connect your existing project</strong></div><p>In the Lovable editor, open Connectors → Supabase and connect your project. Account access can be set up after that connection is ready.</p></div><Link to="/app" className="site-link">View the unconnected workspace <span aria-hidden="true">↗</span></Link></section></main></SiteLayout>
}