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
  createEncounter,
  createLocation,
  createNpc,
  createPlayer,
  createScene,
  importData,
  loadData,
  saveData,
} from '../data/storage'
import type {
  AppData,
  AudioClip,
  CharacterStats,
  DashboardModule,
  Encounter,
  Location,
  ModuleId,
  Npc,
  Player,
  Scene,
  ThemeConfig,
} from '../types'
import { DEFAULT_MODULES, DEFAULT_THEME } from '../types'

type StoreContextValue = {
  data: AppData
  /** Toggle a location on; resets scene to Default. Passing the same id keeps it on. */
  toggleLocation: (id: string) => void
  /** `null` selects the location Default scene. */
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
  addNpc: () => string
  updateNpc: (id: string, patch: Partial<Npc>) => void
  updateNpcStats: (id: string, patch: Partial<CharacterStats>) => void
  deleteNpc: (id: string) => void
  updateTheme: (patch: Partial<ThemeConfig>) => void
  resetTheme: () => void
  setModuleVisible: (id: ModuleId, visible: boolean) => void
  reorderModules: (fromIndex: number, toIndex: number) => void
  resetModules: () => void
  replaceAll: (next: AppData) => void
  resetToSeed: () => void
  importJson: (json: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function updateList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const toggleLocation = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      activeLocationId: id,
      // Always land on Default when switching location
      activeSceneId: d.activeLocationId === id ? d.activeSceneId : null,
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
      const activeLocationId =
        d.activeLocationId === id ? locations[0]?.id ?? null : d.activeLocationId
      return {
        ...d,
        locations,
        scenes,
        activeLocationId,
        activeSceneId: d.activeLocationId === id ? null : d.activeSceneId,
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
    setData((d) => ({ ...d, players: d.players.filter((p) => p.id !== id) }))
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

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  const resetToSeed = useCallback(() => {
    localStorage.removeItem('dm-assistant-data-v2')
    localStorage.removeItem('dm-assistant-data-v1')
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
      addNpc,
      updateNpc,
      updateNpcStats,
      deleteNpc,
      updateTheme,
      resetTheme,
      setModuleVisible,
      reorderModules,
      resetModules,
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
      addNpc,
      updateNpc,
      updateNpcStats,
      deleteNpc,
      updateTheme,
      resetTheme,
      setModuleVisible,
      reorderModules,
      resetModules,
      replaceAll,
      resetToSeed,
      importJson,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Resolve weather/audio for Default scene mode or a custom scene. */
export function useResolvedScene() {
  const { data } = useStore()
  const location = data.locations.find((l) => l.id === data.activeLocationId)
  const isDefault = data.activeSceneId == null
  const scene = isDefault
    ? undefined
    : data.scenes.find((s) => s.id === data.activeSceneId)

  const music: AudioClip | null = !isDefault && scene?.music?.youtubeUrl
    ? scene.music
    : location?.defaultMusic?.youtubeUrl
      ? location.defaultMusic
      : null
  const ambience: AudioClip | null = !isDefault && scene?.ambience?.youtubeUrl
    ? scene.ambience
    : location?.defaultAmbience?.youtubeUrl
      ? location.defaultAmbience
      : null
  const weather =
    (!isDefault && scene?.weather?.trim()) || location?.defaultWeather || '—'

  return { location, scene, isDefault, music, ambience, weather }
}

export type { DashboardModule }
