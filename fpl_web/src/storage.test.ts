import { describe, expect, it } from 'vitest'
import { normalizeManualPicks } from './storage'

describe('manual pick storage migration', () => {
  it('migrates old single picks and preserves multiple picks', () => {
    expect(normalizeManualPicks({ 5: 'ARS', 6: ['AVL', 'BOU'] })).toEqual({
      5: ['ARS'],
      6: ['AVL', 'BOU'],
    })
  })

  it('drops malformed entries and duplicate club keys', () => {
    expect(normalizeManualPicks({ nope: ['ARS'], 5: ['ARS', 'ARS', 2], 6: null })).toEqual({
      5: ['ARS'],
    })
  })
})
