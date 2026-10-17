import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyConfigCsv,
  applyMapsCsv,
  applyMusicCsv,
  applySaveCsv,
  parseCharacterCsv,
  type CampaignSlice,
} from '../data/campaignCsv'
import {
  createEncounter,
  createLocation,
  createMap,
  createNpc,
  createPlayer,
  createScene,
  createToken,
  importData,
  loadData,
  loadPlayData,
  resetStorageKeys,
  saveData,
  savePlayData,
} from '../data/storage'
import { clampLayout } from '../hooks/useIsDesktop'
import {
  attackPreview,
  chebyshev,
  effectiveAc,
  isWalkable,
  rollDiceExpr,
  routeCost,
  squaresToFeet,
} from '../lib/rules5e'
import type {
  AppData,
  AudioClip,
  CharacterStats,
  DashboardModule,
  Encounter,
  Location,
  MapBoard,
  ModuleId,
  Npc,
  Player,
  PublicTableState,
  Scene,
  TableAction,
  ThemeConfig,
  TokenKind,
  WalkCell,
  WorkspaceMode,
} from '../types'
import { DEFAULT_MODULES, DEFAULT_THEME } from '../types'

type ResolveMode = 'rules' | 'modifier' | 'manual'

type StoreContextValue = {
  data: AppData
  toggleLocation: (id: string) => void
  setActiveScene: (id: string | null) => void
  addLocation: () => string
  updateLocation: (id: string, patch: Partial<Location>) => void
  deleteLocation: (id: string) => void
  addScene: (locationId: string) => string
  updateScene: (id: string, patch: Partial<Scene>) => void
  deleteScene: (id: string) => void
  addEncounter: (sceneId: string) => string
  updateEncounter: (sceneId: string, encounterId: string, patch: Partial<Encounter>) => void
  deleteEncounter: (sceneId: string, encounterId: string) => void
  addPlayer: () => string
  updatePlayer: (id: string, patch: Partial<Player>) => void
  updatePlayerStats: (id: string, patch: Partial<CharacterStats>) => void
  deletePlayer: (id: string) => void
  importPlayerCsv: (csv: string) => string
  addNpc: () => string
  updateNpc: (id: string, patch: Partial<Npc>) => void
  updateNpcStats: (id: string, patch: Partial<CharacterStats>) => void
  deleteNpc: (id: string) => void
  updateTheme: (patch: Partial<ThemeConfig>) => void
  resetTheme: () => void
  setModuleVisible: (id: ModuleId, visible: boolean) => void
  updateModuleLayout: (id: ModuleId, patch: Partial<Pick<DashboardModule, 'x' | 'y' | 'w' | 'h'>>) => void
  bringModuleToFront: (id: ModuleId) => void
  reorderModules: (fromIndex: number, toIndex: number) => void
  resetModules: () => void
  setWorkspaceMode: (mode: WorkspaceMode) => void
  setActiveMap: (id: string | null) => void
  addMap: (locationId: string) => string
  updateMap: (id: string, patch: Partial<MapBoard>) => void
  deleteMap: (id: string) => void
  toggleWalkable: (mapId: string, x: number, y: number) => void
  paintWalkableRect: (mapId: string, cells: WalkCell[], add: boolean) => void
  placeOrMoveToken: (kind: TokenKind, characterId: string, mapId: string, gx: number, gy: number) => void
  removeToken: (id: string) => void
  proposeAction: (input: {
    actorKind: TokenKind
    actorId: string
    action: TableAction
    targetGx?: number | null
    targetGy?: number | null
    targetId?: string | null
    d20?: number | null
    advantage?: boolean
    disadvantage?: boolean
  }) => string | null
  clearPending: () => void
  resolvePending: (mode: ResolveMode, extra?: { modifier?: number; manualHp?: number; note?: string }) => string
  applyCsvSlice: (slice: CampaignSlice, csv: string, extras?: { walkByMapId?: Record<string, WalkCell[]>; imageByName?: Record<string, string> }) => void
  applyPublicState: (state: PublicTableState) => void
  publicTableState: () => PublicTableState
  replaceAll: (next: AppData) => void
  resetToSeed: () => void
  importJson: (json: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function updateList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

function actorStats(data: AppData, kind: TokenKind, id: string): CharacterStats | null {
  if (kind === 'player') return data.players.find((p) => p.id === id)?.stats ?? null
  return data.npcs.find((n) => n.id === id)?.stats ?? null
}

function actorName(data: AppData, kind: TokenKind, id: string): string {
  if (kind === 'player') return data.players.find((p) => p.id === id)?.name ?? 'Player'
  return data.npcs.find((n) => n.id === id)?.name ?? 'NPC'
}

export function StoreProvider({
  children,
  playSession = false,
}: {
  children: ReactNode
  playSession?: boolean
}) {
  const [data, setData] = useState<AppData>(() => (playSession ? loadPlayData() : loadData()))

  useEffect(() => {
    if (playSession) savePlayData(data)
    else saveData(data)
  }, [data, playSession])

  const toggleLocation = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      activeLocationId: id,
      activeSceneId: d.activeLocationId === id ? d.activeSceneId : null,
      activeMapId:
        d.maps.find((m) => m.locationId === id && m.id === d.activeMapId)?.id ??
        d.maps.find((m) => m.locationId === id)?.id ??
        null,
    }))
  }, [])

  const setActiveScene = useCallback((id: string | null) => {
    setData((d) => {
      if (id == null) return { ...d, activeSceneId: null }
      const scene = d.scenes.find((s) => s.id === id)
      if (!scene) return d
      return {
        ...d,
        activeSceneId: id,
        activeLocationId: scene.locationId,
      }
    })
  }, [])

  const addLocation = useCallback(() => {
    const loc = createLocation()
    setData((d) => ({
      ...d,
      locations: [...d.locations, loc],
      activeLocationId: loc.id,
      activeSceneId: null,
    }))
    return loc.id
  }, [])

  const updateLocation = useCallback((id: string, patch: Partial<Location>) => {
    setData((d) => ({ ...d, locations: updateList(d.locations, id, patch) }))
  }, [])

  const deleteLocation = useCallback((id: string) => {
    setData((d) => {
      const locations = d.locations.filter((l) => l.id !== id)
      const scenes = d.scenes.filter((s) => s.locationId !== id)
      const maps = d.maps.filter((m) => m.locationId !== id)
      const mapIds = new Set(maps.map((m) => m.id))
      const tokens = d.tokens.filter((t) => mapIds.has(t.mapId))
      const activeLocationId =
        d.activeLocationId === id ? locations[0]?.id ?? null : d.activeLocationId
      return {
        ...d,
        locations,
        scenes,
        maps,
        tokens,
        activeLocationId,
        activeSceneId: d.activeLocationId === id ? null : d.activeSceneId,
        activeMapId: d.maps.find((m) => m.locationId === activeLocationId)?.id ?? maps[0]?.id ?? null,
      }
    })
  }, [])

  const addScene = useCallback((locationId: string) => {
    const scene = createScene(locationId)
    setData((d) => ({
      ...d,
      scenes: [...d.scenes, scene],
      activeSceneId: scene.id,
      activeLocationId: locationId,
    }))
    return scene.id
  }, [])

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    setData((d) => ({ ...d, scenes: updateList(d.scenes, id, patch) }))
  }, [])

  const deleteScene = useCallback((id: string) => {
    setData((d) => {
      const scenes = d.scenes.filter((s) => s.id !== id)
      return {
        ...d,
        scenes,
        activeSceneId: d.activeSceneId === id ? null : d.activeSceneId,
      }
    })
  }, [])

  const addEncounter = useCallback((sceneId: string) => {
    const encounter = createEncounter()
    setData((d) => ({
      ...d,
      scenes: d.scenes.map((s) =>
        s.id === sceneId ? { ...s, encounters: [...s.encounters, encounter] } : s,
      ),
    }))
    return encounter.id
  }, [])

  const updateEncounter = useCallback(
    (sceneId: string, encounterId: string, patch: Partial<Encounter>) => {
      setData((d) => ({
        ...d,
        scenes: d.scenes.map((s) =>
          s.id !== sceneId
            ? s
            : {
                ...s,
                encounters: s.encounters.map((e) =>
                  e.id === encounterId ? { ...e, ...patch } : e,
                ),
              },
        ),
      }))
    },
    [],
  )

  const deleteEncounter = useCallback((sceneId: string, encounterId: string) => {
    setData((d) => ({
      ...d,
      scenes: d.scenes.map((s) =>
        s.id !== sceneId
          ? s
          : { ...s, encounters: s.encounters.filter((e) => e.id !== encounterId) },
      ),
    }))
  }, [])

  const addPlayer = useCallback(() => {
    const player = createPlayer()
    setData((d) => ({ ...d, players: [...d.players, player] }))
    return player.id
  }, [])

  const updatePlayer = useCallback((id: string, patch: Partial<Player>) => {
    setData((d) => ({ ...d, players: updateList(d.players, id, patch) }))
  }, [])

  const updatePlayerStats = useCallback((id: string, patch: Partial<CharacterStats>) => {
    setData((d) => ({
      ...d,
      players: d.players.map((p) =>
        p.id === id ? { ...p, stats: { ...p.stats, ...patch } } : p,
      ),
    }))
  }, [])

  const deletePlayer = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      players: d.players.filter((p) => p.id !== id),
      tokens: d.tokens.filter((t) => !(t.kind === 'player' && t.characterId === id)),
    }))
  }, [])

  const importPlayerCsv = useCallback((csv: string) => {
    const player = parseCharacterCsv(csv)
    setData((d) => ({ ...d, players: [...d.players, player] }))
    return player.id
  }, [])

  const addNpc = useCallback(() => {
    const npc = createNpc()
    setData((d) => ({ ...d, npcs: [...d.npcs, npc] }))
    return npc.id
  }, [])

  const updateNpc = useCallback((id: string, patch: Partial<Npc>) => {
    setData((d) => ({ ...d, npcs: updateList(d.npcs, id, patch) }))
  }, [])

  const updateNpcStats = useCallback((id: string, patch: Partial<CharacterStats>) => {
    setData((d) => ({
      ...d,
      npcs: d.npcs.map((n) => (n.id === id ? { ...n, stats: { ...n.stats, ...patch } } : n)),
    }))
  }, [])

  const deleteNpc = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      npcs: d.npcs.filter((n) => n.id !== id),
      tokens: d.tokens.filter((t) => !(t.kind === 'npc' && t.characterId === id)),
      scenes: d.scenes.map((s) => ({
        ...s,
        npcIds: s.npcIds.filter((nid) => nid !== id),
        encounters: s.encounters.map((e) => ({
          ...e,
          npcIds: e.npcIds.filter((nid) => nid !== id),
        })),
      })),
    }))
  }, [])

  const updateTheme = useCallback((patch: Partial<ThemeConfig>) => {
    setData((d) => ({ ...d, theme: { ...d.theme, ...patch } }))
  }, [])

  const resetTheme = useCallback(() => {
    setData((d) => ({ ...d, theme: { ...DEFAULT_THEME } }))
  }, [])

  const setModuleVisible = useCallback((id: ModuleId, visible: boolean) => {
    setData((d) => ({
      ...d,
      modules: d.modules.map((m) => (m.id === id ? { ...m, visible } : m)),
    }))
  }, [])

  const updateModuleLayout = useCallback(
    (id: ModuleId, patch: Partial<Pick<DashboardModule, 'x' | 'y' | 'w' | 'h'>>) => {
      setData((d) => ({
        ...d,
        modules: d.modules.map((m) => (m.id === id ? clampLayout({ ...m, ...patch }) : m)),
      }))
    },
    [],
  )

  const bringModuleToFront = useCallback((id: ModuleId) => {
    setData((d) => {
      const idx = d.modules.findIndex((m) => m.id === id)
      if (idx < 0 || idx === d.modules.length - 1) return d
      const modules = [...d.modules]
      const [item] = modules.splice(idx, 1)
      modules.push(item)
      return { ...d, modules }
    })
  }, [])

  const reorderModules = useCallback((fromIndex: number, toIndex: number) => {
    setData((d) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= d.modules.length ||
        toIndex >= d.modules.length
      ) {
        return d
      }
      const modules = [...d.modules]
      const [item] = modules.splice(fromIndex, 1)
      modules.splice(toIndex, 0, item)
      return { ...d, modules }
    })
  }, [])

  const resetModules = useCallback(() => {
    setData((d) => ({ ...d, modules: DEFAULT_MODULES.map((m) => ({ ...m })) }))
  }, [])

  const setWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setData((d) => ({ ...d, workspaceMode: mode }))
  }, [])

  const setActiveMap = useCallback((id: string | null) => {
    setData((d) => ({ ...d, activeMapId: id }))
  }, [])

  const addMap = useCallback((locationId: string) => {
    const map = createMap(locationId)
    setData((d) => ({
      ...d,
      maps: [...d.maps, map],
      activeMapId: map.id,
      workspaceMode: 'map',
    }))
    return map.id
  }, [])

  const updateMap = useCallback((id: string, patch: Partial<MapBoard>) => {
    setData((d) => ({ ...d, maps: updateList(d.maps, id, patch) }))
  }, [])

  const deleteMap = useCallback((id: string) => {
    setData((d) => {
      const maps = d.maps.filter((m) => m.id !== id)
      return {
        ...d,
        maps,
        tokens: d.tokens.filter((t) => t.mapId !== id),
        activeMapId: d.activeMapId === id ? maps[0]?.id ?? null : d.activeMapId,
      }
    })
  }, [])

  const toggleWalkable = useCallback((mapId: string, x: number, y: number) => {
    setData((d) => ({
      ...d,
      maps: d.maps.map((m) => {
        if (m.id !== mapId) return m
        const exists = m.walkable.some((c) => c.x === x && c.y === y)
        return {
          ...m,
          walkable: exists
            ? m.walkable.filter((c) => !(c.x === x && c.y === y))
            : [...m.walkable, { x, y }],
        }
      }),
    }))
  }, [])

  const paintWalkableRect = useCallback((mapId: string, cells: WalkCell[], add: boolean) => {
    setData((d) => ({
      ...d,
      maps: d.maps.map((m) => {
        if (m.id !== mapId) return m
        const key = new Set(m.walkable.map((c) => `${c.x},${c.y}`))
        cells.forEach((c) => {
          const k = `${c.x},${c.y}`
          if (add) key.add(k)
          else key.delete(k)
        })
        return {
          ...m,
          walkable: [...key].map((k) => {
            const [x, y] = k.split(',').map(Number)
            return { x, y }
          }),
        }
      }),
    }))
  }, [])

  const placeOrMoveToken = useCallback(
    (kind: TokenKind, characterId: string, mapId: string, gx: number, gy: number) => {
      setData((d) => {
        const map = d.maps.find((m) => m.id === mapId)
        if (!map || !isWalkable(map.walkable, gx, gy)) return d
        const occupied = d.tokens.find(
          (t) => t.mapId === mapId && t.gx === gx && t.gy === gy && !(t.kind === kind && t.characterId === characterId),
        )
        if (occupied) return d
        const existing = d.tokens.find((t) => t.kind === kind && t.characterId === characterId)
        if (existing) {
          return {
            ...d,
            tokens: d.tokens.map((t) =>
              t.id === existing.id ? { ...t, mapId, gx, gy } : t,
            ),
          }
        }
        return {
          ...d,
          tokens: [...d.tokens, createToken({ kind, characterId, mapId, gx, gy })],
        }
      })
    },
    [],
  )

  const removeToken = useCallback((id: string) => {
    setData((d) => ({ ...d, tokens: d.tokens.filter((t) => t.id !== id) }))
  }, [])

  const proposeAction = useCallback(
    (input: {
      actorKind: TokenKind
      actorId: string
      action: TableAction
      targetGx?: number | null
      targetGy?: number | null
      targetId?: string | null
      d20?: number | null
      advantage?: boolean
      disadvantage?: boolean
    }) => {
      let error: string | null = null
      setData((d) => {
        const map = d.maps.find((m) => m.id === d.activeMapId)
        const token = d.tokens.find(
          (t) => t.kind === input.actorKind && t.characterId === input.actorId && t.mapId === d.activeMapId,
        )
        const stats = actorStats(d, input.actorKind, input.actorId)
        if (!map || !token || !stats) {
          error = 'Actor must have a token on the active map.'
          return d
        }

        let preview = ''
        if (input.action === 'move') {
          const tx = input.targetGx
          const ty = input.targetGy
          if (tx == null || ty == null) {
            error = 'Pick a walkable square.'
            return d
          }
          if (!isWalkable(map.walkable, tx, ty)) {
            error = 'That square is not on the painted map.'
            return d
          }
          if (tx === token.gx && ty === token.gy) {
            error = 'Pick a different square.'
            return d
          }
          if (d.tokens.some((t) => t.mapId === map.id && t.gx === tx && t.gy === ty && t.id !== token.id)) {
            error = 'That square is occupied.'
            return d
          }
          const blocked = new Set(
            d.tokens
              .filter((t) => t.mapId === map.id && t.id !== token.id)
              .map((t) => `${t.gx},${t.gy}`),
          )
          const squares = routeCost(map.walkable, token.gx, token.gy, tx, ty, blocked)
          if (squares == null) {
            error = 'No painted route to that square.'
            return d
          }
          const feet = squaresToFeet(squares, map.squareFeet)
          if (feet > stats.speedFt) {
            error = `Route is ${feet} ft; speed is ${stats.speedFt} ft.`
            return d
          }
          preview = `${actorName(d, input.actorKind, input.actorId)} moves ${squares} squares (${feet} ft) to ${tx},${ty}.`
        } else {
          const targetToken = d.tokens.find((t) => t.id === input.targetId && t.mapId === map.id)
          if (!targetToken) {
            error = 'Pick a target token.'
            return d
          }
          const targetStats = actorStats(d, targetToken.kind, targetToken.characterId)
          if (!targetStats) {
            error = 'Target has no stats.'
            return d
          }
          if (input.d20 == null) {
            error = 'Enter a d20 roll (or roll in-app).'
            return d
          }
          const dist = squaresToFeet(
            chebyshev(token.gx, token.gy, targetToken.gx, targetToken.gy),
            map.squareFeet,
          )
          if (dist > stats.rangeFt) {
            error = `Target is ${dist} ft away; reach is ${stats.rangeFt} ft.`
            return d
          }
          const ac = effectiveAc(targetStats)
          const result = attackPreview(stats, ac, input.d20, dist)
          preview = `${actorName(d, input.actorKind, input.actorId)} attacks ${actorName(d, targetToken.kind, targetToken.characterId)}: ${result.summary}. Damage dice ${stats.damageDice}.`
        }

        return {
          ...d,
          pendingAction: {
            id: crypto.randomUUID(),
            actorKind: input.actorKind,
            actorId: input.actorId,
            action: input.action,
            targetGx: input.targetGx ?? null,
            targetGy: input.targetGy ?? null,
            targetId: input.targetId ?? null,
            d20: input.d20 ?? null,
            advantage: Boolean(input.advantage),
            disadvantage: Boolean(input.disadvantage),
            preview,
          },
        }
      })
      return error
    },
    [],
  )

  const clearPending = useCallback(() => {
    setData((d) => ({ ...d, pendingAction: null }))
  }, [])

  const resolvePending = useCallback(
    (mode: ResolveMode, extra?: { modifier?: number; manualHp?: number; note?: string }) => {
      let message = 'Declined.'
      setData((d) => {
        const pending = d.pendingAction
        if (!pending) {
          message = 'Nothing pending.'
          return d
        }
        const map = d.maps.find((m) => m.id === d.activeMapId)
        const token = d.tokens.find(
          (t) => t.kind === pending.actorKind && t.characterId === pending.actorId,
        )
        if (!map || !token) {
          message = 'Actor token missing.'
          return { ...d, pendingAction: null }
        }

        if (pending.action === 'move') {
          const gx = pending.targetGx
          const gy = pending.targetGy
          if (gx == null || gy == null) return { ...d, pendingAction: null }
          message = extra?.note || pending.preview
          return {
            ...d,
            pendingAction: null,
            tokens: d.tokens.map((t) => (t.id === token.id ? { ...t, gx, gy } : t)),
          }
        }

        const targetToken = d.tokens.find((t) => t.id === pending.targetId)
        if (!targetToken) return { ...d, pendingAction: null }
        const attacker = actorStats(d, pending.actorKind, pending.actorId)
        const defender = actorStats(d, targetToken.kind, targetToken.characterId)
        if (!attacker || !defender) return { ...d, pendingAction: null }

        const dist = squaresToFeet(
          chebyshev(token.gx, token.gy, targetToken.gx, targetToken.gy),
          map.squareFeet,
        )
        const result = attackPreview(attacker, effectiveAc(defender), pending.d20 ?? 1, dist)
        let damage = 0
        if (mode === 'manual' && extra?.manualHp != null) {
          const nextHp = extra.manualHp
          message = extra.note || `Manual HP set to ${nextHp}.`
          return patchHp(d, targetToken, nextHp, message)
        }
        if (!result.hit && mode === 'rules') {
          message = `${result.summary} No damage.`
          return { ...d, pendingAction: null }
        }
        const rolled = rollDiceExpr(attacker.damageDice)
        damage = result.crit ? rolled.total + rollDiceExpr(attacker.damageDice).total : rolled.total
        if (mode === 'modifier') damage += extra?.modifier ?? 0
        if (!result.hit && mode === 'modifier') {
          // still allow DM spice on a miss
          if ((extra?.modifier ?? 0) === 0) {
            message = `${result.summary} Miss — no modifier applied.`
            return { ...d, pendingAction: null }
          }
        }
        const nextHp = Math.max(0, defender.hp - Math.max(0, damage))
        message = `${result.summary} Damage ${damage} (${attacker.damageDice}${
          mode === 'modifier' && extra?.modifier ? ` + ${extra.modifier}` : ''
        }). HP ${defender.hp} → ${nextHp}.`
        return patchHp(d, targetToken, nextHp, message)
      })
      return message
    },
    [],
  )

  const applyCsvSlice = useCallback(
    (
      slice: CampaignSlice,
      csv: string,
      extras?: { walkByMapId?: Record<string, WalkCell[]>; imageByName?: Record<string, string> },
    ) => {
      setData((d) => {
        if (slice === 'config') return applyConfigCsv(d, csv)
        if (slice === 'music') return applyMusicCsv(d, csv)
        if (slice === 'map') return applyMapsCsv(d, csv, extras)
        return applySaveCsv(d, csv)
      })
    },
    [],
  )

  const applyPublicState = useCallback((state: PublicTableState) => {
    setData((d) => ({
      ...d,
      maps: state.maps,
      tokens: state.tokens,
      players: state.players,
      npcs: state.npcs,
      pendingAction: state.pendingAction,
      activeMapId: state.activeMapId,
      workspaceMode: 'map',
    }))
  }, [])

  const publicTableState = useCallback((): PublicTableState => {
    return {
      maps: data.maps,
      tokens: data.tokens,
      players: data.players,
      npcs: data.npcs,
      pendingAction: data.pendingAction,
      activeMapId: data.activeMapId,
    }
  }, [data])

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  const resetToSeed = useCallback(() => {
    resetStorageKeys()
    setData(loadData())
  }, [])

  const importJson = useCallback((json: string) => {
    setData(importData(json))
  }, [])

  const value = useMemo(
    () => ({
      data,
      toggleLocation,
      setActiveScene,
      addLocation,
      updateLocation,
      deleteLocation,
      addScene,
      updateScene,
      deleteScene,
      addEncounter,
      updateEncounter,
      deleteEncounter,
      addPlayer,
      updatePlayer,
      updatePlayerStats,
      deletePlayer,
      importPlayerCsv,
      addNpc,
      updateNpc,
      updateNpcStats,
      deleteNpc,
      updateTheme,
      resetTheme,
      setModuleVisible,
      updateModuleLayout,
      bringModuleToFront,
      reorderModules,
      resetModules,
      setWorkspaceMode,
      setActiveMap,
      addMap,
      updateMap,
      deleteMap,
      toggleWalkable,
      paintWalkableRect,
      placeOrMoveToken,
      removeToken,
      proposeAction,
      clearPending,
      resolvePending,
      applyCsvSlice,
      applyPublicState,
      publicTableState,
      replaceAll,
      resetToSeed,
      importJson,
    }),
    [
      data,
      toggleLocation,
      setActiveScene,
      addLocation,
      updateLocation,
      deleteLocation,
      addScene,
      updateScene,
      deleteScene,
      addEncounter,
      updateEncounter,
      deleteEncounter,
      addPlayer,
      updatePlayer,
      updatePlayerStats,
      deletePlayer,
      importPlayerCsv,
      addNpc,
      updateNpc,
      updateNpcStats,
      deleteNpc,
      updateTheme,
      resetTheme,
      setModuleVisible,
      updateModuleLayout,
      bringModuleToFront,
      reorderModules,
      resetModules,
      setWorkspaceMode,
      setActiveMap,
      addMap,
      updateMap,
      deleteMap,
      toggleWalkable,
      paintWalkableRect,
      placeOrMoveToken,
      removeToken,
      proposeAction,
      clearPending,
      resolvePending,
      applyCsvSlice,
      applyPublicState,
      publicTableState,
      replaceAll,
      resetToSeed,
      importJson,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function patchHp(
  d: AppData,
  targetToken: { kind: TokenKind; characterId: string },
  nextHp: number,
  _message: string,
): AppData {
  if (targetToken.kind === 'player') {
    return {
      ...d,
      pendingAction: null,
      players: d.players.map((p) =>
        p.id === targetToken.characterId ? { ...p, stats: { ...p.stats, hp: nextHp } } : p,
      ),
    }
  }
  return {
    ...d,
    pendingAction: null,
    npcs: d.npcs.map((n) =>
      n.id === targetToken.characterId ? { ...n, stats: { ...n.stats, hp: nextHp } } : n,
    ),
  }
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useResolvedScene() {
  const { data } = useStore()
  const location = data.locations.find((l) => l.id === data.activeLocationId)
  const isDefault = data.activeSceneId == null
  const scene = isDefault ? undefined : data.scenes.find((s) => s.id === data.activeSceneId)

  const music: AudioClip | null =
    !isDefault && scene?.music?.youtubeUrl
      ? scene.music
      : location?.defaultMusic?.youtubeUrl
        ? location.defaultMusic
        : null
  const ambience: AudioClip | null =
    !isDefault && scene?.ambience?.youtubeUrl
      ? scene.ambience
      : location?.defaultAmbience?.youtubeUrl
        ? location.defaultAmbience
        : null
  const weather = (!isDefault && scene?.weather?.trim()) || location?.defaultWeather || '—'

  return { location, scene, isDefault, music, ambience, weather }
}

export type { DashboardModule, ResolveMode }
