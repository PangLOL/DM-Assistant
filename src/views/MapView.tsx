import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { CharacterSheet } from '../components/CharacterSheet'
import { blobToDataUrl } from '../lib/csv'
import {
  cellKey,
  chebyshev,
  reachableSquares,
  rectCells,
  rollD20,
  routePath,
  speedSquares,
  squaresToFeet,
  walkableRegionCount,
} from '../lib/rules5e'
import { useRole } from '../hooks/useRole'
import { useStore } from '../hooks/useStore'
import { useTableBus } from '../hooks/useTableBus'
import type { TableAction, TokenKind } from '../types'

function parseActor(key: string): { kind: TokenKind; id: string } | null {
  const [kind, id] = key.split(':')
  if ((kind !== 'player' && kind !== 'npc') || !id) return null
  return { kind, id }
}

type PinPlace = { left: number; top: number; tail: 'down' | 'up'; tailX: number }

/**
 * Pin the card on the destination. Prefer above the square, flip below when
 * that stays on screen, and slide a tall card so the buttons remain visible.
 * Coordinates are viewport pixels; the result is relative to the map frame.
 */
function placePin(
  anchorX: number,
  anchorY: number,
  pinW: number,
  pinH: number,
  frameLeft: number,
  frameTop: number,
): PinPlace {
  const pad = 8
  const gap = 14
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  let left = anchorX - pinW / 2
  let top = anchorY - pinH - gap
  let tail: 'down' | 'up' = 'down'
  const fitsAbove = top >= pad
  const belowTop = anchorY + gap
  const fitsBelow = belowTop + pinH <= viewH - pad
  if (!fitsAbove && fitsBelow) {
    top = belowTop
    tail = 'up'
  } else if (!fitsAbove && !fitsBelow) {
    const spaceAbove = anchorY - gap - pad
    const spaceBelow = viewH - pad - belowTop
    if (spaceBelow >= spaceAbove) {
      top = belowTop
      tail = 'up'
    }
    if (top < pad) top = pad
    if (top + pinH > viewH - pad) top = Math.max(pad, viewH - pad - pinH)
  }
  const maxLeft = viewW - pinW - pad
  left = Math.min(Math.max(pad, left), Math.max(pad, maxLeft))
  const tailX = Math.min(Math.max(16, anchorX - left), Math.max(16, pinW - 16))
  return {
    left: Math.round(left - frameLeft),
    top: Math.round(top - frameTop),
    tail,
    tailX: Math.round(tailX),
  }
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
  const [erase, setErase] = useState(true)
  const [colsDraft, setColsDraft] = useState<string | null>(null)
  const [gapDismissed, setGapDismissed] = useState(false)
  const [sawSplitGround, setSawSplitGround] = useState(false)
  const [rowsDraft, setRowsDraft] = useState<string | null>(null)
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
  const [modifyOn, setModifyOn] = useState(false)
  const [adjust, setAdjust] = useState(0)
  const [sawPendingId, setSawPendingId] = useState<string | null>(null)
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0, ox: 0, oy: 0 })
  const [pinPlace, setPinPlace] = useState<PinPlace | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const scrolledPending = useRef<string | null>(null)

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
      const result = proposeAction({
        actorKind: actor.kind,
        actorId: actor.id,
        action: 'attack',
        targetId: occupant.id,
        d20: Number.isFinite(roll) ? roll : null,
        advantage,
        disadvantage,
      })
      if (!result.error) {
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
          feet: result.feet,
          damage: result.damage,
        })
      }
      setMessage(result.error ?? 'Proposed. Waiting for the DM.')
      return
    }
    const mine = tokens.find((t) => t.kind === actor.kind && t.characterId === actor.id)
    if (role === 'dm' && !mine) {
      placeOrMoveToken(actor.kind, actor.id, map.id, x, y)
      setMessage(`Placed ${tokenLabel(actor.kind, actor.id)} on ${x},${y}.`)
      return
    }
    const result = proposeAction({
      actorKind: actor.kind,
      actorId: actor.id,
      action: 'move',
      targetGx: x,
      targetGy: y,
    })
    if (!result.error) {
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
        feet: result.feet,
        damage: result.damage,
      })
    }
    setMessage(result.error ?? 'Move proposed. Waiting for the DM.')
  }

  const commitSize = (which: 'cols' | 'rows') => {
    if (!map) return
    const raw = which === 'cols' ? colsDraft : rowsDraft
    if (which === 'cols') setColsDraft(null)
    else setRowsDraft(null)
    if (raw == null) return
    const parsed = Math.round(Number(raw))
    if (!Number.isFinite(parsed)) return
    const next = Math.max(2, Math.min(80, parsed))
    const current = which === 'cols' ? map.cols : map.rows
    if (next !== current) updateMap(map.id, { [which]: next })
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

  const regionCount = map ? walkableRegionCount(map.walkable) : 0
  const splitGround = regionCount > 1
  if (splitGround !== sawSplitGround) {
    setSawSplitGround(splitGround)
    if (!splitGround) setGapDismissed(false)
  }
  const showGapWarning = role === 'dm' && splitGround && !gapDismissed

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

  const pending = data.pendingAction
  const pendingId = pending?.id ?? null
  if (pendingId !== sawPendingId) {
    setSawPendingId(pendingId)
    setModifyOn(false)
    setAdjust(0)
    setPinPlace(null)
  }

  const pendingToken = pending
    ? (tokens.find((t) => t.kind === pending.actorKind && t.characterId === pending.actorId) ?? null)
    : null
  const destCell = (() => {
    if (!pending) return null
    if (pending.action === 'move' && pending.targetGx != null && pending.targetGy != null) {
      return { x: pending.targetGx, y: pending.targetGy }
    }
    if (pending.action === 'attack' && pending.targetId) {
      const target = tokens.find((t) => t.id === pending.targetId)
      return target ? { x: target.gx, y: target.gy } : null
    }
    return null
  })()
  const destKey = destCell ? cellKey(destCell.x, destCell.y) : null
  const route =
    map && pending && pendingToken && destCell
      ? pending.action === 'move'
        ? routePath(
            map.walkable,
            pendingToken.gx,
            pendingToken.gy,
            destCell.x,
            destCell.y,
            new Set(tokens.filter((t) => t.id !== pendingToken.id).map((t) => cellKey(t.gx, t.gy))),
          )
        : [
            { x: pendingToken.gx, y: pendingToken.gy },
            { x: destCell.x, y: destCell.y },
          ]
      : null

  const pendingBase = pending
    ? pending.action === 'move'
      ? (pending.feet ?? (route ? Math.max(0, route.length - 1) * (map?.squareFeet || 5) : 0))
      : (pending.damage ?? 0)
    : 0
  const pendingStep = pending?.action === 'move' ? map?.squareFeet || 5 : 1
  const shownValue = Math.max(0, pendingBase + (modifyOn ? adjust : 0))
  const pinCaption = (() => {
    if (!pending) return ''
    if (!modifyOn || shownValue === pendingBase) return pending.preview
    if (pending.action === 'move') {
      const squares = Math.round(shownValue / (map?.squareFeet || 5))
      return pending.preview
        .replace(/\d+ squares/, `${squares} squares`)
        .replace(/\(\d+ ft\)/, `(${shownValue} ft)`)
    }
    return pending.preview.replace(/Damage \d+/, `Damage ${shownValue}`)
  })()

  const nudge = (dir: -1 | 1) => {
    if (!modifyOn || !pending) return
    setAdjust((current) => {
      const next = current + dir * pendingStep
      if (pendingBase + next < 0) return current
      return next
    })
  }

  const acceptPin = () => {
    if (!pending) return
    const delta = shownValue - pendingBase
    if (pending.action === 'attack' && modifyOn && delta !== 0) {
      setMessage(resolvePending('modifier', { modifier: delta }))
      return
    }
    if (pending.action === 'move' && modifyOn && delta !== 0) {
      const text = pending.preview.replace(/\.$/, '')
      setMessage(resolvePending('rules', { note: `${text}. DM set the cost to ${shownValue} ft.` }))
      return
    }
    setMessage(resolvePending('rules'))
  }

  const destX = destCell?.x ?? null
  const destY = destCell?.y ?? null

  useLayoutEffect(() => {
    const board = boardRef.current
    const frame = frameRef.current
    if (!board || !frame) return
    const update = () => {
      const w = board.clientWidth
      const h = board.clientHeight
      const boardRect = board.getBoundingClientRect()
      const frameBox = frame.getBoundingClientRect()
      const ox = boardRect.left - frameBox.left + board.clientLeft
      const oy = boardRect.top - frameBox.top + board.clientTop
      setBoardSize((prev) =>
        prev.w === w && prev.h === h && prev.ox === ox && prev.oy === oy ? prev : { w, h, ox, oy },
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(board)
    return () => observer.disconnect()
  }, [map?.id, map?.cols, map?.rows])

  useLayoutEffect(() => {
    const pin = pinRef.current
    const frame = frameRef.current
    if (!pin || !frame || destX == null || destY == null || !map || boardSize.w <= 0) return
    const place = () => {
      const frameBox = frame.getBoundingClientRect()
      const next = placePin(
        frameBox.left + boardSize.ox + ((destX + 0.5) / map.cols) * boardSize.w,
        frameBox.top + boardSize.oy + ((destY + 0.5) / map.rows) * boardSize.h,
        pin.offsetWidth,
        pin.offsetHeight,
        frameBox.left,
        frameBox.top,
      )
      setPinPlace((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.tail === next.tail &&
        prev.tailX === next.tailX
          ? prev
          : next,
      )
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(pin)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [pendingId, modifyOn, role, pending?.preview, destX, destY, map, boardSize])

  useEffect(() => {
    if (!pendingId) {
      scrolledPending.current = null
      return
    }
    if (destX == null || destY == null || scrolledPending.current === pendingId) return
    scrolledPending.current = pendingId
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${destX},${destY}"]`)
      ?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, [pendingId, destX, destY])

  return (
    <div className="view map-view">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{role === 'dm' ? 'DM map' : 'Player table'}</p>
          <h2>{map?.name ?? 'No map'}</h2>
          <p className="lede">
            {role === 'dm'
              ? 'The grid starts fully painted. Erase the squares you do not want. Outlined squares are a legal move, and outlined tokens are in range.'
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
                  value={colsDraft ?? map.cols}
                  onChange={(e) => setColsDraft(e.target.value)}
                  onBlur={() => commitSize('cols')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              </label>
              <label className="field field--tight">
                <span>Rows</span>
                <input
                  type="number"
                  min={2}
                  max={80}
                  value={rowsDraft ?? map.rows}
                  onChange={(e) => setRowsDraft(e.target.value)}
                  onBlur={() => commitSize('rows')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
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

      {showGapWarning && map ? (
        <div className="map-warning" role="alert">
          <p>
            Some painted squares are separated. Creatures cannot walk between them. Ranged attacks can
            still reach across the gap, so a platform or ledge can stay.
          </p>
          <button type="button" className="btn btn--sm" onClick={() => setGapDismissed(true)}>
            Keep this map
          </button>
        </div>
      ) : null}

      {moveHint || attackHint ? <p className="hint map-msg">{moveHint || attackHint}</p> : null}
      {role === 'dm' && paint ? (
        <p className="hint map-msg">
          {erase
            ? 'Drag a rectangle to erase squares. Switch off Erase to paint them back.'
            : 'Drag a rectangle to paint squares back.'}
        </p>
      ) : null}

      {map ? (
        <div className="map-frame" ref={frameRef}>
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
                  data-cell={`${x},${y}`}
                  className={`map-cell${walk ? ' is-walk' : ''}${tok ? ' has-token' : ''}${reach.has(key) ? ' is-reach' : ''}${attackTargets.has(key) ? ' is-target' : ''}${key === destKey ? ' is-dest' : ''}${inBrush ? ' is-brush' : ''}`}
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
          {route && route.length > 1 && boardSize.w > 0 && map ? (
            <svg
              className="map-route"
              viewBox={`0 0 ${boardSize.w} ${boardSize.h}`}
              width={boardSize.w}
              height={boardSize.h}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="map-route-arrow"
                  viewBox="0 0 12 12"
                  markerWidth="16"
                  markerHeight="16"
                  refX="10.5"
                  refY="6"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M1 1.2 L11 6 L1 10.8 Z" fill="#f6e7b4" stroke="#1a2422" strokeWidth="1.4" />
                </marker>
              </defs>
              <polyline
                points={route
                  .map((cell) => {
                    const px = ((cell.x + 0.5) / map.cols) * boardSize.w
                    const py = ((cell.y + 0.5) / map.rows) * boardSize.h
                    return `${px},${py}`
                  })
                  .join(' ')}
                fill="none"
                stroke="#1a2422"
                strokeWidth="8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={route
                  .map((cell) => {
                    const px = ((cell.x + 0.5) / map.cols) * boardSize.w
                    const py = ((cell.y + 0.5) / map.rows) * boardSize.h
                    return `${px},${py}`
                  })
                  .join(' ')}
                fill="none"
                stroke="#f6e7b4"
                strokeWidth="3.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                markerEnd="url(#map-route-arrow)"
              />
            </svg>
          ) : null}
        </div>
          {pending && destCell ? (
            <div
              ref={pinRef}
              className={`map-pin${pinPlace ? '' : ' is-measuring'}${pinPlace?.tail === 'up' ? ' is-below' : ' is-above'}`}
              style={
                pinPlace
                  ? { left: pinPlace.left, top: pinPlace.top, ['--tail-x' as string]: `${pinPlace.tailX}px` }
                  : { left: 8, top: 8 }
              }
              role="dialog"
              aria-label={pending.action === 'move' ? 'Proposed move' : 'Proposed attack'}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="map-pin__kicker">{pending.action === 'move' ? 'Move' : 'Attack'}</p>
              <div className="map-pin__value">
                {role === 'dm' ? (
                  <button
                    type="button"
                    className="map-pin__nudge"
                    disabled={!modifyOn}
                    aria-label={pending.action === 'move' ? 'Use less movement' : 'Deal less damage'}
                    onClick={() => nudge(-1)}
                  >
                    ‹
                  </button>
                ) : null}
                <strong>{pending.action === 'move' ? `${shownValue} ft` : shownValue}</strong>
                {role === 'dm' ? (
                  <button
                    type="button"
                    className="map-pin__nudge"
                    disabled={!modifyOn}
                    aria-label={pending.action === 'move' ? 'Use more movement' : 'Deal more damage'}
                    onClick={() => nudge(1)}
                  >
                    ›
                  </button>
                ) : null}
              </div>
              <p className="map-pin__unit">{pending.action === 'move' ? 'movement' : 'damage'}</p>
              <p className="map-pin__caption">{pinCaption}</p>
              {role === 'dm' ? (
                <>
                  <button
                    type="button"
                    className={`map-pin__modify${modifyOn ? ' is-on' : ''}`}
                    aria-pressed={modifyOn}
                    onClick={() => setModifyOn((on) => !on)}
                  >
                    Modify {modifyOn ? 'on' : 'off'}
                  </button>
                  <div className="map-pin__actions">
                    <button type="button" className="btn btn--sm btn--accent" onClick={acceptPin}>
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() => {
                        clearPending()
                        setMessage('Declined.')
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </>
              ) : (
                <p className="map-pin__wait">Waiting for the DM.</p>
              )}
              <span className="map-pin__tail" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="empty">No map on this table yet.</p>
      )}

      {message ? <p className="hint map-msg">{message}</p> : null}
    </div>
  )
}
