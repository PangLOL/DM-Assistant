import type {
  AppData,
  AudioClip,
  CharacterStats,
  DashboardModule,
  Encounter,
  Location,
  MapBoard,
  MapToken,
  ModuleId,
  Npc,
  Player,
  Scene,
  ThemeConfig,
} from '../types'
import { DEFAULT_MODULES, DEFAULT_THEME, emptyStats } from '../types'

const STORAGE_KEY = 'dm-assistant-data-v3'
const LEGACY_KEYS = ['dm-assistant-data-v2', 'dm-assistant-data-v1']

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
    backstory: '',
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

export function createMap(locationId: string, partial?: Partial<MapBoard>): MapBoard {
  return {
    id: uid(),
    locationId,
    name: 'New map',
    cols: 25,
    rows: 25,
    squareFeet: 5,
    imageName: '',
    imageDataUrl: '',
    walkable: [],
    ...partial,
  }
}

export function createToken(partial: Omit<MapToken, 'id'> & { id?: string }): MapToken {
  return {
    id: partial.id ?? uid(),
    kind: partial.kind,
    characterId: partial.characterId,
    mapId: partial.mapId,
    gx: partial.gx,
    gy: partial.gy,
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

export function normalizeStats(stats: Partial<CharacterStats> | undefined): CharacterStats {
  const base = emptyStats()
  const merged = { ...base, ...stats }
  merged.skills = (stats?.skills ?? []).map((s) => ({ ...s }))
  merged.buffs = [...(stats?.buffs ?? [])]
  merged.debuffs = [...(stats?.debuffs ?? [])]
  merged.traits = [...(stats?.traits ?? [])]
  if (stats?.ac == null && stats?.armor != null) {
    merged.ac = stats.armor > 0 ? 10 + Number(stats.armor) : 10
  }
  if (stats?.attackBonus == null && stats?.attack != null) {
    merged.attackBonus = Number(stats.attack)
  }
  return merged
}

function normalizeModules(modules: DashboardModule[] | undefined): DashboardModule[] {
  const byId = new Map((modules ?? []).map((m) => [m.id, m]))
  const ordered: DashboardModule[] = []
  const seen = new Set<ModuleId>()

  const source = modules ?? DEFAULT_MODULES
  for (const m of source) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    const def = DEFAULT_MODULES.find((d) => d.id === m.id) ?? DEFAULT_MODULES[0]
    ordered.push({
      id: m.id,
      visible: m.visible !== false,
      x: m.x ?? def.x,
      y: m.y ?? def.y,
      w: m.w ?? def.w,
      h: m.h ?? def.h,
    })
  }
  for (const def of DEFAULT_MODULES) {
    if (!seen.has(def.id)) {
      const existing = byId.get(def.id)
      ordered.push({
        ...def,
        visible: existing ? existing.visible !== false : def.visible,
        x: existing?.x ?? def.x,
        y: existing?.y ?? def.y,
        w: existing?.w ?? def.w,
        h: existing?.h ?? def.h,
      })
    }
  }
  return ordered
}

function normalizeTheme(theme: Partial<ThemeConfig> | undefined): ThemeConfig {
  return {
    base: theme?.base || DEFAULT_THEME.base,
    accent: theme?.accent || DEFAULT_THEME.accent,
    text: theme?.text || DEFAULT_THEME.text,
  }
}

export function normalizeData(raw: Partial<AppData>): AppData {
  const locations = raw.locations ?? []
  const scenes = raw.scenes ?? []
  let activeLocationId = raw.activeLocationId ?? locations[0]?.id ?? null
  if (activeLocationId && !locations.some((l) => l.id === activeLocationId)) {
    activeLocationId = locations[0]?.id ?? null
  }

  let activeSceneId = raw.activeSceneId ?? null
  if (activeSceneId) {
    const scene = scenes.find((s) => s.id === activeSceneId)
    if (!scene || (activeLocationId && scene.locationId !== activeLocationId)) {
      activeSceneId = null
    }
  }

  const maps = (raw.maps ?? []).map((m) => ({
    ...m,
    walkable: m.walkable ?? [],
    imageDataUrl: m.imageDataUrl ?? '',
    imageName: m.imageName ?? '',
    squareFeet: m.squareFeet || 5,
  }))

  let activeMapId = raw.activeMapId ?? maps.find((m) => m.locationId === activeLocationId)?.id ?? maps[0]?.id ?? null
  if (activeMapId && !maps.some((m) => m.id === activeMapId)) {
    activeMapId = maps[0]?.id ?? null
  }

  return {
    locations,
    scenes,
    players: (raw.players ?? []).map((p) => ({
      ...p,
      backstory: p.backstory ?? '',
      stats: normalizeStats(p.stats),
    })),
    npcs: (raw.npcs ?? []).map((n) => ({
      ...n,
      stats: normalizeStats(n.stats),
    })),
    maps,
    tokens: raw.tokens ?? [],
    pendingAction: raw.pendingAction ?? null,
    activeLocationId,
    activeSceneId,
    activeMapId,
    workspaceMode: raw.workspaceMode === 'map' ? 'map' : 'desktop',
    theme: normalizeTheme(raw.theme),
    modules: normalizeModules(raw.modules),
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
      ac: 13,
      speedFt: 30,
      attackBonus: 3,
      damageDice: '1d6+1',
      rangeFt: 5,
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
      ac: 10,
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
    backstory: 'A grove warden who tracks pilgrims missing on the shrine road.',
    stats: {
      ...emptyStats(),
      hp: 18,
      maxHp: 18,
      skillPoints: 2,
      armor: 2,
      attack: 5,
      initiative: 3,
      ac: 14,
      speedFt: 30,
      attackBonus: 5,
      damageDice: '1d8+3',
      rangeFt: 150,
      traits: ['Tracker', 'Beast affinity'],
      skills: [
        { id: uid(), name: 'Survival', points: 5 },
        { id: uid(), name: 'Archery', points: 4 },
      ],
      buffs: [],
      debuffs: [],
    },
  })

  const groveMap = createMap(forest.id, {
    name: 'Grove path',
    cols: 12,
    rows: 12,
    imageName: 'grove-path.png',
    walkable: (() => {
      const cells = []
      for (let y = 2; y <= 9; y++) {
        for (let x = 2; x <= 9; x++) cells.push({ x, y })
      }
      return cells
    })(),
  })

  return normalizeData({
    locations: [forest, tavern],
    scenes: [groveGate, commonRoom],
    players: [player],
    npcs: [scout, keeper],
    maps: [groveMap],
    tokens: [
      createToken({ kind: 'player', characterId: player.id, mapId: groveMap.id, gx: 3, gy: 8 }),
      createToken({ kind: 'npc', characterId: scout.id, mapId: groveMap.id, gx: 8, gy: 3 }),
    ],
    pendingAction: null,
    activeLocationId: forest.id,
    activeSceneId: null,
    activeMapId: groveMap.id,
    workspaceMode: 'desktop',
    theme: DEFAULT_THEME,
    modules: DEFAULT_MODULES,
  })
}

