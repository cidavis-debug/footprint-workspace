/**
 * "Open Footprint" entry transition.
 *
 * The overlay is created imperatively on document.body so it survives the route change:
 * the landing page unmounts when navigation starts, and an overlay owned by that tree would
 * flash blank. The overlay fades out only after the destination route has finished navigating.
 */

const VIDEO_SRC = '/landing/open-footprint-big-bang.mp4'
/** Seconds into the animation at which we navigate (flash has peaked / app frame is arriving). */
const NAVIGATE_AT_AUTHED = 4.6
const NAVIGATE_AT_GUEST = 1.9
const FAILSAFE_MS = 9000

type Options = {
  /** Resolves when the destination route is rendered. */
  navigate: () => Promise<unknown> | void
  /** Warm the destination route/code; failures are ignored. */
  preload?: () => Promise<unknown> | void
  /** Signed-in users get the full animation; guests get a shortened one. */
  authed: boolean
  reducedMotion: boolean
}

let active = false

export function openFootprint({ navigate, preload, authed, reducedMotion }: Options) {
  if (active) return
  if (reducedMotion || typeof document === 'undefined') {
    void navigate()
    return
  }
  active = true

  const root = document.createElement('div')
  root.className = 'cin-entry'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', 'Opening Footprint')
  const video = document.createElement('video')
  video.src = VIDEO_SRC
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('aria-hidden', 'true')
  const skip = document.createElement('button')
  skip.type = 'button'
  skip.className = 'cin-entry-skip'
  skip.textContent = 'Skip'
  root.append(video, skip)
  document.body.append(root)
  requestAnimationFrame(() => root.classList.add('is-on'))

  let navigated = false
  let removed = false
  const remove = () => {
    if (removed) return
    removed = true
    root.classList.remove('is-on')
    window.setTimeout(() => { root.remove(); active = false }, 500)
  }
  const go = () => {
    if (navigated) return
    navigated = true
    video.pause()
    // Hold the overlay until the destination has rendered, then fade it away.
    Promise.resolve()
      .then(() => navigate())
      .catch(() => undefined)
      .finally(() => window.setTimeout(remove, 250))
  }

  const navigateAt = authed ? NAVIGATE_AT_AUTHED : NAVIGATE_AT_GUEST
  video.addEventListener('timeupdate', () => { if (video.currentTime >= navigateAt) go() })
  video.addEventListener('ended', go)
  video.addEventListener('error', go)
  skip.addEventListener('click', go)
  window.setTimeout(go, FAILSAFE_MS)

  void Promise.resolve().then(() => preload?.()).catch(() => undefined)
  void video.play().catch(go)
  skip.focus({ preventScroll: true })
}
