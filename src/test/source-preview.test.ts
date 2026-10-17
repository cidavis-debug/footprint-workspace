import { describe, expect, it } from 'vitest'
import { countMatches, highlightParts, phrasePattern, splitSections } from '@/lib/source-preview'

const doc = '[Page 1]\nAtlas Rover overview.\n\n[Page 2]\nR-101: bus at 24 V.\nCAN bus at 500 kbit/s.\n\n[Slide 3]\nDecision: CAN bus at 1 Mbit/s.\n\n[Sheet: BOM]\nPart: Motor | Voltage: 12'

describe('splitSections', () => {
  it('splits at page, slide, and sheet markers and labels each section', () => {
    expect(splitSections(doc)).toEqual([
      { label: 'Page 1', text: 'Atlas Rover overview.' },
      { label: 'Page 2', text: 'R-101: bus at 24 V.\nCAN bus at 500 kbit/s.' },
      { label: 'Slide 3', text: 'Decision: CAN bus at 1 Mbit/s.' },
      { label: 'Sheet "BOM"', text: 'Part: Motor | Voltage: 12' },
    ])
  })
  it('keeps text without markers as one unlabelled section, and text before the first marker', () => {
    expect(splitSections('Just some notes.\n\nSecond paragraph.')).toEqual([{ label: null, text: 'Just some notes.\n\nSecond paragraph.' }])
    expect(splitSections('Intro line\n[Page 1]\nBody')).toEqual([{ label: null, text: 'Intro line' }, { label: 'Page 1', text: 'Body' }])
  })
  it('does not treat markers in the middle of a line as sections', () => {
    expect(splitSections('see [Page 2] for details')).toEqual([{ label: null, text: 'see [Page 2] for details' }])
  })
  it('handles empty text and empty sections', () => {
    expect(splitSections('')).toEqual([])
    expect(splitSections('[Page 1]\n\n[Page 2]\nText')).toEqual([{ label: 'Page 1', text: '' }, { label: 'Page 2', text: 'Text' }])
  })
})

describe('highlighting', () => {
  it('splits text into plain and matching parts, case-insensitively and across line breaks', () => {
    expect(highlightParts('The CAN bus runs; can\nbus too', 'can bus')).toEqual([
      { text: 'The ', hit: false }, { text: 'CAN bus', hit: true }, { text: ' runs; ', hit: false }, { text: 'can\nbus', hit: true }, { text: ' too', hit: false },
    ])
  })
  it('returns the text untouched for short or missing queries', () => {
    expect(highlightParts('abc', '')).toEqual([{ text: 'abc', hit: false }])
    expect(highlightParts('abc', 'a')).toEqual([{ text: 'abc', hit: false }])
    expect(phrasePattern(' ')).toBeNull()
  })
  it('treats the query literally', () => {
    expect(highlightParts('cost (a+b)* total', '(a+b)*').filter(p => p.hit)).toHaveLength(1)
    expect(highlightParts('anything', '.*').some(p => p.hit)).toBe(false)
  })
  it('counts matches across sections', () => {
    expect(countMatches(splitSections(doc), 'CAN bus')).toBe(2)
    expect(countMatches(splitSections(doc), 'nothing here')).toBe(0)
    expect(countMatches(splitSections(doc), 'x')).toBe(0)
  })
})
