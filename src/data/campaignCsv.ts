import type {
  AppData,
  AudioClip,
  CharacterStats,
  MapBoard,
  MapToken,
  ModuleId,
  Npc,
  PendingAction,
  Player,
  WalkCell,
} from '../types'
import { DEFAULT_MODULES, DEFAULT_THEME, emptyStats } from '../types'
import { parseCsv, toCsv } from '../lib/csv'
import { createPlayer, uid } from './storage'

export type CampaignSlice = 'config' | 'music' | 'map' | 'save'

export const MASTER_CSV = toCsv(
  ['kind', 'path'],
  [
    { kind: 'config', path: 'config.csv' },
    { kind: 'music', path: 'music.csv' },
    { kind: 'map', path: 'maps.csv' },
    { kind: 'save', path: 'save.csv' },
  ],
)

export function exportConfigCsv(data: AppData): string {
  const rows: Array<Record<string, string | number | boolean>> = [
    { key: 'theme.base', value: data.theme.base },
    { key: 'theme.accent', value: data.theme.accent },
    { key: 'theme.text', value: data.theme.text },
  ]
  data.modules.forEach((m) => {
    rows.push({ key: `module.${m.id}.visible`, value: m.visible })
    rows.push({ key: `module.${m.id}.x`, value: m.x })
    rows.push({ key: `module.${m.id}.y`, value: m.y })
    rows.push({ key: `module.${m.id}.w`, value: m.w })
    rows.push({ key: `module.${m.id}.h`, value: m.h })
  })
  return toCsv(['key', 'value'], rows)
}

export function applyConfigCsv(data: AppData, csv: string): AppData {
  const rows = parseCsv(csv)
  const theme = { ...data.theme }
  const modules = data.modules.map((m) => ({ ...m }))
  const byId = new Map(modules.map((m) => [m.id, m]))

  for (const row of rows) {
    const key = row.key ?? ''
    const value = row.value ?? ''
    if (key === 'theme.base') theme.base = value || DEFAULT_THEME.base
    else if (key === 'theme.accent') theme.accent = value || DEFAULT_THEME.accent
    else if (key === 'theme.text') theme.text = value || DEFAULT_THEME.text
    else {
      const match = key.match(/^module\.(\w+)\.(visible|x|y|w|h)$/)
      if (!match) continue
      const id = match[1] as ModuleId
      const field = match[2]
      let mod = byId.get(id)
      if (!mod) {
        const def = DEFAULT_MODULES.find((d) => d.id === id)
        if (!def) continue
        mod = { ...def }
        modules.push(mod)
        byId.set(id, mod)
      }
      if (field === 'visible') mod.visible = value === 'true' || value === '1'
      else if (field === 'x') mod.x = Number(value)
      else if (field === 'y') mod.y = Number(value)
      else if (field === 'w') mod.w = Number(value)
      else if (field === 'h') mod.h = Number(value)
    }
  }
  return { ...data, theme, modules }
}

type MusicRow = {
  ownerKind: string
  ownerId: string
  channel: string
  label: string
  youtubeUrl: string
  inPoint: number
  outPoint: string
}

export function exportMusicCsv(data: AppData): string {
  const rows: MusicRow[] = []
  const push = (
    ownerKind: string,
    ownerId: string,
    channel: string,
    clip: AudioClip | null,
  ) => {
    if (!clip?.youtubeUrl) return
    rows.push({
      ownerKind,
      ownerId,
      channel,
      label: clip.label,
      youtubeUrl: clip.youtubeUrl,
      inPoint: clip.inPoint,
      outPoint: clip.outPoint == null ? '' : String(clip.outPoint),
    })
  }
  data.locations.forEach((l) => {
    push('location', l.id, 'music', l.defaultMusic)
    push('location', l.id, 'ambience', l.defaultAmbience)
  })
  data.scenes.forEach((s) => {
    push('scene', s.id, 'music', s.music)
    push('scene', s.id, 'ambience', s.ambience)
  })
  return toCsv(
    ['ownerKind', 'ownerId', 'channel', 'label', 'youtubeUrl', 'inPoint', 'outPoint'],
    rows,
  )
}

export function applyMusicCsv(data: AppData, csv: string): AppData {
  const rows = parseCsv(csv)
  const locations = data.locations.map((l) => ({
    ...l,
    defaultMusic: null as AudioClip | null,
    defaultAmbience: null as AudioClip | null,
  }))
  const scenes = data.scenes.map((s) => ({
    ...s,
    music: null as AudioClip | null,
    ambience: null as AudioClip | null,
  }))

  for (const row of rows) {
    const clip: AudioClip = {
      label: row.label ?? '',
      youtubeUrl: row.youtubeUrl ?? '',
      inPoint: Number(row.inPoint || 0),
      outPoint: row.outPoint === '' ? null : Number(row.outPoint),
    }
    if (row.ownerKind === 'location') {
      const loc = locations.find((l) => l.id === row.ownerId)
      if (!loc) continue
      if (row.channel === 'ambience') loc.defaultAmbience = clip
      else loc.defaultMusic = clip
    } else if (row.ownerKind === 'scene') {
      const scene = scenes.find((s) => s.id === row.ownerId)
      if (!scene) continue
      if (row.channel === 'ambience') scene.ambience = clip
      else scene.music = clip
    }
  }
  return { ...data, locations, scenes }
}

