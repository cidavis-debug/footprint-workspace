import { describe, expect, it } from 'vitest'

import { BLOCKS, HERO_SCALE_FROM, heroScale, heroStillOpacity, parsePair, pinnedLength, textVisibility, videoProgress, type BlockId } from '@/ui/marketing/timeline'

const ids = Object.keys(BLOCKS) as BlockId[]

describe('landing timelines', () => {
  it('uses only the three kept transition videos (no conflict-detection video)', () => {
    expect(ids.map(id => BLOCKS[id].video).sort()).toEqual(['v1', 'v2', 'v4'])
  })

  it('keeps every scrub inside its pinned scroll length and keeps blocks short', () => {
    for (const id of ids) {
      const [a, b] = BLOCKS[id].range
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(pinnedLength(id))
      expect(a).toBeLessThan(b)
      expect(BLOCKS[id].height).toBeLessThanOrEqual(3)
    }
  })

  it('maps scroll to video position, clamped at both ends and reversible', () => {
    const [a, b] = BLOCKS.stream.range
    expect(videoProgress('stream', a - 1)).toBe(0)
    expect(videoProgress('stream', (a + b) / 2)).toBeCloseTo(0.5)
    expect(videoProgress('stream', b + 3)).toBe(1)
    const forward = [0.1, 0.5, 0.9].map(u => videoProgress('stream', u))
    const backward = [0.9, 0.5, 0.1].map(u => videoProgress('stream', u)).reverse()
    expect(backward).toEqual(forward)
  })

  it('shows the hero still first, then hands over to the video as the aircraft pushes in', () => {
    expect(heroStillOpacity(0)).toBe(1)
    expect(heroStillOpacity(1)).toBe(0)
    expect(heroScale(0)).toBeCloseTo(HERO_SCALE_FROM)
    expect(heroScale(pinnedLength('intro'))).toBe(1)
  })

  it('computes text entrance and exit visibility', () => {
    const anim = { in: [2, 3], out: [5, 6] } as const
    expect(textVisibility(anim, 1).visible).toBe(0)
    expect(textVisibility(anim, 4).visible).toBe(1)
    expect(textVisibility(anim, 7).visible).toBe(0)
    expect(textVisibility({}, 0).visible).toBe(1)
  })

  it('parses data attribute ranges', () => {
    expect(parsePair('1.5,2')).toEqual([1.5, 2])
    expect(parsePair('x,2')).toBeUndefined()
    expect(parsePair(undefined)).toBeUndefined()
  })
})
