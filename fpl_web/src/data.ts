import type { FplData, Team, TeamFixture } from './types'

interface ApiTeam {
  id: number
  name: string
  short_name: string
  strength: number
  code: number
}

interface ApiEvent {
  id: number
  finished: boolean
  is_current: boolean
  is_next: boolean
}

interface ApiBootstrap {
  teams: ApiTeam[]
  events: ApiEvent[]
}

interface ApiFixture {
  event: number | null
  team_h: number
  team_a: number
  team_h_difficulty: number
  team_a_difficulty: number
}

const PALETTES: [string, string][] = [
  ['#ef4444', '#fff'], ['#3b82f6', '#fff'], ['#f59e0b', '#1f2937'], ['#8b5cf6', '#fff'],
  ['#10b981', '#fff'], ['#ec4899', '#fff'], ['#06b6d4', '#123'], ['#f97316', '#fff'],
]

function paletteFor(code: number): [string, string] {
  return PALETTES[Math.abs(code) % PALETTES.length]
}

function toTeam(team: ApiTeam): Team {
  return {
    id: team.id,
    key: team.short_name,
    name: team.name,
    shortName: team.short_name,
    strength: team.strength,
    colors: paletteFor(team.code),
  }
}

function expandFixture(fixture: ApiFixture): TeamFixture[] {
  if (fixture.event === null) return []
  return [
    {
      event: fixture.event,
      teamId: fixture.team_h,
      opponentId: fixture.team_a,
      venue: 'H',
      difficulty: fixture.team_h_difficulty,
    },
    {
      event: fixture.event,
      teamId: fixture.team_a,
      opponentId: fixture.team_h,
      venue: 'A',
      difficulty: fixture.team_a_difficulty,
    },
  ]
}

export async function loadFplData(): Promise<FplData> {
  try {
    const apiBase = import.meta.env.DEV
      ? '/fpl-api'
      : (import.meta.env.VITE_FPL_API_BASE_URL ?? 'https://fantasy.premierleague.com/api')
    const signal = AbortSignal.timeout(6000)
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch(`${apiBase}/bootstrap-static/`, { signal }),
      fetch(`${apiBase}/fixtures/`, { signal }),
    ])
    if (!bootstrapResponse.ok || !fixturesResponse.ok) throw new Error('FPL data request failed')

    const bootstrap = (await bootstrapResponse.json()) as ApiBootstrap
    const apiFixtures = (await fixturesResponse.json()) as ApiFixture[]
    const nextEvent = bootstrap.events.find((event) => event.is_next)?.id
      ?? bootstrap.events.find((event) => event.is_current)?.id
      ?? bootstrap.events.find((event) => !event.finished)?.id
      ?? 1
    const gameweeks = Array.from({ length: Math.min(8, 39 - nextEvent) }, (_, index) => nextEvent + index)

    return {
      teams: bootstrap.teams.map(toTeam),
      fixtures: apiFixtures.flatMap(expandFixture),
      gameweeks,
      isLive: true,
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return createDemoData()
  }
}

function createDemoData(): FplData {
  const names = [
    ['Arsenal', 'ARS'], ['Aston Villa', 'AVL'], ['Bournemouth', 'BOU'], ['Brentford', 'BRE'],
    ['Brighton', 'BHA'], ['Chelsea', 'CHE'], ['Crystal Palace', 'CRY'], ['Everton', 'EVE'],
    ['Fulham', 'FUL'], ['Liverpool', 'LIV'], ['Manchester City', 'MCI'], ['Manchester Utd', 'MUN'],
    ['Newcastle', 'NEW'], ['Nottingham Forest', 'NFO'], ['Sunderland', 'SUN'], ['Tottenham', 'TOT'],
    ['West Ham', 'WHU'], ['Wolves', 'WOL'], ['Leeds', 'LEE'], ['Burnley', 'BUR'],
  ]
  const teams: Team[] = names.map(([name, shortName], index) => ({
    id: index + 1,
    key: shortName,
    name,
    shortName,
    strength: 2 + ((index * 7) % 4),
    colors: PALETTES[index % PALETTES.length],
  }))
  const gameweeks = [1, 2, 3, 4, 5, 6, 7, 8]
  const fixtures: TeamFixture[] = []

  for (const gameweek of gameweeks) {
    for (const team of teams) {
      const opponentIndex = (team.id + gameweek * 3 - 1) % teams.length
      const opponent = teams[opponentIndex]
      const venue = (team.id + gameweek) % 2 === 0 ? 'H' : 'A'
      fixtures.push({
        event: gameweek,
        teamId: team.id,
        opponentId: opponent.id,
        venue,
        difficulty: Math.max(1, Math.min(5, opponent.strength + (venue === 'A' ? 0 : -1))),
      })
    }
  }

  return {
    teams,
    fixtures,
    gameweeks,
    isLive: false,
    updatedAt: new Date().toISOString(),
  }
}

export const demoData = createDemoData()