export function exportMapsCsv(data: AppData): string {
  return toCsv(
    ['id', 'locationId', 'name', 'cols', 'rows', 'squareFeet', 'imageName'],
    data.maps.map((m) => ({
      id: m.id,
      locationId: m.locationId,
      name: m.name,
      cols: m.cols,
      rows: m.rows,
      squareFeet: m.squareFeet,
      imageName: m.imageName || `${m.id}.png`,
    })),
  )
}

export function exportWalkCsv(map: MapBoard): string {
  return toCsv(
    ['x', 'y'],
    map.walkable.map((c) => ({ x: c.x, y: c.y })),
  )
}

export function applyMapsCsv(
  data: AppData,
  mapsCsv: string,
  extras?: { walkByMapId?: Record<string, WalkCell[]>; imageByName?: Record<string, string> },
): AppData {
  const rows = parseCsv(mapsCsv)
  const maps: MapBoard[] = rows.map((row) => {
    const id = row.id || uid()
    const existing = data.maps.find((m) => m.id === id)
    const imageName = row.imageName || `${id}.png`
    return {
      id,
      locationId: row.locationId || data.activeLocationId || '',
      name: row.name || 'Map',
      cols: Math.max(1, Number(row.cols || 25)),
      rows: Math.max(1, Number(row.rows || 25)),
      squareFeet: Math.max(1, Number(row.squareFeet || 5)),
      imageName,
      imageDataUrl: extras?.imageByName?.[imageName] ?? existing?.imageDataUrl ?? '',
      walkable: extras?.walkByMapId?.[id] ?? existing?.walkable ?? [],
    }
  })
  const mapIds = new Set(maps.map((m) => m.id))
  const tokens = data.tokens.filter((t) => mapIds.has(t.mapId))
  const activeMapId =
    data.activeMapId && mapIds.has(data.activeMapId) ? data.activeMapId : maps[0]?.id ?? null
  return { ...data, maps, tokens, activeMapId }
}

function statsToRow(stats: CharacterStats) {
  return {
    hp: stats.hp,
    maxHp: stats.maxHp,
    skillPoints: stats.skillPoints,
    armor: stats.armor,
    attack: stats.attack,
    initiative: stats.initiative,
    ac: stats.ac,
    speedFt: stats.speedFt,
    attackBonus: stats.attackBonus,
    damageDice: stats.damageDice,
    rangeFt: stats.rangeFt,
    traits: stats.traits.join('|'),
    buffs: stats.buffs.join('|'),
    debuffs: stats.debuffs.join('|'),
    skills: stats.skills.map((s) => `${s.name}:${s.points}`).join('|'),
  }
}

function statsFromRow(row: Record<string, string>): CharacterStats {
  const base = emptyStats()
  const skills = (row.skills || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, pts] = part.split(':')
      return { id: uid(), name: name || 'Skill', points: Number(pts || 0) }
    })
  return {
    ...base,
    hp: Number(row.hp ?? base.hp),
    maxHp: Number(row.maxHp ?? base.maxHp),
    skillPoints: Number(row.skillPoints ?? base.skillPoints),
    armor: Number(row.armor ?? base.armor),
    attack: Number(row.attack ?? base.attack),
    initiative: Number(row.initiative ?? base.initiative),
    ac: Number(row.ac ?? row.armor ?? base.ac),
    speedFt: Number(row.speedFt ?? base.speedFt),
    attackBonus: Number(row.attackBonus ?? row.attack ?? base.attackBonus),
    damageDice: row.damageDice || base.damageDice,
    rangeFt: Number(row.rangeFt ?? base.rangeFt),
    traits: splitList(row.traits),
    buffs: splitList(row.buffs),
    debuffs: splitList(row.debuffs),
    skills,
  }
}

function splitList(value: string | undefined): string[] {
  if (!value) return []
  return value.split('|').map((s) => s.trim()).filter(Boolean)
}

const SAVE_HEADERS = [
  'rowType',
  'id',
  'kind',
  'characterId',
  'mapId',
  'gx',
  'gy',
  'name',
  'role',
  'personality',
  'backstory',
  'notes',
  'npcKind',
  'actorKind',
  'actorId',
  'action',
  'targetGx',
  'targetGy',
  'targetId',
  'd20',
  'advantage',
  'disadvantage',
  'preview',
  'hp',
  'maxHp',
  'skillPoints',
  'armor',
  'attack',
  'initiative',
  'ac',
  'speedFt',
  'attackBonus',
  'damageDice',
  'rangeFt',
  'traits',
  'buffs',
  'debuffs',
  'skills',
]

