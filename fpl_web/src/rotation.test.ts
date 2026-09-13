import { describe, expect, it } from 'vitest'
import { averageDifficulty, getRotationWeeks, rotationScore } from './rotation'
import type { TeamFixture } from './types'

const fixtures: TeamFixture[] = [
  { event: 1, teamId: 1, opponentId: 10, venue: 'A', difficulty: 4 },
  { event: 1, teamId: 2, opponentId: 11, venue: 'H', difficulty: 2 },
  { event: 2, teamId: 1, opponentId: 12, venue: 'H', difficulty: 1 },
  { event: 2, teamId: 2, opponentId: 13, venue: 'A', difficulty: 3 },
]

describe('rotation planning', () => {
  it('chooses the easiest club in each gameweek', () => {
    const weeks = getRotationWeeks({ teamIds: [1, 2] }, fixtures, [1, 2])
    expect(weeks.map((week) => week.pickedTeamIds)).toEqual([[2], [1]])
    expect(weeks.map((week) => week.difficulty)).toEqual([2, 1])
  })

  it('calculates average fixture difficulty and a bounded score', () => {
    const weeks = getRotationWeeks({ teamIds: [1, 2] }, fixtures, [1, 2])
    expect(averageDifficulty(weeks)).toBe(1.5)
    expect(rotationScore(weeks)).toBe(90)
  })

  it('penalizes missing fixture coverage', () => {
    const weeks = getRotationWeeks({ teamIds: [1] }, fixtures, [1, 2, 3, 4])
    expect(rotationScore(weeks)).toBeLessThan(50)
  })

  it('accounts for every match in a double gameweek', () => {
    const doubleFixtures: TeamFixture[] = [
      ...fixtures,
      { event: 1, teamId: 1, opponentId: 14, venue: 'H', difficulty: 1 },
    ]
    const [week] = getRotationWeeks({ teamIds: [1, 2] }, doubleFixtures, [1])
    expect(week.pickedTeamIds).toEqual([1])
    expect(week.fixtureCount).toBe(2)
    expect(week.difficulty).toBe(1.75)
  })

  it('uses a saved manual choice while preserving the automatic suggestion', () => {
    const [week] = getRotationWeeks(
      { teamIds: [1, 2], manualPicks: { 1: ['ONE'] } },
      fixtures,
      [1],
      [{ id: 1, key: 'ONE' }, { id: 2, key: 'TWO' }],
    )
    expect(week.suggestedTeamId).toBe(2)
    expect(week.pickedTeamIds).toEqual([1])
    expect(week.isManual).toBe(true)
    expect(week.difficulty).toBe(4)
  })

  it('supports multiple manual picks in the same gameweek', () => {
    const [week] = getRotationWeeks(
      { teamIds: [1, 2], manualPicks: { 1: ['ONE', 'TWO'] } },
      fixtures,
      [1],
      [{ id: 1, key: 'ONE' }, { id: 2, key: 'TWO' }],
    )
    expect(week.pickedTeamIds).toEqual([2, 1])
    expect(week.suggestedTeamId).toBe(2)
    expect(week.difficulty).toBe(3)
    expect(week.isManual).toBe(true)
  })

  it('ignores a manual choice that is not part of the plan', () => {
    const [week] = getRotationWeeks(
      { teamIds: [1, 2], manualPicks: { 1: ['OTHER'] } },
      fixtures,
      [1],
      [{ id: 1, key: 'ONE' }, { id: 2, key: 'TWO' }, { id: 3, key: 'OTHER' }],
    )
    expect(week.pickedTeamIds).toEqual([2])
    expect(week.isManual).toBe(false)
  })

  it('supports rotations containing more than three clubs', () => {
    const expandedFixtures: TeamFixture[] = [
      ...fixtures,
      { event: 1, teamId: 3, opponentId: 14, venue: 'A', difficulty: 3 },
      { event: 1, teamId: 4, opponentId: 15, venue: 'H', difficulty: 1 },
    ]
    const [week] = getRotationWeeks({ teamIds: [1, 2, 3, 4] }, expandedFixtures, [1])
    expect(week.pickedTeamIds).toEqual([4])
    expect(week.difficulty).toBe(1)
  })
})
