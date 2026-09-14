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
  /** D&D 5e-lite armor class */
  ac: number
  /** Walking speed in feet (5 ft per square) */
  speedFt: number
  attackBonus: number
  /** e.g. 1d8+3 */
  damageDice: string
  /** Attack reach/range in feet */
  rangeFt: number
}

export type Player = {
  id: string
  name: string
  role: string
  personality: string
  backstory: string
  stats: CharacterStats
  notes: string
  /** Resized JPEG/PNG data URL stored in CSV + localStorage (no image host). */
  portraitDataUrl: string
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

/** Dashboard modules the user can show/hide and place on a 2D desktop. */
export type ModuleId = 'place' | 'soundscape' | 'party' | 'cast' | 'encounters'

export type DashboardModule = {
  id: ModuleId
  visible: boolean
  /** Percent of the desktop canvas (0–100). */
  x: number
  y: number
  w: number
  h: number
}

export type ThemeConfig = {
  base: string
  accent: string
  text: string
}

export type WalkCell = {
  x: number
  y: number
}

export type MapBoard = {
  id: string
  locationId: string
  name: string
  cols: number
  rows: number
  squareFeet: number
  imageName: string
  /** Cached image for localStorage / in-session play */
  imageDataUrl: string
  walkable: WalkCell[]
}

export type TokenKind = 'player' | 'npc'

export type MapToken = {
  id: string
  kind: TokenKind
  characterId: string
  mapId: string
  gx: number
  gy: number
}

export type TableAction = 'move' | 'attack'

export type PendingAction = {
  id: string
  actorKind: TokenKind
  actorId: string
  action: TableAction
  targetGx: number | null
  targetGy: number | null
  targetId: string | null
  d20: number | null
  advantage: boolean
  disadvantage: boolean
  preview: string
}

export type WorkspaceMode = 'desktop' | 'map'

export type PublicTableState = {
  maps: MapBoard[]
  tokens: MapToken[]
  players: Player[]
  npcs: Npc[]
  pendingAction: PendingAction | null
  activeMapId: string | null
}

export type AppRole = 'dm' | 'player'

export type AppData = {
  locations: Location[]
  scenes: Scene[]
  players: Player[]
  npcs: Npc[]
  maps: MapBoard[]
  tokens: MapToken[]
  pendingAction: PendingAction | null
  activeLocationId: string | null
  activeSceneId: string | null
  activeMapId: string | null
  workspaceMode: WorkspaceMode
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
  { id: 'place', visible: true, x: 1, y: 1, w: 48, h: 54 },
  { id: 'soundscape', visible: true, x: 51, y: 1, w: 47, h: 24 },
  { id: 'party', visible: true, x: 51, y: 27, w: 47, h: 28 },
  { id: 'cast', visible: true, x: 1, y: 57, w: 48, h: 40 },
  { id: 'encounters', visible: true, x: 51, y: 57, w: 47, h: 40 },
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
  ac: 10,
  speedFt: 30,
  attackBonus: 2,
  damageDice: '1d6+2',
  rangeFt: 5,
})