export function exportSaveCsv(data: AppData): string {
  const rows: Array<Record<string, string | number | boolean>> = [
    { rowType: 'meta', preview: String(Date.now()) },
  ]

  data.players.forEach((p) => {
    rows.push({
      rowType: 'player',
      id: p.id,
      name: p.name,
      role: p.role,
      personality: p.personality,
      backstory: p.backstory,
      notes: p.notes,
      ...statsToRow(p.stats),
    })
  })
  data.npcs.forEach((n) => {
    rows.push({
      rowType: 'npc',
      id: n.id,
      name: n.name,
      role: n.role,
      personality: n.personality,
      notes: n.notes,
      npcKind: n.kind,
      ...statsToRow(n.stats),
    })
  })
  data.tokens.forEach((t) => {
    rows.push({
      rowType: 'token',
      id: t.id,
      kind: t.kind,
      characterId: t.characterId,
      mapId: t.mapId,
      gx: t.gx,
      gy: t.gy,
    })
  })
  if (data.pendingAction) {
    const p = data.pendingAction
    rows.push({
      rowType: 'pending',
      id: p.id,
      actorKind: p.actorKind,
      actorId: p.actorId,
      action: p.action,
      targetGx: p.targetGx ?? '',
      targetGy: p.targetGy ?? '',
      targetId: p.targetId ?? '',
      d20: p.d20 ?? '',
      advantage: p.advantage,
      disadvantage: p.disadvantage,
      preview: p.preview,
    })
  }
  return toCsv(SAVE_HEADERS, rows)
}

export function applySaveCsv(data: AppData, csv: string): AppData {
  const rows = parseCsv(csv)
  const players: Player[] = []
  const npcs: Npc[] = []
  const tokens: MapToken[] = []
  let pendingAction: PendingAction | null = null

  for (const row of rows) {
    if (row.rowType === 'meta') continue
    if (row.rowType === 'player') {
      players.push({
        id: row.id || uid(),
        name: row.name || 'Player',
        role: row.role || '',
        personality: row.personality || '',
        backstory: row.backstory || '',
        notes: row.notes || '',
        stats: statsFromRow(row),
      })
    } else if (row.rowType === 'npc') {
      npcs.push({
        id: row.id || uid(),
        name: row.name || 'NPC',
        kind: (row.npcKind as Npc['kind']) || 'npc',
        role: row.role || '',
        personality: row.personality || '',
        notes: row.notes || '',
        stats: statsFromRow(row),
      })
    } else if (row.rowType === 'token') {
      tokens.push({
        id: row.id || uid(),
        kind: row.kind === 'npc' ? 'npc' : 'player',
        characterId: row.characterId,
        mapId: row.mapId,
        gx: Number(row.gx || 0),
        gy: Number(row.gy || 0),
      })
    } else if (row.rowType === 'pending') {
      pendingAction = {
        id: row.id || uid(),
        actorKind: row.actorKind === 'npc' ? 'npc' : 'player',
        actorId: row.actorId,
        action: row.action === 'attack' ? 'attack' : 'move',
        targetGx: row.targetGx === '' ? null : Number(row.targetGx),
        targetGy: row.targetGy === '' ? null : Number(row.targetGy),
        targetId: row.targetId || null,
        d20: row.d20 === '' ? null : Number(row.d20),
        advantage: row.advantage === 'true',
        disadvantage: row.disadvantage === 'true',
        preview: row.preview || '',
      }
    }
  }

  return {
    ...data,
    players: players.length ? players : data.players,
    npcs: npcs.length ? npcs : data.npcs,
    tokens,
    pendingAction,
  }
}

/** Single-character CSV used by the player generator / DM import. */
export function exportCharacterCsv(player: Player): string {
  return toCsv(
    [
      'name',
      'role',
      'personality',
      'backstory',
      'notes',
      'hp',
      'maxHp',
      'ac',
      'speedFt',
      'attackBonus',
      'damageDice',
      'rangeFt',
      'initiative',
      'traits',
      'buffs',
      'debuffs',
      'skills',
    ],
    [
      {
        name: player.name,
        role: player.role,
        personality: player.personality,
        backstory: player.backstory,
        notes: player.notes,
        ...statsToRow(player.stats),
      },
    ],
  )
}

export function parseCharacterCsv(csv: string): Player {
  const rows = parseCsv(csv)
  const row = rows[0]
  if (!row) throw new Error('Character CSV is empty')
  return createPlayer({
    name: row.name || 'New Player',
    role: row.role || '',
    personality: row.personality || '',
    backstory: row.backstory || '',
    notes: row.notes || '',
    stats: statsFromRow(row),
  })
}

export function parseMasterCsv(csv: string): Record<CampaignSlice, string> {
  const paths: Record<CampaignSlice, string> = {
    config: 'config.csv',
    music: 'music.csv',
    map: 'maps.csv',
    save: 'save.csv',
  }
  for (const row of parseCsv(csv)) {
    const kind = row.kind as CampaignSlice
    if (kind && row.path) paths[kind] = row.path
  }
  return paths
}
