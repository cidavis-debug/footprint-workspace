/**
 * Scroll timelines for the cinematic blocks on the landing page.
 *
 * The page is mostly normal scrolling content. Three short "blocks" pin the viewport and scrub a
 * video with the scroll position. Within a block, `u` is scroll progress in viewport heights from
 * the top of the block's track. Everything here is pure so it can be unit tested.
 */

export type BlockId = 'intro' | 'stream' | 'vault'
export type VideoName = 'v1' | 'v2' | 'v4'

type Block = {
  /** Track height in viewport heights; the stage stays pinned for `height - 1`. */
  height: number
  video: VideoName
  /** [start, end] of the video scrub, in viewport heights from the top of the track. */
  range: readonly [number, number]
}

export const BLOCKS: Record<BlockId, Block> = {
  intro: { height: 2.7, video: 'v1', range: [0.3, 1.6] },
  stream: { height: 2.0, video: 'v2', range: [0.05, 0.95] },
  vault: { height: 2.2, video: 'v4', range: [0.05, 1.15] },
}

export const pinnedLength = (id: BlockId) => BLOCKS[id].height - 1

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const range = (u: number, a: number, b: number) => clamp01((u - a) / (b - a))
export const smooth = (x: number) => x * x * (3 - 2 * x)
export const ss = (u: number, a: number, b: number) => smooth(range(u, a, b))

/** 0..1 playback position of the block's video (clamped at both ends). */
export function videoProgress(id: BlockId, u: number): number {
  const [a, b] = BLOCKS[id].range
  return range(u, a, b)
}

/** The hero still sits on top of the first video and fades out as the aircraft starts to move. */
export const heroStillOpacity = (u: number) => 1 - ss(u, 0.3, 0.65)

/** Hero + first video are framed slightly small so text has room, then push in as the video plays. */
export const HERO_SCALE_FROM = 0.86
export const heroScale = (u: number) => HERO_SCALE_FROM + (1 - HERO_SCALE_FROM) * ss(u, 0.25, 0.9)

export type TextAnim = {
  /** [start, end] of the reveal. Omitted = already visible. */
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
