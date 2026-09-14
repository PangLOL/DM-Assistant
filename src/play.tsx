import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StoreProvider, useStore } from './hooks/useStore'
import { RoleProvider } from './hooks/useRole'
import { TableBusProvider } from './hooks/useTableBus'
import { MapView } from './views/MapView'
import { joinTable, type TableMsg } from './lib/tableSync'
import type { PublicTableState } from './types'

function PlayerShell() {
  const { applyPublicState, data } = useStore()
  const params = new URLSearchParams(window.location.search)
  const [code, setCode] = useState(params.get('room') ?? '')
  const [status, setStatus] = useState('Enter the room code from the DM')
  const [joined, setJoined] = useState(false)
  const connRef = useRef<{ send: (data: unknown) => void } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-base', data.theme.base)
    root.style.setProperty('--theme-accent', data.theme.accent)
    root.style.setProperty('--theme-text', data.theme.text)
  }, [data.theme])

  const join = async () => {
    const room = code.trim().toUpperCase()
    if (!room) return
    setStatus('Joining table…')
    try {
      const { conn } = await joinTable(room, (msg: TableMsg) => {
        if (msg.type === 'state') applyPublicState(msg.payload as PublicTableState)
      })
      connRef.current = conn
      setJoined(true)
      setStatus(`Joined ${room}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Join failed')
    }
  }

  return (
    <TableBusProvider
      sendPropose={(msg) => {
        connRef.current?.send({ ...msg, type: 'propose' })
      }}
    >
      <div className="app-shell play-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden />
            <div>
              <p className="brand__name">Player table</p>
              <p className="brand__tag">Map only — no DM notes</p>
            </div>
          </div>
        </header>
        <main className="main">
          {!joined ? (
            <section className="panel join-panel">
              <h2>Join the table</h2>
              <p className="lede">Ask the DM for the 4-letter code (or open the QR link).</p>
              <label className="field">
                <span>Room code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K2P"
                />
              </label>
              <button type="button" className="btn btn--accent" onClick={() => void join()}>
                Join
              </button>
              <p className="hint">{status}</p>
            </section>
          ) : (
            <>
              <p className="hint">{status}</p>
              <MapView />
            </>
          )}
        </main>
      </div>
    </TableBusProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoleProvider role="player">
      <StoreProvider playSession>
        <PlayerShell />
      </StoreProvider>
    </RoleProvider>
  </StrictMode>,
)
