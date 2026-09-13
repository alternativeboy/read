export type PlanStatus = 'active' | 'paused'

export interface Team {
  id: number
  key: string
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
