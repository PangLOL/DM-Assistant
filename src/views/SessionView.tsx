import { useStore, useResolvedAudio } from '../hooks/useStore'
import { useAudio } from '../hooks/useAudioContext'
import { clipSummary } from '../data/storage'

export function SessionView() {
  const { data, setActiveLocation, setActiveScene } = useStore()
  const audio = useAudio()

  const location = data.locations.find((l) => l.id === data.activeLocationId)
  const scene = data.scenes.find((s) => s.id === data.activeSceneId)
  const scenesHere = data.scenes.filter((s) => s.locationId === location?.id)
  const { music, ambience, weather } = useResolvedAudio(scene, location)

  const sceneNpcs = data.npcs.filter((n) => scene?.npcIds.includes(n.id))
  const encounterNpcs = (ids: string[]) => data.npcs.filter((n) => ids.includes(n.id))

  return (
    <div className="view session-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Live session</p>
          <h2>Table overview</h2>
          <p className="lede">
            Jump between locations and scenes, spin up soundscapes, and keep an eye on everyone at
            the table.
          </p>
        </div>
      </header>

      <div className="session-grid">
        <section className="panel">
          <h3>Active place</h3>
          <label className="field">
            <span>Location</span>
            <select
              value={location?.id ?? ''}
              onChange={(e) => {
                const id = e.target.value || null
                setActiveLocation(id)
                const first = data.scenes.find((s) => s.locationId === id)
                setActiveScene(first?.id ?? null)
              }}
            >
              <option value="">Select location…</option>
              {data.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Scene</span>
            <select
              value={scene?.id ?? ''}
              onChange={(e) => setActiveScene(e.target.value || null)}
              disabled={!location}
            >
              <option value="">Select scene…</option>
              {scenesHere.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {location ? (
            <div className="place-card">
              <h4>{location.name}</h4>
              <dl className="meta-list">
                <div>
                  <dt>Size</dt>
                  <dd>{location.size === 'custom' ? location.customSize || 'Custom' : location.size}</dd>
                </div>
                <div>
                  <dt>Biome</dt>
                  <dd>{location.biome || '—'}</dd>
                </div>
                <div>
                  <dt>Atmosphere</dt>
                  <dd>{location.atmosphere || '—'}</dd>
                </div>
                <div>
                  <dt>Weather</dt>
                  <dd>{weather}</dd>
                </div>
              </dl>
              {scene ? (
                <>
                  <h4 className="scene-name">{scene.name}</h4>
                  <p>{scene.description || 'No scene description yet.'}</p>
                </>
              ) : (
                <p className="empty-inline">Choose a scene to run.</p>
              )}
            </div>
          ) : (
            <p className="empty-inline">Create a location in World to begin.</p>
          )}

          <div className="soundscape">
            <h4>Soundscape</h4>
            <p>
              <strong>Music:</strong> {clipSummary(music)}
            </p>
            <p>
              <strong>Ambience:</strong> {clipSummary(ambience)}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--accent"
                disabled={!music && !ambience}
                onClick={() => audio.playSceneAudio(music, ambience)}
              >
                Play scene audio
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => audio.stopAll()}>
                Stop audio
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3>Party</h3>
          {data.players.length === 0 ? (
            <p className="empty-inline">No players yet — add them in Players.</p>
          ) : (
            <ul className="tracker-strip">
              {data.players.map((p) => {
                const pct = Math.max(0, Math.min(100, (p.stats.hp / Math.max(1, p.stats.maxHp)) * 100))
                return (
                  <li key={p.id}>
                    <div className="tracker-strip__head">
                      <strong>{p.name}</strong>
                      <span>{p.role || 'Adventurer'}</span>
                    </div>
                    <div className="hp-bar">
                      <div className="hp-bar__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="hp-text">
                      {p.stats.hp}/{p.stats.maxHp} HP
                    </span>
                    {(p.stats.buffs.length > 0 || p.stats.debuffs.length > 0) && (
                      <div className="mini-tags">
                        {p.stats.buffs.map((b) => (
                          <span key={b} className="tag tag--buff">
                            {b}
                          </span>
                        ))}
                        {p.stats.debuffs.map((b) => (
                          <span key={b} className="tag tag--debuff">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel panel--wide">
          <h3>Encounters & scene cast</h3>
          {scene ? (
            <>
              {scene.encounters.length === 0 ? (
                <p className="empty-inline">No encounters on this scene.</p>
              ) : (
                <ul className="encounter-list">
                  {scene.encounters.map((enc) => (
                    <li key={enc.id}>
                      <h4>{enc.title}</h4>
                      <p>{enc.description || 'No description.'}</p>
                      <div className="mini-tags">
                        {encounterNpcs(enc.npcIds).map((n) => (
                          <span key={n.id} className={`tag tag--${n.kind}`}>
                            {n.name} · {n.stats.hp}/{n.stats.maxHp}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <h4 className="subhead">On stage</h4>
              {sceneNpcs.length === 0 ? (
                <p className="empty-inline">No NPCs linked to this scene.</p>
              ) : (
                <ul className="tracker-strip tracker-strip--npc">
                  {sceneNpcs.map((n) => {
                    const pct = Math.max(
                      0,
                      Math.min(100, (n.stats.hp / Math.max(1, n.stats.maxHp)) * 100),
                    )
                    return (
                      <li key={n.id}>
                        <div className="tracker-strip__head">
                          <strong>{n.name}</strong>
                          <span>
                            {n.kind} · {n.role || '—'}
                          </span>
                        </div>
                        <div className="hp-bar">
                          <div className="hp-bar__fill hp-bar__fill--npc" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="hp-text">
                          {n.stats.hp}/{n.stats.maxHp} HP · ATK {n.stats.attack} · ARM {n.stats.armor}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="empty-inline">Select a scene to see encounters.</p>
          )}
        </section>
      </div>
    </div>
  )
}
