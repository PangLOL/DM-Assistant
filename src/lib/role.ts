import type { AppRole, Player } from '../types'
import { createPlayer } from '../data/storage'

export const ROLE_STORAGE_KEY = 'dm-assistant-role'
export const MY_CHARACTER_KEY = 'dm-assistant-my-character'

export function readStoredRole(): AppRole | null {
  try {
    const value = localStorage.getItem(ROLE_STORAGE_KEY)
    if (value === 'dm' || value === 'player') return value
  } catch {
    /* ignore quota / private mode */
  }
  return null
}

export function writeStoredRole(role: AppRole | null) {
  try {
    if (!role) localStorage.removeItem(ROLE_STORAGE_KEY)
    else localStorage.setItem(ROLE_STORAGE_KEY, role)
  } catch {
    /* ignore */
  }
}

export function resolveInitialRole(search = window.location.search): AppRole | null {
  const params = new URLSearchParams(search)
  if (params.get('room')) return 'player'
  const queryRole = params.get('role')
  if (queryRole === 'player' || queryRole === 'dm') return queryRole
  return readStoredRole()
}

export function loadMyCharacter(): Player | null {
  try {
    const raw = localStorage.getItem(MY_CHARACTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Player>
    if (!parsed || typeof parsed !== 'object') return null
    const player = createPlayer(parsed)
    if (parsed.id) player.id = parsed.id
    return player
  } catch {
    return null
  }
}

export function saveMyCharacter(player: Player | null) {
  try {
    if (!player) localStorage.removeItem(MY_CHARACTER_KEY)
    else localStorage.setItem(MY_CHARACTER_KEY, JSON.stringify(player))
  } catch {
    /* ignore */
  }
}

export function playerJoinUrl(room: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('role', 'player')
  url.searchParams.set('room', room.toUpperCase())
  return url.toString()
}
