import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './hooks/useStore'
import { useAudioEngine } from './hooks/useAudioEngine'
import { AudioProvider } from './hooks/useAudioContext'
import { AudioDock } from './components/AudioDock'
import { LocationRail } from './components/LocationRail'
import { TableShare } from './components/TableShare'
import { DashboardView } from './views/DashboardView'
import { WorldView } from './views/WorldView'
import { ScenesView } from './views/ScenesView'
import { PlayersView } from './views/PlayersView'
import { NpcsView } from './views/NpcsView'
import { AudioView } from './views/AudioView'
import { CustomizeView } from './views/CustomizeView'
import { MapView } from './views/MapView'
import { GateView } from './views/GateView'
import { PlayerShell } from './views/PlayerShell'
import { RoleProvider } from './hooks/useRole'
import { resolveInitialRole, writeStoredRole } from './lib/role'
import { DEFAULT_THEME } from './types'
import type { AppRole, NavView } from './types'

const NAV: { id: NavView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'world', label: 'World' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'players', label: 'Players' },
  { id: 'npcs', label: 'Enemies / NPCs' },
  { id: 'audio', label: 'Audio' },
  { id: 'customize', label: 'Customize' },
]

function applyTheme(theme: { base: string; accent: string; text: string }) {
  const root = document.documentElement
  root.style.setProperty('--theme-base', theme.base)
  root.style.setProperty('--theme-accent', theme.accent)
  root.style.setProperty('--theme-text', theme.text)
}

function DmShell({ onSwitchRole }: { onSwitchRole: () => void }) {
  const [view, setView] = useState<NavView>('dashboard')
  const [railOpen, setRailOpen] = useState(false)
  const engine = useAudioEngine()
  const { data, setWorkspaceMode } = useStore()

  useEffect(() => {
    writeStoredRole('dm')
  }, [])

  useEffect(() => {
    applyTheme(data.theme)
  }, [data.theme])

  return (
    <AudioProvider engine={engine}>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden />
            <div>
              <p className="brand__name">DM Assistant</p>
              <p className="brand__tag">Private desktop · shared player table</p>
            </div>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className={`btn btn--sm${data.workspaceMode === 'desktop' ? ' btn--accent' : ''}`}
              onClick={() => setWorkspaceMode('desktop')}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`btn btn--sm${data.workspaceMode === 'map' ? ' btn--accent' : ''}`}
              onClick={() => setWorkspaceMode('map')}
            >
              Map
            </button>
            <button
              type="button"
              className="btn btn--accent locations-open locations-open--bar"
              onClick={() => setRailOpen(true)}
            >
              Locations
            </button>
            <nav className="nav" aria-label="Primary">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={view === item.id ? 'is-active' : undefined}
                  onClick={() => {
                    setView(item.id)
                    setWorkspaceMode('desktop')
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button type="button" className="btn btn--sm" onClick={onSwitchRole}>
              Switch role
            </button>
          </div>
        </header>

        <div className="workspace">
          <LocationRail open={railOpen} onClose={() => setRailOpen(false)} />
          <main className="main">
            {data.workspaceMode === 'map' ? (
              <>
                <MapView />
                <div className="table-share-wrap">
                  <TableShare />
                </div>
              </>
            ) : (
              <>
                {view === 'dashboard' && (
                  <DashboardView onOpenLocations={() => setRailOpen(true)} />
                )}
                {view === 'world' && <WorldView />}
                {view === 'scenes' && <ScenesView />}
                {view === 'players' && <PlayersView />}
                {view === 'npcs' && <NpcsView />}
                {view === 'audio' && <AudioView />}
                {view === 'customize' && <CustomizeView />}
              </>
            )}
          </main>
        </div>

        <AudioDock />
      </div>
    </AudioProvider>
  )
}

export default function App() {
  const [role, setRole] = useState<AppRole | null>(() => resolveInitialRole())

  const chooseRole = (next: AppRole) => {
    writeStoredRole(next)
    const url = new URL(window.location.href)
    if (next === 'dm') {
      url.searchParams.delete('room')
      url.searchParams.set('role', 'dm')
    } else {
      url.searchParams.set('role', 'player')
    }
    const search = url.searchParams.toString()
    window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}`)
    setRole(next)
  }

  const switchRole = () => {
    writeStoredRole(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('role')
    url.searchParams.delete('room')
    const search = url.searchParams.toString()
    window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}`)
    setRole(null)
  }

  useEffect(() => {
    if (!role) applyTheme(DEFAULT_THEME)
  }, [role])

  if (!role) {
    return <GateView onChoose={chooseRole} />
  }

  if (role === 'player') {
    return (
      <RoleProvider role="player">
        <StoreProvider playSession>
          <PlayerShell onSwitchRole={switchRole} />
        </StoreProvider>
      </RoleProvider>
    )
  }

  return (
    <RoleProvider role="dm">
      <StoreProvider>
        <DmShell onSwitchRole={switchRole} />
      </StoreProvider>
    </RoleProvider>
  )
}
