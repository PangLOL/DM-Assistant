import { useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { StatEditor } from '../components/StatEditor'

export function PlayersView() {
  const { data, addPlayer, updatePlayer, updatePlayerStats, deletePlayer } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(data.players[0]?.id ?? null)

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
        <ul className="entity-list">
          {data.players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={p.id === selectedId ? 'is-active' : undefined}
                onClick={() => setSelectedId(p.id)}
              >
                <strong>{p.name}</strong>
                <span>
                  {p.role || 'No role'} · {p.stats.hp}/{p.stats.maxHp} HP
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
            </header>

            <div className="form-grid">
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
