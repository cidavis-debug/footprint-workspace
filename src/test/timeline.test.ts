import { describe, expect, it } from 'vitest'

import { HOLD_END, TRACK_VH, VIDEO_RANGE, layerOpacity, parsePair, textVisibility, videoIsNear, videoProgress, type LayerName } from '@/ui/marketing/timeline'

describe('landing timeline', () => {
  it('starts on the hero and ends on the held security frame', () => {
    expect(layerOpacity('hero', 0)).toBe(1)
    expect(layerOpacity('v1', 0)).toBe(1)
    expect(layerOpacity('v4', 0)).toBe(0)
    expect(layerOpacity('v4', HOLD_END)).toBeGreaterThan(0.4)
    expect(TRACK_VH).toBe(HOLD_END + 1)
  })

  it('never shows two stills at once and keeps one layer fully visible at each hold', () => {
    const holds: Array<[number, LayerName]> = [[0, 'hero'], [4.4, 's2'], [8.2, 'v2'], [11.6, 'v3'], [15.8, 'v4']]
    for (const [u, name] of holds) expect(layerOpacity(name, u)).toBeCloseTo(name === 'v4' ? layerOpacity('v4', u) : 1, 5)
    expect(layerOpacity('hero', 4.4)).toBe(0)
  })

  it('maps scroll to video position and clamps outside its range', () => {
    const [a, b] = VIDEO_RANGE.v2
    expect(videoProgress('v2', a - 1)).toBe(0)
    expect(videoProgress('v2', (a + b) / 2)).toBeCloseTo(0.5)
    expect(videoProgress('v2', b + 3)).toBe(1)
  })

  it('is reversible: the same scroll position always yields the same state', () => {
    const forward = [0.2, 1.5, 3, 6, 9.5].map(u => videoProgress('v1', u))
    const backward = [9.5, 6, 3, 1.5, 0.2].map(u => videoProgress('v1', u)).reverse()
    expect(backward).toEqual(forward)
    expect(layerOpacity('s2', 4.4)).toBe(layerOpacity('s2', 4.4))
  })

  it('only wakes decoders near the viewport', () => {
    expect(videoIsNear('v4', 0)).toBe(false)
    expect(videoIsNear('v1', 0)).toBe(true)
    expect(videoIsNear('v4', 12.4)).toBe(true)
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
