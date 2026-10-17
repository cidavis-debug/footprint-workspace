import { describe, expect, it } from 'vitest'
import { conflictHints, matchScore, numericMismatch, parseQuantity, rankCandidates, type MatchClaim } from '@/lib/claim-match'
import { findQuote, locateQuote, locationAt, passageAround } from '@/lib/quote-locate'

const claim = (subject: string, attribute: string, value: string, unit: string | null = null, systems: string[] = []): MatchClaim => ({ subject, attribute, value, unit, affected_systems: systems })

describe('parseQuantity', () => {
  it('reads values with units from the unit field or the value text', () => {
    expect(parseQuantity('24', 'V')).toEqual({ dimension: 'voltage', lo: 24, hi: 24 })
    expect(parseQuantity('24 V', null)).toEqual({ dimension: 'voltage', lo: 24, hi: 24 })
    expect(parseQuantity('24 V nominal', null)?.lo).toBe(24)
    expect(parseQuantity('1', 'Mbit/s')).toEqual({ dimension: 'data rate', lo: 1e6, hi: 1e6 })
    expect(parseQuantity('500', 'kbit/s')).toEqual({ dimension: 'data rate', lo: 5e5, hi: 5e5 })
    expect(parseQuantity('18', 'kg')).toEqual({ dimension: 'mass', lo: 18, hi: 18 })
    expect(parseQuantity('500', 'g')?.lo).toBeCloseTo(0.5)
    expect(parseQuantity('4', 'hours')).toEqual({ dimension: 'time', lo: 14400, hi: 14400 })
  })
  it('reads ranges, including negative numbers', () => {
    expect(parseQuantity('-20 °C to 60 °C', null)).toEqual({ dimension: 'temperature', lo: -20, hi: 60 })
    expect(parseQuantity('-10 to 50', '°C')).toEqual({ dimension: 'temperature', lo: -10, hi: 50 })
  })
  it('returns null for things that are not plain quantities', () => {
    expect(parseQuantity('IP54', null)).toBeNull()
    expect(parseQuantity('CAN bus', null)).toBeNull()
    expect(parseQuantity('24', null)).toBeNull()
    expect(parseQuantity('1, 2 and 3', 'V')).toBeNull()
  })
})

describe('numericMismatch', () => {
  it('flags genuinely different values of the same kind', () => {
    expect(numericMismatch(claim('Bus', 'voltage', '24', 'V'), claim('Bus', 'voltage', '12', 'V'))).toBe('24 V vs 12 V')
    expect(numericMismatch(claim('CAN', 'rate', '500', 'kbit/s'), claim('CAN', 'rate', '1', 'Mbit/s'))).not.toBeNull()
    expect(numericMismatch(claim('Env', 'range', '-20 to 60', '°C'), claim('Env', 'range', '-10 to 50', '°C'))).not.toBeNull()
  })
  it('does not flag equal values written differently, or different kinds', () => {
    expect(numericMismatch(claim('CAN', 'rate', '1000', 'kbit/s'), claim('CAN', 'rate', '1', 'Mbit/s'))).toBeNull()
    expect(numericMismatch(claim('Mass', 'max', '18000', 'g'), claim('Mass', 'max', '18', 'kg'))).toBeNull()
    expect(numericMismatch(claim('Bus', 'voltage', '24', 'V'), claim('Bus', 'current', '15', 'A'))).toBeNull()
  })
})

describe('matching and ranking', () => {
  it('scores the same thing described differently highly, and unrelated things low', () => {
    const a = claim('Main power bus', 'nominal voltage', '24', 'V', ['Power'])
    expect(matchScore(a, claim('Main bus', 'voltage', '12', 'V', ['Power']))).toBeGreaterThan(0.8)
    expect(matchScore(a, claim('Enclosure', 'ingress rating', 'IP54'))).toBeLessThan(0.2)
  })
  it('keeps the most related claims when there are too many', () => {
    const fresh = [claim('Main bus', 'voltage', '12', 'V')]
    const existing = [
      ...Array.from({ length: 30 }, (_, i) => claim(`Filler ${i}`, 'thing', `${i}`)),
      claim('Main power bus', 'nominal voltage', '24', 'V'),
    ]
    const top = rankCandidates(fresh, existing, 5)
    expect(top).toHaveLength(5)
    expect(top[0].subject).toBe('Main power bus')
    expect(rankCandidates(fresh, existing, 100)).toBe(existing)
  })
  it('turns matching quantities with different numbers into hints', () => {
    const fresh = [claim('Main bus', 'voltage', '12', 'V'), claim('CAN bus', 'bit rate', '1', 'Mbit/s'), claim('Enclosure', 'rating', 'IP65')]
    const existing = [claim('Main power bus', 'nominal voltage', '24', 'V'), claim('CAN bus', 'bit rate', '500', 'kbit/s'), claim('Enclosure', 'rating', 'IP54'), claim('Motor', 'voltage', '12', 'V')]
    const hints = conflictHints(fresh, existing)
    expect(hints.map(h => [h.newIndex, h.related.subject, h.detail])).toEqual([[0, 'Main power bus', '12 V vs 24 V'], [1, 'CAN bus', '1 Mbit/s vs 500 kbit/s']])
  })
})

describe('quote location', () => {
  const text = '[Page 1]\nAtlas Rover requirements overview.\n\n[Page 2]\nR-101: The main power bus shall operate at 24 V nominal (approved).\nR-102: Max current 15 A.\n\n[Slide 3]\nDecision: CAN at 1 Mbit/s.\n\n[Sheet: BOM]\nPart: Motor | Voltage: 12'

  it('finds exact and re-wrapped quotes', () => {
    expect(findQuote(text, 'main power bus shall operate at 24 V')).not.toBeNull()
    expect(findQuote(text, 'main power bus\nshall   operate at 24 v')).not.toBeNull()
    expect(findQuote(text, 'something that is not there')).toBeNull()
    expect(findQuote(text, 'ab')).toBeNull()
  })
  it('names the page, slide, or sheet', () => {
    const at = (q: string) => locationAt(text, findQuote(text, q)!.start)
    expect(at('Atlas Rover requirements')).toBe('Page 1')
    expect(at('main power bus')).toBe('Page 2')
    expect(at('CAN at 1 Mbit/s')).toBe('Slide 3')
    expect(at('Part: Motor')).toBe('Sheet "BOM"')
    expect(locationAt('no markers here', 3)).toBeNull()
  })
  it('returns a passage with context around the match', () => {
    const hit = locateQuote(text, 'Max current 15 A')!
    expect(hit.location).toBe('Page 2')
    expect(hit.passage.match).toBe('Max current 15 A')
    expect(hit.passage.before).toContain('R-101')
    expect(hit.passage.after).toContain('Slide 3')
  })
  it('trims long context to whole words with ellipses', () => {
    const long = `${'alpha beta '.repeat(100)}TARGET PHRASE${' gamma delta'.repeat(100)}`
    const p = passageAround(long, long.indexOf('TARGET'), long.indexOf('TARGET') + 13)
    expect(p.before.startsWith('…')).toBe(true)
    expect(p.after.endsWith('…')).toBe(true)
    expect(p.before.length).toBeLessThan(400)
    expect(p.match).toBe('TARGET PHRASE')
  })
  it('handles missing text', () => {
    expect(locateQuote(null, 'x quote')).toBeNull()
  })
})
