import hero from '@/assets/illustrations/hero-untangle.png.asset.json'
import gather from '@/assets/illustrations/step-add-sources.png.asset.json'
import organize from '@/assets/illustrations/step-organize.png.asset.json'
import ask from '@/assets/illustrations/step-ask.png.asset.json'
import insight from '@/assets/illustrations/cta-insight.png.asset.json'
import answer from '@/assets/illustrations/cited-answer.png.asset.json'
import map from '@/assets/illustrations/collections-map.png.asset.json'
import filing from '@/assets/illustrations/collections-filing.png.asset.json'
import verified from '@/assets/illustrations/security-verified.png.asset.json'
import chain from '@/assets/illustrations/security-chain.png.asset.json'
import free from '@/assets/illustrations/plan-free.png.asset.json'
import pro from '@/assets/illustrations/plan-pro.png.asset.json'
import team from '@/assets/illustrations/plan-team.png.asset.json'
import empty from '@/assets/illustrations/workspace-empty.png.asset.json'

const illustrations = { hero, gather, organize, ask, insight, answer, map, filing, verified, chain, free, pro, team, empty }

export type IllustrationName = keyof typeof illustrations

/** Decorative artwork: the nearby heading carries the meaning. */
export function Illustration({ name, size = 'spot', eager = false }: { name: IllustrationName; size?: 'spot' | 'small' | 'wide'; eager?: boolean }) {
  return <img src={illustrations[name].url} alt="" aria-hidden="true" className={`illustration illustration-${size}`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}