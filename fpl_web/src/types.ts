export type PlanStatus = 'active' | 'paused'
export type TeamKey = string
export type GameweekKey = `${number}`
export type ManualPicks = Partial<Record<GameweekKey, TeamKey>>

export interface Team {
  id: number
  key: TeamKey
  name: string
  shortName: string
  strength: number
  colors: [string, string]
}

export interface TeamFixture {
  event: number
  teamId: number
  opponentId: number
  venue: 'H' | 'A'
  difficulty: number
}

export interface RotationPlan {
  id: string
  name: string
  teamIds: number[]
  teamKeys: string[]
  manualPicks: ManualPicks
  status: PlanStatus
  note: string
  createdAt: string
}

export interface FplData {
  teams: Team[]
  fixtures: TeamFixture[]
  gameweeks: number[]
  isLive: boolean
  updatedAt: string
}
