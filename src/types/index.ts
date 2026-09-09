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

export type AppData = {
  locations: Location[]
  scenes: Scene[]
  players: Player[]
  npcs: Npc[]
  activeLocationId: string | null
  activeSceneId: string | null
}

export type NavView =
  | 'session'
  | 'world'
  | 'scenes'
  | 'players'
  | 'npcs'
  | 'audio'

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
