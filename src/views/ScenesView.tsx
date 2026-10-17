import { useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { AudioClipEditor } from '../components/AudioClipEditor'

export function ScenesView() {
  const {
    data,
    addScene,
    updateScene,
    deleteScene,
    addEncounter,
    updateEncounter,
    deleteEncounter,
    setActiveScene,
  } = useStore()

  const [selectedId, setSelectedId] = useState<string | null>(
    data.activeSceneId ?? data.scenes[0]?.id ?? null,
  )
  const [filterLocation, setFilterLocation] = useState<string>('all')

  const filtered = useMemo(() => {
    if (filterLocation === 'all') return data.scenes
    return data.scenes.filter((s) => s.locationId === filterLocation)
  }, [data.scenes, filterLocation])

  const scene = useMemo(
    () => data.scenes.find((s) => s.id === selectedId) ?? null,
    [data.scenes, selectedId],
  )

  const locationName = (id: string) =>
    data.locations.find((l) => l.id === id)?.name ?? 'Unknown location'

  const toggleNpc = (list: string[], npcId: string) =>
    list.includes(npcId) ? list.filter((id) => id !== npcId) : [...list, npcId]

  return (
    <div className="view split-view">
      <aside className="list-pane">
        <div className="list-pane__head">
          <h2>Scenes</h2>
          <button
            type="button"
            className="btn btn--accent"
            disabled={data.locations.length === 0}
            onClick={() => {
              const locId =
                filterLocation !== 'all'
                  ? filterLocation
                  : data.activeLocationId ?? data.locations[0]?.id
              if (!locId) return
              const id = addScene(locId)
              setSelectedId(id)
            }}
          >
            Add scene
          </button>
        </div>
        <label className="field field--tight">
          <span>Filter by location</span>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
            <option value="all">All locations</option>
            {data.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <ul className="entity-list">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={s.id === selectedId ? 'is-active' : undefined}
                onClick={() => {
                  setSelectedId(s.id)
                  setActiveScene(s.id)
                }}
              >
                <strong>{s.name}</strong>
                <span>
                  {locationName(s.locationId)} · {s.encounters.length} encounter
                  {s.encounters.length === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="detail-pane">
        {!scene ? (
          <p className="empty">Pick or create a scene to build encounters.</p>
        ) : (
          <>
            <header className="detail-pane__head">
              <div>
                <p className="eyebrow">Scene building</p>
                <h2>{scene.name}</h2>
              </div>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (confirm(`Delete scene “${scene.name}”?`)) {
                    deleteScene(scene.id)
                    setSelectedId(data.scenes.find((s) => s.id !== scene.id)?.id ?? null)
                  }
                }}
              >
                Delete
              </button>
            </header>

            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input
                  value={scene.name}
                  onChange={(e) => updateScene(scene.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Location</span>
                <select
                  value={scene.locationId}
                  onChange={(e) => updateScene(scene.id, { locationId: e.target.value })}
                >
                  {data.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Scene weather (optional override)</span>
                <input
                  value={scene.weather}
                  placeholder="Leave blank to use location default"
                  onChange={(e) => updateScene(scene.id, { weather: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Description / event</span>
                <textarea
                  rows={4}
                  value={scene.description}
                  onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                  placeholder="What the players see, hear, and can interact with…"
                />
              </label>
            </div>

            <div className="audio-pair">
              <AudioClipEditor
                title="Scene music (overrides location)"
                value={scene.music}
                onChange={(music) => updateScene(scene.id, { music })}
              />
              <AudioClipEditor
                title="Scene ambience (overrides location)"
                value={scene.ambience}
                onChange={(ambience) => updateScene(scene.id, { ambience })}
              />
            </div>

            <div className="panel-block">
              <div className="panel-block__head">
                <h3>Scene cast (enemies / NPCs)</h3>
              </div>
              <div className="check-grid">
                {data.npcs.length === 0 ? (
                  <p className="empty-inline">Create NPCs in the Enemy / NPC tracker first.</p>
                ) : (
                  data.npcs.map((n) => (
                    <label key={n.id} className="check">
                      <input
                        type="checkbox"
                        checked={scene.npcIds.includes(n.id)}
                        onChange={() =>
                          updateScene(scene.id, {
                            npcIds: toggleNpc(scene.npcIds, n.id),
                          })
                        }
                      />
                      <span>
                        {n.name} <em>({n.kind})</em>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="panel-block">
              <div className="panel-block__head">
                <h3>Encounters</h3>
                <button type="button" className="btn btn--sm" onClick={() => addEncounter(scene.id)}>
                  Add encounter
                </button>
              </div>
              {scene.encounters.length === 0 ? (
                <p className="empty-inline">No encounters yet.</p>
              ) : (
                <ul className="encounter-editor">
                  {scene.encounters.map((enc) => (
                    <li key={enc.id}>
                      <div className="encounter-editor__head">
                        <input
                          className="title-input"
                          value={enc.title}
                          onChange={(e) =>
                            updateEncounter(scene.id, enc.id, { title: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => deleteEncounter(scene.id, enc.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={enc.description}
                        placeholder="Encounter description…"
                        onChange={(e) =>
                          updateEncounter(scene.id, enc.id, { description: e.target.value })
                        }
                      />
                      <div className="check-grid">
                        {data.npcs.map((n) => (
                          <label key={n.id} className="check">
                            <input
                              type="checkbox"
                              checked={enc.npcIds.includes(n.id)}
                              onChange={() =>
                                updateEncounter(scene.id, enc.id, {
                                  npcIds: toggleNpc(enc.npcIds, n.id),
                                })
                              }
                            />
                            <span>{n.name}</span>
                          </label>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
