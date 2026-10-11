import logoAsset from '@/assets/footprint-mark.png.asset.json'

export function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return <><img className={iconOnly ? 'brand-mark brand-mark-header' : 'brand-mark'} src={logoAsset.url} alt="" />{!iconOnly && <span>Footprint</span>}</>
}