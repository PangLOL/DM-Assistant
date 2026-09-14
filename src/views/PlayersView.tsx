import { useMemo, useRef, useState } from 'react'
import { CharacterSheet } from '../components/CharacterSheet'
import { PortraitPicker } from '../components/PortraitPicker'
import { downloadAllCharacterHandouts, downloadCharacterHandout } from '../data/campaignCsv'
import { useStore } from '../hooks/useStore'
import { StatEditor } from '../components/StatEditor'

export function PlayersView() {
  const { data, addPlayer, updatePlayer, updatePlayerStats, deletePlayer, importPlayerCsv } =
    useStore()
  const [selectedId, setSelectedId] = useState<string | null>(data.players[0]?.id ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  const player = useMemo(
    () => data.players.find((p) => p.id === selectedId) ?? null,
    [data.players, selectedId],
  )

  return (
    <div className="view split-view">
      <aside className="list-pane">
        <div className="list-pane__head">
          <h2>Players</h2>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => setSelectedId(addPlayer())}
          >
            Add player
          </button>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
            Import CSV
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={data.players.length === 0}
            onClick={() => downloadAllCharacterHandouts(data.players)}
          >
            Hand out character files
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const id = importPlayerCsv(await file.text())
                setSelectedId(id)
              } catch {
                alert('Could not read that character CSV.')
              }
              e.target.value = ''
            }}
          />
        </div>
        <ul className="entity-list">
          {data.players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={p.id === selectedId ? 'is-active' : undefined}
                onClick={() => setSelectedId(p.id)}
              >
                {p.portraitDataUrl ? (
                  <img className="entity-list__portrait" src={p.portraitDataUrl} alt="" />
                ) : null}
                <span className="entity-list__copy">
                  <strong>{p.name}</strong>
                  <span>
                    {p.role || 'No role'} · {p.stats.hp}/{p.stats.maxHp} HP
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="detail-pane">
        {!player ? (
          <p className="empty">Add a player character to track stats at the table.</p>
        ) : (
          <>
            <header className="detail-pane__head">
              <div>
                <p className="eyebrow">Player tracker</p>
                <h2>{player.name}</h2>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => downloadCharacterHandout(player)}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    if (confirm(`Remove ${player.name}?`)) {
                      deletePlayer(player.id)
                      setSelectedId(data.players.find((p) => p.id !== player.id)?.id ?? null)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </header>

            <CharacterSheet player={player} compact />

            <div className="form-grid">
              <div className="field field--full">
                <span>Portrait</span>
                <PortraitPicker
                  value={player.portraitDataUrl}
                  onChange={(portraitDataUrl) => updatePlayer(player.id, { portraitDataUrl })}
                />
              </div>
              <label className="field">
                <span>Name</span>
                <input
                  value={player.name}
                  onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Role / class</span>
                <input
                  value={player.role}
                  onChange={(e) => updatePlayer(player.id, { role: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Backstory</span>
                <textarea
                  rows={3}
                  value={player.backstory}
                  onChange={(e) => updatePlayer(player.id, { backstory: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Personality</span>
                <textarea
                  rows={2}
                  value={player.personality}
                  onChange={(e) => updatePlayer(player.id, { personality: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Notes</span>
                <textarea
                  rows={2}
                  value={player.notes}
                  onChange={(e) => updatePlayer(player.id, { notes: e.target.value })}
                />
              </label>
            </div>

            <StatEditor
              stats={player.stats}
              onChange={(patch) => updatePlayerStats(player.id, patch)}
            />
          </>
        )}
      </section>
    </div>
  )
}
