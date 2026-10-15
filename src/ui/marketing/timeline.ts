/**
 * Scroll timeline for the cinematic landing page.
 * `u` is scroll progress measured in viewport heights from the top of the track.
 * Everything here is pure so it can be unit tested and driven from one rAF loop.
 */

export type LayerName = 'hero' | 'v1' | 's2' | 'v2' | 'v3' | 'v4'
export type VideoName = 'v1' | 'v2' | 'v3' | 'v4'

/** Scroll ranges (in viewport heights) during which each video is scrubbed. */
export const VIDEO_RANGE: Record<VideoName, readonly [number, number]> = {
  v1: [1.0, 3.5],
  v2: [5.0, 7.5],
  v3: [9.0, 10.8],
  v4: [12.5, 15.0],
}

/** Scrolling stops this far down the track; the last viewport is the held final frame. */
export const HOLD_END = 16.5
export const TRACK_VH = HOLD_END + 1

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const range = (u: number, a: number, b: number) => clamp01((u - a) / (b - a))
export const smooth = (x: number) => x * x * (3 - 2 * x)
export const ss = (u: number, a: number, b: number) => smooth(range(u, a, b))

/** Opacity of each full-bleed layer at scroll position `u`. */
export function layerOpacity(name: LayerName, u: number): number {
  switch (name) {
    case 'hero': return 1 - ss(u, 0.95, 1.25)
    case 'v1': return 1 - ss(u, 3.4, 3.9)
    case 's2': return ss(u, 3.4, 3.9) * (1 - ss(u, 4.9, 5.25))
    case 'v2': return ss(u, 4.9, 5.25) * (1 - ss(u, 8.7, 9.1))
    case 'v3': return ss(u, 8.7, 9.1) * (1 - ss(u, 12.3, 12.7))
    case 'v4': return ss(u, 12.3, 12.7) * (1 - 0.55 * ss(u, 15.2, 16.4))
  }
}

/** 0..1 playback position of a video at scroll position `u` (clamped at both ends). */
export function videoProgress(name: VideoName, u: number): number {
  const [a, b] = VIDEO_RANGE[name]
  return range(u, a, b)
}

/** True when a video is visible or about to be, so we only seek decoders that matter. */
export function videoIsNear(name: VideoName, u: number, margin = 1.2): boolean {
  const [a, b] = VIDEO_RANGE[name]
  // The first video sits under the hero from scroll 0.
  const started = name === 'v1' || u >= a - margin - 0.4
  return started && u <= b + margin + 3
}

export type TextAnim = {
  /** [start, end] of the reveal, in viewport heights. Omitted = already visible. */
  in?: readonly [number, number]
  /** [start, end] of the exit. Omitted = stays. */
  out?: readonly [number, number]
}

/** Visibility 0..1 of an overlay at `u`, plus how far through the entrance it is. */
export function textVisibility(anim: TextAnim, u: number) {
  const entered = anim.in ? ss(u, anim.in[0], anim.in[1]) : 1
  const exited = anim.out ? ss(u, anim.out[0], anim.out[1]) : 0
  return { entered, exited, visible: entered * (1 - exited) }
}

/** Parse "a,b" into a tuple; returns undefined for missing/invalid values. */
export function parsePair(value: string | undefined): readonly [number, number] | undefined {
  if (!value) return undefined
  const [a, b] = value.split(',').map(Number)
  return a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b) ? [a, b] : undefined
}
