import { useMemo, useState } from 'react'
import { blobToDataUrl } from '../lib/csv'
import { rollD20 } from '../lib/rules5e'
import { useRole } from '../hooks/useRole'
import { useStore } from '../hooks/useStore'
import { useTableBus } from '../hooks/useTableBus'
import type { TableAction, TokenKind } from '../types'

function parseActor(key: string): { kind: TokenKind; id: string } | null {
  const [kind, id] = key.split(':')
  if ((kind !== 'player' && kind !== 'npc') || !id) return null
  return { kind, id }
}

export function MapView() {
  const role = useRole()
  const {
    data,
    addMap,
    updateMap,
    deleteMap,
    setActiveMap,
    toggleWalkable,
    placeOrMoveToken,
    proposeAction,
    clearPending,
    resolvePending,
  } = useStore()
  const bus = useTableBus()

  const [paint, setPaint] = useState(false)
  const [actorKey, setActorKey] = useState('')
  const [action, setAction] = useState<TableAction>('move')
  const [d20, setD20] = useState('')
  const [advantage, setAdvantage] = useState(false)
  const [disadvantage, setDisadvantage] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [modifier, setModifier] = useState('0')
  const [manualHp, setManualHp] = useState('')

  const locationMaps = data.maps.filter((m) =>
    role === 'player' ? true : m.locationId === data.activeLocationId,
  )
  const map =
    data.maps.find((m) => m.id === data.activeMapId) ?? locationMaps[0] ?? data.maps[0] ?? null

  const tokens = data.tokens.filter((t) => t.mapId === map?.id)
  const actor = parseActor(actorKey)

  const tokenLabel = (kind: TokenKind, id: string) => {
    if (kind === 'player') return data.players.find((p) => p.id === id)?.name ?? 'Player'
    return data.npcs.find((n) => n.id === id)?.name ?? 'NPC'
  }

  const actors = useMemo(() => {
    return [
      ...data.players.map((p) => ({ key: `player:${p.id}`, label: `${p.name} (player)` })),
      ...data.npcs.map((n) => ({ key: `npc:${n.id}`, label: `${n.name} (${n.kind})` })),
    ]
  }, [data.players, data.npcs])

  const onCell = (x: number, y: number) => {
    if (!map) return
    if (role === 'dm' && paint) {
      toggleWalkable(map.id, x, y)
      return
    }
    if (!actor) {
      setMessage('Select a character first.')
      return
    }
    const occupant = tokens.find((t) => t.gx === x && t.gy === y)
    if (action === 'attack') {
      if (!occupant || (occupant.kind === actor.kind && occupant.characterId === actor.id)) {
        setMessage('Attack: tap an enemy or other token.')
        return
      }
      const roll = d20 === '' ? null : Number(d20)
      const err = proposeAction({
        actorKind: actor.kind,
        actorId: actor.id,
        action: 'attack',
        targetId: occupant.id,
        d20: Number.isFinite(roll) ? roll : null,
        advantage,
        disadvantage,
      })
      if (!err) {
        bus.sendPropose?.({
          type: 'propose',
          actorKind: actor.kind,
          actorId: actor.id,
          action: 'attack',
          targetGx: null,
          targetGy: null,
          targetId: occupant.id,
          d20: Number.isFinite(roll) ? roll : null,
          advantage,
          disadvantage,
        })
      }
      setMessage(err ?? 'Proposed. Waiting for the DM.')
      return
    }
    const mine = tokens.find((t) => t.kind === actor.kind && t.characterId === actor.id)
    if (role === 'dm' && !mine) {
      placeOrMoveToken(actor.kind, actor.id, map.id, x, y)
      setMessage(`Placed ${tokenLabel(actor.kind, actor.id)} on ${x},${y}.`)
      return
    }
    const err = proposeAction({
      actorKind: actor.kind,
      actorId: actor.id,
      action: 'move',
      targetGx: x,
      targetGy: y,
    })
    if (!err) {
      bus.sendPropose?.({
        type: 'propose',
        actorKind: actor.kind,
        actorId: actor.id,
        action: 'move',
        targetGx: x,
        targetGy: y,
        targetId: null,
        d20: null,
        advantage,
        disadvantage,
      })
    }
    setMessage(err ?? 'Move proposed. Waiting for the DM.')
  }

  const onImage = async (file: File | undefined) => {
    if (!file || !map) return
    const url = await blobToDataUrl(file)
    updateMap(map.id, { imageDataUrl: url, imageName: file.name })
  }

  return (
    <div className="view map-view">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{role === 'dm' ? 'DM map' : 'Player table'}</p>
          <h2>{map?.name ?? 'No map'}</h2>
          <p className="lede">
            {role === 'dm'
              ? 'Paint walkable squares over the image, place tokens, then run move/attack. Players join with a room code — they never see your desktop notes.'
              : 'Pick your character, choose Move or Attack, tap the grid, then Propose. The DM accepts or declines on their device.'}
          </p>
        </div>
      </header>

      {role === 'dm' ? (
        <div className="map-toolbar">
          <label className="field field--tight">
            <span>Map</span>
            <select
              value={map?.id ?? ''}
              onChange={(e) => setActiveMap(e.target.value || null)}
            >
              {locationMaps.length === 0 ? <option value="">None</option> : null}
              {locationMaps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--sm"
            disabled={!data.activeLocationId}
            onClick={() => data.activeLocationId && addMap(data.activeLocationId)}
          >
            New map
          </button>
          {map ? (
            <>
              <label className="field field--tight">
                <span>Name</span>
                <input value={map.name} onChange={(e) => updateMap(map.id, { name: e.target.value })} />
              </label>
              <label className="field field--tight">
                <span>Cols</span>
                <input
                  type="number"
                  min={2}
                  max={80}
                  value={map.cols}
                  onChange={(e) => updateMap(map.id, { cols: Math.max(2, Number(e.target.value) || 2) })}
                />
              </label>
              <label className="field field--tight">
                <span>Rows</span>
                <input
                  type="number"
                  min={2}
                  max={80}
                  value={map.rows}
                  onChange={(e) => updateMap(map.id, { rows: Math.max(2, Number(e.target.value) || 2) })}
                />
              </label>
              <label className="btn btn--sm">
                Import image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void onImage(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                className={`btn btn--sm${paint ? ' btn--accent' : ''}`}
                onClick={() => setPaint((v) => !v)}
              >
                {paint ? 'Painting walkable' : 'Paint walkable'}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => {
                  if (confirm('Delete this map?')) deleteMap(map.id)
                }}
              >
                Delete map
              </button>
            </>
          ) : (
            <p className="empty-inline">Toggle a location, then create a map.</p>
          )}
        </div>
      ) : null}

      <div className="map-toolbar">
        <label className="field field--tight">
          <span>Character</span>
          <select value={actorKey} onChange={(e) => setActorKey(e.target.value)}>
            <option value="">Select…</option>
            {actors.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--tight">
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value as TableAction)}>
            <option value="move">Move</option>
            <option value="attack">Attack</option>
          </select>
        </label>
        {action === 'attack' ? (
          <>
            <label className="field field--tight">
              <span>d20</span>
              <input
                type="number"
                min={1}
                max={20}
                value={d20}
                onChange={(e) => setD20(e.target.value)}
                placeholder="roll"
              />
            </label>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                const r = rollD20(advantage, disadvantage)
                setD20(String(r.used))
                setMessage(`Rolled ${r.rolls.join(' / ')} → ${r.used}`)
              }}
            >
              Roll d20
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={advantage}
                onChange={(e) => {
                  setAdvantage(e.target.checked)
                  if (e.target.checked) setDisadvantage(false)
                }}
              />
              Adv
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={disadvantage}
                onChange={(e) => {
                  setDisadvantage(e.target.checked)
                  if (e.target.checked) setAdvantage(false)
                }}
              />
              Dis
            </label>
          </>
        ) : null}
      </div>

      {map ? (
        <div
          className="map-board"
          style={{
            gridTemplateColumns: `repeat(${map.cols}, 1fr)`,
            gridTemplateRows: `repeat(${map.rows}, 1fr)`,
          }}
        >
          {map.imageDataUrl ? (
            <img className="map-board__image" src={map.imageDataUrl} alt="" />
          ) : null}
          {Array.from({ length: map.rows }).map((_, y) =>
            Array.from({ length: map.cols }).map((__, x) => {
              const walk = map.walkable.some((c) => c.x === x && c.y === y)
              const tok = tokens.find((t) => t.gx === x && t.gy === y)
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className={`map-cell${walk ? ' is-walk' : ''}${tok ? ' has-token' : ''}`}
                  onClick={() => onCell(x, y)}
                >
                  {tok ? (
                    <span className={`token token--${tok.kind}`}>
                      {tokenLabel(tok.kind, tok.characterId).slice(0, 3)}
                    </span>
                  ) : null}
                </button>
              )
            }),
          )}
        </div>
      ) : (
        <p className="empty">No map on this table yet.</p>
      )}

      {data.pendingAction ? (
        <section className="panel pending-panel">
          <h3>Proposed action</h3>
          <p>{data.pendingAction.preview}</p>
          {role === 'dm' ? (
            <>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={() => setMessage(resolvePending('rules'))}
                >
                  Accept (basic rules)
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setMessage(resolvePending('modifier', { modifier: Number(modifier) || 0 }))
                  }
                >
                  Accept + modifier
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setMessage(
                      resolvePending('manual', {
                        manualHp: manualHp === '' ? undefined : Number(manualHp),
                      }),
                    )
                  }
                >
                  Accept + set HP
                </button>
                <button type="button" className="btn btn--danger" onClick={() => clearPending()}>
                  Decline
                </button>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Damage / move modifier</span>
                  <input value={modifier} onChange={(e) => setModifier(e.target.value)} />
                </label>
                <label className="field">
                  <span>Manual HP</span>
                  <input value={manualHp} onChange={(e) => setManualHp(e.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <p className="hint">Waiting for the DM to accept or decline.</p>
          )}
        </section>
      ) : null}

      {message ? <p className="hint map-msg">{message}</p> : null}
    </div>
  )
}
