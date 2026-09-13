import type { RotationPlan } from './types'

const STORAGE_KEY = 'touchline.rotation-plans.v2'

function isPlan(value: unknown): value is RotationPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<RotationPlan>
  return typeof plan.id === 'string'
    && typeof plan.name === 'string'
    && Array.isArray(plan.teamIds)
    && plan.teamIds.every((id) => typeof id === 'number')
    && Array.isArray(plan.teamKeys)
    && plan.teamKeys.every((key) => typeof key === 'string')
    && (plan.status === 'active' || plan.status === 'paused')
    && typeof plan.note === 'string'
    && typeof plan.createdAt === 'string'
}

export function loadPlans(): RotationPlan[] | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every(isPlan) ? parsed : null
  } catch {
    return null
  }
}

export function savePlans(plans: RotationPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch {
    // The planner remains usable when storage is blocked or full.
  }
}