export function loadData(): AppData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key)
        if (raw) break
      }
    }
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed.locations || !parsed.scenes || !parsed.players || !parsed.npcs) {
      return seedData()
    }
    return normalizeData(parsed)
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
  const parsed = JSON.parse(json) as Partial<AppData>
  if (!parsed.locations || !parsed.scenes || !parsed.players || !parsed.npcs) {
    throw new Error('Invalid DM Assistant data')
  }
  return normalizeData(parsed)
}

export function clipSummary(clip: AudioClip | null | undefined): string {
  if (!clip?.youtubeUrl) return 'None'
  const label = clip.label?.trim() || 'YouTube clip'
  const out = clip.outPoint == null ? 'end' : `${clip.outPoint}s`
  return `${label} (${clip.inPoint}s → ${out})`
}

export function emptyPlayData(): AppData {
  return normalizeData({
    locations: [],
    scenes: [],
    players: [],
    npcs: [],
    maps: [],
    tokens: [],
    pendingAction: null,
    activeLocationId: null,
    activeSceneId: null,
    activeMapId: null,
    workspaceMode: 'map',
    theme: DEFAULT_THEME,
    modules: DEFAULT_MODULES,
  })
}

export function loadPlayData(): AppData {
  try {
    const raw = localStorage.getItem('dm-assistant-play-v3')
    if (!raw) return emptyPlayData()
    return normalizeData(JSON.parse(raw) as Partial<AppData>)
  } catch {
    return emptyPlayData()
  }
}

export function savePlayData(data: AppData) {
  localStorage.setItem('dm-assistant-play-v3', JSON.stringify(data))
}

export function resetStorageKeys() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('dm-assistant-play-v3')
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
}
