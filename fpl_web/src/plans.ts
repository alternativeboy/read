import type { ManualPicks, RotationPlan, Team } from './types'

export function updatePlanTeamSelection(
  plan: RotationPlan,
  name: string,
  teamIds: number[],
  teams: Team[],
): RotationPlan {
  const teamKeys = teamIds.flatMap((id) => teams.find((team) => team.id === id)?.key ?? [])
  const manualPicks = Object.fromEntries(
    Object.entries(plan.manualPicks).filter(([, teamKey]) => teamKey && teamKeys.includes(teamKey)),
  ) as ManualPicks

  return { ...plan, name, teamIds, teamKeys, manualPicks }
}
