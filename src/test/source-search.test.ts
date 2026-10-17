import { describe, expect, it } from 'vitest'
import { anchorTerm, escapeLike, searchText } from '@/lib/source-search'

const text = '[Page 1]\nAtlas Rover overview. CAN is used throughout.\n\n[Page 2]\nR-201: All controllers use CAN bus at 500 kbit/s.\nThe can\nbus is terminated at both ends.\n\n[Slide 3]\nDecision: CAN bus at 1 Mbit/s. Voltage 24 V (approved).\n\n[Sheet: BOM]\nPart: Motor | Voltage: 12'

describe('searchText', () => {
  it('finds every occurrence, case-insensitively, with its location', () => {
    const r = searchText(text, 'can', 10)
    expect(r.total).toBe(4)
    expect(r.hits.map(h => h.location)).toEqual(['Page 1', 'Page 2', 'Page 2', 'Slide 3'])
  })

  it('matches a phrase across line breaks and reports page, slide, and sheet', () => {
    const r = searchText(text, 'CAN bus')
    expect(r.total).toBe(3)
    expect(r.hits.map(h => h.location)).toEqual(['Page 2', 'Page 2', 'Slide 3'])
    expect(r.hits[0].passage.match).toBe('CAN bus')
    expect(r.hits[0].passage.after).toContain('500 kbit/s')
  })

  it('caps the number of passages but still counts all matches', () => {
    const r = searchText(text, 'CAN bus', 1)
    expect(r.total).toBe(3)
    expect(r.hits).toHaveLength(1)
  })

  it('treats the query literally, not as a pattern', () => {
    expect(searchText('price is (a+b)* here', '(a+b)*').total).toBe(1)
    expect(searchText('a.c abc', 'a.c').total).toBe(1)
    expect(searchText(text, '.*').total).toBe(0)
  })

  it('finds values with units and locates sheets', () => {
    expect(searchText(text, '24 V').hits[0].location).toBe('Slide 3')
    expect(searchText(text, 'Part: Motor').hits[0].location).toBe('Sheet "BOM"')
  })

  it('returns nothing for empty or too-short queries and missing words', () => {
    expect(searchText(text, ' ').total).toBe(0)
    expect(searchText(text, 'a').total).toBe(0)
    expect(searchText(text, 'hydraulic').total).toBe(0)
  })
})

describe('database narrowing helpers', () => {
  it('picks the longest word as the anchor', () => {
    expect(anchorTerm('main  power bus')).toBe('power')
    expect(anchorTerm('  CAN ')).toBe('CAN')
  })
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('100%_done\\x')).toBe('100\\%\\_done\\\\x')
  })
})
