import { useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { StatEditor } from '../components/StatEditor'
import type { NpcKind } from '../types'

const KINDS: NpcKind[] = ['enemy', 'npc', 'ally']

export function NpcsView() {
  const { data, addNpc, updateNpc, updateNpcStats, deleteNpc } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(data.npcs[0]?.id ?? null)
  const [kindFilter, setKindFilter] = useState<'all' | NpcKind>('all')

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return data.npcs
    return data.npcs.filter((n) => n.kind === kindFilter)
  }, [data.npcs, kindFilter])

  const npc = useMemo(
    () => data.npcs.find((n) => n.id === selectedId) ?? null,
    [data.npcs, selectedId],
  )

  return (
    <div className="view split-view">
      <aside className="list-pane">
        <div className="list-pane__head">
          <h2>Enemies / NPCs</h2>
          <button type="button" className="btn btn--accent" onClick={() => setSelectedId(addNpc())}>
            Add
          </button>
        </div>
        <label className="field field--tight">
          <span>Filter</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as 'all' | NpcKind)}
          >
            <option value="all">All</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <ul className="entity-list">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={n.id === selectedId ? 'is-active' : undefined}
                onClick={() => setSelectedId(n.id)}
              >
                <strong>{n.name}</strong>
                <span>
                  {n.kind} · {n.stats.hp}/{n.stats.maxHp} HP
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="detail-pane">
        {!npc ? (
          <p className="empty">Track enemies and NPCs for combat and social scenes.</p>
        ) : (
          <>
            <header className="detail-pane__head">
              <div>
                <p className="eyebrow">Enemy / NPC tracker</p>
                <h2>{npc.name}</h2>
              </div>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (confirm(`Remove ${npc.name}?`)) {
                    deleteNpc(npc.id)
                    setSelectedId(data.npcs.find((n) => n.id !== npc.id)?.id ?? null)
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
                  value={npc.name}
                  onChange={(e) => updateNpc(npc.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Kind</span>
                <select
                  value={npc.kind}
                  onChange={(e) => updateNpc(npc.id, { kind: e.target.value as NpcKind })}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Role</span>
                <input
                  value={npc.role}
                  onChange={(e) => updateNpc(npc.id, { role: e.target.value })}
                  placeholder="Bandit captain, innkeeper…"
                />
              </label>
              <label className="field field--full">
                <span>Personality</span>
                <textarea
                  rows={2}
                  value={npc.personality}
                  onChange={(e) => updateNpc(npc.id, { personality: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>Notes</span>
                <textarea
                  rows={2}
                  value={npc.notes}
                  onChange={(e) => updateNpc(npc.id, { notes: e.target.value })}
                />
              </label>
            </div>

            <StatEditor stats={npc.stats} onChange={(patch) => updateNpcStats(npc.id, patch)} />
          </>
        )}
      </section>
    </div>
  )
}
