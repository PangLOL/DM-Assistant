import type { AppData, AudioClip, CharacterStats, Encounter, Location, Npc, Player, Scene } from '../types'
import { emptyStats } from '../types'

const STORAGE_KEY = 'dm-assistant-data-v1'

export function uid(): string {
  return crypto.randomUUID()
}

export function createLocation(partial?: Partial<Location>): Location {
  return {
    id: uid(),
    name: 'New Location',
    size: 'medium',
    biome: '',
    atmosphere: '',
    defaultWeather: 'Clear',
    defaultMusic: null,
    defaultAmbience: null,
    notes: '',
    ...partial,
  }
}

export function createScene(locationId: string, partial?: Partial<Scene>): Scene {
  return {
    id: uid(),
    locationId,
    name: 'New Scene',
    description: '',
    weather: '',
    music: null,
    ambience: null,
    encounters: [],
    npcIds: [],
    ...partial,
  }
}

export function createEncounter(partial?: Partial<Encounter>): Encounter {
  return {
    id: uid(),
    title: 'New Encounter',
    description: '',
    npcIds: [],
    ...partial,
  }
}

export function createPlayer(partial?: Partial<Player>): Player {
  return {
    id: uid(),
    name: 'New Player',
    role: '',
    personality: '',
    stats: emptyStats(),
    notes: '',
    ...partial,
  }
}

export function createNpc(partial?: Partial<Npc>): Npc {
  return {
    id: uid(),
    name: 'New NPC',
    kind: 'npc',
    role: '',
    personality: '',
    stats: emptyStats(),
    notes: '',
    ...partial,
  }
}

export function cloneStats(stats: CharacterStats): CharacterStats {
  return {
    ...stats,
    skills: stats.skills.map((s) => ({ ...s })),
    buffs: [...stats.buffs],
    debuffs: [...stats.debuffs],
    traits: [...stats.traits],
  }
}

const seedData = (): AppData => {
  const forest = createLocation({
    name: 'Whispering Grove',
    size: 'large',
    biome: 'Temperate forest',
    atmosphere: 'Damp moss, distant bird calls, shafts of pale light',
    defaultWeather: 'Light rain',
    defaultMusic: {
      youtubeUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      inPoint: 30,
      outPoint: null,
      label: 'Forest underscore',
    },
    defaultAmbience: {
      youtubeUrl: 'https://www.youtube.com/watch?v=OdIJ2x3qxYA',
      inPoint: 10,
      outPoint: null,
      label: 'Rain & leaves',
    },
    notes: 'Ancient trees. Paths fork toward the river and the ruined shrine.',
  })

  const tavern = createLocation({
    name: 'The Ember Lantern',
    size: 'small',
    biome: 'Urban / indoor',
    atmosphere: 'Warm firelight, pipe smoke, low chatter',
    defaultWeather: 'Indoor — storm outside',
    notes: 'Local hub for rumors and hiring.',
  })

  const scout = createNpc({
    name: 'Thorn',
    kind: 'enemy',
    role: 'Bandit scout',
    personality: 'Nervous, quick to flee',
    stats: {
      ...emptyStats(),
      hp: 8,
      maxHp: 8,
      armor: 1,
      attack: 3,
      initiative: 2,
      traits: ['Stealthy', 'Cowardly'],
      skills: [
        { id: uid(), name: 'Stealth', points: 4 },
        { id: uid(), name: 'Perception', points: 2 },
      ],
    },
  })

  const keeper = createNpc({
    name: 'Mira Vale',
    kind: 'npc',
    role: 'Innkeeper',
    personality: 'Warm but shrewd',
    stats: {
      ...emptyStats(),
      hp: 12,
      maxHp: 12,
      traits: ['Well-connected'],
      skills: [{ id: uid(), name: 'Persuasion', points: 3 }],
    },
  })

  const groveGate = createScene(forest.id, {
    name: 'Grove Gate',
    description: 'A mossy stone arch marks the entrance. Footprints in the mud lead inward.',
    weather: 'Light rain',
    encounters: [
      createEncounter({
        title: 'Ambush on the path',
        description: 'Thorn and two lackeys try to rob travelers before they reach the shrine road.',
        npcIds: [scout.id],
      }),
    ],
    npcIds: [scout.id],
  })

  const commonRoom = createScene(tavern.id, {
    name: 'Common Room',
    description: 'Crowded tables, a roaring hearth, and a notice board by the bar.',
    encounters: [
      createEncounter({
        title: 'Rumor of the grove',
        description: 'Mira shares that bandits have been shadowing pilgrims near Whispering Grove.',
        npcIds: [keeper.id],
      }),
    ],
    npcIds: [keeper.id],
  })

  const player = createPlayer({
    name: 'Aerin Sol',
    role: 'Ranger',
    personality: 'Quiet, loyal, dry humor',
    stats: {
      ...emptyStats(),
      hp: 18,
      maxHp: 18,
      skillPoints: 2,
      armor: 2,
      attack: 5,
      initiative: 3,
      traits: ['Tracker', 'Beast affinity'],
      skills: [
        { id: uid(), name: 'Survival', points: 5 },
        { id: uid(), name: 'Archery', points: 4 },
      ],
      buffs: [],
      debuffs: [],
    },
  })

  return {
    locations: [forest, tavern],
    scenes: [groveGate, commonRoom],
    players: [player],
    npcs: [scout, keeper],
    activeLocationId: forest.id,
    activeSceneId: groveGate.id,
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.locations || !parsed.scenes || !parsed.players || !parsed.npcs) {
      return seedData()
    }
    return parsed
  } catch {
    return seedData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json) as AppData
  if (!parsed.locations || !parsed.scenes || !parsed.players || !parsed.npcs) {
    throw new Error('Invalid DM Assistant data')
  }
  return {
    activeLocationId: parsed.activeLocationId ?? null,
    activeSceneId: parsed.activeSceneId ?? null,
    locations: parsed.locations,
    scenes: parsed.scenes,
    players: parsed.players,
    npcs: parsed.npcs,
  }
}

export function clipSummary(clip: AudioClip | null | undefined): string {
  if (!clip?.youtubeUrl) return 'None'
  const label = clip.label?.trim() || 'YouTube clip'
  const out = clip.outPoint == null ? 'end' : `${clip.outPoint}s`
  return `${label} (${clip.inPoint}s → ${out})`
}
