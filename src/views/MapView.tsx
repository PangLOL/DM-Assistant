import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { CharacterSheet } from '../components/CharacterSheet'
import { blobToDataUrl } from '../lib/csv'
import { cellKey, chebyshev, reachableSquares, rectCells, rollD20, speedSquares, squaresToFeet } from '../lib/rules5e'
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
    paintWalkableRect,
    placeOrMoveToken,
    proposeAction,
    clearPending,
    resolvePending,
  } = useStore()
  const bus = useTableBus()

  const [paint, setPaint] = useState(false)
  const [erase, setErase] = useState(false)
  const [brush, setBrush] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const brushRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
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

  const tokenPortrait = (kind: TokenKind, id: string) => {
    if (kind !== 'player') return ''
    return data.players.find((p) => p.id === id)?.portraitDataUrl ?? ''
  }

  const selectedPlayer =
    actor?.kind === 'player' ? (data.players.find((p) => p.id === actor.id) ?? null) : null

  const actors = useMemo(() => {
    const party = data.players.map((p) => ({
      key: `player:${p.id}`,
      label: `${p.name} (player)`,
    }))
    if (role === 'player') return party
    return [
      ...party,
      ...data.npcs.map((n) => ({ key: `npc:${n.id}`, label: `${n.name} (${n.kind})` })),
    ]
  }, [data.players, data.npcs, role])

  const onCell = (x: number, y: number) => {
    if (!map) return
    if (role === 'dm' && paint) return
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

  const actorToken = actor
    ? (tokens.find((t) => t.kind === actor.kind && t.characterId === actor.id) ?? null)
    : null
  const actorStats = actor
    ? actor.kind === 'player'
      ? (data.players.find((p) => p.id === actor.id)?.stats ?? null)
      : (data.npcs.find((n) => n.id === actor.id)?.stats ?? null)
    : null

  const walkSet = new Set((map?.walkable ?? []).map((c) => cellKey(c.x, c.y)))
  const blocked = new Set(
    tokens.filter((t) => t.id !== actorToken?.id).map((t) => cellKey(t.gx, t.gy)),
  )
  const reach =
    map && actorToken && actorStats && !paint && action === 'move'
      ? reachableSquares(
          map.walkable,
          actorToken.gx,
          actorToken.gy,
          speedSquares(actorStats.speedFt, map.squareFeet),
          blocked,
        )
      : new Map<string, number>()
  const attackTargets = new Set<string>()
  if (map && actorToken && actorStats && !paint && action === 'attack') {
    for (const token of tokens) {
      if (token.id === actorToken.id) continue
      const dist = squaresToFeet(
        chebyshev(actorToken.gx, actorToken.gy, token.gx, token.gy),
        map.squareFeet,
      )
      if (dist <= actorStats.rangeFt) attackTargets.add(cellKey(token.gx, token.gy))
    }
  }

  const cellAt = (event: PointerEvent<HTMLDivElement>) => {
    const board = boardRef.current
    if (!board || !map) return null
    const rect = board.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const x = Math.min(map.cols - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * map.cols)))
    const y = Math.min(map.rows - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * map.rows)))
    return { x, y }
  }

  const onBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (role !== 'dm' || !paint || !map) return
    const cell = cellAt(event)
    if (!cell) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic events used in checks cannot capture the pointer.
    }
    dragOrigin.current = cell
    const stroke = { x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y }
    brushRef.current = stroke
    setBrush(stroke)
  }

  const onBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current
    if (!origin || !paint) return
    const cell = cellAt(event)
    if (!cell) return
    const stroke = { x0: origin.x, y0: origin.y, x1: cell.x, y1: cell.y }
    brushRef.current = stroke
    setBrush(stroke)
  }

  const onBoardPointerUp = () => {
    const stroke = brushRef.current
    brushRef.current = null
    dragOrigin.current = null
    setBrush(null)
    if (!stroke || !map || role !== 'dm' || !paint) return
    paintWalkableRect(map.id, rectCells(stroke.x0, stroke.y0, stroke.x1, stroke.y1), !erase)
  }

  const brushSet = brush
    ? new Set(rectCells(brush.x0, brush.y0, brush.x1, brush.y1).map((c) => cellKey(c.x, c.y)))
    : new Set<string>()

  const moveHint =
    action === 'move' && actor && actorStats && !paint
      ? actorToken
        ? reach.size > 0
          ? `${reach.size} outlined squares are in reach (${actorStats.speedFt} ft). Tap one.`
          : 'No painted route from this token. Drag a connected clearing, then tap an outlined square.'
        : 'This character has no token on the map yet.'
      : null
  const attackHint =
    action === 'attack' && actor && actorStats && !paint
      ? actorToken
        ? attackTargets.size > 0
          ? `${attackTargets.size} outlined token${attackTargets.size === 1 ? '' : 's'} within ${actorStats.rangeFt} ft. Tap one.`
          : `No token within ${actorStats.rangeFt} ft. Move closer, then attack.`
        : 'This character has no token on the map yet.'
      : null

  return (
    <div className="view map-view">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{role === 'dm' ? 'DM map' : 'Player table'}</p>
          <h2>{map?.name ?? 'No map'}</h2>
          <p className="lede">
            {role === 'dm'
              ? 'Drag to paint the ground. Outlined squares are a legal move; outlined tokens are in attack range. Players join with a room code and never see your notes.'
              : 'Pick your character. Outlined squares are in reach. Outlined tokens are in range. Tap one, and the DM accepts or declines on their device.'}
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
                {paint ? 'Painting' : 'Paint ground'}
              </button>
              {paint ? (
                <button
                  type="button"
                  className={`btn btn--sm${erase ? ' btn--accent' : ''}`}
                  onClick={() => setErase((v) => !v)}
                >
                  {erase ? 'Erasing' : 'Erase'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  paintWalkableRect(map.id, rectCells(0, 0, map.cols - 1, map.rows - 1), true)
                }
              >
                Fill map
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  if (confirm('Clear all painted squares on this map?')) updateMap(map.id, { walkable: [] })
                }}
              >
                Clear paint
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

      {selectedPlayer ? (
        <div className="player-sheet-wrap player-sheet-wrap--map">
          <CharacterSheet player={selectedPlayer} compact />
        </div>
      ) : null}

      {moveHint || attackHint ? <p className="hint map-msg">{moveHint || attackHint}</p> : null}
      {role === 'dm' && paint ? (
        <p className="hint map-msg">
          {erase ? 'Drag a rectangle to erase ground.' : 'Drag a rectangle to paint ground. One cell is a tap.'}
        </p>
      ) : null}

      {map ? (
        <div
          ref={boardRef}
          className={`map-board${paint ? ' is-painting' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${map.cols}, 1fr)`,
            gridTemplateRows: `repeat(${map.rows}, 1fr)`,
          }}
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={onBoardPointerUp}
        >
          {map.imageDataUrl ? (
            <img className="map-board__image" src={map.imageDataUrl} alt="" />
          ) : null}
          {Array.from({ length: map.rows }).map((_, y) =>
            Array.from({ length: map.cols }).map((__, x) => {
              const key = cellKey(x, y)
              const walk = walkSet.has(key)
              const tok = tokens.find((t) => t.gx === x && t.gy === y)
              const inBrush = brushSet.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`map-cell${walk ? ' is-walk' : ''}${tok ? ' has-token' : ''}${reach.has(key) ? ' is-reach' : ''}${attackTargets.has(key) ? ' is-target' : ''}${inBrush ? ' is-brush' : ''}`}
                  onClick={() => onCell(x, y)}
                >
                  {tok ? (
                    <span className={`token token--${tok.kind}`}>
                      {tokenPortrait(tok.kind, tok.characterId) ? (
                        <img src={tokenPortrait(tok.kind, tok.characterId)} alt="" />
                      ) : (
                        tokenLabel(tok.kind, tok.characterId).slice(0, 3)
                      )}
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
