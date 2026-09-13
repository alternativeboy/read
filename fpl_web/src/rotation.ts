import type { GameweekKey, RotationPlan, Team, TeamFixture } from './types'

export interface WeekRotation {
  gameweek: number
  pickedTeamIds: number[]
  suggestedTeamId: number | null
  isManual: boolean
  difficulty: number | null
  fixtureCount: number
}

export interface ClubWeek {
  teamId: number
  fixtures: TeamFixture[]
  averageDifficulty: number
  rotationDifficulty: number
}

export function getClubWeek(teamId: number, fixtures: TeamFixture[], gameweek: number): ClubWeek | null {
  const clubFixtures = fixtures.filter((fixture) => fixture.event === gameweek && fixture.teamId === teamId)
  if (clubFixtures.length === 0) return null
  const mean = clubFixtures.reduce((sum, fixture) => sum + fixture.difficulty, 0) / clubFixtures.length
  return {
    teamId,
    fixtures: clubFixtures,
    averageDifficulty: mean,
    // A second fixture means a second opportunity for minutes and points. The
    // bonus makes a double attractive without pretending both matches are easy.
    rotationDifficulty: Math.max(1, mean - (clubFixtures.length - 1) * 0.75),
  }
}

export function getRotationWeeks(
  plan: Pick<RotationPlan, 'teamIds'> & Partial<Pick<RotationPlan, 'manualPicks'>>,
  fixtures: TeamFixture[],
  gameweeks: number[],
  teams: Pick<Team, 'id' | 'key'>[] = [],
): WeekRotation[] {
  if (plan.teamIds.length < 2) {
    return gameweeks.map((gameweek) => ({ gameweek, pickedTeamIds: [], suggestedTeamId: null, isManual: false, difficulty: null, fixtureCount: 0 }))
  }
  return gameweeks.map((gameweek) => {
    const options = plan.teamIds
      .flatMap((teamId) => getClubWeek(teamId, fixtures, gameweek) ?? [])
      .sort((a, b) => a.rotationDifficulty - b.rotationDifficulty || a.teamId - b.teamId)
    const suggested = options[0]
    const gameweekKey = `${gameweek}` as GameweekKey
    const manualKeys = plan.manualPicks?.[gameweekKey] ?? []
    const manualTeamIds = new Set(teams.filter((team) => manualKeys.includes(team.key)).map((team) => team.id))
    const manual = options.filter((option) => manualTeamIds.has(option.teamId))
    const picked = manual.length > 0 ? manual : suggested ? [suggested] : []
    const pickedDifficulty = picked.length > 0
      ? picked.reduce((sum, option) => sum + option.rotationDifficulty, 0) / picked.length
      : null

    return {
      gameweek,
      pickedTeamIds: picked.map((option) => option.teamId),
      suggestedTeamId: suggested?.teamId ?? null,
      isManual: manual.length > 0,
      difficulty: pickedDifficulty,
      fixtureCount: picked.reduce((sum, option) => sum + option.fixtures.length, 0),
    }
  })
}

export function rotationScore(weeks: WeekRotation[]): number {
  const available = weeks.filter((week) => week.difficulty !== null)
  if (available.length === 0) return 0
  const averageDifficulty = available.reduce((sum, week) => sum + (week.difficulty ?? 0), 0) / available.length
  const coverage = available.length / weeks.length
  return Math.max(0, Math.min(100, Math.round((6 - averageDifficulty) * 20 * coverage)))
}

export function averageDifficulty(weeks: WeekRotation[]): number {
  const values = weeks.flatMap((week) => (week.difficulty === null ? [] : [week.difficulty]))
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
