import type { TeamId } from '../types'
import { TEAM_IDS } from '../data/seed'

const TEAM_STORAGE_KEY = 'huashanArchiveRunTeamId'

export function isTeamId(value: string | null | undefined): value is TeamId {
  return TEAM_IDS.includes(value as TeamId)
}

export function getStoredTeamId(): TeamId | null {
  const value = window.localStorage.getItem(TEAM_STORAGE_KEY)
  return isTeamId(value) ? value : null
}

export function storeTeamId(teamId: TeamId) {
  window.localStorage.setItem(TEAM_STORAGE_KEY, teamId)
}

export function clearStoredTeamId() {
  window.localStorage.removeItem(TEAM_STORAGE_KEY)
}
