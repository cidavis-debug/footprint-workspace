import { useEffect, useRef, useState } from 'react'
import shoeAsset from '@/assets/shoe-footprint.png.asset.json'

const STEPS = 24
const WINDOW = 10
/** Natural upward tilt of the toe in the uploaded artwork, in degrees. */
const ART_TILT = 25
const START = 3
const END = 97
const waveY = (x: number) => 50 + 22 * Math.sin((x / 100) * Math.PI * 3)
const waveSlope = (x: number) => 22 * Math.cos((x / 100) * Math.PI * 3) * (Math.PI * 3 / 100)
const pathD = Array.from({ length: 101 }, (_, i) => {
  const x = START + (i / 100) * (END - START)
  return `${i ? 'L' : 'M'}${x.toFixed(2)} ${waveY(x).toFixed(2)}`
}).join(' ')

const steps = Array.from({ length: STEPS }, (_, index) => {
  const x = START + (index / (STEPS - 1)) * (END - START)
  const angle = Math.atan(waveSlope(x))
  const side = index % 2 ? -1 : 1
  const offset = 7 * side
  return {
    x: x - Math.sin(angle) * offset * 0.3,
    y: waveY(x) - Math.cos(angle) * offset,
    angle: (angle * 180) / Math.PI,
    top: side === 1,
  }
})

/** Scroll-pinned decorative band: footprints walk a winding dotted path that draws in behind them; each fades once ten newer steps arrive. */
export function FootprintWalk() {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(STEPS)
  const [motion, setMotion] = useState(false)
  useEffect(() => {
    const element = ref.current
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!element) return
    let frame = 0
    const measure = () => {
      frame = 0
      setMotion(!query.matches)
      if (query.matches) { setCount(STEPS); return }
      const bounds = element.getBoundingClientRect()
      const travel = Math.max(1, bounds.height - window.innerHeight)
      const progress = Math.max(0, Math.min(1, -bounds.top / travel))
      setCount(Math.floor(progress * (STEPS + WINDOW)))
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    query.addEventListener('change', schedule)
    schedule()
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      query.removeEventListener('change', schedule)
    }
  }, [])
  const lead = Math.min(count, STEPS) - 1
  const reveal = !motion ? 100 : lead < 0 ? 0 : steps[lead].x
  return <div ref={ref} className="footprint-walk" data-motion={motion} aria-hidden="true">
    <div className="footprint-walk-stage">
      <div className="footprint-walk-track">
        <svg className="walk-path" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <clipPath id="walk-reveal"><rect x="0" y="0" width={reveal} height="100" /></clipPath>
          </defs>
          <path d={pathD} clipPath="url(#walk-reveal)" vectorEffect="non-scaling-stroke" />
        </svg>
        {steps.map((step, index) => {
          const visible = motion ? index < count && index >= count - WINDOW : true
          const transform = step.top
            ? `translate(-50%, -50%) rotate(${step.angle + ART_TILT}deg)`
            : `translate(-50%, -50%) rotate(${step.angle - ART_TILT}deg) scaleY(-1)`
          return <img key={index} src={shoeAsset.url} alt="" className="walk-step" data-visible={visible}
            style={{ left: `${step.x}%`, top: `${step.y}%`, transform }} />
        })}
      </div>
    </div>
  </div>
}
