export type AudioClip = {
  youtubeUrl: string
  inPoint: number
  outPoint: number | null
  label: string
}

export type LocationSize = 'tiny' | 'small' | 'medium' | 'large' | 'vast' | 'custom'

export type Location = {
  id: string
  name: string
  size: LocationSize
  customSize?: string
  biome: string
  atmosphere: string
  defaultWeather: string
  defaultMusic: AudioClip | null
  defaultAmbience: AudioClip | null
  notes: string
}

export type Skill = {
  id: string
  name: string
  points: number
}

export type CharacterStats = {
  hp: number
  maxHp: number
  skillPoints: number
  skills: Skill[]
  buffs: string[]
  debuffs: string[]
  traits: string[]
  armor: number
  attack: number
  initiative: number
}

export type Player = {
  id: string
  name: string
  role: string
  personality: string
  stats: CharacterStats
  notes: string
}

export type NpcKind = 'enemy' | 'npc' | 'ally'

export type Npc = {
  id: string
  name: string
  kind: NpcKind
  role: string
  personality: string
  stats: CharacterStats
  notes: string
}

export type Encounter = {
  id: string
  title: string
  description: string
  npcIds: string[]
}

export type Scene = {
  id: string
  locationId: string
  name: string
  description: string
  weather: string
  music: AudioClip | null
  ambience: AudioClip | null
  encounters: Encounter[]
  npcIds: string[]
}

/** Dashboard modules the user can show/hide and reorder. */
export type ModuleId = 'place' | 'soundscape' | 'party' | 'cast' | 'encounters'

export type DashboardModule = {
  id: ModuleId
  visible: boolean
}

export type ThemeConfig = {
  /** Page / panel surface base color */
  base: string
  /** Accent / interactive color */
  accent: string
  /** Primary text color */
  text: string
}

export type AppData = {
  locations: Location[]
  scenes: Scene[]
  players: Player[]
  npcs: Npc[]
  /** Currently toggled location (only one). */
  activeLocationId: string | null
  /**
   * Active scene within the toggled location.
   * `null` means the location's Default scene (defaults for weather/audio/atmosphere).
   */
  activeSceneId: string | null
  theme: ThemeConfig
  modules: DashboardModule[]
}

export type NavView =
  | 'dashboard'
  | 'world'
  | 'scenes'
  | 'players'
  | 'npcs'
  | 'audio'
  | 'customize'

export const MODULE_LABELS: Record<ModuleId, string> = {
  place: 'Place & scene',
  soundscape: 'Soundscape',
  party: 'Party tracker',
  cast: 'Scene cast',
  encounters: 'Encounters',
}

export const DEFAULT_THEME: ThemeConfig = {
  base: '#e7eef0',
  accent: '#1f4a42',
  text: '#142824',
}

export const DEFAULT_MODULES: DashboardModule[] = [
  { id: 'place', visible: true },
  { id: 'soundscape', visible: true },
  { id: 'party', visible: true },
  { id: 'cast', visible: true },
  { id: 'encounters', visible: true },
]

export const emptyAudioClip = (): AudioClip => ({
  youtubeUrl: '',
  inPoint: 0,
  outPoint: null,
  label: '',
})

export const emptyStats = (): CharacterStats => ({
  hp: 10,
  maxHp: 10,
  skillPoints: 0,
  skills: [],
  buffs: [],
  debuffs: [],
  traits: [],
  armor: 0,
  attack: 0,
  initiative: 0,
})
