import { describe, expect, it } from 'vitest'
import { updatePlanTeamSelection } from './plans'
import type { RotationPlan, Team } from './types'

const teams: Team[] = [
  { id: 1, key: 'ONE', name: 'One', shortName: 'ONE', strength: 3, colors: ['#000', '#fff'] },
  { id: 2, key: 'TWO', name: 'Two', shortName: 'TWO', strength: 3, colors: ['#000', '#fff'] },
  { id: 3, key: 'THR', name: 'Three', shortName: 'THR', strength: 3, colors: ['#000', '#fff'] },
]

const plan: RotationPlan = {
  id: 'plan',
  name: 'Original',
  teamIds: [1, 2],
  teamKeys: ['ONE', 'TWO'],
  manualPicks: { 5: ['ONE', 'TWO'], 6: ['TWO'] },
  status: 'active',
  note: 'Keep this note',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('updating a rotation team selection', () => {
  it('adds teams while preserving the rest of the saved plan', () => {
    const updated = updatePlanTeamSelection(plan, 'Expanded', [1, 2, 3], teams)
    expect(updated.teamIds).toEqual([1, 2, 3])
    expect(updated.teamKeys).toEqual(['ONE', 'TWO', 'THR'])
    expect(updated.name).toBe('Expanded')
    expect(updated.note).toBe('Keep this note')
    expect(updated.manualPicks).toEqual(plan.manualPicks)
  })

  it('clears manual picks for a removed team', () => {
    const updated = updatePlanTeamSelection(plan, plan.name, [1, 3], teams)
    expect(updated.manualPicks).toEqual({ 5: ['ONE'] })
  })
})
