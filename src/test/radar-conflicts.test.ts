import { describe, expect, it } from 'vitest'
import { conflictHints, numericMismatch, type MatchClaim } from '@/lib/claim-match'

/** Encodes demo-files/EXPECTED_CONFLICTS.md for the deterministic part only: the numeric hints given to the model. Whether Gemini then raises an alert is not tested here. */
const c = (subject: string, attribute: string, value: string, unit: string | null = null, systems: string[] = []): MatchClaim => ({ subject, attribute, value, unit, affected_systems: systems })

describe('Atlas Rover planted conflicts (deterministic hints)', () => {
  const pairs: [string, MatchClaim, MatchClaim][] = [
    ['1 bus voltage', c('Main power bus', 'nominal voltage', '24', 'V'), c('Main bus', 'voltage', '12', 'V')],
    ['2 bus current', c('Main power bus', 'continuous current', '15', 'A'), c('Main power bus', 'continuous current', '10', 'A')],
    ['3 CAN bit rate', c('CAN bus', 'bit rate', '500', 'kbit/s'), c('CAN bus', 'bit rate', '1', 'Mbit/s')],
    ['4 operating temperature', c('Operating temperature', 'ambient range', '-20 to 60', '°C'), c('Operating temperature', 'ambient range', '-10 to 50', '°C')],
  ]
  it.each(pairs)('flags %s', (_name, existing, fresh) => {
    expect(numericMismatch(fresh, existing)).not.toBeNull()
    expect(conflictHints([fresh], [existing])).toHaveLength(1)
  })
  it('reports the expected values in the hint text', () => {
    expect(numericMismatch(c('Bus', 'voltage', '24', 'V'), c('Bus', 'voltage', '12', 'V'))).toBe('24 V vs 12 V')
    expect(numericMismatch(c('Bus', 'current', '15', 'A'), c('Bus', 'current', '10', 'A'))).toBe('15 A vs 10 A')
    expect(numericMismatch(c('CAN', 'rate', '500', 'kbit/s'), c('CAN', 'rate', '1', 'Mbit/s'))).toBe('500 kbit/s vs 1 Mbit/s')
    expect(numericMismatch(c('Env', 'range', '-20 to 60', '°C'), c('Env', 'range', '-10 to 50', '°C'))).toBe('-20 to 60 °C vs -10 to 50 °C')
  })
  it('gives no hint for the agreeing values (18 kg mass, 5 GHz Wi-Fi), even when written differently', () => {
    expect(numericMismatch(c('Rover', 'mass', '18', 'kg'), c('Rover', 'mass', '18', 'kg'))).toBeNull()
    expect(numericMismatch(c('Rover', 'mass', '18000', 'g'), c('Rover', 'mass', '18', 'kg'))).toBeNull()
    expect(numericMismatch(c('Wi-Fi', 'band', '5', 'GHz'), c('Wi-Fi', 'band', '5', 'GHz'))).toBeNull()
    expect(numericMismatch(c('Wi-Fi', 'band', '5000', 'MHz'), c('Wi-Fi', 'band', '5', 'GHz'))).toBeNull()
  })
  it('hints only the four numeric conflicts when all claims are compared together', () => {
    const existing = [...pairs.map(p => p[1]), c('Rover', 'mass', '18', 'kg'), c('Wi-Fi', 'band', '5', 'GHz'), c('Enclosure', 'rating', 'IP54')]
    const fresh = [...pairs.map(p => p[2]), c('Rover', 'mass', '18', 'kg'), c('Wi-Fi', 'band', '5', 'GHz')]
    expect(conflictHints(fresh, existing).map(h => h.newIndex).sort()).toEqual([0, 1, 2, 3])
  })
  it('leaves non-numeric mismatches (IP54 vs IP65) to the model, with no hint', () => {
    expect(conflictHints([c('Enclosure', 'rating', 'IP65')], [c('Enclosure', 'rating', 'IP54')])).toEqual([])
  })
})
