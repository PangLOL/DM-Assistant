import { useEffect, useRef, useState } from 'react'
import { playerJoinUrl } from '../lib/role'
import { broadcast, hostTable, randomRoomCode, type DataConn, type TableMsg } from '../lib/tableSync'
import { useStore } from '../hooks/useStore'

export function TableShare() {
  const { publicTableState, proposeAction } = useStore()
  const [room, setRoom] = useState('')
  const [status, setStatus] = useState('Table closed')
  const [playerUrl, setPlayerUrl] = useState('')
  const conns = useRef<DataConn[]>([])
  const peerRef = useRef<{ destroy: () => void } | null>(null)

  const pushState = () => {
    broadcast(conns.current, { type: 'state', payload: publicTableState() })
  }

  useEffect(() => {
    if (!room) return
    pushState()
  }, [room, publicTableState])

  useEffect(() => {
    return () => {
      peerRef.current?.destroy()
    }
  }, [])

  const start = async () => {
    const code = randomRoomCode()
    setStatus('Opening table…')
    try {
      const { peer } = await hostTable(code, (conn) => {
        conns.current = [...conns.current.filter((c) => c.peer !== conn.peer), conn]
        setStatus(`${conns.current.length} player(s) connected`)
        conn.send({ type: 'state', payload: publicTableState() })
        conn.on('data', ((msg: TableMsg) => {
          if (msg.type === 'hello') {
            conn.send({ type: 'state', payload: publicTableState() })
          }
          if (msg.type === 'propose') {
            const err = proposeAction({
              actorKind: msg.actorKind,
              actorId: msg.actorId,
              action: msg.action,
              targetGx: msg.targetGx,
              targetGy: msg.targetGy,
              targetId: msg.targetId,
              d20: msg.d20,
              advantage: msg.advantage,
              disadvantage: msg.disadvantage,
            })
            if (err) conn.send({ type: 'state', payload: { ...publicTableState(), error: err } })
            else pushState()
          }
        }) as never)
        conn.on('close', (() => {
          conns.current = conns.current.filter((c) => c.peer !== conn.peer)
          setStatus(`${conns.current.length} player(s) connected`)
        }) as never)
      })
      peerRef.current = peer
      setRoom(code)
      setPlayerUrl(playerJoinUrl(code))
      setStatus('Waiting for players…')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open table')
    }
  }

  const stop = () => {
    peerRef.current?.destroy()
    peerRef.current = null
    conns.current = []
    setRoom('')
    setPlayerUrl('')
    setStatus('Table closed')
  }

  return (
    <section className="panel">
      <h3>Player table (phones)</h3>
      <p className="hint">
        Players never see your desktop notes. Open a room, send them the link or code. Keep this
        tab open — your browser is the table.
      </p>
      {room ? (
        <>
          <p className="room-code">{room}</p>
          <p className="hint">
            Player link: <a href={playerUrl}>{playerUrl}</a>
          </p>
          {playerUrl ? (
            <img
              className="qr"
              alt="Join QR"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(playerUrl)}`}
            />
          ) : null}
          <p className="hint">{status}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={pushState}>
              Push map now
            </button>
            <button type="button" className="btn btn--danger" onClick={stop}>
              Close table
            </button>
          </div>
        </>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--accent" onClick={() => void start()}>
            Open player table
          </button>
          <span className="hint">{status}</span>
        </div>
      )}
    </section>
  )
}
