export function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return <><img className={iconOnly ? 'brand-mark brand-mark-header' : 'brand-mark'} src="/footprint-logo.png" alt="" />{!iconOnly && <span>Footprint AI</span>}</>
}
