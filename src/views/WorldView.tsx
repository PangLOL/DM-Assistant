import { useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { AudioClipEditor } from '../components/AudioClipEditor'
import type { LocationSize } from '../types'

const SIZES: LocationSize[] = ['tiny', 'small', 'medium', 'large', 'vast', 'custom']

export function WorldView() {
  const { data, addLocation, updateLocation, deleteLocation, setActiveLocation, addScene } =
    useStore()
  const [selectedId, setSelectedId] = useState<string | null>(
    data.activeLocationId ?? data.locations[0]?.id ?? null,
  )

  const location = useMemo(
    () => data.locations.find((l) => l.id === selectedId) ?? null,
    [data.locations, selectedId],
  )

  const sceneCount = (id: string) => data.scenes.filter((s) => s.locationId === id).length

  return (
    <div className="view split-view">
      <aside className="list-pane">
        <div className="list-pane__head">
          <h2>Locations</h2>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              const id = addLocation()
              setSelectedId(id)
            }}
          >
            Add location
          </button>
        </div>
        <ul className="entity-list">
          {data.locations.map((loc) => (
            <li key={loc.id}>
              <button
                type="button"
                className={loc.id === selectedId ? 'is-active' : undefined}
                onClick={() => {
                  setSelectedId(loc.id)
                  setActiveLocation(loc.id)
                }}
              >
                <strong>{loc.name}</strong>
                <span>
                  {loc.biome || 'No biome'} · {sceneCount(loc.id)} scene
                  {sceneCount(loc.id) === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="detail-pane">
        {!location ? (
          <p className="empty">Define your first location to start world-building.</p>
        ) : (
          <>
            <header className="detail-pane__head">
              <div>
                <p className="eyebrow">World building</p>
                <h2>{location.name}</h2>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => addScene(location.id)}
                >
                  Add scene here
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    if (confirm(`Delete “${location.name}” and its scenes?`)) {
                      deleteLocation(location.id)
                      setSelectedId(data.locations.find((l) => l.id !== location.id)?.id ?? null)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </header>

            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input
                  value={location.name}
                  onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Size</span>
                <select
                  value={location.size}
                  onChange={(e) =>
                    updateLocation(location.id, { size: e.target.value as LocationSize })
                  }
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {location.size === 'custom' ? (
                <label className="field">
                  <span>Custom size</span>
                  <input
                    value={location.customSize ?? ''}
                    onChange={(e) => updateLocation(location.id, { customSize: e.target.value })}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>Biome</span>
                <input
                  value={location.biome}
                  onChange={(e) => updateLocation(location.id, { biome: e.target.value })}
                  placeholder="Forest, desert, underdark…"
                />
              </label>
              <label className="field field--full">
                <span>Atmosphere</span>
                <textarea
                  rows={2}
                  value={location.atmosphere}
                  onChange={(e) => updateLocation(location.id, { atmosphere: e.target.value })}
                  placeholder="Mood, smells, sensory details…"
                />
              </label>
              <label className="field">
                <span>Default weather</span>
                <input
                  value={location.defaultWeather}
                  onChange={(e) => updateLocation(location.id, { defaultWeather: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={location.notes}
                  onChange={(e) => updateLocation(location.id, { notes: e.target.value })}
                />
              </label>
            </div>

            <div className="audio-pair">
              <AudioClipEditor
                title="Default background music"
                value={location.defaultMusic}
                onChange={(defaultMusic) => updateLocation(location.id, { defaultMusic })}
              />
              <AudioClipEditor
                title="Default ambient audio"
                value={location.defaultAmbience}
                onChange={(defaultAmbience) => updateLocation(location.id, { defaultAmbience })}
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
