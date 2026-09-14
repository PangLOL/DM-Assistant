import { useEffect, useRef, useState } from 'react'
import { CharacterSheet } from '../components/CharacterSheet'
import { parseCharacterCsv } from '../data/campaignCsv'
import { TableBusProvider } from '../hooks/useTableBus'
import { useStore } from '../hooks/useStore'
import { loadMyCharacter, saveMyCharacter, writeStoredRole } from '../lib/role'
import { joinTable, type TableMsg } from '../lib/tableSync'
import type { Player, PublicTableState } from '../types'
import { CharacterCreatorView } from './CharacterCreatorView'
import { MapView } from './MapView'

type PlayerStep = 'ask' | 'create' | 'join' | 'table'

function initialStep(): PlayerStep {
  const params = new URLSearchParams(window.location.search)
  if (params.get('room')) return 'join'
  return 'ask'
}

function initialRoom(): string {
  return (new URLSearchParams(window.location.search).get('room') ?? '').toUpperCase()
}

export function PlayerShell({ onSwitchRole }: { onSwitchRole: () => void }) {
  const { applyPublicState, data } = useStore()
  const [step, setStep] = useState<PlayerStep>(initialStep)
  const [code, setCode] = useState(initialRoom)
  const [status, setStatus] = useState('Enter the room code from the DM')
  const [mine, setMine] = useState<Player | null>(() => loadMyCharacter())
  const [showSheet, setShowSheet] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)
  const connRef = useRef<{ send: (data: unknown) => void } | null>(null)

  useEffect(() => {
    writeStoredRole('player')
  }, [])

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
      const url = new URL(window.location.href)
      url.searchParams.set('role', 'player')
      url.searchParams.set('room', room)
      window.history.replaceState(null, '', `${url.pathname}${url.search}`)
      setStep('table')
      setStatus(`Joined ${room}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Join failed')
    }
  }

  const importCsv = async (file: File) => {
    try {
      const player = parseCharacterCsv(await file.text())
      saveMyCharacter(player)
      setMine(player)
      setShowSheet(true)
    } catch {
      alert('Could not read that character CSV.')
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
          <div className="topbar__actions">
            <button type="button" className="btn btn--sm" onClick={() => csvRef.current?.click()}>
              Import my CSV
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) await importCsv(file)
              }}
            />
            {mine ? (
              <button
                type="button"
                className={`btn btn--sm${showSheet ? ' btn--accent' : ''}`}
                onClick={() => setShowSheet((v) => !v)}
              >
                My sheet
              </button>
            ) : null}
            {step !== 'create' ? (
              <button type="button" className="btn btn--sm" onClick={() => setStep('create')}>
                New character
              </button>
            ) : null}
            {step !== 'join' && step !== 'table' ? (
              <button type="button" className="btn btn--sm" onClick={() => setStep('join')}>
                Join room
              </button>
            ) : null}
            <button type="button" className="btn btn--sm" onClick={onSwitchRole}>
              Switch role
            </button>
          </div>
        </header>
        <main className="main">
          {showSheet && mine ? (
            <section className="panel player-sheet-wrap">
              <CharacterSheet player={mine} />
            </section>
          ) : null}

          {step === 'ask' ? (
            <section className="panel join-panel">
              <h2>Need a new character?</h2>
              <p className="lede">
                If this is your first session, make a sheet here, download the CSV, and send it to
                the DM. If they already have you on the table, skip ahead and join.
              </p>
              <div className="gate-choices">
                <button type="button" className="gate-choice" onClick={() => setStep('create')}>
                  <strong>Yes — create one</strong>
                  <span>Name, class, 5e-lite stats, optional portrait</span>
                </button>
                <button type="button" className="gate-choice" onClick={() => setStep('join')}>
                  <strong>No — join the room</strong>
                  <span>Pick your character from the table after you connect</span>
                </button>
              </div>
            </section>
          ) : null}

          {step === 'create' ? (
            <CharacterCreatorView
              onReadyToJoin={(player) => {
                setMine(player)
                setStep('join')
              }}
              onCancel={() => setStep('join')}
            />
          ) : null}

          {step === 'join' ? (
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
              <div className="btn-row">
                <button type="button" className="btn btn--accent" onClick={() => void join()}>
                  Join
                </button>
                <button type="button" className="btn" onClick={() => setStep('create')}>
                  Create a character first
                </button>
              </div>
              <p className="hint">{status}</p>
            </section>
          ) : null}

          {step === 'table' ? (
            <>
              <p className="hint map-msg">{status}</p>
              <MapView />
            </>
          ) : null}
        </main>
      </div>
    </TableBusProvider>
  )
}
