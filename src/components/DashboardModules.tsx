import { clipSummary } from '../data/storage'
import { useAudio } from '../hooks/useAudioContext'
import { useResolvedScene, useStore } from '../hooks/useStore'
import { ScenePicker } from './ScenePicker'

export function PlaceModule() {
  const { location, scene, isDefault, weather } = useResolvedScene()

  if (!location) {
    return <p className="empty-inline">Toggle a location from the list to begin.</p>
  }

  return (
    <div className="place-module">
      <ScenePicker />
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
        {isDefault ? (
          <>
            <h4 className="scene-name">Default scene</h4>
            <p>{location.notes || location.atmosphere || 'Using this location’s defaults.'}</p>
          </>
        ) : (
          <>
            <h4 className="scene-name">{scene?.name}</h4>
            <p>{scene?.description || 'No scene description yet.'}</p>
          </>
        )}
      </div>
    </div>
  )
}

export function SoundscapeModule() {
  const { music, ambience } = useResolvedScene()
  const audio = useAudio()

  return (
    <div className="soundscape">
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
  )
}

export function PartyModule() {
  const { data, updatePlayerStats } = useStore()

  if (data.players.length === 0) {
    return <p className="empty-inline">No players yet — add them in Players.</p>
  }

  return (
    <ul className="tracker-strip">
      {data.players.map((p) => {
        const pct = Math.max(0, Math.min(100, (p.stats.hp / Math.max(1, p.stats.maxHp)) * 100))
        return (
          <li key={p.id}>
            <div className="tracker-strip__head">
              <span className="tracker-strip__who">
                {p.portraitDataUrl ? (
                  <img className="tracker-strip__portrait" src={p.portraitDataUrl} alt="" />
                ) : null}
                <strong>{p.name}</strong>
              </span>
              <span>{p.role || 'Adventurer'}</span>
            </div>
            <div className="hp-bar">
              <div className="hp-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="hp-inline">
              <span className="hp-text">
                {p.stats.hp}/{p.stats.maxHp} HP
              </span>
              <div className="hp-quick">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => updatePlayerStats(p.id, { hp: Math.max(0, p.stats.hp - 1) })}
                >
                  −1
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    updatePlayerStats(p.id, { hp: Math.min(p.stats.maxHp, p.stats.hp + 1) })
                  }
                >
                  +1
                </button>
              </div>
            </div>
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
  )
}

export function CastModule() {
  const { data, updateNpcStats } = useStore()
  const { scene, isDefault } = useResolvedScene()

  if (isDefault) {
    return (
      <p className="empty-inline">
        Default scene has no cast — pick a custom scene to show linked NPCs.
      </p>
    )
  }

  const sceneNpcs = data.npcs.filter((n) => scene?.npcIds.includes(n.id))
  if (sceneNpcs.length === 0) {
    return <p className="empty-inline">No NPCs linked to this scene.</p>
  }

  return (
    <ul className="tracker-strip tracker-strip--npc">
      {sceneNpcs.map((n) => {
        const pct = Math.max(0, Math.min(100, (n.stats.hp / Math.max(1, n.stats.maxHp)) * 100))
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
            <div className="hp-inline">
              <span className="hp-text">
                {n.stats.hp}/{n.stats.maxHp} HP · ATK {n.stats.attack} · ARM {n.stats.armor}
              </span>
              <div className="hp-quick">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => updateNpcStats(n.id, { hp: Math.max(0, n.stats.hp - 1) })}
                >
                  −1
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    updateNpcStats(n.id, { hp: Math.min(n.stats.maxHp, n.stats.hp + 1) })
                  }
                >
                  +1
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function EncountersModule() {
  const { data } = useStore()
  const { scene, isDefault } = useResolvedScene()

  if (isDefault) {
    return (
      <p className="empty-inline">
        Default scene has no encounters — choose a custom scene to run events.
      </p>
    )
  }

  if (!scene || scene.encounters.length === 0) {
    return <p className="empty-inline">No encounters on this scene.</p>
  }

  const encounterNpcs = (ids: string[]) => data.npcs.filter((n) => ids.includes(n.id))

  return (
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
  )
}
